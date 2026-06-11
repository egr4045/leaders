import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
    });
    this.client.on('error', (e) => this.logger.warn(`Redis: ${e.message}`));
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
