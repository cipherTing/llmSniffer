import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';
import { QUEUE_NAMES } from '../queue/queue.constants';
import type { SnapshotJobData } from '../queue/queue.service';
import { SnapshotService } from '../snapshots/snapshot.service';

@Injectable()
export class SnapshotWorker implements OnModuleInit, OnModuleDestroy {
  private worker: Worker<SnapshotJobData> | null = null;

  constructor(
    private readonly snapshotService: SnapshotService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    if (process.env.WORKER_ROLE !== 'snapshot') return;
    this.worker = new Worker<SnapshotJobData>(
      QUEUE_NAMES.snapshotRefresh,
      () => this.snapshotService.rebuildPublicRelaysSnapshot(),
      {
        connection: { url: this.configService.getOrThrow<string>('REDIS_URL') },
        concurrency: 1,
      },
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
