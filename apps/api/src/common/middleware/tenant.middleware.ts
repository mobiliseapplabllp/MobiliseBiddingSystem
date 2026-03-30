import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma.service';

/**
 * TenantMiddleware sets PostgreSQL session variables for Row-Level Security (RLS).
 *
 * Behaviour:
 *  - Authenticated user with orgId → sets full tenant context (orgId + BU IDs)
 *  - Authenticated user without orgId (PLATFORM_ADMIN) → sets empty context (RLS bypass by design)
 *  - Unauthenticated request → sets restrictive empty-string context.
 *    RLS policies use `current_org_id() = '' OR "orgId" = current_org_id()`.
 *    When empty string is set, the `= ''` clause matches, allowing access.
 *    This is safe ONLY because all data endpoints are behind @UseGuards(JwtAuthGuard).
 *    Public endpoints (health, login, swagger) don't query tenant-scoped tables.
 *
 * SECURITY NOTE: If a new public endpoint is added that queries tenant-scoped
 * tables, it MUST explicitly set a restrictive tenant context or be rewritten
 * to use a different data access pattern.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const user = (req as any).user;

    if (user?.orgId) {
      // Authenticated user with org context — set full RLS context
      const buIds = user.roles
        ?.filter((r: any) => r.buId)
        .map((r: any) => r.buId) || [];

      await this.prisma.setTenantContext(user.orgId, buIds);
    } else if (user?.sub) {
      // Authenticated user WITHOUT orgId (e.g. PLATFORM_ADMIN)
      // Set empty context — RLS bypass by design for platform admins
      await this.prisma.setTenantContext('', [], false);
    } else {
      // Unauthenticated request (login, health, swagger, etc.)
      // Set a restrictive "no-org" context — prevents accidental leaks
      // if any public endpoint ever queries a tenant-scoped table.
      // Using a dummy UUID that matches no real org.
      await this.prisma.setTenantContext('00000000-0000-0000-0000-000000000000', [], false);
    }

    next();
  }
}
