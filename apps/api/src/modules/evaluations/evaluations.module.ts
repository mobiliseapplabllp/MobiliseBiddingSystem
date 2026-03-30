import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';

@Module({
  controllers: [EvaluationsController],
  providers: [
    EvaluationsService,
    PrismaService,
    AuditService,
    AnalyticsService,
  ],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
