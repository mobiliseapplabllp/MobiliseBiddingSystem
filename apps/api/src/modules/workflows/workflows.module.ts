import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';

@Module({
  controllers: [WorkflowsController],
  providers: [
    WorkflowsService,
    PrismaService,
    AuditService,
    AnalyticsService,
  ],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
