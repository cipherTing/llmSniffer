import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('computes uptime and latency metrics from raw probe results', async () => {
    const resultModel = {
      find: jest.fn(() => ({
        sort: jest.fn(() => ({
          exec: jest.fn().mockResolvedValue([
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
          ]),
        })),
      })),
    };
    const bucketModel = {
      findOneAndUpdate: jest.fn(() => ({ exec: jest.fn().mockResolvedValue({}) })),
    };
    const service = new MetricsService(resultModel as never, bucketModel as never);

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
  });
});
