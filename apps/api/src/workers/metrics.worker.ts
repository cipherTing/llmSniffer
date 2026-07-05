import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { MetricsService } from '../metrics/metrics.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService, type MetricsJobData } from '../queue/queue.service';

@Injectable()
export class MetricsWorker implements OnModuleInit, OnModuleDestroy {
  private worker: Worker<MetricsJobData> | null = null;

  constructor(
    private readonly metricsService: MetricsService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    if (process.env.WORKER_ROLE !== 'metrics') return;

    this.worker = new Worker<MetricsJobData>(
      QUEUE_NAMES.metricsAggregate,
      (job) => this.processJob(job),
      {
        connection: { url: this.configService.getOrThrow<string>('REDIS_URL') },
        concurrency: Number(process.env.METRICS_WORKER_CONCURRENCY ?? 5),
      },
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  async processJob(job: Job<MetricsJobData>) {
    await this.metricsService.aggregateProbe({
      siteId: job.data.siteId,
      probeId: job.data.probeId,
      region: job.data.region,
    });
    await this.queueService.addSnapshotJob({ reason: 'probe-result' });
  }
}
