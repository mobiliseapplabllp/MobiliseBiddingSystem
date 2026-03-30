import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { AnalyticsDashboardService } from './analytics.service';
import {
  CreateDashboardDto,
  UpdateDashboardDto,
  DashboardFilterDto,
  DateRangeDto,
} from './dto/analytics.dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsDashboardService) {}

  // ── Dashboard CRUD ─────────────────────────────────────────────────────────

  @Post('dashboards')
  @Roles('ANALYTICS_VIEW', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Create a new analytics dashboard' })
  async createDashboard(@Body() dto: CreateDashboardDto, @CurrentUser() user: JwtPayload) {
    return this.service.createDashboard(dto, user);
  }

  @Get('dashboards')
  @Roles('ANALYTICS_VIEW', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List analytics dashboards' })
  async listDashboards(@CurrentUser() user: JwtPayload, @Query() filter: DashboardFilterDto) {
    return this.service.listDashboards(user.orgId!, filter);
  }

  @Get('dashboards/:id')
  @Roles('ANALYTICS_VIEW', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get a single analytics dashboard' })
  async getDashboard(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.getDashboard(user.orgId!, id);
  }

  @Put('dashboards/:id')
  @Roles('ANALYTICS_VIEW', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Update an analytics dashboard' })
  async updateDashboard(
    @Param('id') id: string,
    @Body() dto: UpdateDashboardDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateDashboard(id, dto, user);
  }

  @Delete('dashboards/:id')
  @Roles('ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Soft-delete an analytics dashboard' })
  async deleteDashboard(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.deleteDashboard(id, user);
  }

  // ── Analytics Endpoints ────────────────────────────────────────────────────

  @Get('spend')
  @Roles('ANALYTICS_VIEW', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get spend analytics by category, supplier, period' })
  async getSpend(@CurrentUser() user: JwtPayload, @Query() range: DateRangeDto) {
    return this.service.getSpendAnalytics(user.orgId!, range);
  }

  @Get('savings')
  @Roles('ANALYTICS_VIEW', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get savings report — estimated vs awarded values' })
  async getSavings(@CurrentUser() user: JwtPayload, @Query() range: DateRangeDto) {
    return this.service.getSavingsReport(user.orgId!, range);
  }

  @Get('events')
  @Roles('ANALYTICS_VIEW', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get event activity metrics — status, type, cycle time' })
  async getEventActivity(@CurrentUser() user: JwtPayload, @Query() range: DateRangeDto) {
    return this.service.getEventActivityMetrics(user.orgId!, range);
  }

  @Get('auctions')
  @Roles('ANALYTICS_VIEW', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get auction performance — bid counts, savings, patterns' })
  async getAuctionPerformance(@CurrentUser() user: JwtPayload, @Query() range: DateRangeDto) {
    return this.service.getAuctionPerformance(user.orgId!, range);
  }

  @Get('suppliers')
  @Roles('ANALYTICS_VIEW', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get supplier metrics — active, scorecards, qualification' })
  async getSupplierMetrics(@CurrentUser() user: JwtPayload) {
    return this.service.getSupplierMetrics(user.orgId!);
  }

  @Get('dashboard')
  @Roles('ANALYTICS_VIEW', 'ORG_ADMIN', 'PLATFORM_ADMIN', 'BUYER', 'EVENT_MANAGER')
  @ApiOperation({ summary: 'Get aggregated KPI widgets for dashboard homepage' })
  async getDashboardWidgets(@CurrentUser() user: JwtPayload) {
    return this.service.getDashboardWidgets(user.orgId!);
  }
}
