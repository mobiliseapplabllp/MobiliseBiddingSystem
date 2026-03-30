import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';

@Module({
  controllers: [PerformanceController],
  providers: [
    PerformanceService,
    PrismaService,
    AuditService,
    AnalyticsService,
  ],
  exports: [PerformanceService],
})
export class PerformanceModule {}
