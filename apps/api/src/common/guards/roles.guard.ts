import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../decorators/current-user.decorator';
import { PrismaService } from '../../prisma.service';

// Cache: permission -> Set of roles that have that permission
const permissionRoleCache = new Map<string, Set<string>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let cacheLastCleared = Date.now();

/**
 * RolesGuard — checks if the user has the required role or permission.
 *
 * The @Roles() decorator values are treated as EITHER:
 *   1. Role names (direct match against user.roles[].role)
 *   2. Permission strings (lookup in role_permissions table)
 *   3. Permission match against JWT permissions[] array (fastest path)
 *
 * A user passes if ANY of the @Roles() values match via any of these 3 methods.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user || !user.roles) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const userRoleNames = user.roles.map((ur) => ur.role);
    const userPermissions = new Set(user.permissions ?? []);

    // Evict cache if TTL expired
    if (Date.now() - cacheLastCleared > CACHE_TTL_MS) {
      permissionRoleCache.clear();
      cacheLastCleared = Date.now();
    }

    for (const required of requiredRoles) {
      // 1. Direct role-name match (e.g. @Roles('PLATFORM_ADMIN'))
      if (userRoleNames.includes(required)) {
        return true;
      }

      // 2. Direct permission match from JWT (e.g. @Roles('EVENT_CREATE'))
      //    This is the fastest path — no DB lookup needed
      if (userPermissions.has(required)) {
        return true;
      }

      // 3. Permission-based check via RolePermission table
      //    Treats the @Roles() value as a permission string and checks
      //    which roles have that permission, then checks if user has any of those roles
      let rolesWithPermission = permissionRoleCache.get(required);

      if (!rolesWithPermission) {
        const records = await this.prisma.rolePermission.findMany({
          where: { permission: required },
          select: { role: true },
        });
        rolesWithPermission = new Set(records.map((r) => r.role));
        permissionRoleCache.set(required, rolesWithPermission);
      }

      const hasPermissionViaRole = userRoleNames.some((role) =>
        rolesWithPermission!.has(role),
      );

      if (hasPermissionViaRole) {
        return true;
      }
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
