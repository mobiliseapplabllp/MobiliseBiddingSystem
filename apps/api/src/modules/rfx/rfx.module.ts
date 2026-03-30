import { Module } from '@nestjs/common';
import { RfxController } from './rfx.controller';
import { RfxService } from './rfx.service';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';

@Module({
  controllers: [RfxController],
  providers: [RfxService, PrismaService, AuditService, AnalyticsService],
  exports: [RfxService],
})
export class RfxModule {}
