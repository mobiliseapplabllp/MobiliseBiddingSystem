import { Module } from '@nestjs/common';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';

@Module({
  controllers: [BidsController],
  providers: [BidsService, PrismaService, AuditService, AnalyticsService],
  exports: [BidsService],
})
export class BidsModule {}
