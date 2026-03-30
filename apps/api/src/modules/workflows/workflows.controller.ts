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
import { WorkflowsService } from './workflows.service';
import {
  CreateWorkflowTemplateDto,
  UpdateWorkflowTemplateDto,
  StartWorkflowDto,
  WorkflowDecisionDto,
  WorkflowFilterDto,
} from './dto/workflow.dto';

@ApiTags('Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly service: WorkflowsService) {}

  // ── Template Endpoints ───────────────────────────────────────────────────

  @Post('templates')
  @Roles('ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Create a workflow template' })
  async createTemplate(
    @Body() dto: CreateWorkflowTemplateDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createTemplate(dto, user);
  }

  @Get('templates')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List workflow templates' })
  async listTemplates(
    @CurrentUser() user: JwtPayload,
    @Query() filter: WorkflowFilterDto,
  ) {
    return this.service.listTemplates(user.orgId!, filter);
  }

  @Get('templates/:templateId')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get workflow template detail' })
  async getTemplate(
    @Param('templateId') templateId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getTemplate(user.orgId!, templateId);
  }

  @Put('templates/:templateId')
  @Roles('ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Update a workflow template' })
  async updateTemplate(
    @Param('templateId') templateId: string,
    @Body() dto: UpdateWorkflowTemplateDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateTemplate(user.orgId!, templateId, dto, user);
  }

  @Delete('templates/:templateId')
  @Roles('ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Soft-delete a workflow template' })
  async deleteTemplate(
    @Param('templateId') templateId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.deleteTemplate(user.orgId!, templateId, user);
  }

  // ── Instance Endpoints ───────────────────────────────────────────────────

  @Post('instances')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Start a new workflow instance' })
  async startWorkflow(
    @Body() dto: StartWorkflowDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.startWorkflow(dto, user);
  }

  @Get('instances')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List workflow instances with filters' })
  async listInstances(
    @CurrentUser() user: JwtPayload,
    @Query() filter: WorkflowFilterDto,
  ) {
    return this.service.listInstances(user.orgId!, filter);
  }

  @Get('instances/:instanceId')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get workflow instance status' })
  async getStatus(
    @Param('instanceId') instanceId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getWorkflowStatus(user.orgId!, instanceId);
  }

  @Get('entity/:entityType/:entityId')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get workflows for a specific entity' })
  async getByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getWorkflowsByEntity(user.orgId!, entityType, entityId);
  }

  @Post('instances/:instanceId/approve')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Approve the current workflow step' })
  async approveStep(
    @Param('instanceId') instanceId: string,
    @Body() dto: WorkflowDecisionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.approveStep(user.orgId!, instanceId, dto, user);
  }

  @Post('instances/:instanceId/reject')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Reject the current workflow step' })
  async rejectStep(
    @Param('instanceId') instanceId: string,
    @Body() dto: WorkflowDecisionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.rejectStep(user.orgId!, instanceId, dto, user);
  }

  @Post('instances/:instanceId/cancel')
  @Roles('ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Cancel a workflow instance' })
  async cancelWorkflow(
    @Param('instanceId') instanceId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.cancelWorkflow(user.orgId!, instanceId, user);
  }
}
