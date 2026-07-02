import { AdminSitesService } from './admin-sites.service';

describe('AdminSitesService', () => {
  it('creates a monitored site with normalized URL and request probes', async () => {
    const create = jest.fn((payload: Record<string, unknown>) => ({
      ...payload,
      _id: { toString: () => 'site-1' },
      createdAt: new Date('2026-06-30T00:00:00.000Z'),
      updatedAt: new Date('2026-06-30T00:00:00.000Z'),
    }));
    const service = new AdminSitesService({ create } as never);

    const site = await service.createSite(
      {
        name: ' Test Relay ',
        url: 'HTTPS://Example.COM/#ignored',
        sponsorTier: 'premium',
        monitorIntervalSeconds: 300,
        providers: ['OpenAI', 'Anthropic'],
        probes: [
          {
            requestTemplateId: 'openai-chat-basic',
            baseUrl: 'HTTPS://Api.Example.COM/v1#ignored',
            apiKey: ' sk-test ',
            modelName: ' gpt-4o-mini ',
          },
          {
            requestTemplateId: 'anthropic-message-basic',
            baseUrl: 'https://api.anthropic.com/',
            apiKey: 'sk-ant-test',
            modelName: 'claude-3-5-haiku',
          },
        ],
      },
      { id: 'admin-1', username: 'root', role: 'system' },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Relay',
        url: 'https://example.com/',
        urlNormalized: 'https://example.com/',
        domain: 'example.com',
      }),
    );
    expect(site).toMatchObject({
      id: 'site-1',
      name: 'Test Relay',
      domain: 'example.com',
      sponsorTier: 'premium',
      providers: ['OpenAI', 'Anthropic'],
      probes: [
        {
          requestTemplateId: 'openai-chat-basic',
          baseUrl: 'https://api.example.com/v1',
          apiKey: 'sk-test',
          modelName: 'gpt-4o-mini',
        },
        {
          requestTemplateId: 'anthropic-message-basic',
          baseUrl: 'https://api.anthropic.com/',
          apiKey: 'sk-ant-test',
          modelName: 'claude-3-5-haiku',
        },
      ],
    });
  });
});
