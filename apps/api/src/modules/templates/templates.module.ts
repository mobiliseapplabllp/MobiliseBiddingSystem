import { Module } from '@nestjs/common';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';

@Module({
  controllers: [TemplatesController],
  providers: [TemplatesService, PrismaService, AuditService, AnalyticsService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
