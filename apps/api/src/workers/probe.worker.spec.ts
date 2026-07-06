import { MODULE_METADATA } from '@nestjs/common/constants';
import { AppModule } from '../app.module';
import { SecretsModule } from '../secrets/secrets.module';
import { ProbeWorker } from './probe.worker';

describe('ProbeWorker', () => {
  it('decrypts probe key, runs probe, stores result, and enqueues metrics', async () => {
    const previousProbeTimeoutMs = process.env.PROBE_TIMEOUT_MS;
    process.env.PROBE_TIMEOUT_MS = '12345';
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

    try {
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
    } finally {
      if (previousProbeTimeoutMs === undefined) {
        delete process.env.PROBE_TIMEOUT_MS;
      } else {
        process.env.PROBE_TIMEOUT_MS = previousProbeTimeoutMs;
      }
    }

    expect(secrets.decrypt).toHaveBeenCalledWith('encrypted');
    expect(runner.run).toHaveBeenCalledWith({
      siteId: 'site-1',
      probeId: 'probe-1',
      region: 'default',
      provider: 'OpenAI',
      requestTemplateId: 'openai-chat-basic',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'sk-test',
      modelName: 'gpt-4o-mini',
      scheduledAt: new Date('2026-07-05T00:00:00.000Z'),
      bucketStart: new Date('2026-07-05T00:00:00.000Z'),
      attempt: 1,
      timeoutMs: 12345,
    });
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

  it('imports SecretsModule where ProbeWorker is registered', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppModule,
    ) as unknown;

    expect(Array.isArray(imports)).toBe(true);
    if (!Array.isArray(imports)) throw new Error('AppModule imports missing');
    expect(imports).toContain(SecretsModule);
  });
});
