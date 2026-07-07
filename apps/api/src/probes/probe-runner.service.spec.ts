import { Test } from '@nestjs/testing';
import { ProbeRunnerService } from './probe-runner.service';

const probeInput = {
  siteId: 'site-1',
  probeId: 'probe-1',
  region: 'default' as const,
  requestTemplateId: 'openai-chat-basic',
  baseUrl: 'https://api.example.com/v1',
  apiKey: 'sk-test',
  modelName: 'gpt-4o-mini',
  scheduledAt: new Date('2026-07-05T00:00:00.000Z'),
  bucketStart: new Date('2026-07-05T00:00:00.000Z'),
  attempt: 1,
  timeoutMs: 30_000,
};

describe('ProbeRunnerService', () => {
  it('can be instantiated by Nest without runtime dependency providers', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [ProbeRunnerService],
    }).compile();

    expect(moduleRef.get(ProbeRunnerService)).toBeInstanceOf(
      ProbeRunnerService,
    );
  });

  it('records first token latency and total latency from an OpenAI streaming response', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'data: {"choices":[{"delta":{"content":"pong"}}]}\n\n',
          ),
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response(body, { status: 200 }));
    const service = ProbeRunnerService.create({
      fetchImpl: fetchMock as never,
      now: () => new Date('2026-07-05T00:00:01.000Z'),
    });

    const result = await service.run(probeInput);

    expect(result.status).toBe('ok');
    expect(result.provider).toBe('OpenAI');
    expect(result.firstTokenLatencyMs).toBeGreaterThanOrEqual(0);
    expect(result.totalLatencyMs).toBeGreaterThanOrEqual(0);
    expect(result.reason).toBe('收到首个 token');
  });

  it('buffers split streaming payloads and records total latency after the full stream', async () => {
    const encoder = new TextEncoder();
    const chunks = [
      'data: {"choices":[{"delta":{"cont',
      'ent":"pong"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"done"}}]}\n\n',
      'data: [DONE]\n\n',
    ];
    let streamFinished = false;
    const read = jest.fn((): Promise<ReadableStreamReadResult<Uint8Array>> => {
      const chunk = chunks.shift();
      if (!chunk) {
        streamFinished = true;
        return Promise.resolve({ done: true, value: undefined });
      }
      return Promise.resolve({ done: false, value: encoder.encode(chunk) });
    });
    const body = {
      getReader: () => ({ read }),
    } as unknown as ReadableStream<Uint8Array>;
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 200, body });
    let nowCalls = 0;
    const service = ProbeRunnerService.create({
      fetchImpl: fetchMock as never,
      now: () => {
        nowCalls += 1;
        if (nowCalls === 1) return new Date('2026-07-05T00:00:00.000Z');
        if (!streamFinished) return new Date('2026-07-05T00:00:01.000Z');
        return new Date('2026-07-05T00:00:05.000Z');
      },
    });

    const result = await service.run(probeInput);

    expect(result.status).toBe('ok');
    expect(result.firstTokenLatencyMs).toBe(1000);
    expect(result.totalLatencyMs).toBe(5000);
    expect(read).toHaveBeenCalledTimes(5);
  });

  it('marks a 401 response as config_error without retryable status', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response('unauthorized', { status: 401 }));
    const service = ProbeRunnerService.create({
      fetchImpl: fetchMock as never,
    });

    const result = await service.run({
      ...probeInput,
      apiKey: 'bad-key',
    });

    expect(result.status).toBe('config_error');
    expect(result.httpStatus).toBe(401);
    expect(result.firstTokenLatencyMs).toBeNull();
  });

  it('builds OpenAI Responses requests from the request template', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'data: {"type":"response.output_text.delta","delta":"pong"}\n\n',
          ),
        );
        controller.close();
      },
    });
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response(body, { status: 200 }));
    const service = ProbeRunnerService.create({ fetchImpl: fetchMock as never });

    const result = await service.run({
      ...probeInput,
      requestTemplateId: 'openai-responses-basic',
    });

    expect(result.status).toBe('ok');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/responses',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('max_output_tokens'),
      }),
    );
  });
});
