import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ProbeResult,
  type ProbeResultDocument,
} from '../probes/schemas/probe-result.schema';
import type { ProbeResultStatus } from '../probes/probe.types';
import {
  MetricBucket,
  type MetricBucketDocument,
  type TimeWindow,
} from './schemas/metric-bucket.schema';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const WINDOW_STRATEGIES: Record<
  TimeWindow,
  { bucketCount: number; bucketMs: number }
> = {
  '90m': { bucketCount: 18, bucketMs: 5 * MINUTE_MS },
  '24h': { bucketCount: 24, bucketMs: HOUR_MS },
  '7d': { bucketCount: 28, bucketMs: 6 * HOUR_MS },
  '30d': { bucketCount: 30, bucketMs: DAY_MS },
};

type TrendStatus = 'ok' | 'slow' | 'partial' | 'down' | 'no_data';
type TrendBucket = {
  timestamp: string;
  status: TrendStatus;
  latencyMs: number | null;
  failureCount: number;
};
type TrendSlot = {
  start: Date;
  results: ProbeResultForMetrics[];
};
type ProbeResultForMetrics = {
  status: ProbeResultStatus;
  firstTokenLatencyMs?: number | null;
  bucketStart: Date;
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
    for (const window of Object.keys(WINDOW_STRATEGIES) as TimeWindow[]) {
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
    const strategy = WINDOW_STRATEGIES[input.window];
    const slots = createTrendSlots(input.now, strategy);
    const since = slots[0].start;
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
    const successes = results.filter((item) => isSuccessfulStatus(item.status));
    const latencies = successes
      .map((item) => item.firstTokenLatencyMs)
      .filter((value): value is number => typeof value === 'number')
      .sort((a, b) => a - b);
    const failureCount = results.length - successes.length;
    const trends = buildTrendBuckets(results, slots, strategy.bucketMs);
    const metrics = {
      uptimePercent:
        results.length === 0
          ? 0
          : Number(((successes.length / results.length) * 100).toFixed(2)),
      p50LatencyMs: percentile(latencies, 0.5),
      p95LatencyMs: percentile(latencies, 0.95),
      failureCount,
      longestOutageMinutes: longestOutageMinutes(trends, strategy.bucketMs),
      trends,
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

function createTrendSlots(
  now: Date,
  strategy: { bucketCount: number; bucketMs: number },
): TrendSlot[] {
  const lastBucketStartMs = floorToBucketStart(now, strategy.bucketMs);
  const firstBucketStartMs =
    lastBucketStartMs - (strategy.bucketCount - 1) * strategy.bucketMs;

  // 后端固定返回完整时间轴，前端只负责渲染，避免少量原始点撑满趋势条。
  return Array.from({ length: strategy.bucketCount }, (_, index) => ({
    start: new Date(firstBucketStartMs + index * strategy.bucketMs),
    results: [],
  }));
}

function floorToBucketStart(date: Date, bucketMs: number) {
  return Math.floor(date.getTime() / bucketMs) * bucketMs;
}

function buildTrendBuckets(
  results: ProbeResultForMetrics[],
  slots: TrendSlot[],
  bucketMs: number,
): TrendBucket[] {
  const firstBucketStartMs = slots[0].start.getTime();

  for (const result of results) {
    const bucketIndex = Math.floor(
      (result.bucketStart.getTime() - firstBucketStartMs) / bucketMs,
    );
    if (bucketIndex < 0 || bucketIndex >= slots.length) continue;
    slots[bucketIndex].results.push(result);
  }

  return slots.map((slot) => aggregateTrendSlot(slot));
}

function aggregateTrendSlot(slot: TrendSlot): TrendBucket {
  if (slot.results.length === 0) {
    return {
      timestamp: slot.start.toISOString(),
      status: 'no_data',
      latencyMs: null,
      failureCount: 0,
    };
  }

  const successes = slot.results.filter((item) => isSuccessfulStatus(item.status));
  const failureCount = slot.results.length - successes.length;
  const latencyMs = averageLatency(
    successes
      .map((item) => item.firstTokenLatencyMs)
      .filter((value): value is number => typeof value === 'number'),
  );

  return {
    timestamp: slot.start.toISOString(),
    status: statusForTrendSlot(successes, failureCount),
    latencyMs,
    failureCount,
  };
}

function statusForTrendSlot(
  successes: ProbeResultForMetrics[],
  failureCount: number,
): TrendStatus {
  if (successes.length === 0) return 'down';
  if (failureCount > 0) return 'partial';
  return successes.some((item) => item.status === 'slow') ? 'slow' : 'ok';
}

function isSuccessfulStatus(status: ProbeResultStatus) {
  return status === 'ok' || status === 'slow';
}

function averageLatency(values: number[]) {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function longestOutageMinutes(trends: TrendBucket[], bucketMs: number) {
  let longestRun = 0;
  let currentRun = 0;

  for (const bucket of trends) {
    if (bucket.status === 'down') {
      currentRun += 1;
      longestRun = Math.max(longestRun, currentRun);
    } else {
      currentRun = 0;
    }
  }

  return (longestRun * bucketMs) / MINUTE_MS;
}

function percentile(values: number[], ratio: number) {
  if (values.length === 0) return null;
  const index = Math.min(
    values.length - 1,
    Math.ceil(values.length * ratio) - 1,
  );
  return values[index];
}
