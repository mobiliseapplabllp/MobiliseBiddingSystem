import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaService } from './prisma.service';
import { RedisModule } from './common/redis/redis.module';
import { AIServiceModule } from './common/services/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganisationsModule } from './modules/organisations/organisations.module';
import { RfxModule } from './modules/rfx/rfx.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { BidsModule } from './modules/bids/bids.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { AuctionsModule } from './modules/auctions/auctions.module';
import { EvaluationsModule } from './modules/evaluations/evaluations.module';
import { AwardsModule } from './modules/awards/awards.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { SupplierPortalModule } from './modules/supplier-portal/supplier-portal.module';
import { AIModule } from './modules/ai/ai.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AnalyticsDashboardModule } from './modules/analytics/analytics.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationCenterModule } from './modules/notification-center/notification-center.module';
import { CurrencyModule } from './modules/currency/currency.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { AuditModule } from './modules/audit/audit.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { PerformanceModule } from './modules/performance/performance.module';
import { HealthMonitoringModule } from './modules/health-monitoring/health-monitoring.module';
import { SystemModule } from './modules/system/system.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { HealthController } from './health.controller';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 50 },    // 50 req/sec (accommodates robot tests)
      { name: 'medium', ttl: 60000, limit: 500 },  // 500 req/min
      { name: 'long', ttl: 3600000, limit: 5000 }, // 5000 req/hr
    ]),
    RedisModule,
    AIServiceModule,
    AuthModule, OrganisationsModule, RfxModule, InvitationsModule,
    BidsModule, NotificationsModule, TemplatesModule, MasterDataModule, AuctionsModule, EvaluationsModule, AwardsModule, ContractsModule, SupplierPortalModule, AIModule, DashboardModule,
    AnalyticsDashboardModule, ReportsModule, NotificationCenterModule,
    CurrencyModule, WorkflowsModule, AuditModule, IntegrationsModule,
    PerformanceModule, HealthMonitoringModule, SystemModule,
  ],
  controllers: [HealthController],
  providers: [
    PrismaService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
