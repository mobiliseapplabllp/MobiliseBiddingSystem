import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHash, randomBytes, createHmac } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  CreateApiKeyDto,
  CreateWebhookDto,
  UpdateWebhookDto,
  IntegrationFilterDto,
} from './dto/integration.dto';
import {
  ApiKeyCreatedEvent,
  ApiKeyRevokedEvent,
  WebhookCreatedEvent,
  WebhookTriggeredEvent,
} from '../../common/events/domain-events';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
  ) {}

  // ═════════════════════════════════════════════════════════════════════════
  // API Keys
  // ═════════════════════════════════════════════════════════════════════════

  async createApiKey(dto: CreateApiKeyDto, user: JwtPayload) {
    // Generate a cryptographically secure API key
    const rawKey = `esk_live_${randomBytes(32).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const prefix = rawKey.substring(0, 12); // "esk_live_xxx"

    const apiKey = await this.prisma.apiKey.create({
      data: {
        orgId: user.orgId!,
        name: dto.name,
        keyHash,
        prefix,
        scopes: dto.scopes,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdById: user.sub,
      },
    });

    this.eventEmitter.emit(
      'api-key.created',
      new ApiKeyCreatedEvent(apiKey.id, user.orgId!, user.sub, dto.name, prefix),
    );

    await this.audit.log({
      orgId: user.orgId!,
      userId: user.sub,
      action: 'CREATE',
      entityType: 'API_KEY',
      entityId: apiKey.id,
      newValue: { name: dto.name, prefix, scopes: dto.scopes },
    });

    await this.analytics.track({
      orgId: user.orgId!,
      userId: user.sub,
      eventType: 'API_KEY_CREATED',
      entityType: 'API_KEY',
      entityId: apiKey.id,
    });

    this.logger.log(`API key created: ${apiKey.id} prefix=${prefix} orgId=${user.orgId} userId=${user.sub}`);

    // Return the raw key ONCE — it can never be retrieved again
    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,
      prefix: apiKey.prefix,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      warning: 'Store this key securely. It will not be shown again.',
    };
  }

  async validateApiKey(rawKey: string) {
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.prisma.apiKey.findFirst({
      where: { keyHash, isActive: true },
    });

    if (!apiKey) {
      return null;
    }

    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      return null;
    }

    // Update last used timestamp
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return apiKey;
  }

  async listApiKeys(orgId: string, filter: IntegrationFilterDto) {
    const page = filter.page ?? 1;
    const pageSize = Math.min(filter.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const where: Prisma.ApiKeyWhereInput = { orgId, isActive: true };

    const [data, total] = await Promise.all([
      this.prisma.apiKey.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          name: true,
          prefix: true,
          scopes: true,
          expiresAt: true,
          lastUsedAt: true,
          isActive: true,
          createdById: true,
          createdAt: true,
          // Never return keyHash
        },
      }),
      this.prisma.apiKey.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async revokeApiKey(orgId: string, apiKeyId: string, user: JwtPayload) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id: apiKeyId, orgId, isActive: true },
    });
    if (!apiKey) {
      throw new NotFoundException(`API key ${apiKeyId} not found`);
    }

    await this.prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { isActive: false },
    });

    this.eventEmitter.emit(
      'api-key.revoked',
      new ApiKeyRevokedEvent(apiKeyId, orgId, user.sub),
    );

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'DELETE',
      entityType: 'API_KEY',
      entityId: apiKeyId,
      oldValue: { name: apiKey.name, prefix: apiKey.prefix },
    });

    this.logger.log(`API key revoked: ${apiKeyId} orgId=${orgId} userId=${user.sub}`);
    return { message: 'API key revoked' };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Webhooks
  // ═════════════════════════════════════════════════════════════════════════

  private validateWebhookUrl(url: string): void {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname;
      // Block private/internal IP ranges (SSRF prevention)
      const blocked = [
        /^127\./, /^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./, /^192\.168\./,
        /^0\./, /^169\.254\./, /^::1$/, /^localhost$/i, /^.*\.local$/i,
      ];
      if (blocked.some((r) => r.test(hostname))) {
        throw new BadRequestException(`Webhook URL cannot point to private/internal addresses: ${hostname}`);
      }
      if (!['https:', 'http:'].includes(parsed.protocol)) {
        throw new BadRequestException('Webhook URL must use HTTP or HTTPS protocol');
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Invalid webhook URL format');
    }
  }

  async createWebhook(dto: CreateWebhookDto, user: JwtPayload) {
    this.validateWebhookUrl(dto.url);
    const secret = randomBytes(32).toString('hex');

    const webhook = await this.prisma.webhook.create({
      data: {
        orgId: user.orgId!,
        url: dto.url,
        events: dto.events,
        secret,
      },
    });

    this.eventEmitter.emit(
      'webhook.created',
      new WebhookCreatedEvent(webhook.id, user.orgId!, user.sub, dto.url, dto.events),
    );

    await this.audit.log({
      orgId: user.orgId!,
      userId: user.sub,
      action: 'CREATE',
      entityType: 'WEBHOOK',
      entityId: webhook.id,
      newValue: { url: dto.url, events: dto.events },
    });

    await this.analytics.track({
      orgId: user.orgId!,
      userId: user.sub,
      eventType: 'WEBHOOK_CREATED',
      entityType: 'WEBHOOK',
      entityId: webhook.id,
    });

    this.logger.log(`Webhook created: ${webhook.id} url=${dto.url} orgId=${user.orgId} userId=${user.sub}`);

    return {
      ...webhook,
      secretPreview: secret.substring(0, 8) + '...',
      note: 'Store the secret from the response. It is used for HMAC verification.',
    };
  }

  async listWebhooks(orgId: string, filter: IntegrationFilterDto) {
    const page = filter.page ?? 1;
    const pageSize = Math.min(filter.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const where: Prisma.WebhookWhereInput = { orgId, isActive: true };

    const [data, total] = await Promise.all([
      this.prisma.webhook.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          url: true,
          events: true,
          isActive: true,
          lastTriggeredAt: true,
          failureCount: true,
          createdAt: true,
          updatedAt: true,
          // Never return secret
        },
      }),
      this.prisma.webhook.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async updateWebhook(orgId: string, webhookId: string, dto: UpdateWebhookDto, user: JwtPayload) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id: webhookId, orgId, isActive: true },
    });
    if (!webhook) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    const oldValue = { url: webhook.url, events: webhook.events };

    const updated = await this.prisma.webhook.update({
      where: { id: webhookId },
      data: {
        ...(dto.url !== undefined ? { url: dto.url } : {}),
        ...(dto.events !== undefined ? { events: dto.events } : {}),
      },
    });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'UPDATE',
      entityType: 'WEBHOOK',
      entityId: webhookId,
      oldValue,
      newValue: { url: updated.url, events: updated.events },
    });

    return updated;
  }

  async testWebhook(orgId: string, webhookId: string, user: JwtPayload) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id: webhookId, orgId, isActive: true },
    });
    if (!webhook) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook delivery' },
    };

    const result = await this.deliverWebhook(webhook.id, webhook.url, webhook.secret, testPayload);

    this.logger.log(`Webhook test sent: ${webhookId} success=${result.success} orgId=${orgId} userId=${user.sub}`);

    return result;
  }

  async deleteWebhook(orgId: string, webhookId: string, user: JwtPayload) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id: webhookId, orgId, isActive: true },
    });
    if (!webhook) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    await this.prisma.webhook.update({
      where: { id: webhookId },
      data: { isActive: false },
    });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'DELETE',
      entityType: 'WEBHOOK',
      entityId: webhookId,
      oldValue: { url: webhook.url, events: webhook.events },
    });

    this.logger.log(`Webhook deleted: ${webhookId} orgId=${orgId} userId=${user.sub}`);
    return { message: 'Webhook deleted' };
  }

  // ── Trigger Webhooks (called from domain event listeners) ────────────────

  async triggerWebhooks(orgId: string, eventType: string, payload: Record<string, unknown>) {
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        orgId,
        isActive: true,
        events: { has: eventType },
      },
    });

    const results = await Promise.allSettled(
      webhooks.map(async (webhook) => {
        const delivery = await this.deliverWebhook(
          webhook.id,
          webhook.url,
          webhook.secret,
          { event: eventType, timestamp: new Date().toISOString(), data: payload },
        );

        this.eventEmitter.emit(
          'webhook.triggered',
          new WebhookTriggeredEvent(webhook.id, orgId, eventType, delivery.success),
        );

        return delivery;
      }),
    );

    return results;
  }

  // ── Internal: Deliver Webhook ────────────────────────────────────────────

  private async deliverWebhook(
    webhookId: string,
    url: string,
    secret: string,
    payload: Record<string, unknown>,
  ) {
    const body = JSON.stringify(payload);
    const signature = createHmac('sha256', secret).update(body).digest('hex');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Id': webhookId,
        },
        body,
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      const success = response.ok;

      await this.prisma.webhook.update({
        where: { id: webhookId },
        data: {
          lastTriggeredAt: new Date(),
          failureCount: success ? 0 : { increment: 1 },
        },
      });

      return {
        success,
        statusCode: response.status,
        webhookId,
      };
    } catch (error) {
      await this.prisma.webhook.update({
        where: { id: webhookId },
        data: {
          lastTriggeredAt: new Date(),
          failureCount: { increment: 1 },
        },
      });

      this.logger.error(`Webhook delivery failed: ${webhookId} url=${url}`, (error as Error).stack);

      return {
        success: false,
        statusCode: 0,
        webhookId,
        error: (error as Error).message,
      };
    }
  }
}
