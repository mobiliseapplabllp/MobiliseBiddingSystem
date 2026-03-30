import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Get dashboard KPI metrics (active events, auctions, suppliers, savings)' })
  async getKpis(@CurrentUser() user: JwtPayload) {
    return this.service.getKpis(user.orgId!);
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Get recent activity feed from audit log' })
  async getRecentActivity(@CurrentUser() user: JwtPayload) {
    return this.service.getRecentActivity(user.orgId!);
  }

  @Get('pending-actions')
  @ApiOperation({ summary: 'Get pending actions for current user (approvals, drafts, evaluations)' })
  async getPendingActions(@CurrentUser() user: JwtPayload) {
    return this.service.getPendingActions(user.orgId!, user.sub);
  }

  @Get('live-auctions')
  @ApiOperation({ summary: 'Get currently live/open auctions with bid counts, countdown, and best price' })
  async getLiveAuctions(@CurrentUser() user: JwtPayload) {
    return this.service.getLiveAuctions(user.orgId!);
  }
}
