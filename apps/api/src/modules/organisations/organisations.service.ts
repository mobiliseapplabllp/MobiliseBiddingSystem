import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateOrgRequestDto, CreateBuRequestDto, AssignRoleRequestDto, UpdateOrgRequestDto, UpdateBuRequestDto } from './dto/org.dto';

@Injectable()
export class OrganisationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrg(dto: CreateOrgRequestDto) {
    const existing = await this.prisma.organisation.findUnique({
      where: { subdomain: dto.subdomain },
    });
    if (existing) {
      throw new ConflictException('Subdomain already taken');
    }

    return this.prisma.organisation.create({
      data: {
        name: dto.name,
        country: dto.country,
        subdomain: dto.subdomain,
        defaultCurrency: dto.defaultCurrency || 'USD',
        defaultLocale: dto.defaultLocale || 'en',
        buIsolation: dto.buIsolation ?? true,
      },
    });
  }

  async listOrgs(userOrgId?: string | null, isPlatformAdmin = false) {
    const where: Record<string, unknown> = { isActive: true };
    // ORG_ADMIN can only see their own org; PLATFORM_ADMIN sees all
    if (!isPlatformAdmin && userOrgId) {
      where.id = userOrgId;
    }
    return this.prisma.organisation.findMany({
      where: where as any,
      include: { businessUnits: true },
      orderBy: { name: 'asc' },
    });
  }

  async getOrg(orgId: string) {
    const org = await this.prisma.organisation.findUnique({
      where: { id: orgId },
      include: { businessUnits: true },
    });
    if (!org) throw new NotFoundException('Organisation not found');
    return org;
  }

  async updateOrg(orgId: string, dto: UpdateOrgRequestDto) {
    const org = await this.prisma.organisation.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organisation not found');

    return this.prisma.organisation.update({
      where: { id: orgId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.defaultCurrency !== undefined && { defaultCurrency: dto.defaultCurrency }),
        ...(dto.defaultLocale !== undefined && { defaultLocale: dto.defaultLocale }),
        ...(dto.buIsolation !== undefined && { buIsolation: dto.buIsolation }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteOrg(orgId: string) {
    const org = await this.prisma.organisation.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organisation not found');
    return this.prisma.organisation.update({ where: { id: orgId }, data: { isActive: false } });
  }

  async createBu(orgId: string, dto: CreateBuRequestDto) {
    const org = await this.prisma.organisation.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organisation not found');

    return this.prisma.businessUnit.create({
      data: {
        orgId,
        name: dto.name,
        code: dto.code,
        currency: dto.currency,
      },
    });
  }

  async updateBu(orgId: string, buId: string, dto: UpdateBuRequestDto) {
    const bu = await this.prisma.businessUnit.findFirst({ where: { id: buId, orgId } });
    if (!bu) throw new NotFoundException('Business unit not found');

    return this.prisma.businessUnit.update({
      where: { id: buId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteBu(orgId: string, buId: string) {
    const bu = await this.prisma.businessUnit.findFirst({ where: { id: buId, orgId } });
    if (!bu) throw new NotFoundException('Business unit not found');
    return this.prisma.businessUnit.update({ where: { id: buId }, data: { isActive: false } });
  }

  async listBus(orgId: string) {
    return this.prisma.businessUnit.findMany({
      where: { orgId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async assignRole(orgId: string, dto: AssignRoleRequestDto) {
    const org = await this.prisma.organisation.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organisation not found');

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.userOrgRole.upsert({
      where: {
        userId_orgId_buId_role: {
          userId: dto.userId,
          orgId,
          buId: dto.buId || '',
          role: dto.role,
        },
      },
      update: { damLevel: dto.damLevel },
      create: {
        userId: dto.userId,
        orgId,
        buId: dto.buId || null,
        role: dto.role,
        damLevel: dto.damLevel,
      },
    });
  }

  async listUsers(orgId: string) {
    return this.prisma.user.findMany({
      where: { orgId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        createdAt: true,
        userOrgRoles: {
          where: { orgId },
          include: { bu: true },
        },
      },
      orderBy: { firstName: 'asc' },
    });
  }

  // ── Role Permission Management ──────────────────────────────────────────────

  private readonly BUILT_IN_ROLES = [
    'PLATFORM_ADMIN', 'ORG_ADMIN', 'BU_HEAD', 'EVENT_MANAGER',
    'BUYER', 'EVALUATOR', 'OBSERVER', 'SUPPLIER',
  ];

  async listRolePermissions() {
    const allPermissions = await this.prisma.rolePermission.findMany({
      orderBy: [{ role: 'asc' }, { permission: 'asc' }],
    });

    // Group by role
    const grouped: Record<string, { role: string; permissions: string[]; isBuiltIn: boolean }> = {};

    // Ensure all built-in roles appear even if they have no permissions yet
    for (const role of this.BUILT_IN_ROLES) {
      grouped[role] = { role, permissions: [], isBuiltIn: true };
    }

    for (const rp of allPermissions) {
      if (!grouped[rp.role]) {
        grouped[rp.role] = { role: rp.role, permissions: [], isBuiltIn: false };
      }
      grouped[rp.role].permissions.push(rp.permission);
    }

    return Object.values(grouped).sort((a, b) => {
      // Built-in first, then alphabetical
      if (a.isBuiltIn !== b.isBuiltIn) return a.isBuiltIn ? -1 : 1;
      return a.role.localeCompare(b.role);
    });
  }

  async getRolePermissions(role: string) {
    const permissions = await this.prisma.rolePermission.findMany({
      where: { role },
      orderBy: { permission: 'asc' },
    });
    return {
      role,
      permissions: permissions.map((p) => p.permission),
      isBuiltIn: this.BUILT_IN_ROLES.includes(role),
    };
  }

  async setRolePermissions(role: string, permissions: string[]) {
    // Delete existing permissions for this role, then create new ones
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { role } }),
      ...permissions.map((permission) =>
        this.prisma.rolePermission.create({ data: { role, permission } }),
      ),
    ]);

    return this.getRolePermissions(role);
  }

  async deleteRole(role: string) {
    if (this.BUILT_IN_ROLES.includes(role)) {
      throw new BadRequestException(`Cannot delete built-in role: ${role}`);
    }

    // Check if any users are assigned this role
    const usersWithRole = await this.prisma.userOrgRole.count({ where: { role } });
    if (usersWithRole > 0) {
      throw new BadRequestException(
        `Cannot delete role "${role}" — ${usersWithRole} user(s) are assigned to it. Reassign them first.`,
      );
    }

    await this.prisma.rolePermission.deleteMany({ where: { role } });
    return { deleted: true, role };
  }
}
