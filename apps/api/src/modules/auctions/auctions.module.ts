import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { AuctionsController } from './auctions.controller';
import { AuctionBidsController } from './auction-bids.controller';
import { AuctionsService } from './auctions.service';
import { AuctionBidsService } from './auction-bids.service';
import { AuctionSchedulerService } from './auction-scheduler.service';
import { AuctionGateway } from './auction.gateway';
import { AuctionVariantsService } from './auction-variants.service';
import { AuctionExportService } from './auction-export.service';

@Module({
  controllers: [AuctionsController, AuctionBidsController],
  providers: [
    AuctionsService,
    AuctionBidsService,
    AuctionSchedulerService,
    AuctionGateway,
    AuctionVariantsService,
    AuctionExportService,
    PrismaService,
    AuditService,
    AnalyticsService,
  ],
  exports: [AuctionsService],
})
export class AuctionsModule {}
