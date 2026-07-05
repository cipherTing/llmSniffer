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

export function extractToken(provider: ProbeProvider, chunk: string): string | null {
  if (provider === 'OpenAI') return extractOpenAiToken(chunk);
  if (provider === 'Anthropic') return extractAnthropicToken(chunk);
  return extractGeminiToken(chunk);
}

function buildOpenAiRequest(input: { baseUrl: string; apiKey: string; modelName: string }): ProbeHttpRequest {
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

function buildAnthropicRequest(input: { baseUrl: string; apiKey: string; modelName: string }): ProbeHttpRequest {
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

function buildGeminiRequest(input: { baseUrl: string; apiKey: string; modelName: string }): ProbeHttpRequest {
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

function extractOpenAiToken(chunk: string) {
  return extractJsonLineToken(chunk, (payload) => payload?.choices?.[0]?.delta?.content);
}

function extractAnthropicToken(chunk: string) {
  return extractJsonLineToken(chunk, (payload) => payload?.delta?.text);
}

function extractGeminiToken(chunk: string) {
  return extractJsonLineToken(chunk, (payload) => payload?.candidates?.[0]?.content?.parts?.[0]?.text);
}

function extractJsonLineToken(chunk: string, pick: (payload: any) => unknown) {
  for (const rawLine of chunk.split('\n')) {
    const line = rawLine.trim();
    if (!line || line === 'data: [DONE]') continue;
    const jsonText = line.startsWith('data:') ? line.slice(5).trim() : line;
    try {
      const token = pick(JSON.parse(jsonText));
      if (typeof token === 'string' && token.length > 0) return token;
    } catch {
      continue;
    }
  }
  return null;
}
