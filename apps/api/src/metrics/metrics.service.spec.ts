import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('computes metrics and returns fixed hourly trend buckets for 24h', async () => {
    const { service } = createService([
      {
        status: 'ok',
        firstTokenLatencyMs: 1000,
        totalLatencyMs: 2200,
        bucketStart: new Date('2026-07-05T00:00:00.000Z'),
      },
      {
        status: 'down',
        firstTokenLatencyMs: null,
        totalLatencyMs: 30000,
        bucketStart: new Date('2026-07-05T00:05:00.000Z'),
      },
    ]);

    const metrics = await service.aggregateProbeWindow({
      siteId: 'site-1',
      probeId: 'probe-1',
      region: 'default',
      window: '24h',
      now: new Date('2026-07-05T00:10:00.000Z'),
    });

    expect(metrics.uptimePercent).toBe(50);
    expect(metrics.failureCount).toBe(1);
    expect(metrics.p50LatencyMs).toBe(1000);
    expect(metrics.longestOutageMinutes).toBe(0);
    expect(metrics.trends).toHaveLength(24);
    expect(metrics.trends.slice(0, -1)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'no_data', latencyMs: null }),
      ]),
    );
    expect(metrics.trends.at(-1)).toEqual({
      timestamp: '2026-07-05T00:00:00.000Z',
      status: 'partial',
      latencyMs: 1000,
      failureCount: 1,
    });
  });

  it('returns empty fixed trend buckets when a window has no probe results', async () => {
    const { service } = createService([]);

    const metrics = await service.aggregateProbeWindow({
      siteId: 'site-1',
      probeId: 'probe-1',
      region: 'default',
      window: '90m',
      now: new Date('2026-07-05T00:12:00.000Z'),
    });

    expect(metrics.uptimePercent).toBe(0);
    expect(metrics.trends).toHaveLength(18);
    expect(metrics.trends[0]).toEqual({
      timestamp: '2026-07-04T22:45:00.000Z',
      status: 'no_data',
      latencyMs: null,
      failureCount: 0,
    });
    expect(metrics.trends.at(-1)).toEqual({
      timestamp: '2026-07-05T00:10:00.000Z',
      status: 'no_data',
      latencyMs: null,
      failureCount: 0,
    });
  });

  it('aggregates 7d into 28 six-hour trend buckets', async () => {
    const { service } = createService([
      {
        status: 'slow',
        firstTokenLatencyMs: 1800,
        totalLatencyMs: 2600,
        bucketStart: new Date('2026-07-04T18:30:00.000Z'),
      },
    ]);

    const metrics = await service.aggregateProbeWindow({
      siteId: 'site-1',
      probeId: 'probe-1',
      region: 'default',
      window: '7d',
      now: new Date('2026-07-05T00:10:00.000Z'),
    });

    expect(metrics.trends).toHaveLength(28);
    expect(
      metrics.trends.find(
        (bucket) => bucket.timestamp === '2026-07-04T18:00:00.000Z',
      ),
    ).toEqual({
      timestamp: '2026-07-04T18:00:00.000Z',
      status: 'slow',
      latencyMs: 1800,
      failureCount: 0,
    });
  });

  it('marks consecutive all-failed buckets as outage time', async () => {
    const { service } = createService([
      {
        status: 'down',
        firstTokenLatencyMs: null,
        totalLatencyMs: 30000,
        bucketStart: new Date('2026-07-05T00:00:00.000Z'),
      },
      {
        status: 'config_error',
        firstTokenLatencyMs: null,
        totalLatencyMs: 0,
        bucketStart: new Date('2026-07-05T00:05:00.000Z'),
      },
    ]);

    const metrics = await service.aggregateProbeWindow({
      siteId: 'site-1',
      probeId: 'probe-1',
      region: 'default',
      window: '90m',
      now: new Date('2026-07-05T00:12:00.000Z'),
    });

    expect(metrics.failureCount).toBe(2);
    expect(metrics.longestOutageMinutes).toBe(10);
    expect(metrics.trends.at(-3)).toMatchObject({
      timestamp: '2026-07-05T00:00:00.000Z',
      status: 'down',
      failureCount: 1,
    });
    expect(metrics.trends.at(-2)).toMatchObject({
      timestamp: '2026-07-05T00:05:00.000Z',
      status: 'down',
      failureCount: 1,
    });
  });
});

function createService(results: unknown[]) {
  const resultModel = {
    find: jest.fn(() => ({
      sort: jest.fn(() => ({
        exec: jest.fn().mockResolvedValue(results),
      })),
    })),
  };
  const bucketModel = {
    findOneAndUpdate: jest.fn(() => ({
      exec: jest.fn().mockResolvedValue({}),
    })),
  };
  const service = new MetricsService(resultModel as never, bucketModel as never);

  return { service, resultModel, bucketModel };
}
