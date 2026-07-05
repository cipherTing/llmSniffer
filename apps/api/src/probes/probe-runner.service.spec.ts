import { ProbeRunnerService } from './probe-runner.service';

describe('ProbeRunnerService', () => {
  it('records first token latency and total latency from an OpenAI streaming response', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"pong"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    const fetchMock = jest.fn().mockResolvedValue(new Response(body, { status: 200 }));
    const service = new ProbeRunnerService(fetchMock as never, () => new Date('2026-07-05T00:00:01.000Z'));

    const result = await service.run({
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
      timeoutMs: 30_000,
    });

    expect(result.status).toBe('ok');
    expect(result.firstTokenLatencyMs).toBeGreaterThanOrEqual(0);
    expect(result.totalLatencyMs).toBeGreaterThanOrEqual(0);
    expect(result.reason).toBe('收到首个 token');
  });

  it('marks a 401 response as config_error without retryable status', async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response('unauthorized', { status: 401 }));
    const service = new ProbeRunnerService(fetchMock as never);

    const result = await service.run({
      siteId: 'site-1',
      probeId: 'probe-1',
      region: 'default',
      provider: 'OpenAI',
      requestTemplateId: 'openai-chat-basic',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'bad-key',
      modelName: 'gpt-4o-mini',
      scheduledAt: new Date('2026-07-05T00:00:00.000Z'),
      bucketStart: new Date('2026-07-05T00:00:00.000Z'),
      attempt: 1,
      timeoutMs: 30_000,
    });

    expect(result.status).toBe('config_error');
    expect(result.httpStatus).toBe(401);
    expect(result.firstTokenLatencyMs).toBeNull();
  });
});
