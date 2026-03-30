import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { CreateTemplateDto, CreateFromTemplateDto } from './dto/template.dto';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(orgId: string) {
    return this.prisma.rfxTemplate.findMany({
      where: { orgId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(orgId: string, dto: CreateTemplateDto, user: JwtPayload) {
    let lotsJson: Prisma.InputJsonValue | undefined;

    // If sourcing from an existing event, snapshot its lots + line items
    if (dto.sourceEventId) {
      const event = await this.prisma.rfxEvent.findFirst({
        where: { id: dto.sourceEventId, orgId, isActive: true },
        include: {
          lots: {
            where: { isActive: true },
            include: { lineItems: { where: { isActive: true } } },
            orderBy: { lotNumber: 'asc' },
          },
        },
      });
      if (event) {
        lotsJson = event.lots.map(lot => ({
          lotNumber: lot.lotNumber,
          title: lot.title,
          description: lot.description,
          currency: lot.currency,
          estimatedValue: lot.estimatedValue?.toString(),
          lineItems: lot.lineItems.map(li => ({
            itemNumber: li.itemNumber,
            description: li.description,
            quantity: li.quantity?.toString(),
            uom: li.uom,
            targetPrice: li.targetPrice?.toString(),
            notes: li.notes,
          })),
        })) as Prisma.InputJsonValue;
      }
    }

    const template = await this.prisma.rfxTemplate.create({
      data: {
        orgId,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        currency: dto.currency ?? 'USD',
        createdById: user.sub,
        lotsJson,
      },
    });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'CREATE',
      entityType: 'RFX_TEMPLATE',
      entityId: template.id,
      newValue: { name: dto.name, type: dto.type },
    });

    this.logger.log(`Template created: ${template.id} orgId=${orgId}`);
    return template;
  }

  async createFromTemplate(orgId: string, dto: CreateFromTemplateDto, user: JwtPayload) {
    const template = await this.prisma.rfxTemplate.findFirst({
      where: { id: dto.templateId, orgId, isActive: true },
    });
    if (!template) throw new NotFoundException('Template not found');

    // Generate auto ref number
    const year = new Date().getFullYear();
    const count = await this.prisma.rfxEvent.count({ where: { orgId } });
    const refNumber = `${template.type}-${year}-${String(count + 1).padStart(3, '0')}`;

    const lots = Array.isArray(template.lotsJson) ? template.lotsJson as Array<{
      lotNumber: number;
      title: string;
      description?: string | null;
      currency?: string | null;
      estimatedValue?: string | null;
      lineItems?: Array<{
        itemNumber: number;
        description: string;
        quantity?: string | null;
        uom?: string | null;
        targetPrice?: string | null;
        notes?: string | null;
      }>;
    }> : [];

    const event = await this.prisma.rfxEvent.create({
      data: {
        orgId,
        buId: dto.buId ?? null,
        createdById: user.sub,
        type: template.type,
        refNumber,
        title: dto.title,
        currency: template.currency,
        lots: lots.length > 0 ? {
          create: lots.map(lot => ({
            orgId,
            lotNumber: lot.lotNumber,
            title: lot.title,
            description: lot.description ?? null,
            currency: lot.currency ?? null,
            estimatedValue: lot.estimatedValue ? parseFloat(lot.estimatedValue) : null,
            lineItems: lot.lineItems?.length ? {
              create: lot.lineItems.map(li => ({
                orgId,
                itemNumber: li.itemNumber,
                description: li.description,
                quantity: li.quantity ? parseFloat(li.quantity) : null,
                uom: li.uom ?? null,
                targetPrice: li.targetPrice ? parseFloat(li.targetPrice) : null,
                notes: li.notes ?? null,
              })),
            } : undefined,
          })),
        } : undefined,
      },
      include: { lots: { include: { lineItems: true } } },
    });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'CREATE',
      entityType: 'RFX_EVENT',
      entityId: event.id,
      newValue: { refNumber, fromTemplate: dto.templateId },
    });

    this.logger.log(`Event ${event.id} created from template ${dto.templateId}`);
    return event;
  }

  async delete(orgId: string, templateId: string, user: JwtPayload) {
    const template = await this.prisma.rfxTemplate.findFirst({
      where: { id: templateId, orgId, isActive: true },
    });
    if (!template) throw new NotFoundException('Template not found');

    await this.prisma.rfxTemplate.update({
      where: { id: templateId },
      data: { isActive: false },
    });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'DELETE',
      entityType: 'RFX_TEMPLATE',
      entityId: templateId,
      oldValue: { name: template.name },
    });
  }
}
