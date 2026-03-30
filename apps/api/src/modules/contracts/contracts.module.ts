import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  controllers: [ContractsController],
  providers: [
    ContractsService,
    PrismaService,
    AuditService,
    AnalyticsService,
  ],
  exports: [ContractsService],
})
export class ContractsModule {}
