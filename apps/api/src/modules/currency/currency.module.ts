import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { CurrencyController } from './currency.controller';
import { CurrencyService } from './currency.service';

@Module({
  controllers: [CurrencyController],
  providers: [
    CurrencyService,
    PrismaService,
    AuditService,
    AnalyticsService,
  ],
  exports: [CurrencyService],
})
export class CurrencyModule {}
