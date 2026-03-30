import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { AuditService as CoreAuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { AuditLogFilterDto, ComplianceReportFilterDto } from './dto/audit.dto';
import {
  AuditExportRequestedEvent,
  DataPurgeExecutedEvent,
} from '../../common/events/domain-events';

@Injectable()
export class AuditQueryService {
  private readonly logger = new Logger(AuditQueryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: CoreAuditService,
    private readonly analytics: AnalyticsService,
  ) {}

  // ── Query Audit Logs ─────────────────────────────────────────────────────

  async queryAuditLogs(orgId: string, filter: AuditLogFilterDto) {
    const page = filter.page ?? 1;
    const pageSize = Math.min(filter.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const where: Prisma.AuditLogWhereInput = {
      orgId,
      ...(filter.entityType ? { entityType: filter.entityType } : {}),
      ...(filter.entityId ? { entityId: filter.entityId } : {}),
      ...(filter.userId ? { userId: filter.userId } : {}),
      ...(filter.action ? { action: filter.action } : {}),
      ...(filter.dateFrom || filter.dateTo
        ? {
            createdAt: {
              ...(filter.dateFrom ? { gte: new Date(filter.dateFrom) } : {}),
              ...(filter.dateTo ? { lte: new Date(filter.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // ── Entity Timeline ──────────────────────────────────────────────────────

  async getEntityTimeline(orgId: string, entityType: string, entityId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { orgId, entityType, entityId },
      orderBy: { createdAt: 'asc' },
    });

    if (logs.length === 0) {
      throw new NotFoundException(`No audit trail found for ${entityType}/${entityId}`);
    }

    return {
      entityType,
      entityId,
      totalEvents: logs.length,
      firstEvent: logs[0]?.createdAt,
      lastEvent: logs[logs.length - 1]?.createdAt,
      timeline: logs,
    };
  }

  // ── Compliance Report ────────────────────────────────────────────────────

  async getComplianceReport(orgId: string, filter: ComplianceReportFilterDto) {
    const dateFilter: Prisma.AuditLogWhereInput = {
      orgId,
      ...(filter.dateFrom || filter.dateTo
        ? {
            createdAt: {
              ...(filter.dateFrom ? { gte: new Date(filter.dateFrom) } : {}),
              ...(filter.dateTo ? { lte: new Date(filter.dateTo) } : {}),
            },
          }
        : {}),
    };

    // Aggregate counts by action type
    const [
      totalLogs,
      createCount,
      updateCount,
      deleteCount,
      loginCount,
      entityTypes,
      userActivity,
    ] = await Promise.all([
      this.prisma.auditLog.count({ where: dateFilter }),
      this.prisma.auditLog.count({ where: { ...dateFilter, action: 'CREATE' } }),
      this.prisma.auditLog.count({ where: { ...dateFilter, action: 'UPDATE' } }),
      this.prisma.auditLog.count({ where: { ...dateFilter, action: 'DELETE' } }),
      this.prisma.auditLog.count({ where: { ...dateFilter, action: 'LOGIN' } }),
      this.prisma.auditLog.groupBy({
        by: ['entityType'],
        where: dateFilter,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { ...dateFilter, userId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
    ]);

    // Anomaly detection: users with unusually high activity
    const avgActionsPerUser =
      userActivity.length > 0
        ? userActivity.reduce((sum, u) => sum + u._count.id, 0) / userActivity.length
        : 0;
    const anomalyThreshold = avgActionsPerUser * 3;
    const flaggedUsers = userActivity.filter((u) => u._count.id > anomalyThreshold);

    return {
      summary: {
        totalLogs,
        actionBreakdown: {
          CREATE: createCount,
          UPDATE: updateCount,
          DELETE: deleteCount,
          LOGIN: loginCount,
          OTHER: totalLogs - createCount - updateCount - deleteCount - loginCount,
        },
        entityTypeBreakdown: entityTypes.map((e) => ({
          entityType: e.entityType,
          count: e._count.id,
        })),
        topActiveUsers: userActivity.map((u) => ({
          userId: u.userId,
          actionCount: u._count.id,
        })),
      },
      anomalies: {
        highActivityUsers: flaggedUsers.map((u) => ({
          userId: u.userId,
          actionCount: u._count.id,
          threshold: Math.round(anomalyThreshold),
        })),
      },
      dateRange: {
        from: filter.dateFrom ?? null,
        to: filter.dateTo ?? null,
      },
    };
  }

  // ── CSV Export ────────────────────────────────────────────────────────────

  async exportAuditLogCsv(orgId: string, filter: AuditLogFilterDto, user: JwtPayload) {
    const where: Prisma.AuditLogWhereInput = {
      orgId,
      ...(filter.entityType ? { entityType: filter.entityType } : {}),
      ...(filter.entityId ? { entityId: filter.entityId } : {}),
      ...(filter.userId ? { userId: filter.userId } : {}),
      ...(filter.action ? { action: filter.action } : {}),
      ...(filter.dateFrom || filter.dateTo
        ? {
            createdAt: {
              ...(filter.dateFrom ? { gte: new Date(filter.dateFrom) } : {}),
              ...(filter.dateTo ? { lte: new Date(filter.dateTo) } : {}),
            },
          }
        : {}),
    };

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000, // Hard limit for CSV export
    });

    // Build CSV
    const headers = [
      'id',
      'orgId',
      'userId',
      'action',
      'entityType',
      'entityId',
      'ipAddress',
      'createdAt',
    ];
    const rows = logs.map((log) =>
      [
        log.id,
        log.orgId ?? '',
        log.userId ?? '',
        log.action,
        log.entityType,
        log.entityId ?? '',
        log.ipAddress ?? '',
        log.createdAt.toISOString(),
      ].join(','),
    );
    const csv = [headers.join(','), ...rows].join('\n');

    this.eventEmitter.emit(
      'audit.export-requested',
      new AuditExportRequestedEvent(orgId, user.sub, filter as Record<string, unknown>),
    );

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'EXPORT',
      entityType: 'AUDIT_LOG',
      newValue: { rowCount: logs.length, filters: filter },
    });

    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'AUDIT_LOG_EXPORTED',
      entityType: 'AUDIT_LOG',
      properties: { rowCount: logs.length },
    });

    this.logger.log(`Audit log exported: ${logs.length} rows orgId=${orgId} userId=${user.sub}`);

    return { csv, rowCount: logs.length };
  }

  // ── Data Retention ───────────────────────────────────────────────────────

  async getDataRetentionStatus(orgId: string) {
    const org = await this.prisma.organisation.findFirst({
      where: { id: orgId },
      select: { retentionYears: true },
    });

    if (!org) {
      throw new NotFoundException('Organisation not found');
    }

    const retentionCutoff = new Date();
    retentionCutoff.setFullYear(retentionCutoff.getFullYear() - org.retentionYears);

    const [expiredAuditLogs, expiredAnalytics, totalAuditLogs, totalAnalytics] =
      await Promise.all([
        this.prisma.auditLog.count({
          where: { orgId, createdAt: { lt: retentionCutoff } },
        }),
        this.prisma.analyticsEvent.count({
          where: { orgId, occurredAt: { lt: retentionCutoff } },
        }),
        this.prisma.auditLog.count({ where: { orgId } }),
        this.prisma.analyticsEvent.count({ where: { orgId } }),
      ]);

    return {
      retentionYears: org.retentionYears,
      retentionCutoffDate: retentionCutoff.toISOString(),
      auditLogs: { total: totalAuditLogs, expired: expiredAuditLogs },
      analyticsEvents: { total: totalAnalytics, expired: expiredAnalytics },
      totalExpired: expiredAuditLogs + expiredAnalytics,
    };
  }

  // ── Purge Expired Data ───────────────────────────────────────────────────

  async purgeExpiredData(orgId: string, user: JwtPayload) {
    const org = await this.prisma.organisation.findFirst({
      where: { id: orgId },
      select: { retentionYears: true },
    });

    if (!org) {
      throw new NotFoundException('Organisation not found');
    }

    const retentionCutoff = new Date();
    retentionCutoff.setFullYear(retentionCutoff.getFullYear() - org.retentionYears);

    const [auditResult, analyticsResult] = await Promise.all([
      this.prisma.auditLog.deleteMany({
        where: { orgId, createdAt: { lt: retentionCutoff } },
      }),
      this.prisma.analyticsEvent.deleteMany({
        where: { orgId, occurredAt: { lt: retentionCutoff } },
      }),
    ]);

    const totalPurged = auditResult.count + analyticsResult.count;

    this.eventEmitter.emit(
      'data.purge-executed',
      new DataPurgeExecutedEvent(orgId, user.sub, totalPurged),
    );

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'PURGE',
      entityType: 'DATA_RETENTION',
      newValue: {
        auditLogsPurged: auditResult.count,
        analyticsEventsPurged: analyticsResult.count,
        retentionCutoff: retentionCutoff.toISOString(),
      },
    });

    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'DATA_PURGE_EXECUTED',
      entityType: 'DATA_RETENTION',
      properties: { totalPurged },
    });

    this.logger.log(`Data purge executed: ${totalPurged} records orgId=${orgId} userId=${user.sub}`);

    return {
      auditLogsPurged: auditResult.count,
      analyticsEventsPurged: analyticsResult.count,
      totalPurged,
      retentionCutoffDate: retentionCutoff.toISOString(),
    };
  }
}
