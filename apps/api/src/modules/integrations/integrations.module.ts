import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';

@Module({
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    PrismaService,
    AuditService,
    AnalyticsService,
  ],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
