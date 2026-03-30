import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { PerformanceService } from './performance.service';
import { WarmCacheDto } from './dto/performance.dto';

@ApiTags('Performance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('performance')
export class PerformanceController {
  private readonly logger = new Logger(PerformanceController.name);

  constructor(private readonly service: PerformanceService) {}

  @Get('cache')
  @Roles('ADMIN_SETTINGS', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get Redis cache statistics' })
  async getCacheStats() {
    return this.service.getCacheStats();
  }

  @Post('cache/warm')
  @Roles('ADMIN_SETTINGS', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Pre-populate Redis cache for an entity type' })
  async warmCache(@Body() dto: WarmCacheDto, @CurrentUser() user: JwtPayload) {
    this.logger.log(`Cache warm requested: entityType=${dto.entityType} userId=${user.sub}`);
    return this.service.warmCache(dto.entityType, user.sub, user.orgId ?? '');
  }

  @Get('database')
  @Roles('ADMIN_SETTINGS', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get database table sizes and index usage' })
  async getDatabaseStats() {
    return this.service.getDatabaseStats();
  }

  @Get('latency')
  @Roles('ADMIN_SETTINGS', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get API latency metrics (p50/p95/p99) per endpoint' })
  async getLatencyMetrics() {
    return this.service.getApiLatencyMetrics();
  }

  @Get('slow-queries')
  @Roles('ADMIN_SETTINGS', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get endpoints with average latency > 200ms' })
  async getSlowQueries() {
    return this.service.getSlowQueries();
  }
}
