import { Injectable } from '@nestjs/common';
import type { ProbeProvider, ProbeRegion } from '../queue/queue.constants';
import type { NormalizedProbeResult, ProbeResultStatus } from './probe.types';
import { buildProbeRequest, extractToken } from './templates';

export type RunProbeInput = {
  siteId: string;
  probeId: string;
  region: ProbeRegion;
  provider: ProbeProvider;
  requestTemplateId: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  scheduledAt: Date;
  bucketStart: Date;
  attempt: number;
  timeoutMs: number;
};

@Injectable()
export class ProbeRunnerService {
  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async run(input: RunProbeInput): Promise<NormalizedProbeResult> {
    const startedAt = this.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs);

    try {
      const request = buildProbeRequest(input);
      const response = await this.fetchImpl(request.url, {
        ...request.init,
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        return this.finish(input, startedAt, null, response.status, classifyHttpStatus(response.status), reasonForHttpStatus(response.status));
      }

      const firstTokenAt = await readStreamUntilComplete(response.body, input.provider, this.now);
      if (!firstTokenAt) {
        return this.finish(input, startedAt, null, response.status, 'down', '流式响应未返回 token');
      }

      return this.finish(input, startedAt, firstTokenAt, response.status, 'ok', '收到首个 token');
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      return this.finish(input, startedAt, null, null, 'down', isTimeout ? '探测请求超时' : '探测请求失败', isTimeout ? 'timeout' : 'network_error');
    } finally {
      clearTimeout(timer);
    }
  }

  private finish(
    input: RunProbeInput,
    startedAt: Date,
    firstTokenAt: Date | null,
    httpStatus: number | null,
    status: ProbeResultStatus,
    reason: string,
    errorCode: string | null = null,
  ): NormalizedProbeResult {
    const finishedAt = this.now();
    return {
      siteId: input.siteId,
      probeId: input.probeId,
      region: input.region,
      provider: input.provider,
      modelName: input.modelName,
      bucketStart: input.bucketStart,
      scheduledAt: input.scheduledAt,
      startedAt,
      firstTokenAt,
      finishedAt,
      firstTokenLatencyMs: firstTokenAt ? firstTokenAt.getTime() - startedAt.getTime() : null,
      totalLatencyMs: finishedAt.getTime() - startedAt.getTime(),
      status,
      httpStatus,
      errorCode,
      reason,
      attempt: input.attempt,
    };
  }
}

async function readStreamUntilComplete(body: ReadableStream<Uint8Array>, provider: ProbeProvider, now: () => Date) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let firstTokenAt: Date | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    // 首 token 只决定成功条件；后续仍读完整个流，用于记录完整响应耗时。
    if (!firstTokenAt && extractToken(provider, chunk)) {
      firstTokenAt = now();
    }
  }

  return firstTokenAt;
}

function classifyHttpStatus(status: number): ProbeResultStatus {
  if (status === 401 || status === 403 || status === 404) return 'config_error';
  if (status === 429 || status >= 500) return 'down';
  return 'down';
}

function reasonForHttpStatus(status: number) {
  if (status === 401 || status === 403) return '认证失败';
  if (status === 404) return '模型或接口不存在';
  if (status === 429) return '请求被限流';
  if (status >= 500) return '上游服务错误';
  return `HTTP ${status}`;
}
