import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger, Inject, Optional } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(
    @Optional() @Inject(RedisService) private readonly redis?: RedisService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const durationMs = Date.now() - now;
        const user = request.user;
        const orgId = user?.orgId ?? '';
        const userId = user?.sub ?? '';

        this.logger.log(
          `${method} ${url} ${response.statusCode} - ${durationMs}ms` +
          (orgId ? ` orgId=${orgId}` : '') +
          (userId ? ` userId=${userId}` : ''),
        );

        // Track latency metrics in Redis for the performance dashboard
        this.recordLatencyMetric(method, url, durationMs).catch(() => {});
      }),
    );
  }

  /**
   * Store latency samples in Redis for per-endpoint p50/p95/p99 calculation.
   * Failures are swallowed — latency tracking never breaks the main flow.
   */
  private async recordLatencyMetric(method: string, url: string, durationMs: number): Promise<void> {
    if (!this.redis) return;

    try {
      // Normalize the URL: strip query params and UUIDs for grouping
      const normalizedUrl = this.normalizeUrl(url);
      const endpoint = `${method} ${normalizedUrl}`;
      const listKey = `latency:samples:${endpoint}`;

      const current = await this.redis.get(listKey);
      const samples: number[] = current ? JSON.parse(current) : [];
      samples.push(durationMs);

      // Keep only last 1000 samples
      if (samples.length > 1000) {
        samples.splice(0, samples.length - 1000);
      }

      await this.redis.set(listKey, JSON.stringify(samples), 3600); // 1 hour TTL
      await this.redis.incr(`latency:count:${endpoint}`);
    } catch {
      // Silent — never break main flow for metrics
    }
  }

  /**
   * Normalize URL by removing UUIDs and query strings for endpoint grouping.
   */
  private normalizeUrl(url: string): string {
    // Remove query string
    const path = url.split('?')[0];
    // Replace UUIDs with :id placeholder
    return path.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      ':id',
    );
  }
}
