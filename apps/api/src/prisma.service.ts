import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async setTenantContext(orgId: string, buIds?: string[], buIsolation = true) {
    await this.$executeRaw`SELECT set_config('app.current_org_id', ${orgId}, true)`;
    const buIdStr = buIds && buIds.length > 0 ? buIds.join(',') : '';
    await this.$executeRaw`SELECT set_config('app.accessible_bu_ids', ${buIdStr}, true)`;
    await this.$executeRaw`SELECT set_config('app.bu_isolation', ${String(buIsolation)}, true)`;
  }
}
