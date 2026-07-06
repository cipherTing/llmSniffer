import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { ProbeProvider, ProbeRegion } from './queue.constants';

export type ProbeJobData = {
  provider: ProbeProvider;
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

type QueueSet = {
  probeOpenai: Queue<ProbeJobData>;
  probeAnthropic: Queue<ProbeJobData>;
  probeGemini: Queue<ProbeJobData>;
  metricsAggregate: Queue<MetricsJobData>;
  snapshotRefresh: Queue<SnapshotJobData>;
};

@Injectable()
export class QueueService {
  constructor(private readonly queues: QueueSet) {}

  async addProbeJob(data: ProbeJobData) {
    const queue = this.providerQueue(data.provider);
    return queue.add('run-probe', data, {
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
    return this.queues.metricsAggregate.add('aggregate-probe', data, {
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
    return this.queues.snapshotRefresh.add('refresh-snapshot', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10_000 },
      removeOnComplete: true,
      removeOnFail: { age: 86_400, count: 5_000 },
    });
  }

  private providerQueue(provider: ProbeProvider) {
    if (provider === 'OpenAI') return this.queues.probeOpenai;
    if (provider === 'Anthropic') return this.queues.probeAnthropic;
    return this.queues.probeGemini;
  }
}

function safeJobId(...parts: string[]) {
  return parts.map((part) => part.replaceAll(':', '-')).join('-');
}
