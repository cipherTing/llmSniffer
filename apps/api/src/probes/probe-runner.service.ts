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

export type ProbeRunnerRuntime = {
  fetchImpl: typeof fetch;
  now: () => Date;
};

const defaultRuntime: ProbeRunnerRuntime = {
  fetchImpl: (input, init) => fetch(input, init),
  now: () => new Date(),
};

@Injectable()
export class ProbeRunnerService {
  private runtime = defaultRuntime;

  static create(runtime: Partial<ProbeRunnerRuntime> = {}) {
    const service = new ProbeRunnerService();
    service.runtime = { ...service.runtime, ...runtime };
    return service;
  }

  async run(input: RunProbeInput): Promise<NormalizedProbeResult> {
    const startedAt = this.runtime.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs);

    try {
      const request = buildProbeRequest(input);
      const response = await this.runtime.fetchImpl(request.url, {
        ...request.init,
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        return this.finish(
          input,
          startedAt,
          null,
          response.status,
          classifyHttpStatus(response.status),
          reasonForHttpStatus(response.status),
        );
      }

      const firstTokenAt = await readStreamUntilComplete(
        response.body,
        input.provider,
        this.runtime.now,
      );
      if (!firstTokenAt) {
        return this.finish(
          input,
          startedAt,
          null,
          response.status,
          'down',
          '流式响应未返回 token',
        );
      }

      return this.finish(
        input,
        startedAt,
        firstTokenAt,
        response.status,
        'ok',
        '收到首个 token',
      );
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      return this.finish(
        input,
        startedAt,
        null,
        null,
        'down',
        isTimeout ? '探测请求超时' : '探测请求失败',
        isTimeout ? 'timeout' : 'network_error',
      );
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
    const finishedAt = this.runtime.now();
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
      firstTokenLatencyMs: firstTokenAt
        ? firstTokenAt.getTime() - startedAt.getTime()
        : null,
      totalLatencyMs: finishedAt.getTime() - startedAt.getTime(),
      status,
      httpStatus,
      errorCode,
      reason,
      attempt: input.attempt,
    };
  }
}

async function readStreamUntilComplete(
  body: ReadableStream<Uint8Array>,
  provider: ProbeProvider,
  now: () => Date,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let firstTokenAt: Date | null = null;
  let pendingText = '';
  let eventLines: string[] = [];

  const captureFirstToken = (hasToken: boolean) => {
    if (hasToken && !firstTokenAt) {
      firstTokenAt = now();
    }
  };

  const processEvent = () => {
    if (eventLines.length === 0) return false;
    const eventText = eventLines.join('\n');
    eventLines = [];
    return Boolean(extractToken(provider, eventText));
  };

  const processLine = (line: string) => {
    const normalizedLine = line.endsWith('\r') ? line.slice(0, -1) : line;
    if (normalizedLine.trim() === '') {
      return processEvent();
    }
    eventLines.push(normalizedLine);
    return false;
  };

  const processText = (text: string) => {
    pendingText += text;
    let lineEnd = pendingText.indexOf('\n');

    while (lineEnd !== -1) {
      const line = pendingText.slice(0, lineEnd);
      pendingText = pendingText.slice(lineEnd + 1);
      // 流式响应可能把一行 JSON 拆到多个网络分片里，必须等完整行/事件后再解析 token。
      captureFirstToken(processLine(line));
      lineEnd = pendingText.indexOf('\n');
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    processText(decoder.decode(value, { stream: true }));
  }

  processText(decoder.decode());
  if (pendingText.length > 0) {
    captureFirstToken(processLine(pendingText));
  }
  captureFirstToken(processEvent());

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
