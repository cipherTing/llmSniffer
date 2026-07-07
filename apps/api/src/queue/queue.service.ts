import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { QUEUE_NAMES, type ProbeRegion } from './queue.constants';

export type ProbeJobData = {
  siteId: string;
  probeId: string;
  region: ProbeRegion;
  scheduledAt: string;
  bucketStart: string;
};

export type MetricsJobData = {
  siteId: string;
  probeId: string;
  region: ProbeRegion;
  bucketStart: string;
};

export type SnapshotJobData = {
  reason: 'probe-result' | 'manual-refresh';
};

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.probe)
    private readonly probeQueue: Queue<ProbeJobData>,
    @InjectQueue(QUEUE_NAMES.metricsAggregate)
    private readonly metricsAggregateQueue: Queue<MetricsJobData>,
    @InjectQueue(QUEUE_NAMES.snapshotRefresh)
    private readonly snapshotRefreshQueue: Queue<SnapshotJobData>,
  ) {}

  async addProbeJob(data: ProbeJobData) {
    return this.probeQueue.add('run-probe', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 30_000 },
      jobId: safeJobId(
        'probe',
        data.siteId,
        data.probeId,
        data.region,
        data.bucketStart,
      ),
      removeOnComplete: { age: 86_400, count: 10_000 },
      removeOnFail: { age: 604_800, count: 50_000 },
    });
  }

  async addMetricsJob(data: MetricsJobData) {
    return this.metricsAggregateQueue.add('aggregate-probe', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10_000 },
      jobId: safeJobId(
        'metrics',
        data.siteId,
        data.probeId,
        data.region,
        data.bucketStart,
      ),
      removeOnComplete: { age: 86_400, count: 10_000 },
      removeOnFail: { age: 604_800, count: 50_000 },
    });
  }

  async addSnapshotJob(data: SnapshotJobData) {
    return this.snapshotRefreshQueue.add('refresh-snapshot', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10_000 },
      removeOnComplete: true,
      removeOnFail: { age: 86_400, count: 5_000 },
    });
  }

}

function safeJobId(...parts: string[]) {
  return parts.map((part) => part.replaceAll(':', '-')).join('-');
}
