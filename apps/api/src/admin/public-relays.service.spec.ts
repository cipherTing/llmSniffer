import { PublicRelaysService } from './public-relays.service';

describe('PublicRelaysService', () => {
  it('maps each request probe to one public trend channel', async () => {
    const find = jest.fn(() => ({
      sort: jest.fn(() => ({
        exec: jest.fn(() => [
          {
            _id: { toString: () => 'site-1' },
            name: 'Relay A',
            domain: 'relay.example',
            url: 'https://relay.example/',
            sponsorTier: 'standard',
            providers: ['OpenAI', 'Gemini'],
            monitorIntervalSeconds: 300,
            probes: [
              { modelName: 'gpt-4o-mini', requestTemplateId: 'openai-chat-basic' },
              { modelName: 'gemini-1.5-flash', requestTemplateId: 'gemini-generate-basic' },
              { modelName: 'gpt-4o', requestTemplateId: 'openai-chat-basic' },
            ],
          },
        ]),
      })),
    }));
    const service = new PublicRelaysService({ find } as never);

    const snapshot = await service.getSnapshot();

    expect(snapshot.relays).toHaveLength(1);
    expect(snapshot.relays[0]).toMatchObject({
      id: 'site-1',
      name: 'Relay A',
      current: { status: 'no_data', reason: '等待首次探测' },
      providers: ['OpenAI', 'Gemini'],
    });
    expect(snapshot.relays[0].channels.map((channel) => channel.label)).toEqual(
      ['gpt-4o-mini', 'gemini-1.5-flash', 'gpt-4o'],
    );
    expect(snapshot.relays[0].channels[0].trends['90m']).toHaveLength(18);
  });
});
