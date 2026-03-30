import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { AuditController } from './audit.controller';
import { AuditQueryService } from './audit.service';

@Module({
  controllers: [AuditController],
  providers: [
    AuditQueryService,
    PrismaService,
    AuditService,
    AnalyticsService,
  ],
  exports: [AuditQueryService],
})
export class AuditModule {}
