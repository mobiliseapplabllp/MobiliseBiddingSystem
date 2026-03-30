import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { CreateRfxEventDto, CreateLotDto, CreateLineItemDto, UpdateRfxEventDto, RfxFilterDto } from './dto/rfx.dto';

// RFx valid state transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['AUCTION_OPEN', 'CLOSED', 'CANCELLED'], // Can open auction OR close directly
  AUCTION_OPEN: ['CLOSED', 'CANCELLED'],               // Auction running → close
  CLOSED: ['IN_EVALUATION', 'AWARDED', 'CANCELLED'],
  IN_EVALUATION: ['AWARDED', 'CANCELLED'],
  AWARDED: [],
  CANCELLED: [],
};

@Injectable()
export class RfxService {
  private readonly logger = new Logger(RfxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
  ) {}

  // ─── Ref Number Generation ────────────────────────────────────────────────
  private async generateRefNumber(orgId: string, type: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.rfxEvent.count({
      where: { orgId, type, createdAt: { gte: new Date(`${year}-01-01`) } },
    });
    return `${type}-${year}-${String(count + 1).padStart(3, '0')}`;
  }

  // ─── Create Event ─────────────────────────────────────────────────────────
  async create(dto: CreateRfxEventDto, user: JwtPayload) {
    const orgId = user.orgId!;
    const refNumber = await this.generateRefNumber(orgId, dto.type);

    this.logger.log(`Creating RFx event: orgId=${orgId} userId=${user.sub} type=${dto.type}`);

    const event = await this.prisma.rfxEvent.create({
      data: {
        orgId,
        buId: dto.buId || null,
        refNumber,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        currency: dto.currency || 'USD',
        submissionDeadline: dto.submissionDeadline ? new Date(dto.submissionDeadline) : null,
        clarificationDeadline: dto.clarificationDeadline ? new Date(dto.clarificationDeadline) : null,
        estimatedValue: dto.estimatedValue ? dto.estimatedValue : null,
        internalRef: dto.internalRef,
        auctionConfig: dto.auctionConfig ? (dto.auctionConfig as any) : undefined,
        hasAuctionPhase: ['REVERSE_AUCTION', 'DUTCH_AUCTION', 'JAPANESE_AUCTION'].includes(dto.type),
        createdById: user.sub,
        lots: dto.lots ? {
          create: dto.lots.map((lot, lotIdx) => ({
            orgId,
            lotNumber: lotIdx + 1,
            title: lot.title,
            description: lot.description,
            currency: lot.currency,
            estimatedValue: lot.estimatedValue ? lot.estimatedValue : null,
            lineItems: lot.lineItems ? {
              create: lot.lineItems.map((item, itemIdx) => ({
                orgId,
                itemNumber: itemIdx + 1,
                description: item.description,
                quantity: item.quantity ? item.quantity : null,
                uom: item.uom,
                targetPrice: item.targetPrice ? item.targetPrice : null,
                notes: item.notes,
              })),
            } : undefined,
          })),
        } : undefined,
      },
      include: { lots: { include: { lineItems: true } } },
    });

    this.eventEmitter.emit('rfx.created', { eventId: event.id, orgId, userId: user.sub });

    await this.audit.log({
      orgId,
      buId: dto.buId,
      userId: user.sub,
      action: 'CREATE',
      entityType: 'RFX_EVENT',
      entityId: event.id,
      newValue: { refNumber, title: event.title, type: event.type },
    });

    await this.analytics.track({
      orgId,
      buId: dto.buId,
      userId: user.sub,
      eventType: 'RFX_CREATED',
      entityType: 'RFX_EVENT',
      entityId: event.id,
      properties: { type: event.type, refNumber },
    });

    return event;
  }

  // ─── List Events ──────────────────────────────────────────────────────────
  async findAll(orgId: string, filter: RfxFilterDto) {
    const page = filter.page || 1;
    const pageSize = Math.min(filter.pageSize || 20, 100);
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { orgId, isActive: true };
    if (filter.status) where['status'] = filter.status;
    if (filter.type) where['type'] = filter.type;
    if (filter.search) {
      where['OR'] = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { refNumber: { contains: filter.search, mode: 'insensitive' } },
        { internalRef: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.rfxEvent.findMany({
        where,
        include: { lots: { select: { id: true, title: true, lotNumber: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.rfxEvent.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  // ─── Get Event Detail ─────────────────────────────────────────────────────
  async findOne(orgId: string, eventId: string) {
    const event = await this.prisma.rfxEvent.findFirst({
      where: { id: eventId, orgId, isActive: true },
      include: { lots: { include: { lineItems: { where: { isActive: true } } }, where: { isActive: true }, orderBy: { lotNumber: 'asc' } } },
    });
    if (!event) throw new NotFoundException(`RFx event ${eventId} not found`);
    return event;
  }

  // ─── Update Event ─────────────────────────────────────────────────────────
  async update(orgId: string, eventId: string, dto: UpdateRfxEventDto, user: JwtPayload) {
    const event = await this.findOne(orgId, eventId);

    if (!['DRAFT'].includes(event.status)) {
      throw new ForbiddenException('Only DRAFT events can be edited');
    }

    const oldValue = { title: event.title, description: event.description };
    const updated = await this.prisma.rfxEvent.update({
      where: { id: eventId },
      data: {
        title: dto.title ?? event.title,
        description: dto.description ?? event.description,
        currency: dto.currency ?? event.currency,
        submissionDeadline: dto.submissionDeadline ? new Date(dto.submissionDeadline) : event.submissionDeadline,
        clarificationDeadline: dto.clarificationDeadline ? new Date(dto.clarificationDeadline) : event.clarificationDeadline,
        estimatedValue: dto.estimatedValue !== undefined ? dto.estimatedValue : event.estimatedValue,
        internalRef: dto.internalRef ?? event.internalRef,
      },
      include: { lots: { include: { lineItems: true } } },
    });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'UPDATE',
      entityType: 'RFX_EVENT',
      entityId: eventId,
      oldValue,
      newValue: { title: updated.title },
    });

    return updated;
  }

  // ─── Change Status ────────────────────────────────────────────────────────
  async changeStatus(orgId: string, eventId: string, newStatus: string, user: JwtPayload) {
    const event = await this.findOne(orgId, eventId);
    const allowed = VALID_TRANSITIONS[event.status] || [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid state transition: ${event.status} → ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'PUBLISHED') updateData['publishedAt'] = new Date();
    if (newStatus === 'CLOSED') updateData['closedAt'] = new Date();

    const updated = await this.prisma.rfxEvent.update({
      where: { id: eventId },
      data: updateData,
    });

    this.eventEmitter.emit(`rfx.${newStatus.toLowerCase()}`, { eventId, orgId, userId: user.sub });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'UPDATE',
      entityType: 'RFX_EVENT',
      entityId: eventId,
      oldValue: { status: event.status },
      newValue: { status: newStatus },
    });

    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: `RFX_${newStatus}`,
      entityType: 'RFX_EVENT',
      entityId: eventId,
      properties: { refNumber: event.refNumber },
    });

    return updated;
  }

  // ─── Soft Delete ──────────────────────────────────────────────────────────
  async remove(orgId: string, eventId: string, user: JwtPayload) {
    const event = await this.findOne(orgId, eventId);
    if (event.status !== 'DRAFT') {
      throw new ForbiddenException('Only DRAFT events can be deleted');
    }

    await this.prisma.rfxEvent.update({ where: { id: eventId }, data: { isActive: false } });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'DELETE',
      entityType: 'RFX_EVENT',
      entityId: eventId,
      oldValue: { title: event.title },
    });
  }

  // ─── Lot Management ───────────────────────────────────────────────────────
  async addLot(orgId: string, eventId: string, dto: CreateLotDto, user: JwtPayload) {
    const event = await this.findOne(orgId, eventId);
    if (event.status !== 'DRAFT') throw new ForbiddenException('Cannot add lots to a non-DRAFT event');

    const count = await this.prisma.rfxLot.count({ where: { eventId } });
    const lot = await this.prisma.rfxLot.create({
      data: {
        eventId,
        orgId,
        lotNumber: count + 1,
        title: dto.title,
        description: dto.description,
        currency: dto.currency,
        estimatedValue: dto.estimatedValue ? dto.estimatedValue : null,
        lineItems: dto.lineItems ? {
          create: dto.lineItems.map((item, idx) => ({
            orgId,
            itemNumber: idx + 1,
            description: item.description,
            quantity: item.quantity ? item.quantity : null,
            uom: item.uom,
            targetPrice: item.targetPrice ? item.targetPrice : null,
            notes: item.notes,
          })),
        } : undefined,
      },
      include: { lineItems: true },
    });

    await this.audit.log({ orgId, userId: user.sub, action: 'CREATE', entityType: 'RFX_LOT', entityId: lot.id, newValue: { title: lot.title } });
    return lot;
  }

  async addLineItem(orgId: string, lotId: string, dto: CreateLineItemDto, user: JwtPayload) {
    const lot = await this.prisma.rfxLot.findFirst({ where: { id: lotId, orgId } });
    if (!lot) throw new NotFoundException(`Lot ${lotId} not found`);

    const count = await this.prisma.rfxLineItem.count({ where: { lotId } });
    const item = await this.prisma.rfxLineItem.create({
      data: {
        lotId,
        orgId,
        itemNumber: count + 1,
        description: dto.description,
        quantity: dto.quantity ? dto.quantity : null,
        uom: dto.uom,
        targetPrice: dto.targetPrice ? dto.targetPrice : null,
        notes: dto.notes,
      },
    });

    await this.audit.log({ orgId, userId: user.sub, action: 'CREATE', entityType: 'RFX_LINE_ITEM', entityId: item.id, newValue: { description: item.description } });
    return item;
  }

  // ─── Upcoming Deadlines ────────────────────────────────────────────────────
  async upcomingDeadlines(orgId: string) {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return this.prisma.rfxEvent.findMany({
      where: {
        orgId,
        isActive: true,
        status: 'PUBLISHED',
        submissionDeadline: { gte: now, lte: in30Days },
      },
      select: {
        id: true,
        refNumber: true,
        title: true,
        type: true,
        submissionDeadline: true,
        _count: { select: { invitations: true, bids: true } },
      },
      orderBy: { submissionDeadline: 'asc' },
    });
  }

  // ── Auction Phase Management ────────────────────────────────────────────────

  async openAuctionPhase(orgId: string, eventId: string, user: JwtPayload) {
    const event = await this.findOne(orgId, eventId);

    if (!event.auctionConfig) {
      throw new BadRequestException('No auction rules configured for this event. Add auctionConfig first.');
    }
    if (event.status !== 'PUBLISHED') {
      throw new BadRequestException('Event must be PUBLISHED to open auction phase');
    }

    const config = event.auctionConfig as Record<string, unknown>;
    const now = new Date();
    const durationMinutes = (config.durationMinutes as number) ?? 120;
    const endAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

    // Create the Auction phase record
    const count = await this.prisma.auction.count({ where: { orgId } });
    const refNumber = `AUC-${now.getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const auction = await this.prisma.auction.create({
      data: {
        orgId,
        buId: event.buId,
        rfxEventId: eventId,
        refNumber,
        title: event.title,
        description: event.description,
        auctionType: (config.auctionType as string) ?? 'ENGLISH',
        status: 'OPEN',
        currency: event.currency ?? 'USD',
        startAt: now,
        endAt,
        reservePrice: config.reservePrice as number ?? undefined,
        startingPrice: config.startingPrice as number ?? undefined,
        decrementMin: config.decrementMin as number ?? undefined,
        decrementMax: config.decrementMax as number ?? undefined,
        extensionMinutes: (config.extensionMinutes as number) ?? 5,
        extensionTriggerMinutes: (config.extensionTriggerMinutes as number) ?? 5,
        maxExtensions: config.maxExtensions as number ?? undefined,
        bidVisibility: (config.bidVisibility as string) ?? 'RANK_ONLY',
        allowTiedBids: (config.allowTiedBids as boolean) ?? false,
        createdById: user.sub,
        publishedAt: now,
        openedAt: now,
      },
    });

    // Auto-create AuctionInvitations from accepted SupplierInvitations
    const acceptedInvites = await this.prisma.supplierInvitation.findMany({
      where: { eventId, orgId, status: 'ACCEPTED', isActive: true },
    });

    for (const inv of acceptedInvites) {
      await this.prisma.auctionInvitation.create({
        data: {
          auctionId: auction.id,
          orgId,
          supplierId: inv.supplierId,
          supplierEmail: inv.supplierEmail,
          supplierName: inv.supplierName,
          status: 'ACCEPTED',
          sentAt: now,
          respondedAt: now,
        },
      });
    }

    // Update RfxEvent status
    await this.prisma.rfxEvent.update({
      where: { id: eventId },
      data: {
        status: 'AUCTION_OPEN',
        hasAuctionPhase: true,
        auctionStatus: 'OPEN',
        auctionStartAt: now,
        auctionEndAt: endAt,
      },
    });

    this.logger.log(`Auction phase opened for event ${event.refNumber}: ${auction.refNumber} (${acceptedInvites.length} suppliers)`);

    await this.audit.log({
      orgId, userId: user.sub, action: 'AUCTION_PHASE_OPENED',
      entityType: 'RFX_EVENT', entityId: eventId,
      newValue: { auctionId: auction.id, refNumber: auction.refNumber, suppliers: acceptedInvites.length },
    });

    return { event: eventId, auction, suppliersInvited: acceptedInvites.length };
  }

  async closeAuctionPhase(orgId: string, eventId: string, user: JwtPayload) {
    const event = await this.findOne(orgId, eventId);

    if (event.status !== 'AUCTION_OPEN') {
      throw new BadRequestException('Event is not in auction phase');
    }

    // Find the active auction for this event
    const auction = await this.prisma.auction.findFirst({
      where: { rfxEventId: eventId, orgId, status: 'OPEN', isActive: true },
    });

    if (auction) {
      await this.prisma.auction.update({
        where: { id: auction.id },
        data: { status: 'CLOSED', closedAt: new Date() },
      });
    }

    await this.prisma.rfxEvent.update({
      where: { id: eventId },
      data: { status: 'CLOSED', auctionStatus: 'CLOSED', closedAt: new Date() },
    });

    this.logger.log(`Auction phase closed for event ${event.refNumber}`);

    await this.audit.log({
      orgId, userId: user.sub, action: 'AUCTION_PHASE_CLOSED',
      entityType: 'RFX_EVENT', entityId: eventId,
    });

    return { eventId, status: 'CLOSED' };
  }

  async getAuctionForEvent(orgId: string, eventId: string) {
    return this.prisma.auction.findFirst({
      where: { rfxEventId: eventId, orgId, isActive: true },
      include: {
        _count: { select: { bids: true, invitations: true } },
        invitations: { orderBy: { createdAt: 'desc' } },
      },
    });
  }
}
