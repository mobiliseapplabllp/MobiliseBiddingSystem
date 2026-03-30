import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProduces } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import {
  CreateReportDto,
  UpdateReportDto,
  ReportFilterDto,
} from './dto/report.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Post()
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Create a new report definition' })
  async create(@Body() dto: CreateReportDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List reports with filters and pagination' })
  async findAll(@CurrentUser() user: JwtPayload, @Query() filter: ReportFilterDto) {
    return this.service.findAll(user.orgId!, filter);
  }

  @Get('scheduled')
  @Roles('ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List scheduled reports' })
  async getScheduled(@CurrentUser() user: JwtPayload) {
    return this.service.getScheduledReports(user.orgId!);
  }

  @Get(':id')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get a single report by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(user.orgId!, id);
  }

  @Put(':id')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Update a report definition' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReportDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Soft-delete a report' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user);
  }

  @Post(':id/generate')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Generate report data from its definition' })
  async generate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.generate(id, user);
  }

  @Get(':id/export/csv')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Export a generated report as CSV' })
  @ApiProduces('text/csv')
  async exportCsv(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const csv = await this.service.exportCsv(id, user);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="report-${id}.csv"`);
    res.send(csv);
  }
}
