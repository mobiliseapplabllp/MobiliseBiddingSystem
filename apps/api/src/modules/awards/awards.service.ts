import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import {
  CreateAwardDto,
  UpdateAwardDto,
  AwardFilterDto,
  ApproveRejectDto,
} from './dto/award.dto';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  AwardCreatedEvent,
  AwardSubmittedForApprovalEvent,
  AwardApprovedEvent,
  AwardRejectedEvent,
  AwardSuppliersNotifiedEvent,
} from '../../common/events/domain-events';

// ── Valid state transitions ─────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['NOTIFIED', 'CANCELLED'],
  REJECTED: ['DRAFT'],
  NOTIFIED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

// ── IApprovalWorkflow interface (seam for Sprint 20 engine) ─────────────────

export interface IApprovalWorkflow {
  /** Determine if all required approvals at all levels are satisfied */
  isFullyApproved(awardId: string): Promise<boolean>;
  /** Get the next pending approval level */
  getNextPendingLevel(awardId: string): Promise<number | null>;
}

@Injectable()
export class AwardsService implements IApprovalWorkflow {
  private readonly logger = new Logger(AwardsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
  ) {}

  // ── Create ──────────────────────────────────────────────────────────────────

  async create(dto: CreateAwardDto, user: JwtPayload) {
    const orgId = user.orgId!;
    this.logger.log(`Creating award: orgId=${orgId} userId=${user.sub}`);

    // Validate RFx event exists
    const rfxEvent = await this.prisma.rfxEvent.findFirst({
      where: { id: dto.rfxEventId, orgId, isActive: true },
    });
    if (!rfxEvent) {
      throw new NotFoundException(`RFx event ${dto.rfxEventId} not found`);
    }

    // Validate evaluation if provided
    if (dto.evaluationId) {
      const evaluation = await this.prisma.evaluation.findFirst({
        where: { id: dto.evaluationId, orgId, isActive: true },
      });
      if (!evaluation) {
        throw new NotFoundException(`Evaluation ${dto.evaluationId} not found`);
      }
    }

    // Validate items are present
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one award item is required');
    }

    // Calculate total value from items
    const totalValue = dto.items.reduce(
      (sum, item) => sum + Number(item.awardedValue),
      0,
    );

    const award = await this.prisma.award.create({
      data: {
        orgId,
        buId: dto.buId,
        rfxEventId: dto.rfxEventId,
        evaluationId: dto.evaluationId,
        title: dto.title,
        description: dto.description,
        awardMode: dto.awardMode ?? 'WHOLE_EVENT',
        currency: dto.currency ?? rfxEvent.currency,
        totalValue,
        createdById: user.sub,
        items: {
          create: dto.items.map((item) => ({
            orgId,
            lotId: item.lotId,
            bidId: item.bidId,
            supplierId: item.supplierId,
            supplierName: item.supplierName,
            awardedValue: item.awardedValue,
            currency: item.currency ?? dto.currency ?? rfxEvent.currency,
            status: item.status ?? 'AWARDED',
            rejectionReason: item.rejectionReason,
            conditions: item.conditions,
            notes: item.notes,
          })),
        },
        approvalSteps: dto.approvalSteps?.length
          ? {
              create: dto.approvalSteps.map((step) => ({
                orgId,
                approverId: step.approverId,
                approverRole: step.approverRole,
                level: step.level,
              })),
            }
          : undefined,
      },
      include: { items: true, approvalSteps: true },
    });

    // Domain event
    this.eventEmitter.emit(
      'award.created',
      new AwardCreatedEvent(award.id, orgId, user.sub, award.title),
    );

    // Audit log
    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'CREATE',
      entityType: 'AWARD',
      entityId: award.id,
      newValue: award as unknown as Record<string, unknown>,
    });

    // Analytics
    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'AWARD_CREATED',
      entityType: 'AWARD',
      entityId: award.id,
      properties: {
        awardMode: award.awardMode,
        itemCount: dto.items.length,
        totalValue: Number(totalValue),
      },
    });

    this.logger.log(`Award created: id=${award.id} orgId=${orgId}`);
    return award;
  }

  // ── Find All (paginated) ──────────────────────────────────────────────────

  async findAll(orgId: string, filter: AwardFilterDto) {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { orgId, isActive: true };
    if (filter.status) where.status = filter.status;
    if (filter.awardMode) where.awardMode = filter.awardMode;
    if (filter.rfxEventId) where.rfxEventId = filter.rfxEventId;
    if (filter.search) {
      where.title = { contains: filter.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.award.findMany({
        where,
        include: {
          items: { where: { isActive: true } },
          approvalSteps: { where: { isActive: true }, orderBy: { level: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.award.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  // ── Find One ──────────────────────────────────────────────────────────────

  async findOne(orgId: string, awardId: string) {
    const award = await this.prisma.award.findFirst({
      where: { id: awardId, orgId, isActive: true },
      include: {
        items: { where: { isActive: true } },
        approvalSteps: { where: { isActive: true }, orderBy: { level: 'asc' } },
        rfxEvent: { select: { id: true, refNumber: true, title: true, type: true } },
        evaluation: { select: { id: true, title: true, status: true } },
      },
    });

    if (!award) {
      throw new NotFoundException(`Award ${awardId} not found`);
    }

    return award;
  }

  // ── Update (DRAFT only) ───────────────────────────────────────────────────

  async update(orgId: string, awardId: string, dto: UpdateAwardDto, user: JwtPayload) {
    const existing = await this.findOne(orgId, awardId);

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT awards can be updated');
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.awardMode !== undefined) updateData.awardMode = dto.awardMode;
    if (dto.currency !== undefined) updateData.currency = dto.currency;

    // Replace items if provided
    if (dto.items) {
      // Soft-delete existing items
      await this.prisma.awardItem.updateMany({
        where: { awardId, orgId },
        data: { isActive: false },
      });

      // Create new items
      await this.prisma.awardItem.createMany({
        data: dto.items.map((item) => ({
          awardId,
          orgId,
          lotId: item.lotId,
          bidId: item.bidId,
          supplierId: item.supplierId,
          supplierName: item.supplierName,
          awardedValue: item.awardedValue,
          currency: item.currency ?? dto.currency ?? existing.currency,
          status: item.status ?? 'AWARDED',
          rejectionReason: item.rejectionReason,
          conditions: item.conditions,
          notes: item.notes,
        })),
      });

      // Recalculate total value
      updateData.totalValue = dto.items.reduce(
        (sum, item) => sum + Number(item.awardedValue),
        0,
      );
    }

    // Replace approval steps if provided
    if (dto.approvalSteps) {
      await this.prisma.awardApproval.updateMany({
        where: { awardId, orgId },
        data: { isActive: false },
      });

      if (dto.approvalSteps.length > 0) {
        await this.prisma.awardApproval.createMany({
          data: dto.approvalSteps.map((step) => ({
            awardId,
            orgId,
            approverId: step.approverId,
            approverRole: step.approverRole,
            level: step.level,
          })),
        });
      }
    }

    const updated = await this.prisma.award.update({
      where: { id: awardId },
      data: updateData,
      include: {
        items: { where: { isActive: true } },
        approvalSteps: { where: { isActive: true }, orderBy: { level: 'asc' } },
      },
    });

    // Audit log
    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'UPDATE',
      entityType: 'AWARD',
      entityId: awardId,
      oldValue: existing as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    // Analytics
    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'AWARD_UPDATED',
      entityType: 'AWARD',
      entityId: awardId,
    });

    this.logger.log(`Award updated: id=${awardId} orgId=${orgId}`);
    return updated;
  }

  // ── Submit for Approval ───────────────────────────────────────────────────

  async submitForApproval(orgId: string, awardId: string, user: JwtPayload) {
    const award = await this.findOne(orgId, awardId);

    if (award.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT awards can be submitted for approval');
    }

    // Validate at least one item exists
    if (!award.items || award.items.length === 0) {
      throw new BadRequestException('Award must have at least one item before submission');
    }

    // If no approval steps defined, auto-approve
    const hasApprovalSteps = award.approvalSteps && award.approvalSteps.length > 0;

    const newStatus = hasApprovalSteps ? 'PENDING_APPROVAL' : 'APPROVED';

    const updated = await this.prisma.award.update({
      where: { id: awardId },
      data: {
        status: newStatus,
        ...(newStatus === 'APPROVED'
          ? { approvedById: user.sub, approvedAt: new Date() }
          : {}),
      },
      include: {
        items: { where: { isActive: true } },
        approvalSteps: { where: { isActive: true }, orderBy: { level: 'asc' } },
      },
    });

    // Domain event
    this.eventEmitter.emit(
      'award.submittedForApproval',
      new AwardSubmittedForApprovalEvent(awardId, orgId, user.sub),
    );

    if (newStatus === 'APPROVED') {
      this.eventEmitter.emit(
        'award.approved',
        new AwardApprovedEvent(awardId, orgId, user.sub),
      );
    }

    // Audit log
    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'UPDATE',
      entityType: 'AWARD',
      entityId: awardId,
      oldValue: { status: 'DRAFT' },
      newValue: { status: newStatus },
    });

    // Analytics
    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: newStatus === 'APPROVED' ? 'AWARD_AUTO_APPROVED' : 'AWARD_SUBMITTED_FOR_APPROVAL',
      entityType: 'AWARD',
      entityId: awardId,
    });

    this.logger.log(`Award submitted for approval: id=${awardId} newStatus=${newStatus}`);
    return updated;
  }

  // ── Approve (at the approver's level) ─────────────────────────────────────

  async approve(orgId: string, awardId: string, dto: ApproveRejectDto, user: JwtPayload) {
    const award = await this.findOne(orgId, awardId);

    if (award.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Award is not pending approval');
    }

    // Find the approver's pending step
    const approvalStep = award.approvalSteps.find(
      (step: { approverId: string; status: string }) =>
        step.approverId === user.sub && step.status === 'PENDING',
    );

    if (!approvalStep) {
      throw new ForbiddenException('You do not have a pending approval step for this award');
    }

    // Verify this is the next level to approve (levels must be sequential)
    const nextLevel = await this.getNextPendingLevel(awardId);
    if (nextLevel !== null && approvalStep.level !== nextLevel) {
      throw new BadRequestException(
        `Approval at level ${nextLevel} must be completed first`,
      );
    }

    // Approve this step
    await this.prisma.awardApproval.update({
      where: { id: approvalStep.id },
      data: {
        status: 'APPROVED',
        comments: dto.comments,
        decidedAt: new Date(),
      },
    });

    // Check if all levels are now approved
    const fullyApproved = await this.isFullyApproved(awardId);

    if (fullyApproved) {
      await this.prisma.award.update({
        where: { id: awardId },
        data: {
          status: 'APPROVED',
          approvedById: user.sub,
          approvedAt: new Date(),
        },
      });

      this.eventEmitter.emit(
        'award.approved',
        new AwardApprovedEvent(awardId, orgId, user.sub),
      );

      await this.analytics.track({
        orgId,
        userId: user.sub,
        eventType: 'AWARD_APPROVED',
        entityType: 'AWARD',
        entityId: awardId,
      });
    }

    // Audit log
    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'UPDATE',
      entityType: 'AWARD_APPROVAL',
      entityId: approvalStep.id,
      oldValue: { status: 'PENDING' },
      newValue: { status: 'APPROVED', comments: dto.comments },
    });

    // Analytics
    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'AWARD_STEP_APPROVED',
      entityType: 'AWARD_APPROVAL',
      entityId: approvalStep.id,
      properties: { awardId, level: approvalStep.level, fullyApproved },
    });

    this.logger.log(
      `Award approval step approved: awardId=${awardId} level=${approvalStep.level} fullyApproved=${fullyApproved}`,
    );

    return this.findOne(orgId, awardId);
  }

  // ── Reject ────────────────────────────────────────────────────────────────

  async reject(orgId: string, awardId: string, dto: ApproveRejectDto, user: JwtPayload) {
    const award = await this.findOne(orgId, awardId);

    if (award.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Award is not pending approval');
    }

    // Find the approver's pending step
    const approvalStep = award.approvalSteps.find(
      (step: { approverId: string; status: string }) =>
        step.approverId === user.sub && step.status === 'PENDING',
    );

    if (!approvalStep) {
      throw new ForbiddenException('You do not have a pending approval step for this award');
    }

    // Reject the step
    await this.prisma.awardApproval.update({
      where: { id: approvalStep.id },
      data: {
        status: 'REJECTED',
        comments: dto.comments,
        decidedAt: new Date(),
      },
    });

    // Reject the award entirely
    await this.prisma.award.update({
      where: { id: awardId },
      data: {
        status: 'REJECTED',
        rejectedReason: dto.comments,
      },
    });

    // Domain event
    this.eventEmitter.emit(
      'award.rejected',
      new AwardRejectedEvent(awardId, orgId, user.sub, dto.comments),
    );

    // Audit log
    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'UPDATE',
      entityType: 'AWARD',
      entityId: awardId,
      oldValue: { status: 'PENDING_APPROVAL' },
      newValue: { status: 'REJECTED', rejectedReason: dto.comments },
    });

    // Analytics
    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'AWARD_REJECTED',
      entityType: 'AWARD',
      entityId: awardId,
      properties: { level: approvalStep.level, reason: dto.comments },
    });

    this.logger.log(`Award rejected: id=${awardId} orgId=${orgId}`);
    return this.findOne(orgId, awardId);
  }

  // ── Notify Suppliers ──────────────────────────────────────────────────────

  async notifySuppliers(orgId: string, awardId: string, user: JwtPayload) {
    const award = await this.findOne(orgId, awardId);

    if (award.status !== 'APPROVED') {
      throw new BadRequestException('Only APPROVED awards can notify suppliers');
    }

    const updated = await this.prisma.award.update({
      where: { id: awardId },
      data: { status: 'NOTIFIED' },
      include: {
        items: { where: { isActive: true } },
        approvalSteps: { where: { isActive: true }, orderBy: { level: 'asc' } },
      },
    });

    // Domain event — email notification handler will subscribe to this
    this.eventEmitter.emit(
      'award.suppliersNotified',
      new AwardSuppliersNotifiedEvent(
        awardId,
        orgId,
        user.sub,
        award.items
          .filter((i: { status: string }) => i.status === 'AWARDED')
          .map((i: { supplierId: string }) => i.supplierId),
      ),
    );

    // Audit log
    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'UPDATE',
      entityType: 'AWARD',
      entityId: awardId,
      oldValue: { status: 'APPROVED' },
      newValue: { status: 'NOTIFIED' },
    });

    // Analytics
    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'AWARD_SUPPLIERS_NOTIFIED',
      entityType: 'AWARD',
      entityId: awardId,
      properties: {
        supplierCount: award.items.filter(
          (i: { status: string }) => i.status === 'AWARDED',
        ).length,
      },
    });

    this.logger.log(`Award suppliers notified: id=${awardId} orgId=${orgId}`);
    return updated;
  }

  // ── Soft Delete ───────────────────────────────────────────────────────────

  async remove(orgId: string, awardId: string, user: JwtPayload) {
    const award = await this.findOne(orgId, awardId);

    if (award.status !== 'DRAFT' && award.status !== 'CANCELLED') {
      throw new BadRequestException('Only DRAFT or CANCELLED awards can be deleted');
    }

    await this.prisma.award.update({
      where: { id: awardId },
      data: { isActive: false },
    });

    // Also soft-delete items and approval steps
    await this.prisma.awardItem.updateMany({
      where: { awardId, orgId },
      data: { isActive: false },
    });
    await this.prisma.awardApproval.updateMany({
      where: { awardId, orgId },
      data: { isActive: false },
    });

    // Audit log
    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'DELETE',
      entityType: 'AWARD',
      entityId: awardId,
      oldValue: award as unknown as Record<string, unknown>,
    });

    // Analytics
    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'AWARD_DELETED',
      entityType: 'AWARD',
      entityId: awardId,
    });

    this.logger.log(`Award soft-deleted: id=${awardId} orgId=${orgId}`);
  }

  // ── IApprovalWorkflow implementation ──────────────────────────────────────

  async isFullyApproved(awardId: string): Promise<boolean> {
    const pendingCount = await this.prisma.awardApproval.count({
      where: {
        awardId,
        isActive: true,
        status: { in: ['PENDING'] },
      },
    });
    return pendingCount === 0;
  }

  async getNextPendingLevel(awardId: string): Promise<number | null> {
    const nextPending = await this.prisma.awardApproval.findFirst({
      where: {
        awardId,
        isActive: true,
        status: 'PENDING',
      },
      orderBy: { level: 'asc' },
      select: { level: true },
    });
    return nextPending?.level ?? null;
  }
}
