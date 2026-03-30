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
import { AnalyticsService } from '../../common/services/analytics.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  CreateReportDto,
  UpdateReportDto,
  ReportFilterDto,
  ReportTypeEnum,
} from './dto/report.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(dto: CreateReportDto, user: JwtPayload) {
    const orgId = user.orgId!;
    this.logger.log(`Creating report: orgId=${orgId} userId=${user.sub} type=${dto.reportType}`);

    const report = await this.prisma.report.create({
      data: {
        orgId,
        title: dto.title,
        reportType: dto.reportType,
        parameters: dto.parameters as Prisma.InputJsonValue | undefined,
        format: dto.format ?? 'JSON',
        scheduleConfig: dto.scheduleConfig as Prisma.InputJsonValue | undefined,
        status: dto.scheduleConfig ? 'SCHEDULED' : 'DRAFT',
        createdById: user.sub,
      },
    });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'CREATE',
      entityType: 'REPORT',
      entityId: report.id,
      newValue: report as unknown as Record<string, unknown>,
    });

    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'REPORT_CREATED',
      entityType: 'REPORT',
      entityId: report.id,
      properties: { reportType: dto.reportType },
    });

    return report;
  }

  // ── List ───────────────────────────────────────────────────────────────────

  async findAll(orgId: string, filter: ReportFilterDto) {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;

    const where: Prisma.ReportWhereInput = {
      orgId,
      isActive: true,
      ...(filter.reportType && { reportType: filter.reportType }),
      ...(filter.status && { status: filter.status }),
    };

    const [data, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // ── Get Single ─────────────────────────────────────────────────────────────

  async findOne(orgId: string, id: string) {
    const report = await this.prisma.report.findFirst({
      where: { id, orgId, isActive: true },
    });
    if (!report) throw new NotFoundException(`Report ${id} not found`);
    return report;
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateReportDto, user: JwtPayload) {
    const orgId = user.orgId!;
    const existing = await this.findOne(orgId, id);

    const updated = await this.prisma.report.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.reportType !== undefined && { reportType: dto.reportType }),
        ...(dto.parameters !== undefined && { parameters: dto.parameters as Prisma.InputJsonValue }),
        ...(dto.format !== undefined && { format: dto.format }),
        ...(dto.scheduleConfig !== undefined && { scheduleConfig: dto.scheduleConfig as Prisma.InputJsonValue }),
      },
    });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'UPDATE',
      entityType: 'REPORT',
      entityId: id,
      oldValue: existing as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  // ── Delete (soft) ──────────────────────────────────────────────────────────

  async remove(id: string, user: JwtPayload) {
    const orgId = user.orgId!;
    await this.findOne(orgId, id);

    await this.prisma.report.update({
      where: { id },
      data: { isActive: false },
    });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'DELETE',
      entityType: 'REPORT',
      entityId: id,
    });

    return { message: 'Report deleted' };
  }

  // ── Generate Report ────────────────────────────────────────────────────────

  async generate(id: string, user: JwtPayload) {
    const orgId = user.orgId!;
    const report = await this.findOne(orgId, id);
    this.logger.log(`Generating report: id=${id} type=${report.reportType} orgId=${orgId}`);

    const params = (report.parameters as Record<string, unknown>) ?? {};
    let generatedData: Record<string, unknown>;

    switch (report.reportType) {
      case ReportTypeEnum.EVENT_SUMMARY:
        generatedData = await this.generateEventSummary(orgId, params);
        break;
      case ReportTypeEnum.BID_COMPARISON:
        generatedData = await this.generateBidComparison(orgId, params);
        break;
      case ReportTypeEnum.EVALUATION_REPORT:
        generatedData = await this.generateEvaluationReport(orgId, params);
        break;
      case ReportTypeEnum.AWARD_SUMMARY:
        generatedData = await this.generateAwardSummary(orgId, params);
        break;
      case ReportTypeEnum.CONTRACT_STATUS:
        generatedData = await this.generateContractStatus(orgId, params);
        break;
      case ReportTypeEnum.SUPPLIER_REPORT:
        generatedData = await this.generateSupplierReport(orgId, params);
        break;
      case ReportTypeEnum.SPEND_REPORT:
        generatedData = await this.generateSpendReport(orgId, params);
        break;
      default:
        throw new BadRequestException(`Unsupported report type: ${report.reportType}`);
    }

    const updated = await this.prisma.report.update({
      where: { id },
      data: {
        generatedData: generatedData as Prisma.InputJsonValue,
        status: 'GENERATED',
        generatedAt: new Date(),
      },
    });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'UPDATE',
      entityType: 'REPORT',
      entityId: id,
      newValue: { status: 'GENERATED', generatedAt: updated.generatedAt },
    });

    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'REPORT_GENERATED',
      entityType: 'REPORT',
      entityId: id,
      properties: { reportType: report.reportType },
    });

    return updated;
  }

  // ── Export CSV ──────────────────────────────────────────────────────────────

  async exportCsv(id: string, user: JwtPayload): Promise<string> {
    const orgId = user.orgId!;
    const report = await this.findOne(orgId, id);

    if (!report.generatedData) {
      throw new BadRequestException('Report must be generated before export. Call POST /reports/:id/generate first.');
    }

    const data = report.generatedData as Record<string, unknown>;
    const rows = (data.rows as Array<Record<string, unknown>>) ?? [];

    if (rows.length === 0) return '';

    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => {
          const val = row[h];
          const str = val === null || val === undefined ? '' : String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(','),
      ),
    ];

    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'REPORT_EXPORTED',
      entityType: 'REPORT',
      entityId: id,
      properties: { format: 'CSV' },
    });

    return csvLines.join('\n');
  }

  // ── Scheduled Reports ──────────────────────────────────────────────────────

  async getScheduledReports(orgId: string) {
    return this.prisma.report.findMany({
      where: { orgId, isActive: true, status: 'SCHEDULED' },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Report Generators ──────────────────────────────────────────────────────

  private async generateEventSummary(orgId: string, params: Record<string, unknown>) {
    const dateFilter = this.buildDateFilter(params);

    const events = await this.prisma.rfxEvent.findMany({
      where: {
        orgId,
        isActive: true,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      select: {
        id: true,
        refNumber: true,
        title: true,
        type: true,
        status: true,
        currency: true,
        estimatedValue: true,
        createdAt: true,
        publishedAt: true,
        closedAt: true,
        _count: { select: { bids: true, invitations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = events.map(e => ({
      refNumber: e.refNumber,
      title: e.title,
      type: e.type,
      status: e.status,
      currency: e.currency,
      estimatedValue: Number(e.estimatedValue ?? 0),
      bidsReceived: e._count.bids,
      suppliersInvited: e._count.invitations,
      createdAt: e.createdAt.toISOString(),
      publishedAt: e.publishedAt?.toISOString() ?? '',
      closedAt: e.closedAt?.toISOString() ?? '',
    }));

    return { reportType: 'EVENT_SUMMARY', generatedAt: new Date().toISOString(), totalEvents: events.length, rows };
  }

  private async generateBidComparison(orgId: string, params: Record<string, unknown>) {
    const eventId = params.eventId as string | undefined;
    const where: Prisma.BidSubmissionWhereInput = {
      orgId,
      isActive: true,
      status: 'SUBMITTED',
      ...(eventId && { eventId }),
    };

    const bids = await this.prisma.bidSubmission.findMany({
      where,
      select: {
        id: true,
        eventId: true,
        supplierId: true,
        totalPrice: true,
        currency: true,
        submittedAt: true,
        version: true,
        shortlisted: true,
        event: { select: { refNumber: true, title: true } },
        lineItems: {
          where: { isActive: true },
          select: { description: true, unitPrice: true, totalPrice: true, quantity: true },
        },
      },
      orderBy: { totalPrice: 'asc' },
    });

    const rows = bids.map(b => ({
      bidId: b.id,
      eventRefNumber: b.event.refNumber,
      eventTitle: b.event.title,
      supplierId: b.supplierId,
      totalPrice: Number(b.totalPrice ?? 0),
      currency: b.currency,
      lineItemCount: b.lineItems.length,
      submittedAt: b.submittedAt?.toISOString() ?? '',
      version: b.version,
      shortlisted: b.shortlisted,
    }));

    return { reportType: 'BID_COMPARISON', generatedAt: new Date().toISOString(), totalBids: bids.length, rows };
  }

  private async generateEvaluationReport(orgId: string, params: Record<string, unknown>) {
    const evaluationId = params.evaluationId as string | undefined;
    const where: Prisma.EvaluationWhereInput = {
      orgId,
      isActive: true,
      ...(evaluationId && { id: evaluationId }),
    };

    const evaluations = await this.prisma.evaluation.findMany({
      where,
      select: {
        id: true,
        title: true,
        envelopeType: true,
        status: true,
        technicalWeight: true,
        commercialWeight: true,
        rfxEvent: { select: { refNumber: true, title: true } },
        _count: { select: { criteria: true, assignments: true, scores: true } },
      },
    });

    const rows = evaluations.map(e => ({
      evaluationId: e.id,
      title: e.title,
      eventRefNumber: e.rfxEvent.refNumber,
      eventTitle: e.rfxEvent.title,
      envelopeType: e.envelopeType,
      status: e.status,
      technicalWeight: Number(e.technicalWeight ?? 0),
      commercialWeight: Number(e.commercialWeight ?? 0),
      criteriaCount: e._count.criteria,
      evaluatorCount: e._count.assignments,
      totalScores: e._count.scores,
    }));

    return { reportType: 'EVALUATION_REPORT', generatedAt: new Date().toISOString(), totalEvaluations: evaluations.length, rows };
  }

  private async generateAwardSummary(orgId: string, params: Record<string, unknown>) {
    const dateFilter = this.buildDateFilter(params);

    const awards = await this.prisma.award.findMany({
      where: {
        orgId,
        isActive: true,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      select: {
        id: true,
        title: true,
        awardMode: true,
        status: true,
        totalValue: true,
        currency: true,
        approvedAt: true,
        createdAt: true,
        rfxEvent: { select: { refNumber: true, title: true } },
        items: {
          where: { isActive: true },
          select: { supplierName: true, awardedValue: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = awards.map(a => ({
      awardId: a.id,
      title: a.title,
      eventRefNumber: a.rfxEvent.refNumber,
      eventTitle: a.rfxEvent.title,
      awardMode: a.awardMode,
      status: a.status,
      totalValue: Number(a.totalValue ?? 0),
      currency: a.currency,
      supplierCount: a.items.length,
      approvedAt: a.approvedAt?.toISOString() ?? '',
      createdAt: a.createdAt.toISOString(),
    }));

    return { reportType: 'AWARD_SUMMARY', generatedAt: new Date().toISOString(), totalAwards: awards.length, rows };
  }

  private async generateContractStatus(orgId: string, params: Record<string, unknown>) {
    const statusFilter = params.status as string | undefined;

    const contracts = await this.prisma.contract.findMany({
      where: {
        orgId,
        isActive: true,
        ...(statusFilter && { status: statusFilter }),
      },
      select: {
        id: true,
        contractNumber: true,
        title: true,
        contractType: true,
        status: true,
        supplierName: true,
        totalValue: true,
        currency: true,
        startDate: true,
        endDate: true,
        createdAt: true,
      },
      orderBy: { endDate: 'asc' },
    });

    const rows = contracts.map(c => ({
      contractNumber: c.contractNumber,
      title: c.title,
      contractType: c.contractType,
      status: c.status,
      supplierName: c.supplierName,
      totalValue: Number(c.totalValue ?? 0),
      currency: c.currency,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate.toISOString(),
      daysUntilExpiry: Math.ceil((c.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    }));

    return { reportType: 'CONTRACT_STATUS', generatedAt: new Date().toISOString(), totalContracts: contracts.length, rows };
  }

  private async generateSupplierReport(orgId: string, _params: Record<string, unknown>) {
    const scorecards = await this.prisma.supplierScorecard.findMany({
      where: { orgId, isActive: true },
      select: {
        supplierId: true,
        period: true,
        overallScore: true,
        qualityScore: true,
        deliveryScore: true,
        priceScore: true,
        complianceScore: true,
        riskLevel: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const qualifications = await this.prisma.supplierQualification.findMany({
      where: { orgId, isActive: true },
      select: { supplierId: true, status: true, score: true },
    });

    const qualBySupplier: Record<string, { status: string; score: number }> = {};
    for (const q of qualifications) {
      qualBySupplier[q.supplierId] = { status: q.status, score: Number(q.score ?? 0) };
    }

    const rows = scorecards.map(s => ({
      supplierId: s.supplierId,
      period: s.period,
      overallScore: Number(s.overallScore),
      qualityScore: Number(s.qualityScore),
      deliveryScore: Number(s.deliveryScore),
      priceScore: Number(s.priceScore),
      complianceScore: Number(s.complianceScore),
      riskLevel: s.riskLevel,
      qualificationStatus: qualBySupplier[s.supplierId]?.status ?? 'N/A',
      qualificationScore: qualBySupplier[s.supplierId]?.score ?? 0,
    }));

    return { reportType: 'SUPPLIER_REPORT', generatedAt: new Date().toISOString(), totalEntries: rows.length, rows };
  }

  private async generateSpendReport(orgId: string, params: Record<string, unknown>) {
    const dateFilter = this.buildDateFilter(params);

    const contracts = await this.prisma.contract.findMany({
      where: {
        orgId,
        isActive: true,
        status: { in: ['ACTIVE', 'EXPIRED', 'RENEWED'] },
        ...(Object.keys(dateFilter).length > 0 && { startDate: dateFilter }),
      },
      select: {
        contractNumber: true,
        title: true,
        contractType: true,
        supplierName: true,
        totalValue: true,
        currency: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { totalValue: 'desc' },
    });

    const rows = contracts.map(c => ({
      contractNumber: c.contractNumber,
      title: c.title,
      contractType: c.contractType,
      supplierName: c.supplierName,
      totalValue: Number(c.totalValue ?? 0),
      currency: c.currency,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate.toISOString(),
    }));

    const totalSpend = rows.reduce((sum, r) => sum + r.totalValue, 0);

    return { reportType: 'SPEND_REPORT', generatedAt: new Date().toISOString(), totalSpend, totalContracts: rows.length, rows };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private buildDateFilter(params: Record<string, unknown>): { gte?: Date; lte?: Date } {
    const filter: { gte?: Date; lte?: Date } = {};
    if (params.startDate) filter.gte = new Date(params.startDate as string);
    if (params.endDate) filter.lte = new Date(params.endDate as string);
    return filter;
  }
}
