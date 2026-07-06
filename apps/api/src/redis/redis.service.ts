import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const url = this.configService.getOrThrow<string>('REDIS_URL');

    this.client = createClient({ url });
    this.client.on('error', (error) => {
      this.logger.error(error instanceof Error ? error.stack : String(error));
    });

    await this.client.connect();
  }

  async onModuleDestroy() {
    if (this.client?.isOpen) {
      await this.client.close();
    }
  }

  async ping() {
    if (!this.client?.isReady) {
      throw new Error('Redis client is not ready');
    }

    return this.client.ping();
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.client?.isReady) {
      throw new Error('Redis client is not ready');
    }

    const value = await this.client.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number) {
    if (!this.client?.isReady) {
      throw new Error('Redis client is not ready');
    }

    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, payload, { EX: ttlSeconds });
      return;
    }
    await this.client.set(key, payload);
  }
}
