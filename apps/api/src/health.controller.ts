import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'esourcing-api',
      version: process.env.npm_package_version ?? '1.0.0',
      uptime: Math.round(process.uptime()),
      detailedEndpoint: '/api/v1/health/detailed',
    };
  }
}
