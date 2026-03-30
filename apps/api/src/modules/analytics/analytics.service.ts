import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService as AnalyticsTracker } from '../../common/services/analytics.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  CreateDashboardDto,
  UpdateDashboardDto,
  DashboardFilterDto,
  DateRangeDto,
} from './dto/analytics.dto';

@Injectable()
export class AnalyticsDashboardService {
  private readonly logger = new Logger(AnalyticsDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsTracker,
  ) {}

  // ── Helper: build date range filter ────────────────────────────────────────

  private buildDateFilter(range?: DateRangeDto): { gte?: Date; lte?: Date } {
    const filter: { gte?: Date; lte?: Date } = {};
    if (range?.startDate) filter.gte = new Date(range.startDate);
    if (range?.endDate) filter.lte = new Date(range.endDate);
    return filter;
  }

  // ── Dashboard CRUD ─────────────────────────────────────────────────────────

  async createDashboard(dto: CreateDashboardDto, user: JwtPayload) {
    const orgId = user.orgId!;
    this.logger.log(`Creating dashboard: orgId=${orgId} userId=${user.sub}`);

    const dashboard = await this.prisma.analyticsDashboard.create({
      data: {
        orgId,
        title: dto.title,
        type: dto.type,
        config: dto.config as Prisma.InputJsonValue | undefined,
        isDefault: dto.isDefault ?? false,
        createdById: user.sub,
      },
    });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'CREATE',
      entityType: 'ANALYTICS_DASHBOARD',
      entityId: dashboard.id,
      newValue: dashboard as unknown as Record<string, unknown>,
    });

    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'DASHBOARD_CREATED',
      entityType: 'ANALYTICS_DASHBOARD',
      entityId: dashboard.id,
    });

    return dashboard;
  }

  async listDashboards(orgId: string, filter: DashboardFilterDto) {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const where: Prisma.AnalyticsDashboardWhereInput = {
      orgId,
      isActive: true,
      ...(filter.type && { type: filter.type }),
    };

    const [data, total] = await Promise.all([
      this.prisma.analyticsDashboard.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.analyticsDashboard.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getDashboard(orgId: string, id: string) {
    const dashboard = await this.prisma.analyticsDashboard.findFirst({
      where: { id, orgId, isActive: true },
    });
    if (!dashboard) throw new NotFoundException(`Dashboard ${id} not found`);
    return dashboard;
  }

  async updateDashboard(id: string, dto: UpdateDashboardDto, user: JwtPayload) {
    const orgId = user.orgId!;
    const existing = await this.getDashboard(orgId, id);

    const updated = await this.prisma.analyticsDashboard.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.config !== undefined && { config: dto.config as Prisma.InputJsonValue }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'UPDATE',
      entityType: 'ANALYTICS_DASHBOARD',
      entityId: id,
      oldValue: existing as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async deleteDashboard(id: string, user: JwtPayload) {
    const orgId = user.orgId!;
    await this.getDashboard(orgId, id);

    await this.prisma.analyticsDashboard.update({
      where: { id },
      data: { isActive: false },
    });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'DELETE',
      entityType: 'ANALYTICS_DASHBOARD',
      entityId: id,
    });

    return { message: 'Dashboard deleted' };
  }

  // ── Spend Analytics ────────────────────────────────────────────────────────

  async getSpendAnalytics(orgId: string, range?: DateRangeDto) {
    this.logger.log(`Fetching spend analytics: orgId=${orgId}`);
    const dateFilter = this.buildDateFilter(range);

    // Aggregate spend by supplier from contracts
    const contractWhere: Prisma.ContractWhereInput = {
      orgId,
      isActive: true,
      status: { in: ['ACTIVE', 'EXPIRED', 'RENEWED'] },
      ...(Object.keys(dateFilter).length > 0 && { startDate: dateFilter }),
    };

    const contracts = await this.prisma.contract.findMany({
      where: contractWhere,
      select: {
        id: true,
        supplierId: true,
        supplierName: true,
        totalValue: true,
        currency: true,
        contractType: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    });

    // Aggregate by supplier
    const bySupplier: Record<string, { supplierName: string; totalSpend: number; contractCount: number }> = {};
    let totalSpend = 0;

    for (const c of contracts) {
      const val = Number(c.totalValue ?? 0);
      totalSpend += val;
      if (!bySupplier[c.supplierId]) {
        bySupplier[c.supplierId] = { supplierName: c.supplierName, totalSpend: 0, contractCount: 0 };
      }
      bySupplier[c.supplierId].totalSpend += val;
      bySupplier[c.supplierId].contractCount += 1;
    }

    // Aggregate by contract type
    const byType: Record<string, { totalSpend: number; count: number }> = {};
    for (const c of contracts) {
      if (!byType[c.contractType]) byType[c.contractType] = { totalSpend: 0, count: 0 };
      byType[c.contractType].totalSpend += Number(c.totalValue ?? 0);
      byType[c.contractType].count += 1;
    }

    // Monthly trend
    const byMonth: Record<string, number> = {};
    for (const c of contracts) {
      const month = c.startDate.toISOString().slice(0, 7);
      byMonth[month] = (byMonth[month] ?? 0) + Number(c.totalValue ?? 0);
    }

    return {
      totalSpend,
      totalContracts: contracts.length,
      bySupplier: Object.entries(bySupplier)
        .map(([supplierId, data]) => ({ supplierId, ...data }))
        .sort((a, b) => b.totalSpend - a.totalSpend),
      byType: Object.entries(byType)
        .map(([type, data]) => ({ type, ...data }))
        .sort((a, b) => b.totalSpend - a.totalSpend),
      byMonth: Object.entries(byMonth)
        .map(([month, totalSpend]) => ({ month, totalSpend }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    };
  }

  // ── Savings Report ─────────────────────────────────────────────────────────

  async getSavingsReport(orgId: string, range?: DateRangeDto) {
    this.logger.log(`Fetching savings report: orgId=${orgId}`);
    const dateFilter = this.buildDateFilter(range);

    // Get events that have been awarded
    const eventWhere: Prisma.RfxEventWhereInput = {
      orgId,
      isActive: true,
      status: 'AWARDED',
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    };

    const events = await this.prisma.rfxEvent.findMany({
      where: eventWhere,
      select: {
        id: true,
        refNumber: true,
        title: true,
        type: true,
        estimatedValue: true,
        createdAt: true,
      },
    });

    // Get awards for these events
    const eventIds = events.map(e => e.id);
    const awards = await this.prisma.award.findMany({
      where: { rfxEventId: { in: eventIds }, isActive: true, status: { in: ['APPROVED', 'NOTIFIED', 'COMPLETED'] } },
      select: { rfxEventId: true, totalValue: true },
    });

    const awardsByEvent: Record<string, number> = {};
    for (const a of awards) {
      if (a.rfxEventId) {
        awardsByEvent[a.rfxEventId] = (awardsByEvent[a.rfxEventId] ?? 0) + Number(a.totalValue ?? 0);
      }
    }

    let totalEstimated = 0;
    let totalAwarded = 0;
    const details: Array<{
      eventId: string;
      refNumber: string;
      title: string;
      type: string;
      estimatedValue: number;
      awardedValue: number;
      savings: number;
      savingsPercent: number;
    }> = [];

    for (const e of events) {
      const estimated = Number(e.estimatedValue ?? 0);
      const awarded = awardsByEvent[e.id] ?? 0;
      const savings = estimated - awarded;
      const savingsPercent = estimated > 0 ? (savings / estimated) * 100 : 0;

      totalEstimated += estimated;
      totalAwarded += awarded;

      details.push({
        eventId: e.id,
        refNumber: e.refNumber,
        title: e.title,
        type: e.type,
        estimatedValue: estimated,
        awardedValue: awarded,
        savings,
        savingsPercent: Math.round(savingsPercent * 100) / 100,
      });
    }

    const totalSavings = totalEstimated - totalAwarded;
    const totalSavingsPercent = totalEstimated > 0 ? (totalSavings / totalEstimated) * 100 : 0;

    return {
      totalEstimated,
      totalAwarded,
      totalSavings,
      totalSavingsPercent: Math.round(totalSavingsPercent * 100) / 100,
      eventCount: events.length,
      details: details.sort((a, b) => b.savings - a.savings),
    };
  }

  // ── Event Activity Metrics ─────────────────────────────────────────────────

  async getEventActivityMetrics(orgId: string, range?: DateRangeDto) {
    this.logger.log(`Fetching event activity: orgId=${orgId}`);
    const dateFilter = this.buildDateFilter(range);

    const where: Prisma.RfxEventWhereInput = {
      orgId,
      isActive: true,
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    };

    const events = await this.prisma.rfxEvent.findMany({
      where,
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        publishedAt: true,
        closedAt: true,
      },
    });

    // By status
    const byStatus: Record<string, number> = {};
    for (const e of events) {
      byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
    }

    // By type
    const byType: Record<string, number> = {};
    for (const e of events) {
      byType[e.type] = (byType[e.type] ?? 0) + 1;
    }

    // Average cycle time (published to closed)
    const cycleTimes: number[] = [];
    for (const e of events) {
      if (e.publishedAt && e.closedAt) {
        const days = (e.closedAt.getTime() - e.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
        cycleTimes.push(days);
      }
    }
    const avgCycleTimeDays = cycleTimes.length > 0
      ? Math.round((cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length) * 10) / 10
      : 0;

    // Monthly trend
    const byMonth: Record<string, number> = {};
    for (const e of events) {
      const month = e.createdAt.toISOString().slice(0, 7);
      byMonth[month] = (byMonth[month] ?? 0) + 1;
    }

    return {
      totalEvents: events.length,
      avgCycleTimeDays,
      byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
      byMonth: Object.entries(byMonth)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    };
  }

  // ── Auction Performance ────────────────────────────────────────────────────

  async getAuctionPerformance(orgId: string, range?: DateRangeDto) {
    this.logger.log(`Fetching auction performance: orgId=${orgId}`);
    const dateFilter = this.buildDateFilter(range);

    const where: Prisma.AuctionWhereInput = {
      orgId,
      isActive: true,
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    };

    const auctions = await this.prisma.auction.findMany({
      where,
      select: {
        id: true,
        auctionType: true,
        status: true,
        reservePrice: true,
        startingPrice: true,
        extensionCount: true,
        createdAt: true,
        closedAt: true,
        _count: { select: { bids: true, invitations: true } },
      },
    });

    const totalAuctions = auctions.length;
    let totalBids = 0;
    let totalExtensions = 0;
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const a of auctions) {
      totalBids += a._count.bids;
      totalExtensions += a.extensionCount;
      byType[a.auctionType] = (byType[a.auctionType] ?? 0) + 1;
      byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    }

    const avgBidsPerAuction = totalAuctions > 0
      ? Math.round((totalBids / totalAuctions) * 10) / 10
      : 0;

    // Savings: compare starting price to best bid for closed auctions
    const closedAuctions = auctions.filter(a => a.status === 'CLOSED' || a.status === 'AWARDED');
    let totalStartingValue = 0;
    let totalBestBidValue = 0;
    let auctionsWithSavings = 0;

    for (const a of closedAuctions) {
      if (a.startingPrice) {
        const bestBid = await this.prisma.auctionBid.findFirst({
          where: { auctionId: a.id, status: 'ACTIVE', isActive: true },
          orderBy: { bidPrice: 'asc' },
          select: { bidPrice: true },
        });
        if (bestBid) {
          totalStartingValue += Number(a.startingPrice);
          totalBestBidValue += Number(bestBid.bidPrice);
          auctionsWithSavings++;
        }
      }
    }

    const avgSavingsPercent = totalStartingValue > 0
      ? Math.round(((totalStartingValue - totalBestBidValue) / totalStartingValue) * 10000) / 100
      : 0;

    return {
      totalAuctions,
      totalBids,
      avgBidsPerAuction,
      totalExtensions,
      avgSavingsPercent,
      byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
      byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
    };
  }

  // ── Supplier Metrics ───────────────────────────────────────────────────────

  async getSupplierMetrics(orgId: string) {
    this.logger.log(`Fetching supplier metrics: orgId=${orgId}`);

    // Count active suppliers (orgs with supplierType=true that have invitations to this org's events)
    const supplierInvitations = await this.prisma.supplierInvitation.findMany({
      where: { orgId, isActive: true },
      select: { supplierId: true, status: true },
      distinct: ['supplierId'],
    });
    const totalInvitedSuppliers = supplierInvitations.length;

    // Supplier qualification stats
    const qualifications = await this.prisma.supplierQualification.findMany({
      where: { orgId, isActive: true },
      select: { status: true, score: true },
    });

    const qualByStatus: Record<string, number> = {};
    const scores: number[] = [];
    for (const q of qualifications) {
      qualByStatus[q.status] = (qualByStatus[q.status] ?? 0) + 1;
      if (q.score !== null) scores.push(Number(q.score));
    }
    const avgQualificationScore = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;

    // Scorecard stats
    const scorecards = await this.prisma.supplierScorecard.findMany({
      where: { orgId, isActive: true },
      select: { overallScore: true, riskLevel: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const avgOverallScore = scorecards.length > 0
      ? Math.round((scorecards.reduce((a, b) => a + Number(b.overallScore), 0) / scorecards.length) * 10) / 10
      : 0;

    const riskDistribution: Record<string, number> = {};
    for (const s of scorecards) {
      riskDistribution[s.riskLevel] = (riskDistribution[s.riskLevel] ?? 0) + 1;
    }

    return {
      totalInvitedSuppliers,
      totalQualifications: qualifications.length,
      avgQualificationScore,
      qualificationsByStatus: Object.entries(qualByStatus).map(([status, count]) => ({ status, count })),
      avgOverallScore,
      scorecardCount: scorecards.length,
      riskDistribution: Object.entries(riskDistribution).map(([level, count]) => ({ level, count })),
    };
  }

  // ── Dashboard Widgets (Homepage KPIs) ──────────────────────────────────────

  async getDashboardWidgets(orgId: string) {
    this.logger.log(`Fetching dashboard widgets: orgId=${orgId}`);

    const [
      totalEvents,
      activeEvents,
      totalContracts,
      activeContracts,
      totalAuctions,
      openAuctions,
      totalBids,
      totalAwards,
    ] = await Promise.all([
      this.prisma.rfxEvent.count({ where: { orgId, isActive: true } }),
      this.prisma.rfxEvent.count({ where: { orgId, isActive: true, status: { in: ['PUBLISHED', 'AUCTION_OPEN'] } } }),
      this.prisma.contract.count({ where: { orgId, isActive: true } }),
      this.prisma.contract.count({ where: { orgId, isActive: true, status: 'ACTIVE' } }),
      this.prisma.auction.count({ where: { orgId, isActive: true } }),
      this.prisma.auction.count({ where: { orgId, isActive: true, status: 'OPEN' } }),
      this.prisma.bidSubmission.count({ where: { orgId, isActive: true, status: 'SUBMITTED' } }),
      this.prisma.award.count({ where: { orgId, isActive: true, status: { in: ['APPROVED', 'NOTIFIED', 'COMPLETED'] } } }),
    ]);

    return {
      events: { total: totalEvents, active: activeEvents },
      contracts: { total: totalContracts, active: activeContracts },
      auctions: { total: totalAuctions, open: openAuctions },
      bidsReceived: totalBids,
      awardsCompleted: totalAwards,
    };
  }
}
