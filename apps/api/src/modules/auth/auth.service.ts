import { Injectable, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        userOrgRoles: {
          include: { org: true, bu: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // Support both bcrypt hashes and legacy seed hashes (SHA256)
    let passwordValid = false;
    if (user.passwordHash.startsWith('seed:')) {
      // DEPRECATED: SHA256 seed hashes — auto-migrate to bcrypt on successful login
      const seedHash = crypto.createHash('sha256').update(password).digest('hex');
      passwordValid = user.passwordHash === `seed:${seedHash}`;

      if (passwordValid) {
        // Auto-upgrade to bcrypt (10 rounds) — eliminates SHA256 weakness
        const bcryptHash = await bcrypt.hash(password, 10);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: bcryptHash },
        });
        this.logger.warn(`Auto-migrated seed hash to bcrypt for user ${user.id} (${user.email})`);
      }
    } else {
      passwordValid = await bcrypt.compare(password, user.passwordHash);
    }

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const roles = user.userOrgRoles.map((ur) => ({
      orgId: ur.orgId,
      buId: ur.buId,
      role: ur.role,
    }));

    // Resolve permissions from role_permissions table
    const permissions = await this.resolvePermissions(roles.map((r) => r.role));

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: user.orgId,
      roles,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });

    const refreshTokenValue = uuidv4();
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenValue,
        expiresAt: refreshExpiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  async refresh(refreshToken: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: {
            userOrgRoles: true,
          },
        },
      },
    });

    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    const user = tokenRecord.user;
    const roles = user.userOrgRoles.map((ur) => ({
      orgId: ur.orgId,
      buId: ur.buId,
      role: ur.role,
    }));

    // Resolve permissions from role_permissions table
    const permissions = await this.resolvePermissions(roles.map((r) => r.role));

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: user.orgId,
      roles,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });

    const newRefreshToken = uuidv4();
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: newRefreshToken,
        expiresAt: refreshExpiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userOrgRoles: {
          include: { org: true, bu: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const roleNames = user.userOrgRoles.map((ur) => ur.role);
    const permissions = await this.resolvePermissions(roleNames);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roles: user.userOrgRoles.map((ur) => ({
        orgId: ur.orgId,
        orgName: ur.org.name,
        buId: ur.buId,
        buName: ur.bu?.name || null,
        role: ur.role,
      })),
      permissions,
      preferredLocale: user.preferredLocale ?? 'en',
      preferredTheme: user.preferredTheme ?? 'light',
      createdAt: user.createdAt.toISOString(),
    };
  }

  // ── Update User Preferences ─────────────────────────────────────────────────

  async updatePreferences(userId: string, preferences: { locale?: string; theme?: string }) {
    const data: Record<string, string> = {};
    if (preferences.locale) data.preferredLocale = preferences.locale;
    if (preferences.theme) data.preferredTheme = preferences.theme;

    if (Object.keys(data).length === 0) return { updated: false };

    await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    this.logger.log(`User ${userId} updated preferences: ${JSON.stringify(data)}`);
    return { updated: true, ...data };
  }

  // ── Simulate / Switch User (authenticated, permission-checked) ────────────

  async simulateLogin(targetUserId: string, requester: JwtPayload) {
    const canImpersonate = requester.permissions?.includes('USER_IMPERSONATE') ?? false;
    const requesterOrgIds = new Set(requester.roles.map((r) => r.orgId));
    const isMultiOrg = requesterOrgIds.size > 1;

    if (!canImpersonate && !isMultiOrg) {
      throw new ForbiddenException('Insufficient permissions to switch user');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { userOrgRoles: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Multi-org users (without USER_IMPERSONATE) can only switch to users in their own orgs
    if (!canImpersonate) {
      const targetOrgIds = new Set(user.userOrgRoles.map((ur) => ur.orgId));
      const sharedOrg = [...targetOrgIds].some((id) => requesterOrgIds.has(id));
      if (!sharedOrg) {
        throw new ForbiddenException('Cannot switch to users outside your organisations');
      }
    }

    const roles = user.userOrgRoles.map((ur) => ({
      orgId: ur.orgId, buId: ur.buId, role: ur.role,
    }));
    const permissions = await this.resolvePermissions(roles.map((r) => r.role));

    const payload: JwtPayload = {
      sub: user.id, email: user.email, orgId: user.orgId, roles, permissions,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });

    const refreshTokenValue = uuidv4();
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);
    await this.prisma.refreshToken.create({
      data: { userId: user.id, token: refreshTokenValue, expiresAt: refreshExpiresAt },
    });

    this.logger.warn(`USER SWITCH: ${requester.email} → ${user.email} (${user.id})`);

    return { accessToken, refreshToken: refreshTokenValue, expiresIn: 900 };
  }

  async listOrgsForSimulate(requester: JwtPayload) {
    const canImpersonate = requester.permissions?.includes('USER_IMPERSONATE') ?? false;

    if (canImpersonate) {
      // USER_IMPERSONATE: see all orgs
      return this.prisma.organisation.findMany({
        where: { isActive: true },
        select: { id: true, name: true, subdomain: true },
        orderBy: { name: 'asc' },
      });
    }

    // Multi-org user: see only their orgs
    const orgIds = [...new Set(requester.roles.map((r) => r.orgId))];
    return this.prisma.organisation.findMany({
      where: { id: { in: orgIds }, isActive: true },
      select: { id: true, name: true, subdomain: true },
      orderBy: { name: 'asc' },
    });
  }

  async listUsersForSimulate(orgId: string, requester: JwtPayload) {
    const canImpersonate = requester.permissions?.includes('USER_IMPERSONATE') ?? false;
    const requesterOrgIds = new Set(requester.roles.map((r) => r.orgId));

    // Without USER_IMPERSONATE, only allow querying own orgs
    if (!canImpersonate && !requesterOrgIds.has(orgId)) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: { orgId, status: 'ACTIVE' },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        userOrgRoles: { where: { orgId }, select: { role: true } },
      },
      orderBy: { firstName: 'asc' },
    });
    return users.map((u) => ({
      id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName,
      roles: u.userOrgRoles.map((r) => r.role),
    }));
  }

  // ── Helper: resolve permissions from role_permissions table ────────────────

  private async resolvePermissions(roleNames: string[]): Promise<string[]> {
    const uniqueRoles = [...new Set(roleNames)];
    if (uniqueRoles.length === 0) return [];

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role: { in: uniqueRoles } },
      select: { permission: true },
    });

    return [...new Set(rolePermissions.map((rp) => rp.permission))].sort();
  }
}
