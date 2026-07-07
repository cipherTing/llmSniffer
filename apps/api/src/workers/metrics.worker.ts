import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { MetricsService } from '../metrics/metrics.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService, type MetricsJobData } from '../queue/queue.service';

@Injectable()
export class MetricsWorker {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly queueService: QueueService,
  ) {}

  async processJob(job: Job<MetricsJobData>) {
    await this.metricsService.aggregateProbe({
      siteId: job.data.siteId,
      probeId: job.data.probeId,
      region: job.data.region,
    });
    await this.queueService.addSnapshotJob({ reason: 'probe-result' });
  }
}

@Processor(QUEUE_NAMES.metricsAggregate, {
  concurrency: Number(process.env.METRICS_WORKER_CONCURRENCY ?? 5),
})
export class MetricsProcessor extends WorkerHost {
  constructor(private readonly metricsWorker: MetricsWorker) {
    super();
  }

  async process(job: Job<MetricsJobData>) {
    await this.metricsWorker.processJob(job);
  }
}
