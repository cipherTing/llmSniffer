import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from './redis/redis.service';

type ComponentHealth = {
  ok: boolean;
  latencyMs: number;
  detail?: string;
};

@Injectable()
export class AppService {
  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly redisService: RedisService,
  ) {}

  getHello(): string {
    return 'LLMSniffer API is running.';
  }

  async getHealth() {
    const [mongo, redis] = await Promise.all([
      this.checkMongo(),
      this.checkRedis(),
    ]);

    return {
      ok: mongo.ok && redis.ok,
      service: 'llmsniffer-api',
      message: '初始化完毕',
      timestamp: new Date().toISOString(),
      dependencies: {
        mongo,
        redis,
      },
    };
  }

  private async checkMongo(): Promise<ComponentHealth> {
    const startedAt = Date.now();

    try {
      if (!this.mongoConnection.db) {
        throw new Error('MongoDB connection is not ready');
      }

      await this.mongoConnection.db.admin().ping();
      return {
        ok: true,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        detail: error instanceof Error ? error.message : 'MongoDB ping failed',
      };
    }
  }

  private async checkRedis(): Promise<ComponentHealth> {
    const startedAt = Date.now();

    try {
      await this.redisService.ping();
      return {
        ok: true,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        detail: error instanceof Error ? error.message : 'Redis ping failed',
      };
    }
  }
}
