import { SnapshotService } from './snapshot.service';

describe('SnapshotService', () => {
  it('builds cached public relay snapshots from metric buckets and latest probe result', async () => {
    const premiumSite = {
      _id: { toString: () => 'site-premium' },
      name: 'Premium Relay',
      domain: 'premium.example',
      url: 'https://premium.example',
      sponsorTier: 'premium',
      providers: ['OpenAI', 'Gemini'],
      monitorIntervalSeconds: 300,
      probes: [
        {
          id: 'stable-openai',
          requestTemplateId: 'openai-chat-basic',
          baseUrl: 'https://premium.example/v1',
          apiKeyEncrypted: 'encrypted-secret',
          apiKeyMasked: 'sk-***',
          modelName: 'gpt-4o-mini',
        },
        {
          id: 'stable-gemini',
          requestTemplateId: 'gemini-generate-basic',
          baseUrl: 'https://premium.example/v1',
          apiKeyEncrypted: 'encrypted-secret-2',
          apiKeyMasked: 'gm-***',
          modelName: 'gemini-1.5-flash',
        },
      ],
    };
    const standardSite = {
      _id: { toString: () => 'site-standard' },
      name: 'Standard Relay',
      domain: 'standard.example',
      url: 'https://standard.example',
      sponsorTier: 'standard',
      providers: ['Anthropic'],
      monitorIntervalSeconds: 300,
      probes: [
        {
          id: 'standard-probe',
          apiKeyEncrypted: 'standard-secret',
          apiKeyMasked: 'ant-***',
          modelName: 'claude-3-haiku',
        },
      ],
    };
    const trend = [
      {
        timestamp: '2026-07-05T00:00:00.000Z',
        status: 'ok',
        latencyMs: 900,
        failureCount: 0,
      },
    ];
    const siteModel = {
      find: jest.fn(() => ({
        sort: jest.fn(() => ({
          exec: jest.fn().mockResolvedValue([premiumSite, standardSite]),
        })),
      })),
    };
    const bucketModel = {
      find: jest
        .fn()
        .mockImplementationOnce(() => ({
          exec: jest.fn().mockResolvedValue([
            {
              siteId: 'site-premium',
              probeId: 'stable-openai',
              window: '90m',
              uptimePercent: 98,
              p50LatencyMs: 900,
              p95LatencyMs: 1400,
              failureCount: 1,
              longestOutageMinutes: 5,
              trends: trend,
            },
            {
              siteId: 'site-premium',
              probeId: 'stable-gemini',
              window: '90m',
              uptimePercent: 100,
              p50LatencyMs: 700,
              p95LatencyMs: 1800,
              failureCount: 0,
              longestOutageMinutes: 0,
              trends: [],
            },
          ]),
        }))
        .mockImplementationOnce(() => ({
          exec: jest.fn().mockResolvedValue([]),
        })),
    };
    const resultModel = {
      findOne: jest
        .fn()
        .mockImplementationOnce(() => ({
          sort: jest.fn(() => ({
            exec: jest.fn().mockResolvedValue({
              status: 'slow',
              firstTokenLatencyMs: 1400,
              bucketStart: new Date('2026-07-05T00:05:00.000Z'),
              reason: '响应偏慢',
            }),
          })),
        }))
        .mockImplementationOnce(() => ({
          sort: jest.fn(() => ({ exec: jest.fn().mockResolvedValue(null) })),
        })),
    };
    const redisService = { setJson: jest.fn().mockResolvedValue(undefined) };
    const snapshotModel = {
      findOneAndUpdate: jest.fn(() => ({ exec: jest.fn().mockResolvedValue({}) })),
    };
    const service = new SnapshotService(
      siteModel as never,
      bucketModel as never,
      resultModel as never,
      redisService as never,
      snapshotModel as never,
    );

    const snapshot = await service.rebuildPublicRelaysSnapshot();

    expect(snapshot.relays.map((relay) => relay.id)).toEqual([
      'site-premium',
      'site-standard',
    ]);
    expect(snapshot.relays[0].channels.map((channel) => channel.id)).toEqual([
      'stable-openai',
      'stable-gemini',
    ]);
    expect(snapshot.relays[0].channels[0].trends['90m']).toEqual(trend);
    expect(snapshot.relays[0].windows['90m']).toEqual({
      uptimePercent: 99,
      p50LatencyMs: 700,
      p95LatencyMs: 1800,
      failureCount: 1,
      longestOutageMinutes: 5,
    });
    expect(snapshot.relays[0].current).toEqual({
      status: 'degraded',
      latencyMs: 1400,
      firstTokenLatencyMs: 1400,
      latestCheckAt: '2026-07-05T00:05:00.000Z',
      reason: '响应偏慢',
    });
    expect(JSON.stringify(snapshot)).not.toContain('apiKey');
    expect(redisService.setJson).toHaveBeenCalledWith(
      'public:relays:snapshot',
      snapshot,
      30,
    );
    expect(snapshotModel.findOneAndUpdate).toHaveBeenCalledWith(
      { key: 'public:relays:snapshot' },
      expect.objectContaining({
        $set: expect.objectContaining({
          key: 'public:relays:snapshot',
          snapshot,
        }),
      }),
      { new: true, upsert: true, runValidators: true },
    );
  });
});
