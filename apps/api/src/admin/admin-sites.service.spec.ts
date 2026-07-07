import { ConfigService } from '@nestjs/config';
import { SecretsService } from '../secrets/secrets.service';
import { AdminSitesService } from './admin-sites.service';

type ProbePayload = {
  id: string;
  requestTemplateId: string;
  baseUrl: string;
  apiKeyEncrypted: string;
  apiKeyMasked: string;
  modelName: string;
  enabled: boolean;
  region: string;
  nextRunAt: Date;
  apiKey?: string;
};

type SitePayload = {
  name: string;
  url: string;
  urlNormalized: string;
  domain: string;
  sponsorTier: string;
  monitorIntervalSeconds: number;
  providers: string[];
  probes: ProbePayload[];
};

describe('AdminSitesService', () => {
  const secretKey = Buffer.alloc(32, 7).toString('base64url');
  const secretsService = new SecretsService({
    getOrThrow: () => secretKey,
  } as never as ConfigService);

  it('creates a monitored site with normalized URL and request probes', async () => {
    const create = jest.fn((payload: Record<string, unknown>) => ({
      ...payload,
      _id: { toString: () => 'site-1' },
      createdAt: new Date('2026-06-30T00:00:00.000Z'),
      updatedAt: new Date('2026-06-30T00:00:00.000Z'),
    }));
    const service = new AdminSitesService({ create } as never, secretsService);

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
            apiKey: ' sk-openai-test ',
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

    expect(create).toHaveBeenCalledTimes(1);
    const createdPayload = create.mock.calls[0][0] as SitePayload;
    expect(createdPayload).toMatchObject({
      name: 'Test Relay',
      url: 'https://example.com/',
      urlNormalized: 'https://example.com/',
      domain: 'example.com',
    });
    expect(createdPayload.probes[0]).toMatchObject({
      apiKeyMasked: 'sk-...test',
      enabled: true,
      region: 'default',
    });
    expect(createdPayload.probes[0].id).toMatch(/^probe_/);
    expect(createdPayload.probes[0].apiKeyEncrypted).toContain('v1:');
    expect(createdPayload.probes[0].nextRunAt).toBeInstanceOf(Date);
    expect(createdPayload.probes[1].id).toMatch(/^probe_/);
    expect(createdPayload.probes[0].apiKeyEncrypted).not.toContain(
      'sk-openai-test',
    );
    expect(createdPayload.probes[0]).not.toHaveProperty('apiKey');
    expect(site).toMatchObject({
      id: 'site-1',
      name: 'Test Relay',
      domain: 'example.com',
      sponsorTier: 'premium',
      providers: ['OpenAI', 'Anthropic'],
    });
    expect(site.probes[0]).toMatchObject({
      requestTemplateId: 'openai-chat-basic',
      baseUrl: 'https://api.example.com/v1',
      apiKeyMasked: 'sk-...test',
      modelName: 'gpt-4o-mini',
      enabled: true,
      region: 'default',
    });
    expect(site.probes[0].nextRunAt).toBeInstanceOf(Date);
    expect(site.probes[1]).toMatchObject({
      requestTemplateId: 'anthropic-message-basic',
      baseUrl: 'https://api.anthropic.com/',
      apiKeyMasked: 'sk-...test',
      modelName: 'claude-3-5-haiku',
      enabled: true,
      region: 'default',
    });
    expect(site.probes[1].nextRunAt).toBeInstanceOf(Date);
    expect(site.probes[0]).not.toHaveProperty('apiKey');
  });

  it('preserves an existing encrypted API key when updating a probe without a new key', async () => {
    const existingSite = {
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      name: 'Old Relay',
      url: 'https://old.example.com/',
      domain: 'old.example.com',
      sponsorTier: 'free',
      monitorIntervalSeconds: 300,
      providers: ['OpenAI'],
      probes: [
        {
          id: 'probe_existing',
          requestTemplateId: 'openai-chat-basic',
          baseUrl: 'https://api.old.example.com/v1',
          apiKeyEncrypted: 'v1:existing-secret',
          apiKeyMasked: 'sk-...test',
          modelName: 'gpt-4o-mini',
          enabled: false,
          region: 'default',
          nextRunAt: new Date('2026-06-30T00:00:00.000Z'),
        },
      ],
      createdBy: { toString: () => 'admin-1' },
      createdAt: new Date('2026-06-30T00:00:00.000Z'),
      updatedAt: new Date('2026-06-30T00:00:00.000Z'),
    };
    const select = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(existingSite) });
    const findById = jest.fn().mockReturnValue({ select });
    const findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...existingSite,
        name: 'Updated Relay',
        url: 'https://updated.example.com/',
        domain: 'updated.example.com',
        probes: [
          {
            ...existingSite.probes[0],
            baseUrl: 'https://api.updated.example.com/v1',
            modelName: 'gpt-4o',
          },
        ],
      }),
    });
    const service = new AdminSitesService(
      { findById, findByIdAndUpdate } as never,
      secretsService,
    );

    await service.updateSite('507f1f77bcf86cd799439011', {
      name: 'Updated Relay',
      url: 'https://updated.example.com/',
      sponsorTier: 'free',
      monitorIntervalSeconds: 300,
      providers: ['OpenAI'],
      probes: [
        {
          id: 'probe_existing',
          requestTemplateId: 'openai-chat-basic',
          baseUrl: 'https://api.updated.example.com/v1',
          modelName: 'gpt-4o',
        },
      ],
    });

    expect(select).toHaveBeenCalledWith('+probes.apiKeyEncrypted');
    expect(findByIdAndUpdate).toHaveBeenCalledTimes(1);
    const [updatedId, update, updateOptions] = findByIdAndUpdate.mock
      .calls[0] as [
      string,
      { $set: SitePayload },
      { new: boolean; runValidators: boolean },
    ];
    expect(updatedId).toBe('507f1f77bcf86cd799439011');
    expect(update.$set.probes[0]).toMatchObject({
      id: 'probe_existing',
      apiKeyEncrypted: 'v1:existing-secret',
      apiKeyMasked: 'sk-...test',
      enabled: false,
      nextRunAt: new Date('2026-06-30T00:00:00.000Z'),
    });
    expect(updateOptions).toEqual({ new: true, runValidators: true });
  });

  it('generates a probe id when the client submits an empty id', async () => {
    const create = jest.fn((payload: Record<string, unknown>) => ({
      ...payload,
      _id: { toString: () => 'site-2' },
      createdAt: new Date('2026-06-30T00:00:00.000Z'),
      updatedAt: new Date('2026-06-30T00:00:00.000Z'),
    }));
    const service = new AdminSitesService({ create } as never, secretsService);

    await service.createSite(
      {
        name: 'Relay With Empty Probe Id',
        url: 'https://empty-probe-id.example',
        sponsorTier: 'standard',
        monitorIntervalSeconds: 300,
        providers: ['OpenAI'],
        probes: [
          {
            id: '',
            requestTemplateId: 'openai-chat-basic',
            baseUrl: 'https://api.example.com/v1',
            apiKey: 'sk-openai-test',
            modelName: 'gpt-4o-mini',
          },
        ],
      },
      { id: 'admin-1', username: 'root', role: 'system' },
    );

    const createdPayload = create.mock.calls[0][0] as SitePayload;
    expect(createdPayload.probes[0].id).toMatch(/^probe_/);
  });
});
