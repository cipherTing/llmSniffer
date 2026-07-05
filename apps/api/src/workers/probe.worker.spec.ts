import { ProbeWorker } from './probe.worker';

describe('ProbeWorker', () => {
  it('decrypts probe key, runs probe, stores result, and enqueues metrics', async () => {
    const site = {
      _id: { toString: () => 'site-1' },
      probes: [
        {
          id: 'probe-1',
          requestTemplateId: 'openai-chat-basic',
          baseUrl: 'https://api.example.com/v1',
          apiKeyEncrypted: 'encrypted',
          modelName: 'gpt-4o-mini',
          region: 'default',
        },
      ],
    };
    const siteModel = {
      findById: jest.fn(() => ({
        select: jest.fn(() => ({ exec: jest.fn().mockResolvedValue(site) })),
      })),
    };
    const secrets = { decrypt: jest.fn().mockReturnValue('sk-test') };
    const runner = {
      run: jest.fn().mockResolvedValue({
        status: 'ok',
        siteId: 'site-1',
        probeId: 'probe-1',
        region: 'default',
        bucketStart: new Date('2026-07-05T00:00:00.000Z'),
      }),
    };
    const results = { upsertResult: jest.fn().mockResolvedValue({}) };
    const queues = { addMetricsJob: jest.fn().mockResolvedValue({}) };
    const worker = new ProbeWorker(
      siteModel as never,
      secrets as never,
      runner as never,
      results as never,
      queues as never,
    );

    await worker.processJob({
      attemptsMade: 0,
      data: {
        provider: 'OpenAI',
        siteId: 'site-1',
        probeId: 'probe-1',
        region: 'default',
        scheduledAt: '2026-07-05T00:00:00.000Z',
        bucketStart: '2026-07-05T00:00:00.000Z',
      },
    } as never);

    expect(secrets.decrypt).toHaveBeenCalledWith('encrypted');
    expect(results.upsertResult).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ok' }),
    );
    expect(queues.addMetricsJob).toHaveBeenCalledWith({
      siteId: 'site-1',
      probeId: 'probe-1',
      region: 'default',
      bucketStart: '2026-07-05T00:00:00.000Z',
    });
  });
});
