import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getKpis(orgId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      activeEvents, liveAuctions, registeredSuppliers,
      totalAwarded, totalEstimated, totalContracts, pendingApprovals,
    ] = await Promise.all([
      this.prisma.rfxEvent.count({ where: { orgId, isActive: true, status: { in: ['PUBLISHED', 'AUCTION_OPEN'] } } }),
      this.prisma.auction.count({ where: { orgId, isActive: true, status: 'OPEN' } }),
      this.prisma.organisation.count({ where: { supplierType: true, isActive: true } }),
      this.prisma.award.aggregate({ where: { orgId, isActive: true, status: 'APPROVED' }, _sum: { totalValue: true } }),
      this.prisma.rfxEvent.aggregate({ where: { orgId, isActive: true }, _sum: { estimatedValue: true } }),
      this.prisma.contract.count({ where: { orgId, isActive: true, status: 'ACTIVE' } }),
      this.prisma.award.count({ where: { orgId, isActive: true, status: 'PENDING_APPROVAL' } }),
    ]);

    const estimatedTotal = Number(totalEstimated._sum.estimatedValue ?? 0);
    const awardedTotal = Number(totalAwarded._sum.totalValue ?? 0);
    const savingsPercent = estimatedTotal > 0
      ? Math.round(((estimatedTotal - awardedTotal) / estimatedTotal) * 1000) / 10
      : 0;

    return {
      activeEvents,
      liveAuctions,
      registeredSuppliers,
      avgSavings: savingsPercent,
      activeContracts: totalContracts,
      pendingApprovals,
    };
  }

  async getRecentActivity(orgId: string, limit = 10) {
    const logs = await this.prisma.auditLog.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        userId: true,
        createdAt: true,
      },
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      userId: log.userId,
      timestamp: log.createdAt.toISOString(),
      description: `${log.action} on ${log.entityType}${log.entityId ? ` (${log.entityId.substring(0, 8)}...)` : ''}`,
    }));
  }

  async getPendingActions(orgId: string, userId: string) {
    const [pendingAwards, expiringContracts, draftEvents, pendingEvaluations] = await Promise.all([
      this.prisma.award.findMany({
        where: { orgId, isActive: true, status: 'PENDING_APPROVAL' },
        select: { id: true, title: true, createdAt: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contract.findMany({
        where: {
          orgId, isActive: true, status: 'ACTIVE',
          endDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        },
        select: { id: true, title: true, endDate: true },
        take: 5,
        orderBy: { endDate: 'asc' },
      }),
      this.prisma.rfxEvent.findMany({
        where: { orgId, isActive: true, status: 'DRAFT', createdById: userId },
        select: { id: true, title: true, refNumber: true, createdAt: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.evaluatorAssignment.findMany({
        where: { orgId, evaluatorId: userId, status: 'PENDING', isActive: true },
        select: { id: true, evaluationId: true, envelope: true },
        take: 5,
      }),
    ]);

    const actions: Array<{ id: string; type: string; title: string; priority: string; link: string }> = [];

    for (const a of pendingAwards) {
      actions.push({ id: a.id, type: 'AWARD_APPROVAL', title: `Approve award: ${a.title}`, priority: 'HIGH', link: `/awards/${a.id}` });
    }
    for (const c of expiringContracts) {
      actions.push({ id: c.id, type: 'CONTRACT_EXPIRING', title: `Contract expiring: ${c.title}`, priority: 'MEDIUM', link: `/contracts/${c.id}` });
    }
    for (const e of draftEvents) {
      actions.push({ id: e.id, type: 'DRAFT_EVENT', title: `Complete draft: ${e.refNumber}`, priority: 'LOW', link: `/events/${e.id}` });
    }
    for (const ev of pendingEvaluations) {
      actions.push({ id: ev.id, type: 'EVALUATION_PENDING', title: `Score evaluation (${ev.envelope})`, priority: 'HIGH', link: `/evaluations/${ev.evaluationId}` });
    }

    return actions.sort((a, b) => {
      const p = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return (p[a.priority as keyof typeof p] ?? 3) - (p[b.priority as keyof typeof p] ?? 3);
    });
  }

  async getLiveAuctions(orgId: string) {
    const auctions = await this.prisma.auction.findMany({
      where: { orgId, isActive: true, status: 'OPEN' },
      select: {
        id: true,
        rfxEventId: true,
        refNumber: true,
        title: true,
        auctionType: true,
        currency: true,
        startAt: true,
        endAt: true,
        actualEndAt: true,
        extensionCount: true,
        bidVisibility: true,
        _count: { select: { bids: true, invitations: true } },
      },
      orderBy: { endAt: 'asc' },
    });

    // For each auction, get the current best bid price
    const results = await Promise.all(
      auctions.map(async (auction) => {
        const bestBid = await this.prisma.auctionBid.findFirst({
          where: { auctionId: auction.id, status: 'ACTIVE' },
          orderBy: { bidPrice: 'asc' },
          select: { bidPrice: true, placedAt: true },
        });

        const endTime = auction.actualEndAt ?? auction.endAt;
        const timeRemaining = endTime ? Math.max(0, new Date(endTime).getTime() - Date.now()) : null;

        return {
          id: auction.id,
          rfxEventId: auction.rfxEventId,
          refNumber: auction.refNumber,
          title: auction.title,
          auctionType: auction.auctionType,
          currency: auction.currency,
          endAt: endTime?.toISOString() ?? null,
          timeRemaining,
          extensionCount: auction.extensionCount,
          totalBids: auction._count.bids,
          totalSuppliers: auction._count.invitations,
          bestPrice: bestBid ? Number(bestBid.bidPrice) : null,
          lastBidAt: bestBid?.placedAt?.toISOString() ?? null,
        };
      }),
    );

    return results;
  }
}
