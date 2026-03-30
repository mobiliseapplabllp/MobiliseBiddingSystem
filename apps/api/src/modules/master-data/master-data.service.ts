import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { CreateReferenceDataDto, UpdateReferenceDataDto } from './dto/master-data.dto';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class MasterDataService {
  private readonly logger = new Logger(MasterDataService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * List reference data by type.
   * If orgId is provided, merges platform defaults with org-specific overrides.
   * Org-specific entry with same code shadows the platform default.
   */
  async list(type: string, orgId?: string) {
    const items = await this.prisma.referenceData.findMany({
      where: {
        type,
        isActive: true,
        OR: [
          { orgId: null },
          ...(orgId ? [{ orgId }] : []),
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });

    // If orgId provided, org-specific entries shadow platform defaults with same code
    if (orgId) {
      const orgCodes = new Set(items.filter(i => i.orgId === orgId).map(i => i.code));
      return items.filter(i => i.orgId !== null || !orgCodes.has(i.code));
    }

    return items;
  }

  /**
   * List all MDM types with their counts — used by the admin overview page.
   */
  async listTypes() {
    const rows = await this.prisma.$queryRaw<{ type: string; count: bigint }[]>`
      SELECT type, COUNT(*) as count
      FROM reference_data
      WHERE "isActive" = true AND "orgId" IS NULL
      GROUP BY type
      ORDER BY type
    `;
    return rows.map(r => ({ type: r.type, count: Number(r.count) }));
  }

  async findById(id: string) {
    const item = await this.prisma.referenceData.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Reference data ${id} not found`);
    return item;
  }

  async create(dto: CreateReferenceDataDto, user: JwtPayload) {
    // Check uniqueness
    const existing = await this.prisma.referenceData.findFirst({
      where: { type: dto.type, code: dto.code, orgId: dto.orgId ?? null },
    });
    if (existing) {
      throw new ConflictException(`${dto.type} code '${dto.code}' already exists`);
    }

    const item = await this.prisma.referenceData.create({
      data: {
        type: dto.type,
        code: dto.code,
        label: dto.label,
        orgId: dto.orgId ?? null,
        metadata: dto.metadata ?? undefined,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    await this.audit.log({
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      action: 'CREATE',
      entityType: 'REFERENCE_DATA',
      entityId: item.id,
      newValue: item as unknown as Record<string, unknown>,
    });

    this.logger.log(`Created ${dto.type} '${dto.code}' by userId=${user.sub}`);
    return item;
  }

  async update(id: string, dto: UpdateReferenceDataDto, user: JwtPayload) {
    const existing = await this.findById(id);

    const updated = await this.prisma.referenceData.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    await this.audit.log({
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      action: 'UPDATE',
      entityType: 'REFERENCE_DATA',
      entityId: id,
      oldValue: existing as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    this.logger.log(`Updated reference data ${id} by userId=${user.sub}`);
    return updated;
  }

  async remove(id: string, user: JwtPayload) {
    const existing = await this.findById(id);

    await this.prisma.referenceData.update({
      where: { id },
      data: { isActive: false },
    });

    await this.audit.log({
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      action: 'DELETE',
      entityType: 'REFERENCE_DATA',
      entityId: id,
      oldValue: existing as unknown as Record<string, unknown>,
    });

    this.logger.log(`Deactivated reference data ${id} by userId=${user.sub}`);
    return { success: true };
  }
}
