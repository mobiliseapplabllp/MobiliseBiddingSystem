import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuctionOpenedEvent, AuctionClosedEvent } from '../../common/events/domain-events';
import { AuditService } from '../../common/services/audit.service';

@Injectable()
export class AuctionSchedulerService {
  private readonly logger = new Logger(AuctionSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: AuditService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleAuctionLifecycle() {
    const now = new Date();

    // Auto-open: PUBLISHED auctions whose startAt has passed
    const toOpen = await this.prisma.auction.findMany({
      where: {
        status: 'PUBLISHED',
        startAt: { lte: now },
        isActive: true,
      },
    });

    for (const auction of toOpen) {
      try {
        await this.prisma.auction.update({
          where: { id: auction.id },
          data: { status: 'OPEN', openedAt: now },
        });

        this.eventEmitter.emit('auction.opened', new AuctionOpenedEvent(auction.id, auction.orgId, auction.endAt));

        await this.audit.log({
          orgId: auction.orgId, action: 'STATUS_CHANGE',
          entityType: 'AUCTION', entityId: auction.id,
          oldValue: { status: 'PUBLISHED' }, newValue: { status: 'OPEN' },
        });

        this.logger.log(`Auto-opened auction ${auction.refNumber}`);
      } catch (err) {
        this.logger.error(`Failed to auto-open auction ${auction.id}: ${err}`);
      }
    }

    // Auto-close: OPEN auctions whose end time has passed
    const toClose = await this.prisma.auction.findMany({
      where: {
        status: 'OPEN',
        isActive: true,
        OR: [
          { actualEndAt: { lte: now } },
          { actualEndAt: null, endAt: { lte: now } },
        ],
      },
    });

    for (const auction of toClose) {
      try {
        const bidCount = await this.prisma.auctionBid.count({
          where: { auctionId: auction.id, status: 'ACTIVE' },
        });

        await this.prisma.auction.update({
          where: { id: auction.id },
          data: { status: 'CLOSED', closedAt: now },
        });

        this.eventEmitter.emit('auction.closed', new AuctionClosedEvent(auction.id, auction.orgId, bidCount));

        await this.audit.log({
          orgId: auction.orgId, action: 'STATUS_CHANGE',
          entityType: 'AUCTION', entityId: auction.id,
          oldValue: { status: 'OPEN' }, newValue: { status: 'CLOSED' },
        });

        this.logger.log(`Auto-closed auction ${auction.refNumber} with ${bidCount} bids`);
      } catch (err) {
        this.logger.error(`Failed to auto-close auction ${auction.id}: ${err}`);
      }
    }
  }
}
