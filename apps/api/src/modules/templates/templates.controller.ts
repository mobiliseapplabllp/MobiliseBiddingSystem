import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto, CreateFromTemplateDto } from './dto/template.dto';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rfx-templates')
export class TemplatesController {
  constructor(private readonly service: TemplatesService) {}

  @Get()
  @Roles('BUYER', 'ORG_ADMIN', 'BU_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List RFx templates for org' })
  async list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user.orgId!);
  }

  @Post()
  @Roles('BUYER', 'ORG_ADMIN', 'BU_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Create a new RFx template' })
  async create(@Body() dto: CreateTemplateDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(user.orgId!, dto, user);
  }

  @Post('from-template')
  @Roles('BUYER', 'ORG_ADMIN', 'BU_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Create an RFx event from a template' })
  async createFromTemplate(@Body() dto: CreateFromTemplateDto, @CurrentUser() user: JwtPayload) {
    return this.service.createFromTemplate(user.orgId!, dto, user);
  }

  @Delete(':templateId')
  @Roles('BUYER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Delete (soft) an RFx template' })
  async delete(@Param('templateId') templateId: string, @CurrentUser() user: JwtPayload) {
    await this.service.delete(user.orgId!, templateId, user);
    return { message: 'Template deleted' };
  }
}
