import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';

export interface AuditEntry {
  orgId?: string;
  buId?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          ...entry,
          oldValue: entry.oldValue as Prisma.InputJsonValue | undefined,
          newValue: entry.newValue as Prisma.InputJsonValue | undefined,
        },
      });
    } catch {
      // Audit log failures must never break the main flow
    }
  }
}
