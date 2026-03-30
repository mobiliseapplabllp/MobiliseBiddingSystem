import { Module } from '@nestjs/common';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';

@Module({
  controllers: [InvitationsController],
  providers: [InvitationsService, PrismaService, AuditService, AnalyticsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
