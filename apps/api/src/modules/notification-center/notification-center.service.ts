import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  CreateNotificationDto,
  NotificationFilterDto,
  UpdatePreferencesDto,
  ScheduleReminderDto,
  NotificationTypeEnum,
  ChannelEnum,
} from './dto/notification.dto';
import {
  RfxPublishedEvent,
  BidSubmittedEvent,
  AuctionOpenedEvent,
  AuctionClosedEvent,
  AuctionBidPlacedEvent,
  EvaluationCreatedEvent,
  EvaluationCompletedEvent,
  AwardApprovedEvent,
  AwardRejectedEvent,
  ContractCreatedEvent,
  ContractActivatedEvent,
  ContractExpiredEvent,
  SupplierRegisteredEvent,
  SupplierApprovedEvent,
} from '../../common/events/domain-events';

@Injectable()
export class NotificationCenterService {
  private readonly logger = new Logger(NotificationCenterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
  ) {}

  // ── Core CRUD ──────────────────────────────────────────────────────────────

  async createNotification(dto: CreateNotificationDto) {
    this.logger.log(`Creating notification: userId=${dto.userId} type=${dto.type}`);

    // Check user preferences
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId_type: { userId: dto.userId, type: dto.type } },
    });

    // If user has disabled this notification type for in-app, skip (unless it's a reminder)
    if (pref && !pref.inApp && dto.channel !== ChannelEnum.EMAIL) {
      this.logger.log(`User ${dto.userId} has disabled in-app for type=${dto.type}, skipping`);
      return null;
    }

    const notification = await this.prisma.notification.create({
      data: {
        orgId: dto.orgId,
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        entityType: dto.entityType,
        entityId: dto.entityId,
        channel: dto.channel ?? 'IN_APP',
        reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : undefined,
      },
    });

    return notification;
  }

  async listForUser(userId: string, filter: NotificationFilterDto) {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;

    const where = {
      userId,
      isActive: true,
      ...(filter.type && { type: filter.type }),
      ...(filter.isRead !== undefined && { isRead: filter.isRead }),
    };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }], // Unread first
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId, isActive: true },
    });
    if (!notification) throw new NotFoundException(`Notification ${id} not found`);

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false, isActive: true },
      data: { isRead: true, readAt: new Date() },
    });

    return { updated: result.count };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false, isActive: true },
    });
    return { count };
  }

  // ── Preferences ────────────────────────────────────────────────────────────

  async getPreferences(userId: string) {
    const prefs = await this.prisma.notificationPreference.findMany({
      where: { userId },
    });

    // Return all types with defaults for any not yet configured
    const allTypes = Object.values(NotificationTypeEnum);
    const prefMap = new Map(prefs.map(p => [p.type, p]));

    return allTypes.map(type => ({
      type,
      email: prefMap.get(type)?.email ?? true,
      inApp: prefMap.get(type)?.inApp ?? true,
    }));
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    this.logger.log(`Updating notification preferences: userId=${userId}`);

    const results = await Promise.all(
      dto.preferences.map(pref =>
        this.prisma.notificationPreference.upsert({
          where: { userId_type: { userId, type: pref.type } },
          create: { userId, type: pref.type, email: pref.email, inApp: pref.inApp },
          update: { email: pref.email, inApp: pref.inApp },
        }),
      ),
    );

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entityType: 'NOTIFICATION_PREFERENCE',
      newValue: { preferences: dto.preferences } as unknown as Record<string, unknown>,
    });

    return results;
  }

  // ── Sprint 19: Schedule Reminder ───────────────────────────────────────────

  async scheduleReminder(orgId: string, dto: ScheduleReminderDto) {
    this.logger.log(`Scheduling reminder: userId=${dto.userId} at=${dto.reminderAt}`);

    return this.createNotification({
      orgId,
      userId: dto.userId,
      type: NotificationTypeEnum.REMINDER,
      title: 'Reminder',
      body: dto.message,
      entityType: dto.entityType,
      entityId: dto.entityId,
      channel: ChannelEnum.BOTH,
      reminderAt: dto.reminderAt,
    });
  }

  // ── Sprint 19: Cron — Deadline Reminders ───────────────────────────────────

  @Cron(CronExpression.EVERY_HOUR)
  async checkDeadlineReminders() {
    this.logger.log('Running deadline reminder check');

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Events with submission deadlines approaching
    const upcomingDeadlines = await this.prisma.rfxEvent.findMany({
      where: {
        isActive: true,
        status: { in: ['PUBLISHED', 'AUCTION_OPEN'] },
        submissionDeadline: {
          gte: now,
          lte: in7d,
        },
      },
      select: {
        id: true,
        orgId: true,
        refNumber: true,
        title: true,
        submissionDeadline: true,
        createdById: true,
      },
    });

    for (const event of upcomingDeadlines) {
      const hoursUntil = Math.round(
        (event.submissionDeadline!.getTime() - now.getTime()) / (1000 * 60 * 60),
      );

      // Only notify at 24h, 48h, and 7d thresholds (with 1h window)
      const shouldNotify =
        (hoursUntil >= 23 && hoursUntil <= 25) ||
        (hoursUntil >= 47 && hoursUntil <= 49) ||
        (hoursUntil >= 167 && hoursUntil <= 169);

      if (!shouldNotify) continue;

      // Check if we already sent a notification for this threshold
      const existing = await this.prisma.notification.findFirst({
        where: {
          entityId: event.id,
          entityType: 'RFX_EVENT',
          type: 'REMINDER',
          createdAt: { gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
        },
      });

      if (existing) continue;

      const timeLabel = hoursUntil <= 25 ? '24 hours' : hoursUntil <= 49 ? '48 hours' : '7 days';

      await this.createNotification({
        orgId: event.orgId,
        userId: event.createdById,
        type: NotificationTypeEnum.REMINDER,
        title: `Deadline approaching: ${event.refNumber}`,
        body: `The submission deadline for "${event.title}" is in ${timeLabel}.`,
        entityType: 'RFX_EVENT',
        entityId: event.id,
        channel: ChannelEnum.BOTH,
      });

      this.logger.log(`Deadline reminder sent: eventId=${event.id} in=${timeLabel}`);
    }
  }

  // ── Sprint 19: Cron — Contract Expiration Reminders ────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async checkContractExpirations() {
    this.logger.log('Running contract expiration check');

    const now = new Date();
    const thresholds = [
      { days: 30, label: '30 days' },
      { days: 60, label: '60 days' },
      { days: 90, label: '90 days' },
    ];

    for (const threshold of thresholds) {
      const targetDate = new Date(now.getTime() + threshold.days * 24 * 60 * 60 * 1000);
      const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const expiringContracts = await this.prisma.contract.findMany({
        where: {
          isActive: true,
          status: 'ACTIVE',
          endDate: { gte: dayStart, lt: dayEnd },
        },
        select: {
          id: true,
          orgId: true,
          contractNumber: true,
          title: true,
          endDate: true,
          createdById: true,
        },
      });

      for (const contract of expiringContracts) {
        // Check if we already sent this exact reminder
        const existing = await this.prisma.notification.findFirst({
          where: {
            entityId: contract.id,
            entityType: 'CONTRACT',
            type: 'CONTRACT_EXPIRING',
            body: { contains: threshold.label },
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        });

        if (existing) continue;

        await this.createNotification({
          orgId: contract.orgId,
          userId: contract.createdById,
          type: NotificationTypeEnum.CONTRACT_EXPIRING,
          title: `Contract expiring: ${contract.contractNumber}`,
          body: `Contract "${contract.title}" (${contract.contractNumber}) will expire in ${threshold.label}.`,
          entityType: 'CONTRACT',
          entityId: contract.id,
          channel: ChannelEnum.BOTH,
        });

        this.logger.log(`Contract expiration reminder: contractId=${contract.id} in=${threshold.label}`);
      }
    }
  }

  // ── Domain Event Listeners ─────────────────────────────────────────────────

  @OnEvent('rfx.published')
  async handleRfxPublished(event: RfxPublishedEvent) {
    this.logger.log(`Notification: RFx published eventId=${event.eventId}`);

    // Notify all invited suppliers
    const invitations = await this.prisma.supplierInvitation.findMany({
      where: { eventId: event.eventId, isActive: true },
      select: { supplierId: true },
    });

    // Get users for each supplier org
    for (const inv of invitations) {
      const users = await this.prisma.user.findMany({
        where: { orgId: inv.supplierId, status: 'ACTIVE' },
        select: { id: true },
        take: 5, // Limit to key contacts
      });

      for (const user of users) {
        await this.createNotification({
          orgId: event.orgId,
          userId: user.id,
          type: NotificationTypeEnum.EVENT_PUBLISHED,
          title: `New event published: ${event.refNumber}`,
          body: `A new procurement event "${event.title}" (${event.refNumber}) has been published. You are invited to participate.`,
          entityType: 'RFX_EVENT',
          entityId: event.eventId,
          channel: ChannelEnum.BOTH,
        });
      }
    }
  }

  @OnEvent('bid.submitted')
  async handleBidSubmitted(event: BidSubmittedEvent) {
    this.logger.log(`Notification: Bid submitted bidId=${event.bidId}`);

    // Notify the event creator
    const rfxEvent = await this.prisma.rfxEvent.findFirst({
      where: { id: event.eventId },
      select: { createdById: true, refNumber: true, title: true },
    });

    if (rfxEvent) {
      await this.createNotification({
        orgId: event.orgId,
        userId: rfxEvent.createdById,
        type: NotificationTypeEnum.BID_RECEIVED,
        title: `New bid received: ${rfxEvent.refNumber}`,
        body: `A new bid has been submitted for "${rfxEvent.title}" (${rfxEvent.refNumber}).`,
        entityType: 'RFX_EVENT',
        entityId: event.eventId,
        channel: ChannelEnum.IN_APP,
      });
    }
  }

  @OnEvent('auction.opened')
  async handleAuctionOpened(event: AuctionOpenedEvent) {
    this.logger.log(`Notification: Auction opened auctionId=${event.auctionId}`);

    const invitations = await this.prisma.auctionInvitation.findMany({
      where: { auctionId: event.auctionId, isActive: true, status: 'ACCEPTED' },
      select: { supplierId: true },
    });

    for (const inv of invitations) {
      const users = await this.prisma.user.findMany({
        where: { orgId: inv.supplierId, status: 'ACTIVE' },
        select: { id: true },
        take: 5,
      });

      for (const user of users) {
        await this.createNotification({
          orgId: event.orgId,
          userId: user.id,
          type: NotificationTypeEnum.AUCTION_STARTED,
          title: 'Auction is now open',
          body: `An auction you are participating in is now open for bidding.`,
          entityType: 'AUCTION',
          entityId: event.auctionId,
          channel: ChannelEnum.BOTH,
        });
      }
    }
  }

  @OnEvent('auction.closed')
  async handleAuctionClosed(event: AuctionClosedEvent) {
    this.logger.log(`Notification: Auction closed auctionId=${event.auctionId}`);

    const invitations = await this.prisma.auctionInvitation.findMany({
      where: { auctionId: event.auctionId, isActive: true },
      select: { supplierId: true },
    });

    for (const inv of invitations) {
      const users = await this.prisma.user.findMany({
        where: { orgId: inv.supplierId, status: 'ACTIVE' },
        select: { id: true },
        take: 5,
      });

      for (const user of users) {
        await this.createNotification({
          orgId: event.orgId,
          userId: user.id,
          type: NotificationTypeEnum.AUCTION_CLOSED,
          title: 'Auction has closed',
          body: `An auction you participated in has closed. Total bids: ${event.totalBids}.`,
          entityType: 'AUCTION',
          entityId: event.auctionId,
          channel: ChannelEnum.IN_APP,
        });
      }
    }
  }

  @OnEvent('auction.bid.placed')
  async handleAuctionBidPlaced(event: AuctionBidPlacedEvent) {
    // Notify the auction creator (buyer)
    const auction = await this.prisma.auction.findFirst({
      where: { id: event.auctionId },
      select: { createdById: true, refNumber: true },
    });

    if (auction) {
      await this.createNotification({
        orgId: event.orgId,
        userId: auction.createdById,
        type: NotificationTypeEnum.AUCTION_BID_PLACED,
        title: `New auction bid: ${auction.refNumber}`,
        body: `A new bid of ${event.bidPrice} has been placed${event.rank ? ` (rank #${event.rank})` : ''}.`,
        entityType: 'AUCTION',
        entityId: event.auctionId,
        channel: ChannelEnum.IN_APP,
      });
    }
  }

  @OnEvent('evaluation.created')
  async handleEvaluationCreated(event: EvaluationCreatedEvent) {
    this.logger.log(`Notification: Evaluation created evaluationId=${event.evaluationId}`);

    // Notify assigned evaluators
    const assignments = await this.prisma.evaluatorAssignment.findMany({
      where: { evaluationId: event.evaluationId, isActive: true },
      select: { evaluatorId: true },
    });

    for (const assignment of assignments) {
      await this.createNotification({
        orgId: event.orgId,
        userId: assignment.evaluatorId,
        type: NotificationTypeEnum.EVALUATION_ASSIGNED,
        title: `Evaluation assigned: ${event.title}`,
        body: `You have been assigned as an evaluator for "${event.title}".`,
        entityType: 'EVALUATION',
        entityId: event.evaluationId,
        channel: ChannelEnum.BOTH,
      });
    }
  }

  @OnEvent('evaluation.completed')
  async handleEvaluationCompleted(event: EvaluationCompletedEvent) {
    this.logger.log(`Notification: Evaluation completed evaluationId=${event.evaluationId}`);

    const evaluation = await this.prisma.evaluation.findFirst({
      where: { id: event.evaluationId },
      select: { createdById: true, title: true },
    });

    if (evaluation) {
      await this.createNotification({
        orgId: event.orgId,
        userId: evaluation.createdById,
        type: NotificationTypeEnum.EVALUATION_COMPLETED,
        title: `Evaluation completed: ${evaluation.title}`,
        body: `The evaluation "${evaluation.title}" has been completed.`,
        entityType: 'EVALUATION',
        entityId: event.evaluationId,
        channel: ChannelEnum.IN_APP,
      });
    }
  }

  @OnEvent('award.approved')
  async handleAwardApproved(event: AwardApprovedEvent) {
    this.logger.log(`Notification: Award approved awardId=${event.awardId}`);

    const award = await this.prisma.award.findFirst({
      where: { id: event.awardId },
      select: { createdById: true, title: true },
    });

    if (award) {
      await this.createNotification({
        orgId: event.orgId,
        userId: award.createdById,
        type: NotificationTypeEnum.AWARD_APPROVED,
        title: `Award approved: ${award.title}`,
        body: `The award "${award.title}" has been approved.`,
        entityType: 'AWARD',
        entityId: event.awardId,
        channel: ChannelEnum.BOTH,
      });
    }
  }

  @OnEvent('award.rejected')
  async handleAwardRejected(event: AwardRejectedEvent) {
    this.logger.log(`Notification: Award rejected awardId=${event.awardId}`);

    const award = await this.prisma.award.findFirst({
      where: { id: event.awardId },
      select: { createdById: true, title: true },
    });

    if (award) {
      await this.createNotification({
        orgId: event.orgId,
        userId: award.createdById,
        type: NotificationTypeEnum.AWARD_REJECTED,
        title: `Award rejected: ${award.title}`,
        body: `The award "${award.title}" has been rejected.${event.reason ? ` Reason: ${event.reason}` : ''}`,
        entityType: 'AWARD',
        entityId: event.awardId,
        channel: ChannelEnum.BOTH,
      });
    }
  }

  @OnEvent('contract.created')
  async handleContractCreated(event: ContractCreatedEvent) {
    this.logger.log(`Notification: Contract created contractId=${event.contractId}`);

    await this.createNotification({
      orgId: event.orgId,
      userId: event.userId,
      type: NotificationTypeEnum.CONTRACT_CREATED,
      title: `Contract created: ${event.contractNumber}`,
      body: `Contract "${event.title}" (${event.contractNumber}) has been created.`,
      entityType: 'CONTRACT',
      entityId: event.contractId,
      channel: ChannelEnum.IN_APP,
    });
  }

  @OnEvent('contract.activated')
  async handleContractActivated(event: ContractActivatedEvent) {
    this.logger.log(`Notification: Contract activated contractId=${event.contractId}`);

    await this.createNotification({
      orgId: event.orgId,
      userId: event.userId,
      type: NotificationTypeEnum.CONTRACT_ACTIVATED,
      title: `Contract activated: ${event.contractNumber}`,
      body: `Contract ${event.contractNumber} is now active.`,
      entityType: 'CONTRACT',
      entityId: event.contractId,
      channel: ChannelEnum.IN_APP,
    });
  }

  @OnEvent('contract.expired')
  async handleContractExpired(event: ContractExpiredEvent) {
    this.logger.log(`Notification: Contract expired contractId=${event.contractId}`);

    const contract = await this.prisma.contract.findFirst({
      where: { id: event.contractId },
      select: { createdById: true, title: true },
    });

    if (contract) {
      await this.createNotification({
        orgId: event.orgId,
        userId: contract.createdById,
        type: NotificationTypeEnum.CONTRACT_EXPIRING,
        title: `Contract expired: ${event.contractNumber}`,
        body: `Contract "${contract.title}" (${event.contractNumber}) has expired.`,
        entityType: 'CONTRACT',
        entityId: event.contractId,
        channel: ChannelEnum.BOTH,
      });
    }
  }

  @OnEvent('supplier.registered')
  async handleSupplierRegistered(event: SupplierRegisteredEvent) {
    this.logger.log(`Notification: Supplier registered profileId=${event.profileId}`);

    // Notify org admins
    const admins = await this.prisma.userOrgRole.findMany({
      where: { orgId: event.orgId, role: { in: ['ORG_ADMIN', 'PLATFORM_ADMIN'] } },
      select: { userId: true },
      distinct: ['userId'],
    });

    for (const admin of admins) {
      await this.createNotification({
        orgId: event.orgId,
        userId: admin.userId,
        type: NotificationTypeEnum.SUPPLIER_REGISTERED,
        title: `New supplier registered: ${event.orgName}`,
        body: `Supplier "${event.orgName}" has registered and is pending review.`,
        entityType: 'SUPPLIER_PROFILE',
        entityId: event.profileId,
        channel: ChannelEnum.BOTH,
      });
    }
  }

  @OnEvent('supplier.approved')
  async handleSupplierApproved(event: SupplierApprovedEvent) {
    this.logger.log(`Notification: Supplier approved profileId=${event.profileId}`);

    // Notify supplier users
    const profile = await this.prisma.supplierProfile.findFirst({
      where: { id: event.profileId },
      select: { orgId: true },
    });

    if (profile) {
      const users = await this.prisma.user.findMany({
        where: { orgId: profile.orgId, status: 'ACTIVE' },
        select: { id: true },
        take: 5,
      });

      for (const user of users) {
        await this.createNotification({
          orgId: event.orgId,
          userId: user.id,
          type: NotificationTypeEnum.SUPPLIER_APPROVED,
          title: 'Your supplier profile has been approved',
          body: 'Congratulations! Your supplier registration has been approved. You can now participate in procurement events.',
          entityType: 'SUPPLIER_PROFILE',
          entityId: event.profileId,
          channel: ChannelEnum.BOTH,
        });
      }
    }
  }
}
