import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) return null; // stop retrying after 5 attempts
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Redis connection error: ${err.message}`);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected');
    });

    this.client.connect().catch((err) => {
      this.logger.warn(`Redis initial connect failed: ${err.message} — falling back to DB`);
    });
  }

  async onModuleDestroy() {
    await this.client.quit().catch(() => {});
  }

  private isReady(): boolean {
    return this.client.status === 'ready';
  }

  async get(key: string): Promise<string | null> {
    if (!this.isReady()) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isReady()) return;
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch {
      // Redis failures never break main flow
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isReady()) return;
    try {
      await this.client.del(key);
    } catch {
      // silent
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.isReady()) return 0;
    try {
      return await this.client.incr(key);
    } catch {
      return 0;
    }
  }
}
