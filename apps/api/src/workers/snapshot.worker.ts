import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue/queue.constants';
import type { SnapshotJobData } from '../queue/queue.service';
import { SnapshotService } from '../snapshots/snapshot.service';

@Injectable()
export class SnapshotWorker {
  constructor(
    private readonly snapshotService: SnapshotService,
  ) {}

  async processJob(_job: Job<SnapshotJobData>) {
    await this.snapshotService.rebuildPublicRelaysSnapshot();
  }
}

@Processor(QUEUE_NAMES.snapshotRefresh, { concurrency: 1 })
export class SnapshotProcessor extends WorkerHost {
  constructor(private readonly snapshotWorker: SnapshotWorker) {
    super();
  }

  async process(job: Job<SnapshotJobData>) {
    await this.snapshotWorker.processJob(job);
  }
}
