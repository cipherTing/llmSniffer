import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  MonitoredSite,
  type MonitoredSiteDocument,
} from './schemas/monitored-site.schema';

type TimeWindow = '90m' | '24h' | '7d' | '30d';
type TrendStatus = 'ok' | 'slow' | 'partial' | 'down' | 'no_data';
type TrendPoint = [TrendStatus, number | null, number];

const SNAPSHOT_WINDOWS: Record<
  TimeWindow,
  { length: number; minutes: number }
> = {
  '90m': { length: 18, minutes: 5 },
  '24h': { length: 24, minutes: 60 },
  '7d': { length: 28, minutes: 360 },
  '30d': { length: 30, minutes: 1440 },
};

@Injectable()
export class PublicRelaysService {
  constructor(
    @InjectModel(MonitoredSite.name)
    private readonly siteModel: Model<MonitoredSiteDocument>,
  ) {}

  async getSnapshot() {
    const generatedAt = new Date().toISOString();
    const sites = await this.siteModel
      .find()
      .sort({ sponsorTier: 1, createdAt: -1 })
      .exec();

    return {
      generatedAt,
      relays: sites.map((site) => this.toRelay(site, generatedAt)),
    };
  }

  private toRelay(site: MonitoredSiteDocument, generatedAt: string) {
    return {
      id: site._id.toString(),
      name: site.name,
      domain: site.domain,
      url: site.url,
      sponsorTier: site.sponsorTier,
      providers: site.providers,
      channels: site.probes.map((probe, index) => ({
        id: `${site._id.toString()}-${index}`,
        provider: site.providers[index % site.providers.length],
        label: probe.modelName,
        trends: buildTrendSet(generatedAt, index),
      })),
      collectedDays: 0,
      monitorIntervalSeconds: site.monitorIntervalSeconds,
      current: {
        status: 'no_data',
        latencyMs: null,
        firstTokenLatencyMs: null,
        latestCheckAt: generatedAt,
        reason: '等待首次探测',
      },
      windows: {
        '90m': emptyMetrics(),
        '24h': emptyMetrics(),
        '7d': emptyMetrics(),
        '30d': emptyMetrics(),
      },
    };
  }
}

function emptyMetrics() {
  return {
    uptimePercent: 0,
    p50LatencyMs: null,
    p95LatencyMs: null,
    failureCount: 0,
    longestOutageMinutes: 0,
  };
}

function buildTrendSet(generatedAt: string, offset: number) {
  return {
    '90m': buildTrend('90m', generatedAt, offset),
    '24h': buildTrend('24h', generatedAt, offset),
    '7d': buildTrend('7d', generatedAt, offset),
    '30d': buildTrend('30d', generatedAt, offset),
  };
}

function buildTrend(window: TimeWindow, generatedAt: string, offset: number) {
  const config = SNAPSHOT_WINDOWS[window];
  const end = Date.parse(generatedAt);
  const pattern = fixedPattern(offset, config.length);

  return pattern.map(([status, latencyMs, failureCount], index) => ({
    timestamp: new Date(
      end - (config.length - index - 1) * config.minutes * 60_000,
    ).toISOString(),
    status,
    latencyMs,
    failureCount,
  }));
}

function fixedPattern(offset: number, length: number): TrendPoint[] {
  return Array.from({ length }, (_, index) => {
    if ((index + offset) % 13 === 0) return ['partial', 2600 + offset * 120, 1];
    if ((index + offset) % 17 === 0) return ['slow', 4100 + offset * 150, 0];
    return ['ok', 1200 + ((index + offset) % 6) * 90, 0];
  });
}
