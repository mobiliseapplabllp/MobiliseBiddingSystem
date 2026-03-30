import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { CreateBidDto, UpdateBidDto } from './dto/bid.dto';

@Injectable()
export class BidsService {
  private readonly logger = new Logger(BidsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
  ) {}

  // ─── Create / Save Draft ─────────────────────────────────────────────────
  async createDraft(dto: CreateBidDto) {
    const invitation = await this.prisma.supplierInvitation.findUnique({
      where: { token: dto.invitationToken },
      include: { event: true },
    });
    if (!invitation || !invitation.isActive) {
      throw new NotFoundException('Invitation not found or revoked');
    }
    if (invitation.status === 'DECLINED') {
      throw new ForbiddenException('You declined this invitation');
    }
    if (invitation.event.status !== 'PUBLISHED') {
      throw new ForbiddenException('This event is not open for bidding');
    }

    // Check deadline
    if (invitation.event.submissionDeadline && new Date() > invitation.event.submissionDeadline) {
      throw new ForbiddenException('Submission deadline has passed');
    }

    const bid = await this.prisma.bidSubmission.create({
      data: {
        eventId: invitation.eventId,
        invitationId: invitation.id,
        orgId: invitation.orgId,
        supplierId: invitation.supplierId,
        lotId: dto.lotId || null,
        totalPrice: dto.totalPrice ? dto.totalPrice : null,
        currency: dto.currency || invitation.event.currency,
        notes: dto.notes,
        lineItems: dto.lineItems ? {
          create: dto.lineItems.map((li) => ({
            orgId: invitation.orgId,
            rfxLineItemId: li.rfxLineItemId,
            description: li.description,
            quantity: li.quantity ? li.quantity : null,
            uom: li.uom,
            unitPrice: li.unitPrice ? li.unitPrice : null,
            totalPrice: (li.quantity && li.unitPrice) ? li.quantity * li.unitPrice : null,
            notes: li.notes,
          })),
        } : undefined,
      },
      include: { lineItems: true },
    });

    this.logger.log(`Bid draft created: bidId=${bid.id} eventId=${invitation.eventId}`);
    return bid;
  }

  // ─── Submit Bid ───────────────────────────────────────────────────────────
  async submit(bidId: string, token: string) {
    const bid = await this.getBidByToken(bidId, token);

    if (bid.status !== 'DRAFT') {
      throw new BadRequestException(`Bid is already ${bid.status}`);
    }

    // Verify deadline server-side
    if (bid.event.submissionDeadline && new Date() > bid.event.submissionDeadline) {
      throw new ForbiddenException('Submission deadline has passed');
    }

    const submitted = await this.prisma.bidSubmission.update({
      where: { id: bidId },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
      include: { lineItems: true },
    });

    this.eventEmitter.emit('bid.submitted', {
      bidId,
      eventId: bid.eventId,
      orgId: bid.orgId,
      supplierId: bid.supplierId,
    });

    await this.audit.log({
      orgId: bid.orgId,
      action: 'UPDATE',
      entityType: 'BID_SUBMISSION',
      entityId: bidId,
      oldValue: { status: 'DRAFT' },
      newValue: { status: 'SUBMITTED' },
    });

    await this.analytics.track({
      orgId: bid.orgId,
      eventType: 'BID_SUBMITTED',
      entityType: 'BID_SUBMISSION',
      entityId: bidId,
      properties: { eventId: bid.eventId },
    });

    return submitted;
  }

  // ─── Amend Bid ────────────────────────────────────────────────────────────
  async amend(bidId: string, token: string, dto: UpdateBidDto) {
    const bid = await this.getBidByToken(bidId, token);

    if (!['DRAFT', 'SUBMITTED'].includes(bid.status)) {
      throw new ForbiddenException('Cannot amend a withdrawn or disqualified bid');
    }
    if (bid.event.submissionDeadline && new Date() > bid.event.submissionDeadline) {
      throw new ForbiddenException('Submission deadline has passed');
    }

    // Delete old line items and replace
    if (dto.lineItems !== undefined) {
      await this.prisma.bidLineItem.updateMany({ where: { bidId }, data: { isActive: false } });
    }

    const updated = await this.prisma.bidSubmission.update({
      where: { id: bidId },
      data: {
        totalPrice: dto.totalPrice !== undefined ? dto.totalPrice : bid.totalPrice,
        notes: dto.notes !== undefined ? dto.notes : bid.notes,
        status: 'DRAFT',
        version: { increment: 1 },
        lineItems: dto.lineItems ? {
          create: dto.lineItems.map((li) => ({
            orgId: bid.orgId,
            rfxLineItemId: li.rfxLineItemId,
            description: li.description,
            quantity: li.quantity ? li.quantity : null,
            uom: li.uom,
            unitPrice: li.unitPrice ? li.unitPrice : null,
            totalPrice: (li.quantity && li.unitPrice) ? li.quantity * li.unitPrice : null,
            notes: li.notes,
          })),
        } : undefined,
      },
      include: { lineItems: { where: { isActive: true } } },
    });

    return updated;
  }

  // ─── Withdraw Bid ─────────────────────────────────────────────────────────
  async withdraw(bidId: string, token: string) {
    const bid = await this.getBidByToken(bidId, token);

    if (!['DRAFT', 'SUBMITTED'].includes(bid.status)) {
      throw new ForbiddenException('Cannot withdraw a bid that is not draft or submitted');
    }

    return this.prisma.bidSubmission.update({
      where: { id: bidId },
      data: { status: 'WITHDRAWN', withdrawnAt: new Date() },
    });
  }

  // ─── List Bids (buyer view) ───────────────────────────────────────────────
  async listForEvent(orgId: string, eventId: string) {
    const event = await this.prisma.rfxEvent.findFirst({ where: { id: eventId, orgId } });
    if (!event) throw new NotFoundException('Event not found');

    return this.prisma.bidSubmission.findMany({
      where: { eventId, orgId, isActive: true, status: { not: 'DRAFT' } },
      include: { lineItems: { where: { isActive: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  // ─── Get Bid by Supplier Token ────────────────────────────────────────────
  private async getBidByToken(bidId: string, token: string) {
    const invitation = await this.prisma.supplierInvitation.findUnique({ where: { token } });
    if (!invitation) throw new NotFoundException('Invalid token');

    const bid = await this.prisma.bidSubmission.findFirst({
      where: { id: bidId, invitationId: invitation.id, isActive: true },
      include: {
        lineItems: { where: { isActive: true } },
        event: true,
      },
    });
    if (!bid) throw new NotFoundException('Bid not found');
    return bid;
  }

  // ─── Get Supplier's Bids ──────────────────────────────────────────────────
  async getMyBids(token: string) {
    const invitation = await this.prisma.supplierInvitation.findUnique({
      where: { token },
      include: { event: { select: { id: true, refNumber: true, title: true, type: true, status: true } } },
    });
    if (!invitation) throw new NotFoundException('Invalid token');

    const bids = await this.prisma.bidSubmission.findMany({
      where: { invitationId: invitation.id, isActive: true },
      include: { lineItems: { where: { isActive: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    return { invitation, bids };
  }
}
