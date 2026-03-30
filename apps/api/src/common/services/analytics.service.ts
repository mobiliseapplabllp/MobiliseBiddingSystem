import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';

export interface AnalyticsEventEntry {
  orgId?: string;
  buId?: string;
  userId?: string;
  eventType: string;
  entityType: string;
  entityId?: string;
  properties?: Record<string, unknown>;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async track(event: AnalyticsEventEntry): Promise<void> {
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          ...event,
          properties: event.properties as Prisma.InputJsonValue | undefined,
        },
      });
    } catch {
      // Analytics tracking failures must never break the main flow
    }
  }
}
