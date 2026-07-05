import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  MetricBucket,
  type MetricBucketDocument,
} from '../metrics/schemas/metric-bucket.schema';
import {
  ProbeResult,
  type ProbeResultDocument,
} from '../probes/schemas/probe-result.schema';
import { RedisService } from '../redis/redis.service';
import {
  MonitoredSite,
  type MonitoredSiteDocument,
} from '../sites/schemas/monitored-site.schema';
import {
  RelaySnapshot,
  type RelaySnapshotDocument,
} from './schemas/relay-snapshot.schema';

export const PUBLIC_RELAYS_SNAPSHOT_KEY = 'public:relays:snapshot';

const TIME_WINDOWS = ['90m', '24h', '7d', '30d'] as const;

type TimeWindow = (typeof TIME_WINDOWS)[number];
type RelayStatus = 'operational' | 'flaky' | 'degraded' | 'down' | 'no_data';
type TrendBucket = {
  timestamp: string;
  status: string;
  latencyMs: number | null;
  failureCount: number;
};
type WindowMetrics = {
  uptimePercent: number;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
  failureCount: number;
  longestOutageMinutes: number;
};
export type RelayHealthSnapshot = {
  generatedAt: string;
  relays: {
    id: string;
    name: string;
    domain: string;
    url: string;
    sponsorTier: string;
    providers: string[];
    channels: {
      id: string;
      provider: string;
      label: string;
      trends: Record<TimeWindow, TrendBucket[]>;
    }[];
    collectedDays: number;
    monitorIntervalSeconds: number;
    current: {
      status: RelayStatus;
      latencyMs: number | null;
      firstTokenLatencyMs: number | null;
      latestCheckAt: string;
      reason: string;
    };
    windows: Record<TimeWindow, WindowMetrics>;
  }[];
};

@Injectable()
export class SnapshotService {
  constructor(
    @InjectModel(MonitoredSite.name)
    private readonly siteModel: Model<MonitoredSiteDocument>,
    @InjectModel(MetricBucket.name)
    private readonly bucketModel: Model<MetricBucketDocument>,
    @InjectModel(ProbeResult.name)
    private readonly resultModel: Model<ProbeResultDocument>,
    private readonly redisService: RedisService,
    @InjectModel(RelaySnapshot.name)
    private readonly snapshotModel: Model<RelaySnapshotDocument>,
  ) {}

  async rebuildPublicRelaysSnapshot(): Promise<RelayHealthSnapshot> {
    const generatedAt = new Date().toISOString();
    const sites = await this.siteModel
      .find()
      .sort({ sponsorTier: 1, createdAt: -1 })
      .exec();
    const relays = await Promise.all(
      sites.map((site) => this.buildRelay(site, generatedAt)),
    );
    const snapshot = { generatedAt, relays };

    await this.redisService.setJson(PUBLIC_RELAYS_SNAPSHOT_KEY, snapshot, 30);
    await this.snapshotModel
      .findOneAndUpdate(
        { key: PUBLIC_RELAYS_SNAPSHOT_KEY },
        {
          $set: {
            key: PUBLIC_RELAYS_SNAPSHOT_KEY,
            generatedAt: new Date(generatedAt),
            snapshot,
          },
        },
        { new: true, upsert: true, runValidators: true },
      )
      .exec();

    return snapshot;
  }

  private async buildRelay(site: MonitoredSiteDocument, generatedAt: string) {
    const buckets = await this.bucketModel
      .find({ siteId: site._id.toString() })
      .exec();
    const latest = await this.resultModel
      .findOne({ siteId: site._id.toString() })
      .sort({ bucketStart: -1 })
      .exec();

    return {
      id: site._id.toString(),
      name: site.name,
      domain: site.domain,
      url: site.url,
      sponsorTier: site.sponsorTier,
      providers: site.providers,
      channels: site.probes.map((probe, index) => ({
        id: probe.id,
        provider: site.providers[index % site.providers.length],
        label: probe.modelName,
        trends: windowsForProbe(buckets, probe.id),
      })),
      collectedDays: 0,
      monitorIntervalSeconds: site.monitorIntervalSeconds,
      current: latest
        ? {
            status: statusFromProbeResult(latest.status),
            latencyMs: latest.firstTokenLatencyMs ?? null,
            firstTokenLatencyMs: latest.firstTokenLatencyMs ?? null,
            latestCheckAt: latest.bucketStart.toISOString(),
            reason: latest.reason,
          }
        : {
            status: 'no_data' as const,
            latencyMs: null,
            firstTokenLatencyMs: null,
            latestCheckAt: generatedAt,
            reason: '等待首次探测',
          },
      windows: metricsForRelay(buckets),
    };
  }
}

function windowsForProbe(buckets: MetricBucketDocument[], probeId: string) {
  return Object.fromEntries(
    TIME_WINDOWS.map((window) => {
      const bucket = buckets.find(
        (item) => item.probeId === probeId && item.window === window,
      );
      return [window, bucket?.trends ?? []];
    }),
  ) as Record<TimeWindow, TrendBucket[]>;
}

function metricsForRelay(buckets: MetricBucketDocument[]) {
  return Object.fromEntries(
    TIME_WINDOWS.map((window) => {
      const windowBuckets = buckets.filter((item) => item.window === window);
      if (windowBuckets.length === 0) {
        return [
          window,
          {
            uptimePercent: 0,
            p50LatencyMs: null,
            p95LatencyMs: null,
            failureCount: 0,
            longestOutageMinutes: 0,
          },
        ];
      }
      return [
        window,
        {
          uptimePercent: average(
            windowBuckets.map((item) => item.uptimePercent),
          ),
          p50LatencyMs: minNullable(
            windowBuckets.map((item) => item.p50LatencyMs ?? null),
          ),
          p95LatencyMs: maxNullable(
            windowBuckets.map((item) => item.p95LatencyMs ?? null),
          ),
          failureCount: windowBuckets.reduce(
            (sum, item) => sum + item.failureCount,
            0,
          ),
          longestOutageMinutes: Math.max(
            ...windowBuckets.map((item) => item.longestOutageMinutes),
          ),
        },
      ];
    }),
  ) as Record<TimeWindow, WindowMetrics>;
}

function statusFromProbeResult(status: string): RelayStatus {
  if (status === 'ok') return 'operational';
  if (status === 'slow') return 'degraded';
  if (status === 'partial') return 'flaky';
  if (status === 'config_error') return 'down';
  return 'down';
}

function average(values: number[]) {
  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2),
  );
}

function minNullable(values: Array<number | null>) {
  const numbers = values.filter(
    (value): value is number => typeof value === 'number',
  );
  return numbers.length > 0 ? Math.min(...numbers) : null;
}

function maxNullable(values: Array<number | null>) {
  const numbers = values.filter(
    (value): value is number => typeof value === 'number',
  );
  return numbers.length > 0 ? Math.max(...numbers) : null;
}
