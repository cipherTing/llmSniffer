import { QueueService } from './queue.service';
import { QUEUE_NAMES } from './queue.constants';

describe('QueueService', () => {
  it('routes provider probe jobs to provider queues with stable job id', async () => {
    const add = jest.fn().mockResolvedValue({ id: 'job-1' });
    const service = new QueueService({
      probeOpenai: { add },
      probeAnthropic: { add: jest.fn() },
      probeGemini: { add: jest.fn() },
      metricsAggregate: { add: jest.fn() },
      snapshotRefresh: { add: jest.fn() },
    } as never);

    await service.addProbeJob({
      provider: 'OpenAI',
      siteId: 'site-1',
      probeId: 'probe-1',
      region: 'default',
      scheduledAt: '2026-07-05T00:00:00.000Z',
      bucketStart: '2026-07-05T00:00:00.000Z',
    });

    expect(add).toHaveBeenCalledWith(
      'run-probe',
      expect.objectContaining({ provider: 'OpenAI', siteId: 'site-1' }),
      expect.objectContaining({
        jobId: 'probe:site-1:probe-1:default:2026-07-05T00:00:00.000Z',
        attempts: 3,
      }),
    );
    expect(QUEUE_NAMES.probeOpenai).toBe('probe:openai');
  });

  it('removes completed snapshot jobs so later refreshes can enqueue', async () => {
    const add = jest.fn().mockResolvedValue({ id: 'snapshot-1' });
    const service = new QueueService({
      probeOpenai: { add: jest.fn() },
      probeAnthropic: { add: jest.fn() },
      probeGemini: { add: jest.fn() },
      metricsAggregate: { add: jest.fn() },
      snapshotRefresh: { add },
    } as never);

    await service.addSnapshotJob({ reason: 'probe-result' });

    expect(add).toHaveBeenCalledWith(
      'refresh-snapshot',
      { reason: 'probe-result' },
      expect.objectContaining({
        jobId: 'snapshot:probe-result',
        removeOnComplete: true,
      }),
    );
  });
});
