import type { ProbeProvider } from '../queue/queue.constants';

export type ProbeHttpRequest = {
  url: string;
  init: RequestInit;
};

export function buildProbeRequest(input: {
  provider: ProbeProvider;
  requestTemplateId: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
}): ProbeHttpRequest {
  if (input.provider === 'OpenAI') return buildOpenAiRequest(input);
  if (input.provider === 'Anthropic') return buildAnthropicRequest(input);
  return buildGeminiRequest(input);
}

export function extractToken(
  provider: ProbeProvider,
  chunk: string,
): string | null {
  if (provider === 'OpenAI') return extractOpenAiToken(chunk);
  if (provider === 'Anthropic') return extractAnthropicToken(chunk);
  return extractGeminiToken(chunk);
}

function buildOpenAiRequest(input: {
  baseUrl: string;
  apiKey: string;
  modelName: string;
}): ProbeHttpRequest {
  return {
    url: `${input.baseUrl.replace(/\/$/, '')}/chat/completions`,
    init: {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: input.modelName,
        stream: true,
        max_tokens: 8,
        messages: [{ role: 'user', content: 'Reply with pong.' }],
      }),
    },
  };
}

function buildAnthropicRequest(input: {
  baseUrl: string;
  apiKey: string;
  modelName: string;
}): ProbeHttpRequest {
  return {
    url: `${input.baseUrl.replace(/\/$/, '')}/messages`,
    init: {
      method: 'POST',
      headers: {
        'x-api-key': input.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: input.modelName,
        stream: true,
        max_tokens: 8,
        messages: [{ role: 'user', content: 'Reply with pong.' }],
      }),
    },
  };
}

function buildGeminiRequest(input: {
  baseUrl: string;
  apiKey: string;
  modelName: string;
}): ProbeHttpRequest {
  return {
    url: `${input.baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(input.modelName)}:streamGenerateContent?key=${encodeURIComponent(input.apiKey)}`,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Reply with pong.' }] }],
        generationConfig: { maxOutputTokens: 8 },
      }),
    },
  };
}

type JsonRecord = Record<string, unknown>;

function extractOpenAiToken(chunk: string) {
  return extractJsonLineToken(chunk, (payload) => {
    const choices = isRecord(payload) ? payload.choices : undefined;
    if (!isUnknownArray(choices)) return null;
    const firstChoice = choices[0];
    const delta = isRecord(firstChoice) ? firstChoice.delta : undefined;
    if (!isRecord(delta)) return null;
    return delta.content;
  });
}

function extractAnthropicToken(chunk: string) {
  return extractJsonLineToken(chunk, (payload) => {
    const delta = isRecord(payload) ? payload.delta : undefined;
    if (!isRecord(delta)) return null;
    return delta.text;
  });
}

function extractGeminiToken(chunk: string) {
  return extractJsonLineToken(chunk, (payload) => {
    const candidates = isRecord(payload) ? payload.candidates : undefined;
    if (!isUnknownArray(candidates)) return null;
    const firstCandidate = candidates[0];
    const content = isRecord(firstCandidate)
      ? firstCandidate.content
      : undefined;
    const parts = isRecord(content) ? content.parts : undefined;
    if (!isUnknownArray(parts)) return null;
    const firstPart = parts[0];
    if (!isRecord(firstPart)) return null;
    return firstPart.text;
  });
}

function extractJsonLineToken(
  chunk: string,
  pick: (payload: unknown) => unknown,
) {
  for (const rawLine of chunk.split('\n')) {
    const line = rawLine.trim();
    if (!line || line === 'data: [DONE]') continue;
    const jsonText = line.startsWith('data:') ? line.slice(5).trim() : line;
    try {
      const payload: unknown = JSON.parse(jsonText);
      const token = pick(payload);
      if (typeof token === 'string' && token.length > 0) return token;
    } catch {
      continue;
    }
  }
  return null;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}
