import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsDashboardService } from './analytics.service';

@Module({
  controllers: [AnalyticsController],
  providers: [
    AnalyticsDashboardService,
    PrismaService,
    AuditService,
    AnalyticsService,
  ],
  exports: [AnalyticsDashboardService],
})
export class AnalyticsDashboardModule {}
