import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { NotificationCenterController } from './notification-center.controller';
import { NotificationCenterService } from './notification-center.service';

@Module({
  controllers: [NotificationCenterController],
  providers: [
    NotificationCenterService,
    PrismaService,
    AuditService,
    AnalyticsService,
  ],
  exports: [NotificationCenterService],
})
export class NotificationCenterModule {}
