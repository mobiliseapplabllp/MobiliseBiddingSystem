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
import { IntegrationsService } from './integrations.service';
import {
  CreateApiKeyDto,
  CreateWebhookDto,
  UpdateWebhookDto,
  IntegrationFilterDto,
} from './dto/integration.dto';

@ApiTags('Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  // ── API Keys ─────────────────────────────────────────────────────────────

  @Post('api-keys')
  @Roles('ADMIN_SETTINGS', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Create a new API key (returns raw key once)' })
  async createApiKey(
    @Body() dto: CreateApiKeyDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createApiKey(dto, user);
  }

  @Get('api-keys')
  @Roles('ADMIN_SETTINGS', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List API keys (keys are masked)' })
  async listApiKeys(
    @CurrentUser() user: JwtPayload,
    @Query() filter: IntegrationFilterDto,
  ) {
    return this.service.listApiKeys(user.orgId!, filter);
  }

  @Delete('api-keys/:apiKeyId')
  @Roles('ADMIN_SETTINGS', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Revoke an API key' })
  async revokeApiKey(
    @Param('apiKeyId') apiKeyId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.revokeApiKey(user.orgId!, apiKeyId, user);
  }

  // ── Webhooks ─────────────────────────────────────────────────────────────

  @Post('webhooks')
  @Roles('ADMIN_SETTINGS', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Create a new webhook' })
  async createWebhook(
    @Body() dto: CreateWebhookDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createWebhook(dto, user);
  }

  @Get('webhooks')
  @Roles('ADMIN_SETTINGS', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List webhooks (secrets are masked)' })
  async listWebhooks(
    @CurrentUser() user: JwtPayload,
    @Query() filter: IntegrationFilterDto,
  ) {
    return this.service.listWebhooks(user.orgId!, filter);
  }

  @Put('webhooks/:webhookId')
  @Roles('ADMIN_SETTINGS', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Update a webhook URL or events' })
  async updateWebhook(
    @Param('webhookId') webhookId: string,
    @Body() dto: UpdateWebhookDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateWebhook(user.orgId!, webhookId, dto, user);
  }

  @Post('webhooks/:webhookId/test')
  @Roles('ADMIN_SETTINGS', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Send a test webhook delivery' })
  async testWebhook(
    @Param('webhookId') webhookId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.testWebhook(user.orgId!, webhookId, user);
  }

  @Delete('webhooks/:webhookId')
  @Roles('ADMIN_SETTINGS', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Soft-delete a webhook' })
  async deleteWebhook(
    @Param('webhookId') webhookId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.deleteWebhook(user.orgId!, webhookId, user);
  }
}
