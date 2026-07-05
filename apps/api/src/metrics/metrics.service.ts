import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ProbeResult,
  type ProbeResultDocument,
} from '../probes/schemas/probe-result.schema';
import {
  MetricBucket,
  type MetricBucketDocument,
  type TimeWindow,
} from './schemas/metric-bucket.schema';

const WINDOW_MS: Record<TimeWindow, number> = {
  '90m': 90 * 60_000,
  '24h': 24 * 60 * 60_000,
  '7d': 7 * 24 * 60 * 60_000,
  '30d': 30 * 24 * 60 * 60_000,
};

@Injectable()
export class MetricsService {
  constructor(
    @InjectModel(ProbeResult.name)
    private readonly resultModel: Model<ProbeResultDocument>,
    @InjectModel(MetricBucket.name)
    private readonly bucketModel: Model<MetricBucketDocument>,
  ) {}

  async aggregateProbe(input: {
    siteId: string;
    probeId: string;
    region: 'default';
    now?: Date;
  }) {
    const now = input.now ?? new Date();
    for (const window of Object.keys(WINDOW_MS) as TimeWindow[]) {
      await this.aggregateProbeWindow({ ...input, window, now });
    }
  }

  async aggregateProbeWindow(input: {
    siteId: string;
    probeId: string;
    region: 'default';
    window: TimeWindow;
    now: Date;
  }) {
    const since = new Date(input.now.getTime() - WINDOW_MS[input.window]);
    const results = await this.resultModel
      .find({
        siteId: input.siteId,
        probeId: input.probeId,
        region: input.region,
        bucketStart: { $gte: since, $lte: input.now },
      })
      .sort({ bucketStart: 1 })
      .exec();

    // 聚合只基于探测结果本身，不读取站点赞助等级，避免影响频率或指标口径。
    const successes = results.filter(
      (item) => item.status === 'ok' || item.status === 'slow',
    );
    const latencies = successes
      .map((item) => item.firstTokenLatencyMs)
      .filter((value): value is number => typeof value === 'number')
      .sort((a, b) => a - b);
    const failureCount = results.length - successes.length;
    const metrics = {
      uptimePercent:
        results.length === 0
          ? 0
          : Number(((successes.length / results.length) * 100).toFixed(2)),
      p50LatencyMs: percentile(latencies, 0.5),
      p95LatencyMs: percentile(latencies, 0.95),
      failureCount,
      longestOutageMinutes: failureCount > 0 ? 5 : 0,
      trends: results.map((item) => ({
        timestamp: item.bucketStart.toISOString(),
        status: item.status === 'config_error' ? 'down' : item.status,
        latencyMs: item.firstTokenLatencyMs ?? null,
        failureCount: item.status === 'ok' || item.status === 'slow' ? 0 : 1,
      })),
    };

    await this.bucketModel
      .findOneAndUpdate(
        {
          siteId: input.siteId,
          probeId: input.probeId,
          region: input.region,
          window: input.window,
        },
        { $set: { ...metrics, generatedAt: input.now } },
        { new: true, upsert: true, runValidators: true },
      )
      .exec();

    return metrics;
  }
}

function percentile(values: number[], ratio: number) {
  if (values.length === 0) return null;
  const index = Math.min(
    values.length - 1,
    Math.ceil(values.length * ratio) - 1,
  );
  return values[index];
}
