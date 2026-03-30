import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { HealthMonitoringController } from './health-monitoring.controller';
import { HealthMonitoringService } from './health-monitoring.service';

@Module({
  controllers: [HealthMonitoringController],
  providers: [
    HealthMonitoringService,
    PrismaService,
  ],
  exports: [HealthMonitoringService],
})
export class HealthMonitoringModule {}
