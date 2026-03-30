import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { RedisService } from '../../common/redis/redis.service';
import { PlaceBidDto, BidHistoryFilterDto, SetProxyBidDto } from './dto/auction-bid.dto';
import { AuctionBidPlacedEvent, AuctionExtendedEvent } from '../../common/events/domain-events';

@Injectable()
export class AuctionBidsService {
  private readonly logger = new Logger(AuctionBidsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
    private readonly redis: RedisService,
  ) {}

  // ── Place Bid ───────────────────────────────────────────────────────────────

  async placeBid(dto: PlaceBidDto) {
    // 1. Verify invitation
    const invitation = await this.prisma.auctionInvitation.findUnique({
      where: { token: dto.invitationToken },
      include: { auction: true },
    });

    if (!invitation || !invitation.isActive) {
      throw new NotFoundException('Invalid or expired invitation token');
    }

    if (invitation.status === 'REVOKED' || invitation.status === 'DECLINED') {
      throw new ForbiddenException('This invitation has been revoked or declined');
    }

    const auction = invitation.auction;
    const orgId = auction.orgId;
    const supplierId = invitation.supplierId;

    // 2. Auction must be OPEN
    if (auction.status !== 'OPEN') {
      throw new ForbiddenException(`Auction is not open for bidding (status: ${auction.status})`);
    }

    // 3. Server-time check — no bids after close
    const endTime = auction.actualEndAt ?? auction.endAt;
    if (endTime && new Date() > new Date(endTime)) {
      throw new ForbiddenException('Auction has closed');
    }

    // 4. Bid must improve (lower than supplier's previous best)
    const previousBest = await this.prisma.auctionBid.findFirst({
      where: {
        auctionId: auction.id,
        supplierId,
        lotId: dto.lotId ?? null,
        status: 'ACTIVE',
      },
      orderBy: { bidPrice: 'asc' },
    });

    if (previousBest && dto.bidPrice >= Number(previousBest.bidPrice)) {
      throw new BadRequestException('Bid must be lower than your previous bid');
    }

    // 5. Decrement rules
    if (previousBest && auction.decrementMin) {
      const diff = Number(previousBest.bidPrice) - dto.bidPrice;
      if (diff < Number(auction.decrementMin)) {
        throw new BadRequestException(
          `Bid decrease must be at least ${auction.decrementMin} (you decreased by ${diff.toFixed(2)})`,
        );
      }
    }
    if (previousBest && auction.decrementMax) {
      const diff = Number(previousBest.bidPrice) - dto.bidPrice;
      if (diff > Number(auction.decrementMax)) {
        throw new BadRequestException(
          `Bid decrease cannot exceed ${auction.decrementMax} (you decreased by ${diff.toFixed(2)})`,
        );
      }
    }

    // 6. Reserve price check for sealed auctions
    if (auction.bidVisibility === 'SEALED' && auction.reservePrice && dto.bidPrice < Number(auction.reservePrice)) {
      throw new BadRequestException('Bid does not meet reserve price');
    }

    // 7. Compute bid number (sequential per supplier per auction)
    const bidCount = await this.prisma.auctionBid.count({
      where: { auctionId: auction.id, supplierId },
    });

    // 8. Create bid
    const bid = await this.prisma.auctionBid.create({
      data: {
        auctionId: auction.id,
        lotId: dto.lotId,
        invitationId: invitation.id,
        orgId,
        supplierId,
        bidPrice: dto.bidPrice,
        currency: auction.currency,
        bidNumber: bidCount + 1,
      },
    });

    this.logger.log(`Bid placed: auction=${auction.refNumber} supplier=${supplierId} price=${dto.bidPrice}`);

    // 9. Update invitation status to ACCEPTED if first bid
    if (invitation.status === 'PENDING') {
      await this.prisma.auctionInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      });
    }

    // 10. Recompute rankings
    const rank = await this.recomputeRankings(auction.id, dto.lotId ?? null);
    const myRank = rank.find((r) => r.supplierId === supplierId)?.rank ?? null;

    // Update bid with computed rank
    await this.prisma.auctionBid.update({
      where: { id: bid.id },
      data: { rank: myRank },
    });

    // 11. Auto-extension check
    if (endTime) {
      const timeToClose = new Date(endTime).getTime() - Date.now();
      const triggerMs = auction.extensionTriggerMinutes * 60 * 1000;

      if (timeToClose > 0 && timeToClose < triggerMs) {
        const canExtend = auction.maxExtensions === null || auction.extensionCount < auction.maxExtensions;
        if (canExtend) {
          await this.extendAuction(auction.id, orgId, auction.extensionMinutes, auction.extensionCount, endTime, bid.id);
        }
      }
    }

    // 12. Invalidate Redis cache
    await this.redis.del(`auction:live:${auction.id}`);

    // 13. Domain event + audit + analytics
    this.eventEmitter.emit(
      'auction.bid.placed',
      new AuctionBidPlacedEvent(bid.id, auction.id, orgId, supplierId, dto.bidPrice, myRank),
    );

    await this.audit.log({
      orgId, userId: supplierId, action: 'CREATE',
      entityType: 'AUCTION_BID', entityId: bid.id,
      newValue: { auctionId: auction.id, bidPrice: dto.bidPrice, rank: myRank },
    });

    await this.analytics.track({
      orgId, userId: supplierId,
      eventType: 'AUCTION_BID_PLACED', entityType: 'AUCTION_BID', entityId: bid.id,
      properties: { auctionId: auction.id, bidPrice: dto.bidPrice, rank: myRank, bidNumber: bidCount + 1 },
    });

    // 14. Trigger proxy bids from other suppliers (async, fire-and-forget)
    this.triggerProxyBids(auction.id, supplierId).catch((err) => {
      this.logger.warn(`Proxy bid trigger error: ${err}`);
    });

    return { ...bid, rank: myRank };
  }

  // ── Recompute Rankings ──────────────────────────────────────────────────────

  private async recomputeRankings(auctionId: string, lotId: string | null) {
    const whereClause: Record<string, unknown> = { auctionId, status: 'ACTIVE' };
    if (lotId) whereClause.lotId = lotId;

    const bids = await this.prisma.auctionBid.findMany({
      where: whereClause as any,
      orderBy: { bidPrice: 'asc' },
    });

    // Best per supplier
    const bestPerSupplier = new Map<string, typeof bids[0]>();
    for (const bid of bids) {
      if (!bestPerSupplier.has(bid.supplierId)) {
        bestPerSupplier.set(bid.supplierId, bid);
      }
    }

    const ranked = Array.from(bestPerSupplier.values())
      .sort((a, b) => Number(a.bidPrice) - Number(b.bidPrice));

    return ranked.map((bid, idx) => ({
      supplierId: bid.supplierId,
      rank: idx + 1,
      bidId: bid.id,
    }));
  }

  // ── Auto-Extension ──────────────────────────────────────────────────────────

  private async extendAuction(
    auctionId: string,
    orgId: string,
    extensionMinutes: number,
    currentExtensionCount: number,
    currentEndAt: Date,
    triggeringBidId: string,
  ) {
    const previousEndAt = new Date(currentEndAt);
    const newEndAt = new Date(previousEndAt.getTime() + extensionMinutes * 60 * 1000);
    const extensionNumber = currentExtensionCount + 1;

    await this.prisma.auction.update({
      where: { id: auctionId },
      data: { actualEndAt: newEndAt, extensionCount: extensionNumber },
    });

    await this.prisma.auctionExtension.create({
      data: {
        auctionId,
        orgId,
        triggeredByBidId: triggeringBidId,
        previousEndAt,
        newEndAt,
        extensionNumber,
      },
    });

    this.logger.log(`Auction ${auctionId} extended: #${extensionNumber} → ${newEndAt.toISOString()}`);

    this.eventEmitter.emit(
      'auction.extended',
      new AuctionExtendedEvent(auctionId, orgId, extensionNumber, previousEndAt, newEndAt, triggeringBidId),
    );

    await this.analytics.track({
      orgId, eventType: 'AUCTION_EXTENDED', entityType: 'AUCTION', entityId: auctionId,
      properties: { extensionNumber, previousEndAt, newEndAt },
    });
  }

  // ── Bid History (buyer — authenticated, scoped by orgId) ──────────────────

  async getBidHistory(orgId: string, auctionId: string, filter: BidHistoryFilterDto) {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;

    const where: Record<string, unknown> = { auctionId, orgId, status: 'ACTIVE' };
    if (filter.supplierId) where.supplierId = filter.supplierId;

    const [data, total] = await Promise.all([
      this.prisma.auctionBid.findMany({
        where: where as any,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { placedAt: 'desc' },
      }),
      this.prisma.auctionBid.count({ where: where as any }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // ── Bid History (supplier — token-scoped to own bids only) ──────────────

  async getSupplierBidHistory(invitationToken: string, filter: BidHistoryFilterDto) {
    const invitation = await this.prisma.auctionInvitation.findUnique({
      where: { token: invitationToken },
    });
    if (!invitation || !invitation.isActive) {
      throw new NotFoundException('Invalid invitation token');
    }

    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;

    // Scoped to this supplier's own bids only
    const where = {
      auctionId: invitation.auctionId,
      supplierId: invitation.supplierId,
      status: 'ACTIVE' as const,
    };

    const [data, total] = await Promise.all([
      this.prisma.auctionBid.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { placedAt: 'desc' },
      }),
      this.prisma.auctionBid.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // ── Supplier Live View ──────────────────────────────────────────────────────

  async getSupplierLiveState(invitationToken: string) {
    const invitation = await this.prisma.auctionInvitation.findUnique({
      where: { token: invitationToken },
      include: { auction: true },
    });

    if (!invitation || !invitation.isActive) {
      throw new NotFoundException('Invalid invitation token');
    }

    const auction = invitation.auction;
    const endTime = auction.actualEndAt ?? auction.endAt;

    // Get supplier's own bids
    const myBids = await this.prisma.auctionBid.findMany({
      where: { auctionId: auction.id, supplierId: invitation.supplierId, status: 'ACTIVE' },
      orderBy: { placedAt: 'desc' },
      take: 20,
    });

    const myBestBid = myBids.length > 0
      ? myBids.reduce((best, bid) => Number(bid.bidPrice) < Number(best.bidPrice) ? bid : best)
      : null;

    // Get total bids count and my rank
    const totalBids = await this.prisma.auctionBid.count({
      where: { auctionId: auction.id, status: 'ACTIVE' },
    });

    // Compute rank
    const allBest = await this.prisma.auctionBid.findMany({
      where: { auctionId: auction.id, status: 'ACTIVE' },
      orderBy: { bidPrice: 'asc' },
      distinct: ['supplierId'],
    });

    const myRank = myBestBid
      ? allBest.findIndex((b) => b.supplierId === invitation.supplierId) + 1
      : null;

    return {
      auctionId: auction.id,
      title: auction.title,
      refNumber: auction.refNumber,
      status: auction.status,
      currency: auction.currency,
      auctionType: auction.auctionType,
      bidVisibility: auction.bidVisibility,
      endAt: endTime,
      timeRemaining: endTime ? Math.max(0, new Date(endTime).getTime() - Date.now()) : null,
      totalBids,
      totalParticipants: allBest.length,
      extensionCount: auction.extensionCount,
      myRank,
      myBestPrice: myBestBid?.bidPrice ?? null,
      myBidCount: myBids.length,
      myBids: myBids.slice(0, 10), // Last 10 bids
    };
  }

  // ── Proxy Bidding ───────────────────────────────────────────────────────────

  async setProxyBid(dto: { minPrice: number; decrementStep: number; invitationToken: string }) {
    const invitation = await this.prisma.auctionInvitation.findUnique({
      where: { token: dto.invitationToken },
      include: { auction: true },
    });
    if (!invitation || !invitation.isActive) {
      throw new NotFoundException('Invalid invitation token');
    }

    const auction = invitation.auction;
    if (auction.status !== 'OPEN') {
      throw new ForbiddenException('Auction is not open');
    }

    if (dto.minPrice <= 0) {
      throw new BadRequestException('Minimum price must be positive');
    }

    const proxy = await this.prisma.proxyBid.upsert({
      where: { auctionId_supplierId: { auctionId: auction.id, supplierId: invitation.supplierId } },
      update: { minPrice: dto.minPrice, decrementStep: dto.decrementStep, isActive: true },
      create: {
        auctionId: auction.id,
        invitationId: invitation.id,
        orgId: auction.orgId,
        supplierId: invitation.supplierId,
        minPrice: dto.minPrice,
        decrementStep: dto.decrementStep,
      },
    });

    this.logger.log(`Proxy bid set: auction=${auction.refNumber} supplier=${invitation.supplierId} min=${dto.minPrice} step=${dto.decrementStep}`);

    await this.audit.log({
      orgId: auction.orgId, userId: invitation.supplierId, action: 'CREATE',
      entityType: 'PROXY_BID', entityId: proxy.id,
      newValue: { minPrice: dto.minPrice, decrementStep: dto.decrementStep },
    });

    return proxy;
  }

  async cancelProxyBid(invitationToken: string) {
    const invitation = await this.prisma.auctionInvitation.findUnique({
      where: { token: invitationToken },
    });
    if (!invitation) throw new NotFoundException('Invalid invitation token');

    const proxy = await this.prisma.proxyBid.findUnique({
      where: { auctionId_supplierId: { auctionId: invitation.auctionId, supplierId: invitation.supplierId } },
    });
    if (!proxy) throw new NotFoundException('No proxy bid found');

    await this.prisma.proxyBid.update({
      where: { id: proxy.id },
      data: { isActive: false },
    });

    return { cancelled: true };
  }

  async getProxyBid(invitationToken: string) {
    const invitation = await this.prisma.auctionInvitation.findUnique({
      where: { token: invitationToken },
    });
    if (!invitation) throw new NotFoundException('Invalid invitation token');

    return this.prisma.proxyBid.findUnique({
      where: { auctionId_supplierId: { auctionId: invitation.auctionId, supplierId: invitation.supplierId } },
    });
  }

  // ── Trigger Proxy Bids (called after each bid is placed) ────────────────────

  async triggerProxyBids(auctionId: string, excludeSupplierId: string) {
    const activeProxies = await this.prisma.proxyBid.findMany({
      where: { auctionId, isActive: true, supplierId: { not: excludeSupplierId } },
      include: { invitation: true },
    });

    for (const proxy of activeProxies) {
      try {
        // Get current best bid for this supplier
        const myBest = await this.prisma.auctionBid.findFirst({
          where: { auctionId, supplierId: proxy.supplierId, status: 'ACTIVE' },
          orderBy: { bidPrice: 'asc' },
        });

        // Get overall best bid
        const overallBest = await this.prisma.auctionBid.findFirst({
          where: { auctionId, status: 'ACTIVE' },
          orderBy: { bidPrice: 'asc' },
        });

        if (!overallBest) continue;

        // Only trigger if this supplier is NOT currently winning
        if (myBest && Number(myBest.bidPrice) <= Number(overallBest.bidPrice)) continue;

        // Calculate new bid: overall best - decrement step
        const newPrice = Number(overallBest.bidPrice) - Number(proxy.decrementStep);

        // Don't bid below minimum price
        if (newPrice < Number(proxy.minPrice)) continue;

        // Place the auto-bid
        await this.placeBid({
          bidPrice: newPrice,
          invitationToken: proxy.invitation.token,
        });

        // Update proxy stats
        await this.prisma.proxyBid.update({
          where: { id: proxy.id },
          data: { lastTriggeredAt: new Date(), totalBidsPlaced: { increment: 1 } },
        });

        this.logger.log(`Proxy bid triggered: auction=${auctionId} supplier=${proxy.supplierId} price=${newPrice}`);
      } catch (err) {
        this.logger.warn(`Proxy bid failed for supplier ${proxy.supplierId}: ${err}`);
      }
    }
  }
}
