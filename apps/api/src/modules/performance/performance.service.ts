import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';

export interface LatencyMetrics {
  endpoint: string;
  p50: number;
  p95: number;
  p99: number;
  count: number;
  avgMs: number;
}

export interface CacheStats {
  connected: boolean;
  keys: number;
  memoryUsed: string;
  hitRate: string;
  uptime: number;
}

export interface DatabaseStats {
  tableCount: number;
  totalSizeMB: number;
  tables: Array<{
    name: string;
    rowEstimate: number;
    sizeMB: number;
    indexSizeMB: number;
  }>;
}

export interface SlowQuery {
  endpoint: string;
  avgMs: number;
  maxMs: number;
  count: number;
}

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
  ) {}

  /**
   * Record a latency measurement for an endpoint in Redis.
   * Called by the enhanced LoggingInterceptor on every request.
   */
  async recordLatency(endpoint: string, durationMs: number): Promise<void> {
    try {
      const key = `latency:${endpoint}`;
      // Store in a Redis sorted set with timestamp as score for time-window queries
      const member = `${Date.now()}:${durationMs}`;
      await this.redis.set(
        `${key}:latest`,
        JSON.stringify({ ms: durationMs, at: Date.now() }),
        300, // 5 min TTL
      );

      // Increment request counter
      await this.redis.incr(`${key}:count`);

      // Track in a simple list (last 1000 measurements per endpoint)
      const listKey = `latency:samples:${endpoint}`;
      const current = await this.redis.get(listKey);
      const samples: number[] = current ? JSON.parse(current) : [];
      samples.push(durationMs);
      // Keep only last 1000 samples
      if (samples.length > 1000) {
        samples.splice(0, samples.length - 1000);
      }
      await this.redis.set(listKey, JSON.stringify(samples), 3600); // 1 hour TTL
    } catch {
      // Performance tracking failures never break main flow
    }
  }

  /**
   * Get cache (Redis) statistics.
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      // Try to get basic Redis info via a simple ping
      const testKey = `cache:stats:test:${Date.now()}`;
      await this.redis.set(testKey, '1', 5);
      const testResult = await this.redis.get(testKey);
      await this.redis.del(testKey);

      return {
        connected: testResult === '1',
        keys: 0, // Redis INFO not directly available through our service
        memoryUsed: 'N/A',
        hitRate: 'N/A',
        uptime: 0,
      };
    } catch {
      return {
        connected: false,
        keys: 0,
        memoryUsed: 'N/A',
        hitRate: 'N/A',
        uptime: 0,
      };
    }
  }

  /**
   * Pre-populate Redis cache with frequently accessed data.
   */
  async warmCache(entityType: string, userId: string, orgId: string): Promise<{ warmed: number }> {
    this.logger.log(`Warming cache for entityType=${entityType} orgId=${orgId}`);
    let warmed = 0;

    try {
      switch (entityType) {
        case 'RFX_EVENTS': {
          const events = await this.prisma.rfxEvent.findMany({
            where: { isActive: true },
            take: 100,
            orderBy: { updatedAt: 'desc' },
          });
          for (const event of events) {
            await this.redis.set(
              `cache:rfx:${event.id}`,
              JSON.stringify(event),
              600,
            );
            warmed++;
          }
          break;
        }
        case 'AUCTIONS': {
          const auctions = await this.prisma.auction.findMany({
            where: { isActive: true, status: { in: ['OPEN', 'PUBLISHED'] } },
            take: 50,
            orderBy: { updatedAt: 'desc' },
          });
          for (const auction of auctions) {
            await this.redis.set(
              `cache:auction:${auction.id}`,
              JSON.stringify(auction),
              300,
            );
            warmed++;
          }
          break;
        }
        case 'CONTRACTS': {
          const contracts = await this.prisma.contract.findMany({
            where: { isActive: true, status: 'ACTIVE' },
            take: 100,
            orderBy: { updatedAt: 'desc' },
          });
          for (const contract of contracts) {
            await this.redis.set(
              `cache:contract:${contract.id}`,
              JSON.stringify(contract),
              600,
            );
            warmed++;
          }
          break;
        }
        case 'MASTER_DATA': {
          const refData = await this.prisma.referenceData.findMany({
            where: { isActive: true },
          });
          for (const item of refData) {
            await this.redis.set(
              `cache:mdm:${item.type}:${item.code}`,
              JSON.stringify(item),
              1800,
            );
            warmed++;
          }
          break;
        }
        default:
          this.logger.warn(`Unknown entity type for cache warming: ${entityType}`);
      }

      await this.audit.log({
        orgId,
        userId,
        action: 'CACHE_WARM',
        entityType: 'PERFORMANCE',
        newValue: { entityType, warmed },
      });

      await this.analytics.track({
        orgId,
        userId,
        eventType: 'CACHE_WARMED',
        entityType: 'PERFORMANCE',
        properties: { entityType, warmed },
      });
    } catch (error) {
      this.logger.error(`Cache warming failed for ${entityType}`, (error as Error).stack);
    }

    return { warmed };
  }

  /**
   * Get slow queries (endpoints exceeding 200ms average).
   */
  async getSlowQueries(): Promise<SlowQuery[]> {
    const slowQueries: SlowQuery[] = [];

    try {
      // Scan all latency sample keys
      // Since our RedisService doesn't expose SCAN, we check known endpoint patterns
      const knownEndpoints = [
        'GET /api/v1/rfx-events',
        'GET /api/v1/auctions',
        'GET /api/v1/contracts',
        'GET /api/v1/awards',
        'GET /api/v1/evaluations',
        'GET /api/v1/suppliers',
        'GET /api/v1/analytics',
        'GET /api/v1/master-data',
        'POST /api/v1/auction-bids',
        'POST /api/v1/auth/login',
        'GET /api/v1/notifications',
      ];

      for (const endpoint of knownEndpoints) {
        const samplesRaw = await this.redis.get(`latency:samples:${endpoint}`);
        if (!samplesRaw) continue;

        const samples: number[] = JSON.parse(samplesRaw);
        if (samples.length === 0) continue;

        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        const max = Math.max(...samples);

        if (avg > 200) {
          slowQueries.push({
            endpoint,
            avgMs: Math.round(avg),
            maxMs: max,
            count: samples.length,
          });
        }
      }

      slowQueries.sort((a, b) => b.avgMs - a.avgMs);
    } catch (error) {
      this.logger.error('Failed to fetch slow queries', (error as Error).stack);
    }

    return slowQueries;
  }

  /**
   * Get database statistics (table sizes, index usage).
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    try {
      const tableStats: Array<{
        table_name: string;
        row_estimate: number;
        total_bytes: number;
        index_bytes: number;
      }>[] = await this.prisma.$queryRaw`
        SELECT
          relname AS table_name,
          n_live_tup AS row_estimate,
          pg_total_relation_size(quote_ident(relname)) AS total_bytes,
          pg_indexes_size(quote_ident(relname)) AS index_bytes
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(quote_ident(relname)) DESC
        LIMIT 50
      `;

      const tables = (tableStats as unknown as Array<{
        table_name: string;
        row_estimate: number;
        total_bytes: number;
        index_bytes: number;
      }>).map((t) => ({
        name: t.table_name,
        rowEstimate: Number(t.row_estimate),
        sizeMB: Math.round(Number(t.total_bytes) / 1024 / 1024 * 100) / 100,
        indexSizeMB: Math.round(Number(t.index_bytes) / 1024 / 1024 * 100) / 100,
      }));

      const totalSizeMB = tables.reduce((sum, t) => sum + t.sizeMB, 0);

      return {
        tableCount: tables.length,
        totalSizeMB: Math.round(totalSizeMB * 100) / 100,
        tables,
      };
    } catch (error) {
      this.logger.error('Failed to fetch database stats', (error as Error).stack);
      return { tableCount: 0, totalSizeMB: 0, tables: [] };
    }
  }

  /**
   * Get API latency metrics (p50, p95, p99) for all tracked endpoints.
   */
  async getApiLatencyMetrics(): Promise<LatencyMetrics[]> {
    const metrics: LatencyMetrics[] = [];

    try {
      const knownEndpoints = [
        'GET /api/v1/rfx-events',
        'GET /api/v1/auctions',
        'GET /api/v1/contracts',
        'GET /api/v1/awards',
        'GET /api/v1/evaluations',
        'GET /api/v1/suppliers',
        'GET /api/v1/analytics',
        'GET /api/v1/master-data',
        'POST /api/v1/auction-bids',
        'POST /api/v1/auth/login',
        'POST /api/v1/auth/refresh',
        'GET /api/v1/notifications',
        'GET /api/v1/health',
      ];

      for (const endpoint of knownEndpoints) {
        const samplesRaw = await this.redis.get(`latency:samples:${endpoint}`);
        if (!samplesRaw) continue;

        const samples: number[] = JSON.parse(samplesRaw);
        if (samples.length === 0) continue;

        const sorted = [...samples].sort((a, b) => a - b);
        const count = sorted.length;
        const avg = sorted.reduce((a, b) => a + b, 0) / count;
        const p50 = sorted[Math.floor(count * 0.5)] ?? 0;
        const p95 = sorted[Math.floor(count * 0.95)] ?? 0;
        const p99 = sorted[Math.floor(count * 0.99)] ?? 0;

        metrics.push({
          endpoint,
          p50: Math.round(p50),
          p95: Math.round(p95),
          p99: Math.round(p99),
          count,
          avgMs: Math.round(avg),
        });
      }

      metrics.sort((a, b) => b.p95 - a.p95);
    } catch (error) {
      this.logger.error('Failed to fetch latency metrics', (error as Error).stack);
    }

    return metrics;
  }
}
