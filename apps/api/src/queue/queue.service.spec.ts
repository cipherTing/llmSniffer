import { QueueService, type SnapshotJobData } from './queue.service';
import { QUEUE_NAMES } from './queue.constants';

describe('QueueService', () => {
  it('uses BullMQ-safe queue names', () => {
    expect(Object.values(QUEUE_NAMES).every((name) => !name.includes(':'))).toBe(
      true,
    );
  });

  it('enqueues probe jobs into the unified probe queue with stable job id', async () => {
    const add = jest.fn().mockResolvedValue({ id: 'job-1' });
    const service = new QueueService(
      { add } as never,
      { add: jest.fn() } as never,
      { add: jest.fn() } as never,
    );

    await service.addProbeJob({
      siteId: 'site-1',
      probeId: 'probe-1',
      region: 'default',
      scheduledAt: '2026-07-05T00:00:00.000Z',
      bucketStart: '2026-07-05T00:00:00.000Z',
    });

    expect(add).toHaveBeenCalledWith(
      'run-probe',
      expect.objectContaining({
        siteId: 'site-1',
      }),
      expect.objectContaining({
        jobId: 'probe-site-1-probe-1-default-2026-07-05T00-00-00.000Z',
        attempts: 3,
      }),
    );
    expect(QUEUE_NAMES.probe).toBe('probe');
  });

  it('removes completed snapshot jobs so later refreshes can enqueue', async () => {
    const add = jest.fn().mockResolvedValue({ id: 'snapshot-1' });
    const service = new QueueService(
      { add: jest.fn() } as never,
      { add: jest.fn() } as never,
      { add } as never,
    );

    await service.addSnapshotJob({ reason: 'probe-result' });

    expect(add).toHaveBeenCalledWith(
      'refresh-snapshot',
      { reason: 'probe-result' },
      expect.objectContaining({ removeOnComplete: true }),
    );
    const calls = add.mock.calls as Array<
      [string, SnapshotJobData, Record<string, unknown>]
    >;
    const options = calls[0][2];
    expect(options).not.toHaveProperty('jobId');
  });
});
