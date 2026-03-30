import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import {
  CreateContractDto,
  UpdateContractDto,
  ChangeContractStatusDto,
  CreateAmendmentDto,
  ContractFilterDto,
} from './dto/contract.dto';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  ContractCreatedEvent,
  ContractActivatedEvent,
  ContractExpiredEvent,
  ContractAmendedEvent,
} from '../../common/events/domain-events';

// ── Valid state transitions ─────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['ACTIVE', 'DRAFT'],
  ACTIVE: ['SUSPENDED', 'EXPIRED', 'TERMINATED'],
  SUSPENDED: ['ACTIVE', 'TERMINATED'],
  EXPIRED: ['RENEWED'],
  TERMINATED: [],
  RENEWED: ['ACTIVE'],
};

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
  ) {}

  // ── Generate Contract Number ──────────────────────────────────────────────

  private async generateContractNumber(orgId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.contract.count({
      where: {
        orgId,
        contractNumber: { startsWith: `CON-${year}-` },
      },
    });
    const seq = String(count + 1).padStart(3, '0');
    return `CON-${year}-${seq}`;
  }

  // ── Create ──────────────────────────────────────────────────────────────────

  async create(dto: CreateContractDto, user: JwtPayload) {
    const orgId = user.orgId!;
    this.logger.log(`Creating contract: orgId=${orgId} userId=${user.sub}`);

    // Validate RFx event if provided
    if (dto.rfxEventId) {
      const rfxEvent = await this.prisma.rfxEvent.findFirst({
        where: { id: dto.rfxEventId, orgId, isActive: true },
      });
      if (!rfxEvent) {
        throw new NotFoundException(`RFx event ${dto.rfxEventId} not found`);
      }
    }

    // Validate award if provided
    if (dto.awardId) {
      const award = await this.prisma.award.findFirst({
        where: { id: dto.awardId, orgId, isActive: true },
      });
      if (!award) {
        throw new NotFoundException(`Award ${dto.awardId} not found`);
      }
    }

    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const contractNumber = await this.generateContractNumber(orgId);

    const contract = await this.prisma.contract.create({
      data: {
        orgId,
        buId: dto.buId,
        rfxEventId: dto.rfxEventId,
        awardId: dto.awardId,
        contractNumber,
        title: dto.title,
        description: dto.description,
        contractType: dto.contractType,
        supplierId: dto.supplierId,
        supplierName: dto.supplierName,
        totalValue: dto.totalValue,
        currency: dto.currency ?? 'USD',
        startDate,
        endDate,
        signedDate: dto.signedDate ? new Date(dto.signedDate) : null,
        paymentTerms: dto.paymentTerms,
        incoterms: dto.incoterms,
        terms: (dto.terms as any) ?? undefined,
        createdById: user.sub,
      },
    });

    // Domain event
    this.eventEmitter.emit(
      'contract.created',
      new ContractCreatedEvent(contract.id, orgId, user.sub, contract.contractNumber, contract.title),
    );

    // Audit log
    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'CREATE',
      entityType: 'CONTRACT',
      entityId: contract.id,
      newValue: contract as unknown as Record<string, unknown>,
    });

    // Analytics
    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'CONTRACT_CREATED',
      entityType: 'CONTRACT',
      entityId: contract.id,
      properties: {
        contractType: contract.contractType,
        contractNumber: contract.contractNumber,
        totalValue: contract.totalValue ? Number(contract.totalValue) : null,
      },
    });

    this.logger.log(`Contract created: id=${contract.id} number=${contractNumber} orgId=${orgId}`);
    return contract;
  }

  // ── Find All (paginated) ──────────────────────────────────────────────────

  async findAll(orgId: string, filter: ContractFilterDto) {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { orgId, isActive: true };
    if (filter.status) where.status = filter.status;
    if (filter.contractType) where.contractType = filter.contractType;
    if (filter.supplierId) where.supplierId = filter.supplierId;
    if (filter.rfxEventId) where.rfxEventId = filter.rfxEventId;
    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { contractNumber: { contains: filter.search, mode: 'insensitive' } },
        { supplierName: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        include: {
          amendments: { where: { isActive: true }, orderBy: { amendmentNumber: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.contract.count({ where }),
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

  async findOne(orgId: string, contractId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, orgId, isActive: true },
      include: {
        amendments: { where: { isActive: true }, orderBy: { amendmentNumber: 'desc' } },
        rfxEvent: { select: { id: true, refNumber: true, title: true, type: true } },
        award: { select: { id: true, title: true, status: true, totalValue: true } },
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    return contract;
  }

  // ── Update (DRAFT or UNDER_REVIEW only) ─────────────────────────────────

  async update(orgId: string, contractId: string, dto: UpdateContractDto, user: JwtPayload) {
    const existing = await this.findOne(orgId, contractId);

    if (existing.status !== 'DRAFT' && existing.status !== 'UNDER_REVIEW') {
      throw new BadRequestException('Only DRAFT or UNDER_REVIEW contracts can be updated');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.contractType !== undefined) updateData.contractType = dto.contractType;
    if (dto.supplierId !== undefined) updateData.supplierId = dto.supplierId;
    if (dto.supplierName !== undefined) updateData.supplierName = dto.supplierName;
    if (dto.totalValue !== undefined) updateData.totalValue = dto.totalValue;
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.startDate !== undefined) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) updateData.endDate = new Date(dto.endDate);
    if (dto.signedDate !== undefined) updateData.signedDate = new Date(dto.signedDate);
    if (dto.paymentTerms !== undefined) updateData.paymentTerms = dto.paymentTerms;
    if (dto.incoterms !== undefined) updateData.incoterms = dto.incoterms;
    if (dto.terms !== undefined) updateData.terms = dto.terms;

    // Validate dates if both are provided or changing
    const newStart = dto.startDate ? new Date(dto.startDate) : existing.startDate;
    const newEnd = dto.endDate ? new Date(dto.endDate) : existing.endDate;
    if (newEnd <= newStart) {
      throw new BadRequestException('End date must be after start date');
    }

    const updated = await this.prisma.contract.update({
      where: { id: contractId },
      data: updateData,
      include: {
        amendments: { where: { isActive: true }, orderBy: { amendmentNumber: 'desc' } },
      },
    });

    // Audit log
    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'UPDATE',
      entityType: 'CONTRACT',
      entityId: contractId,
      oldValue: existing as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    // Analytics
    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'CONTRACT_UPDATED',
      entityType: 'CONTRACT',
      entityId: contractId,
    });

    this.logger.log(`Contract updated: id=${contractId} orgId=${orgId}`);
    return updated;
  }

  // ── Change Status (lifecycle transitions) ─────────────────────────────────

  async changeStatus(orgId: string, contractId: string, dto: ChangeContractStatusDto, user: JwtPayload) {
    const contract = await this.findOne(orgId, contractId);
    const currentStatus = contract.status;
    const targetStatus = dto.status;

    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Invalid status transition: ${currentStatus} -> ${targetStatus}`,
      );
    }

    const updateData: Record<string, unknown> = { status: targetStatus };

    // Set signedDate when activating
    if (targetStatus === 'ACTIVE' && !contract.signedDate) {
      updateData.signedDate = new Date();
    }

    const updated = await this.prisma.contract.update({
      where: { id: contractId },
      data: updateData,
      include: {
        amendments: { where: { isActive: true }, orderBy: { amendmentNumber: 'desc' } },
      },
    });

    // Domain events based on new status
    if (targetStatus === 'ACTIVE') {
      this.eventEmitter.emit(
        'contract.activated',
        new ContractActivatedEvent(contractId, orgId, user.sub, contract.contractNumber),
      );
    }
    if (targetStatus === 'EXPIRED') {
      this.eventEmitter.emit(
        'contract.expired',
        new ContractExpiredEvent(contractId, orgId, contract.contractNumber),
      );
    }

    // Audit log
    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'UPDATE',
      entityType: 'CONTRACT',
      entityId: contractId,
      oldValue: { status: currentStatus },
      newValue: { status: targetStatus, reason: dto.reason },
    });

    // Analytics
    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: `CONTRACT_${targetStatus}`,
      entityType: 'CONTRACT',
      entityId: contractId,
      properties: { previousStatus: currentStatus, reason: dto.reason },
    });

    this.logger.log(`Contract status changed: id=${contractId} ${currentStatus} -> ${targetStatus}`);
    return updated;
  }

  // ── Add Amendment ─────────────────────────────────────────────────────────

  async addAmendment(orgId: string, contractId: string, dto: CreateAmendmentDto, user: JwtPayload) {
    const contract = await this.findOne(orgId, contractId);

    if (contract.status !== 'ACTIVE' && contract.status !== 'UNDER_REVIEW') {
      throw new BadRequestException('Amendments can only be added to ACTIVE or UNDER_REVIEW contracts');
    }

    // Get next amendment number
    const lastAmendment = await this.prisma.contractAmendment.findFirst({
      where: { contractId, orgId, isActive: true },
      orderBy: { amendmentNumber: 'desc' },
      select: { amendmentNumber: true },
    });
    const amendmentNumber = (lastAmendment?.amendmentNumber ?? 0) + 1;

    const amendment = await this.prisma.contractAmendment.create({
      data: {
        contractId,
        orgId,
        amendmentNumber,
        title: dto.title,
        description: dto.description,
        changeType: dto.changeType,
        oldValue: (dto.oldValue as any) ?? undefined,
        newValue: (dto.newValue as any) ?? undefined,
      },
    });

    // Domain event
    this.eventEmitter.emit(
      'contract.amended',
      new ContractAmendedEvent(
        amendment.id,
        contractId,
        orgId,
        user.sub,
        amendmentNumber,
        dto.changeType,
      ),
    );

    // Audit log
    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'CREATE',
      entityType: 'CONTRACT_AMENDMENT',
      entityId: amendment.id,
      newValue: amendment as unknown as Record<string, unknown>,
    });

    // Analytics
    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'CONTRACT_AMENDED',
      entityType: 'CONTRACT_AMENDMENT',
      entityId: amendment.id,
      properties: {
        contractId,
        amendmentNumber,
        changeType: dto.changeType,
      },
    });

    this.logger.log(`Contract amendment created: contractId=${contractId} amendment #${amendmentNumber}`);
    return amendment;
  }

  // ── Get Amendments ────────────────────────────────────────────────────────

  async getAmendments(orgId: string, contractId: string) {
    // Verify contract exists
    await this.findOne(orgId, contractId);

    return this.prisma.contractAmendment.findMany({
      where: { contractId, orgId, isActive: true },
      orderBy: { amendmentNumber: 'desc' },
    });
  }

  // ── Get Expiring Contracts ────────────────────────────────────────────────

  async getExpiringContracts(orgId: string, withinDays: number) {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);

    return this.prisma.contract.findMany({
      where: {
        orgId,
        isActive: true,
        status: 'ACTIVE',
        endDate: {
          gte: now,
          lte: cutoff,
        },
      },
      orderBy: { endDate: 'asc' },
    });
  }

  // ── Get Contract Stats ────────────────────────────────────────────────────

  async getContractStats(orgId: string) {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [total, byStatus, expiringCount, byType] = await Promise.all([
      this.prisma.contract.count({
        where: { orgId, isActive: true },
      }),
      this.prisma.contract.groupBy({
        by: ['status'],
        where: { orgId, isActive: true },
        _count: true,
      }),
      this.prisma.contract.count({
        where: {
          orgId,
          isActive: true,
          status: 'ACTIVE',
          endDate: { gte: now, lte: thirtyDaysFromNow },
        },
      }),
      this.prisma.contract.groupBy({
        by: ['contractType'],
        where: { orgId, isActive: true },
        _count: true,
      }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of byStatus) {
      statusMap[s.status] = s._count;
    }

    const typeMap: Record<string, number> = {};
    for (const t of byType) {
      typeMap[t.contractType] = t._count;
    }

    return {
      total,
      byStatus: statusMap,
      expiringIn30Days: expiringCount,
      byType: typeMap,
    };
  }

  // ── Soft Delete ─────────────────────────────────────────────────────────────

  async remove(orgId: string, contractId: string, user: JwtPayload) {
    const contract = await this.findOne(orgId, contractId);

    if (contract.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT contracts can be deleted');
    }

    await this.prisma.contract.update({
      where: { id: contractId },
      data: { isActive: false },
    });

    // Also soft-delete amendments
    await this.prisma.contractAmendment.updateMany({
      where: { contractId, orgId },
      data: { isActive: false },
    });

    // Audit log
    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'DELETE',
      entityType: 'CONTRACT',
      entityId: contractId,
      oldValue: contract as unknown as Record<string, unknown>,
    });

    // Analytics
    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'CONTRACT_DELETED',
      entityType: 'CONTRACT',
      entityId: contractId,
    });

    this.logger.log(`Contract soft-deleted: id=${contractId} orgId=${orgId}`);
  }
}
