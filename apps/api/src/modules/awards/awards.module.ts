import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { AwardsController } from './awards.controller';
import { AwardsService } from './awards.service';

@Module({
  controllers: [AwardsController],
  providers: [
    AwardsService,
    PrismaService,
    AuditService,
    AnalyticsService,
  ],
  exports: [AwardsService],
})
export class AwardsModule {}
