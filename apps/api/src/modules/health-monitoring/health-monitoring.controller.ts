import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { HealthMonitoringService } from './health-monitoring.service';

@ApiTags('Health Monitoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('health')
export class HealthMonitoringController {
  constructor(private readonly service: HealthMonitoringService) {}

  @Get('detailed')
  @Roles('ADMIN_SETTINGS', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Run and return detailed health checks for all services' })
  async getDetailedHealth() {
    return this.service.runHealthCheck();
  }

  @Get('history')
  @Roles('ADMIN_SETTINGS', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get health check history for a service' })
  @ApiQuery({ name: 'service', required: false, enum: ['API', 'DATABASE', 'REDIS', 'WEBSOCKET', 'STORAGE'] })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  async getHealthHistory(
    @Query('service') service?: string,
    @Query('hours') hours?: string,
  ) {
    const hoursNum = hours ? parseInt(hours, 10) : 24;
    return this.service.getHealthHistory(service, hoursNum);
  }

  @Get('uptime')
  @Roles('ADMIN_SETTINGS', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get uptime percentage for a service' })
  @ApiQuery({ name: 'service', required: true, enum: ['API', 'DATABASE', 'REDIS', 'WEBSOCKET', 'STORAGE'] })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  async getUptime(
    @Query('service') service: string,
    @Query('hours') hours?: string,
  ) {
    const hoursNum = hours ? parseInt(hours, 10) : 24;
    return this.service.getUptimePercentage(service, hoursNum);
  }
}
