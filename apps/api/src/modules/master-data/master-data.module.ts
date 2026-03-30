import { Module } from '@nestjs/common';
import { MasterDataController } from './master-data.controller';
import { MasterDataService } from './master-data.service';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';

@Module({
  controllers: [MasterDataController],
  providers: [MasterDataService, PrismaService, AuditService, AnalyticsService],
  exports: [MasterDataService],
})
export class MasterDataModule {}
