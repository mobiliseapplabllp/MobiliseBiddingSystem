import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { SupplierPortalController } from './supplier-portal.controller';
import { SupplierPortalService } from './supplier-portal.service';

@Module({
  controllers: [SupplierPortalController],
  providers: [
    SupplierPortalService,
    PrismaService,
    AuditService,
    AnalyticsService,
  ],
  exports: [SupplierPortalService],
})
export class SupplierPortalModule {}
