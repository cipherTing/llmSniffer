import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { QueueService } from '../queue/queue.service';
import { MonitoredSite } from '../sites/schemas/monitored-site.schema';
import { SchedulerWorker } from './scheduler.worker';

describe('SchedulerWorker', () => {
  it('can be created by Nest without a test clock provider', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SchedulerWorker,
        { provide: getModelToken(MonitoredSite.name), useValue: {} },
        { provide: QueueService, useValue: {} },
      ],
    }).compile();

    expect(moduleRef.get(SchedulerWorker)).toBeInstanceOf(SchedulerWorker);
  });

  it('enqueues due enabled probes and advances nextRunAt', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const site = {
      _id: { toString: () => 'site-1' },
      monitorIntervalSeconds: 300,
      providers: ['OpenAI'],
      probes: [
        {
          id: 'probe-1',
          enabled: true,
          region: 'default',
          requestTemplateId: 'openai-chat-basic',
          nextRunAt: new Date('2026-07-05T00:00:00.000Z'),
        },
      ],
      save,
    };
    const siteModel = {
      find: jest.fn(() => ({ exec: jest.fn().mockResolvedValue([site]) })),
    };
    const queueService = {
      addProbeJob: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };
    const worker = new SchedulerWorker(
      siteModel as never,
      queueService as never,
      () => new Date('2026-07-05T00:00:05.000Z'),
    );

    await worker.scheduleDueProbes();

    expect(queueService.addProbeJob).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'OpenAI',
        siteId: 'site-1',
        probeId: 'probe-1',
        region: 'default',
        bucketStart: '2026-07-05T00:00:00.000Z',
      }),
    );
    expect(site.probes[0].nextRunAt).toEqual(
      new Date('2026-07-05T00:05:05.000Z'),
    );
    expect(save).toHaveBeenCalled();
  });
});
