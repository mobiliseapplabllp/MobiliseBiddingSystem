import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { RedisService } from '../../common/redis/redis.service';
import { CreateAuctionDto, UpdateAuctionDto, AuctionFilterDto, InviteSupplierDto } from './dto/auction.dto';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  AuctionCreatedEvent,
  AuctionPublishedEvent,
  AuctionOpenedEvent,
  AuctionClosedEvent,
  AuctionInvitationSentEvent,
} from '../../common/events/domain-events';

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PUBLISHED'],
  PUBLISHED: ['OPEN'],
  OPEN: ['CLOSED'],
  CLOSED: ['EVALUATED'],
  EVALUATED: ['AWARDED'],
  AWARDED: [],
};

@Injectable()
export class AuctionsService {
  private readonly logger = new Logger(AuctionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
    private readonly redis: RedisService,
  ) {}

  // ── Create ──────────────────────────────────────────────────────────────────

  async create(dto: CreateAuctionDto, user: JwtPayload) {
    const orgId = user.orgId!;
    this.logger.log(`Creating auction: orgId=${orgId} userId=${user.sub}`);

    // Generate sequential ref number
    const count = await this.prisma.auction.count({ where: { orgId } });
    const year = new Date().getFullYear();
    const refNumber = `AUC-${year}-${String(count + 1).padStart(3, '0')}`;

    // Auto-populate from linked RFx event's auctionConfig if available
    let rfxRules: Record<string, unknown> = {};
    if (dto.rfxEventId) {
      const rfx = await this.prisma.rfxEvent.findFirst({
        where: { id: dto.rfxEventId, orgId },
        select: { auctionConfig: true },
      });
      if (rfx?.auctionConfig && typeof rfx.auctionConfig === 'object') {
        rfxRules = rfx.auctionConfig as Record<string, unknown>;
        this.logger.log(`Auto-populating auction rules from RFx ${dto.rfxEventId}`);
      }
    }

    const auction = await this.prisma.auction.create({
      data: {
        orgId,
        buId: dto.buId,
        rfxEventId: dto.rfxEventId,
        refNumber,
        title: dto.title,
        description: dto.description,
        auctionType: dto.auctionType ?? (rfxRules.auctionType as string) ?? 'ENGLISH',
        currency: dto.currency ?? (rfxRules.currency as string) ?? 'USD',
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        reservePrice: dto.reservePrice ?? (rfxRules.reservePrice as number) ?? undefined,
        startingPrice: dto.startingPrice ?? (rfxRules.startingPrice as number) ?? undefined,
        decrementMin: dto.decrementMin ?? (rfxRules.decrementMin as number) ?? undefined,
        decrementMax: dto.decrementMax ?? (rfxRules.decrementMax as number) ?? undefined,
        extensionMinutes: dto.extensionMinutes ?? (rfxRules.extensionMinutes as number) ?? 5,
        extensionTriggerMinutes: dto.extensionTriggerMinutes ?? (rfxRules.extensionTriggerMinutes as number) ?? 5,
        maxExtensions: dto.maxExtensions ?? (rfxRules.maxExtensions as number) ?? undefined,
        bidVisibility: dto.bidVisibility ?? (rfxRules.bidVisibility as string) ?? 'RANK_ONLY',
        allowTiedBids: dto.allowTiedBids ?? (rfxRules.allowTiedBids as boolean) ?? false,
        createdById: user.sub,
        lots: dto.lots?.length
          ? {
              create: dto.lots.map((lot, lotIdx) => ({
                orgId,
                lotNumber: lotIdx + 1,
                title: lot.title,
                description: lot.description,
                currency: lot.currency,
                reservePrice: lot.reservePrice,
                startingPrice: lot.startingPrice,
                decrementMin: lot.decrementMin,
                lineItems: lot.lineItems?.length
                  ? {
                      create: lot.lineItems.map((li, liIdx) => ({
                        orgId,
                        itemNumber: liIdx + 1,
                        description: li.description,
                        quantity: li.quantity,
                        uom: li.uom,
                        targetPrice: li.targetPrice,
                        notes: li.notes,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
      },
      include: { lots: { include: { lineItems: true } } },
    });

    this.eventEmitter.emit('auction.created', new AuctionCreatedEvent(auction.id, orgId, user.sub, refNumber, dto.title));

    await this.audit.log({
      orgId, userId: user.sub, action: 'CREATE',
      entityType: 'AUCTION', entityId: auction.id,
      newValue: { refNumber, title: dto.title, auctionType: dto.auctionType },
    });

    await this.analytics.track({
      orgId, userId: user.sub,
      eventType: 'AUCTION_CREATED', entityType: 'AUCTION', entityId: auction.id,
      properties: { auctionType: dto.auctionType, lotsCount: dto.lots?.length ?? 0 },
    });

    return auction;
  }

  // ── List ────────────────────────────────────────────────────────────────────

  async findAll(orgId: string, filter: AuctionFilterDto) {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;

    const where: Record<string, unknown> = { orgId, isActive: true };
    if (filter.status) where.status = filter.status;
    if (filter.auctionType) where.auctionType = filter.auctionType;
    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { refNumber: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.auction.findMany({
        where: where as any,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { bids: true, invitations: true, lots: true } },
        },
      }),
      this.prisma.auction.count({ where: where as any }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // ── Detail ──────────────────────────────────────────────────────────────────

  async findOne(orgId: string, auctionId: string) {
    const auction = await this.prisma.auction.findFirst({
      where: { id: auctionId, orgId, isActive: true },
      include: {
        lots: { include: { lineItems: true }, orderBy: { lotNumber: 'asc' } },
        invitations: { orderBy: { createdAt: 'desc' } },
        _count: { select: { bids: true, extensions: true } },
      },
    });
    if (!auction) throw new NotFoundException(`Auction ${auctionId} not found`);
    return auction;
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  async update(orgId: string, auctionId: string, dto: UpdateAuctionDto, user: JwtPayload) {
    const auction = await this.findOne(orgId, auctionId);
    if (auction.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT auctions can be updated');
    }

    const oldValue = { title: auction.title, auctionType: auction.auctionType };

    const updated = await this.prisma.auction.update({
      where: { id: auctionId },
      data: {
        ...dto,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      },
      include: { lots: { include: { lineItems: true } } },
    });

    await this.audit.log({
      orgId, userId: user.sub, action: 'UPDATE',
      entityType: 'AUCTION', entityId: auctionId,
      oldValue, newValue: { title: updated.title, auctionType: updated.auctionType },
    });

    return updated;
  }

  // ── State Machine ───────────────────────────────────────────────────────────

  async changeStatus(orgId: string, auctionId: string, newStatus: string, user: JwtPayload) {
    const auction = await this.findOne(orgId, auctionId);
    const allowed = VALID_TRANSITIONS[auction.status] || [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid state transition: ${auction.status} → ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'PUBLISHED') updateData.publishedAt = new Date();
    if (newStatus === 'OPEN') updateData.openedAt = new Date();
    if (newStatus === 'CLOSED') {
      updateData.closedAt = new Date();
      updateData.actualEndAt = new Date();
    }

    const updated = await this.prisma.auction.update({
      where: { id: auctionId },
      data: updateData,
    });

    // Emit domain events
    if (newStatus === 'PUBLISHED') {
      this.eventEmitter.emit('auction.published', new AuctionPublishedEvent(auctionId, orgId, user.sub, auction.startAt));
    } else if (newStatus === 'OPEN') {
      this.eventEmitter.emit('auction.opened', new AuctionOpenedEvent(auctionId, orgId, auction.endAt));
    } else if (newStatus === 'CLOSED') {
      const bidCount = await this.prisma.auctionBid.count({ where: { auctionId, status: 'ACTIVE' } });
      this.eventEmitter.emit('auction.closed', new AuctionClosedEvent(auctionId, orgId, bidCount));
    }

    await this.audit.log({
      orgId, userId: user.sub, action: 'STATUS_CHANGE',
      entityType: 'AUCTION', entityId: auctionId,
      oldValue: { status: auction.status }, newValue: { status: newStatus },
    });

    await this.analytics.track({
      orgId, userId: user.sub,
      eventType: `AUCTION_${newStatus}`, entityType: 'AUCTION', entityId: auctionId,
    });

    return updated;
  }

  // ── Soft Delete ─────────────────────────────────────────────────────────────

  async remove(orgId: string, auctionId: string, user: JwtPayload) {
    const auction = await this.findOne(orgId, auctionId);
    if (auction.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT auctions can be deleted');
    }

    await this.prisma.auction.update({ where: { id: auctionId }, data: { isActive: false } });

    await this.audit.log({
      orgId, userId: user.sub, action: 'DELETE',
      entityType: 'AUCTION', entityId: auctionId,
      oldValue: { refNumber: auction.refNumber, title: auction.title },
    });
  }

  // ── Invite Supplier ─────────────────────────────────────────────────────────

  async inviteSupplier(orgId: string, auctionId: string, dto: InviteSupplierDto, user: JwtPayload) {
    await this.findOne(orgId, auctionId); // ensure auction exists

    // Prevent duplicate invitations to same supplier
    const existing = await this.prisma.auctionInvitation.findFirst({
      where: { auctionId, orgId, supplierId: dto.supplierId, isActive: true },
    });
    if (existing) {
      throw new BadRequestException(`Supplier ${dto.supplierName} has already been invited to this auction`);
    }

    const invitation = await this.prisma.auctionInvitation.create({
      data: {
        auctionId,
        orgId,
        supplierId: dto.supplierId,
        supplierEmail: dto.supplierEmail,
        supplierName: dto.supplierName,
        sentAt: new Date(),
      },
    });

    this.eventEmitter.emit(
      'auction.invitation.sent',
      new AuctionInvitationSentEvent(invitation.id, auctionId, orgId, dto.supplierEmail, dto.supplierName, invitation.token),
    );

    await this.audit.log({
      orgId, userId: user.sub, action: 'CREATE',
      entityType: 'AUCTION_INVITATION', entityId: invitation.id,
      newValue: { auctionId, supplierEmail: dto.supplierEmail },
    });

    return invitation;
  }

  // ── Get Invitations ─────────────────────────────────────────────────────────

  async getInvitations(orgId: string, auctionId: string) {
    await this.findOne(orgId, auctionId);
    return this.prisma.auctionInvitation.findMany({
      where: { auctionId, orgId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Live State (polling) ────────────────────────────────────────────────────

  async getLiveState(orgId: string, auctionId: string) {
    // Try Redis cache first
    const cacheKey = `auction:live:${auctionId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const auction = await this.findOne(orgId, auctionId);
    const endTime = auction.actualEndAt ?? auction.endAt;
    const timeRemaining = endTime ? Math.max(0, new Date(endTime).getTime() - Date.now()) : null;

    const totalBids = await this.prisma.auctionBid.count({
      where: { auctionId, status: 'ACTIVE' },
    });

    const uniqueSuppliers = await this.prisma.auctionBid.groupBy({
      by: ['supplierId'],
      where: { auctionId, status: 'ACTIVE' },
    });

    // Best price (lowest active bid)
    const bestBid = await this.prisma.auctionBid.findFirst({
      where: { auctionId, status: 'ACTIVE' },
      orderBy: { bidPrice: 'asc' },
    });

    const result = {
      auctionId: auction.id,
      status: auction.status,
      title: auction.title,
      refNumber: auction.refNumber,
      auctionType: auction.auctionType,
      currency: auction.currency,
      endAt: endTime,
      timeRemaining,
      totalBids,
      participatingSuppliers: uniqueSuppliers.length,
      bestPrice: bestBid?.bidPrice ?? null,
      extensionCount: auction.extensionCount,
      bidVisibility: auction.bidVisibility,
    };

    // Cache for 2 seconds
    await this.redis.set(cacheKey, JSON.stringify(result), 2);

    return result;
  }

  // ── Ranking ─────────────────────────────────────────────────────────────────

  async getRanking(orgId: string, auctionId: string) {
    await this.findOne(orgId, auctionId);

    // Get best bid per supplier (lowest price)
    const bids = await this.prisma.auctionBid.findMany({
      where: { auctionId, status: 'ACTIVE' },
      orderBy: { bidPrice: 'asc' },
    });

    // Group by supplier, keep best (lowest) per supplier
    const bestPerSupplier = new Map<string, typeof bids[0]>();
    for (const bid of bids) {
      if (!bestPerSupplier.has(bid.supplierId)) {
        bestPerSupplier.set(bid.supplierId, bid);
      }
    }

    // Sort and rank
    const ranked = Array.from(bestPerSupplier.values())
      .sort((a, b) => Number(a.bidPrice) - Number(b.bidPrice))
      .map((bid, idx) => ({
        rank: idx + 1,
        supplierId: bid.supplierId,
        bestPrice: bid.bidPrice,
        bidCount: bids.filter((b) => b.supplierId === bid.supplierId).length,
        lastBidAt: bids
          .filter((b) => b.supplierId === bid.supplierId)
          .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime())[0]?.placedAt,
      }));

    return ranked;
  }
}
