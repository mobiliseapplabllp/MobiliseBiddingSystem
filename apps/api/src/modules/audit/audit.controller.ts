import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { AuditQueryService } from './audit.service';
import { AuditLogFilterDto, ComplianceReportFilterDto } from './dto/audit.dto';

@ApiTags('Audit & Compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly service: AuditQueryService) {}

  @Get('logs')
  @Roles('ADMIN_AUDIT_LOG', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Query audit logs with filters and pagination' })
  async queryLogs(
    @CurrentUser() user: JwtPayload,
    @Query() filter: AuditLogFilterDto,
  ) {
    return this.service.queryAuditLogs(user.orgId!, filter);
  }

  @Get('timeline/:entityType/:entityId')
  @Roles('ADMIN_AUDIT_LOG', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get full audit timeline for a specific entity' })
  async getTimeline(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getEntityTimeline(user.orgId!, entityType, entityId);
  }

  @Get('compliance')
  @Roles('ADMIN_AUDIT_LOG', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get compliance report with anomaly detection' })
  async getComplianceReport(
    @CurrentUser() user: JwtPayload,
    @Query() filter: ComplianceReportFilterDto,
  ) {
    return this.service.getComplianceReport(user.orgId!, filter);
  }

  @Get('export/csv')
  @Roles('ADMIN_AUDIT_LOG', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Export audit logs as CSV' })
  async exportCsv(
    @CurrentUser() user: JwtPayload,
    @Query() filter: AuditLogFilterDto,
    @Res() res: Response,
  ) {
    const result = await this.service.exportAuditLogCsv(user.orgId!, filter, user);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-log-${Date.now()}.csv`);
    res.send(result.csv);
  }

  @Get('retention')
  @Roles('ADMIN_AUDIT_LOG', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get data retention status and expired record counts' })
  async getRetentionStatus(@CurrentUser() user: JwtPayload) {
    return this.service.getDataRetentionStatus(user.orgId!);
  }

  @Post('purge')
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Purge expired data per retention policy (GDPR)' })
  async purgeExpiredData(@CurrentUser() user: JwtPayload) {
    return this.service.purgeExpiredData(user.orgId!, user);
  }
}
