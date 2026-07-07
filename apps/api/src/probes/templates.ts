import type { ProviderTag } from '../admin/admin.constants';

export type ProbeHttpRequest = {
  url: string;
  init: RequestInit;
};

export type ProbeTemplate = {
  id: string;
  provider: ProviderTag;
  name: string;
  description: string;
  request: {
    method: 'POST';
    path: string;
    query?: Record<string, string>;
    headers: Record<string, string>;
    body: Record<string, unknown>;
  };
  tokenExtractor: 'openai-chat' | 'openai-responses' | 'anthropic' | 'gemini';
};

const REQUEST_BODY_PROMPT = 'Reply with pong.';

// 请求模板只描述 HTTP 请求形状；密钥、模型名等变量在实际探测时再渲染进去。
export const PROBE_TEMPLATES: ProbeTemplate[] = [
  {
    id: 'openai-chat-basic',
    provider: 'OpenAI',
    name: 'OpenAI Chat 基础探测',
    description: '使用 Chat Completions streaming 请求检测首 token 和完整流耗时。',
    request: {
      method: 'POST',
      path: '/chat/completions',
      headers: {
        Authorization: 'Bearer {{API_KEY}}',
        'Content-Type': 'application/json',
      },
      body: {
        model: '{{MODEL}}',
        stream: true,
        max_tokens: 8,
        messages: [{ role: 'user', content: REQUEST_BODY_PROMPT }],
      },
    },
    tokenExtractor: 'openai-chat',
  },
  {
    id: 'openai-responses-basic',
    provider: 'OpenAI',
    name: 'OpenAI Responses 基础探测',
    description: '使用 Responses streaming 请求检测首 token 和完整流耗时。',
    request: {
      method: 'POST',
      path: '/responses',
      headers: {
        Authorization: 'Bearer {{API_KEY}}',
        'Content-Type': 'application/json',
      },
      body: {
        model: '{{MODEL}}',
        stream: true,
        max_output_tokens: 8,
        input: REQUEST_BODY_PROMPT,
      },
    },
    tokenExtractor: 'openai-responses',
  },
  {
    id: 'anthropic-message-basic',
    provider: 'Anthropic',
    name: 'Anthropic Messages 基础探测',
    description: '使用 Messages streaming 请求检测首 token 和完整流耗时。',
    request: {
      method: 'POST',
      path: '/messages',
      headers: {
        'x-api-key': '{{API_KEY}}',
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: {
        model: '{{MODEL}}',
        stream: true,
        max_tokens: 8,
        messages: [{ role: 'user', content: REQUEST_BODY_PROMPT }],
      },
    },
    tokenExtractor: 'anthropic',
  },
  {
    id: 'gemini-generate-basic',
    provider: 'Gemini',
    name: 'Gemini Generate 基础探测',
    description: '使用 Gemini streaming 请求检测首 token 和完整流耗时。',
    request: {
      method: 'POST',
      path: '/models/{{MODEL}}:streamGenerateContent',
      query: { key: '{{API_KEY}}' },
      headers: { 'Content-Type': 'application/json' },
      body: {
        contents: [{ role: 'user', parts: [{ text: REQUEST_BODY_PROMPT }] }],
        generationConfig: { maxOutputTokens: 8 },
      },
    },
    tokenExtractor: 'gemini',
  },
];

export function buildProbeRequest(input: {
  requestTemplateId: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
}): ProbeHttpRequest {
  const template = getProbeTemplate(input.requestTemplateId);
  const variables = templateVariables(input);
  const url = buildTemplateUrl(input.baseUrl, template, variables);

  return {
    url,
    init: {
      method: template.request.method,
      headers: renderTemplateValue(template.request.headers, variables) as Record<
        string,
        string
      >,
      body: JSON.stringify(renderTemplateValue(template.request.body, variables)),
    },
  };
}

export function extractToken(
  requestTemplateId: string,
  chunk: string,
): string | null {
  const template = getProbeTemplate(requestTemplateId);
  if (template.tokenExtractor === 'openai-chat') {
    return extractOpenAiChatToken(chunk);
  }
  if (template.tokenExtractor === 'openai-responses') {
    return extractOpenAiResponsesToken(chunk);
  }
  if (template.tokenExtractor === 'anthropic') return extractAnthropicToken(chunk);
  return extractGeminiToken(chunk);
}

export function providerForProbeTemplate(requestTemplateId: string) {
  return getProbeTemplate(requestTemplateId).provider;
}

function getProbeTemplate(requestTemplateId: string) {
  const template = PROBE_TEMPLATES.find((item) => item.id === requestTemplateId);
  if (!template) throw new Error(`Unknown request template: ${requestTemplateId}`);
  return template;
}

function templateVariables(input: { apiKey: string; modelName: string }) {
  return {
    API_KEY: input.apiKey,
    MODEL: input.modelName,
  };
}

function buildTemplateUrl(
  baseUrl: string,
  template: ProbeTemplate,
  variables: Record<string, string>,
) {
  const renderedPath = renderTemplateString(template.request.path, variables);
  const url = new URL(
    `${baseUrl.replace(/\/$/, '')}/${renderedPath.replace(/^\//, '')}`,
  );
  const renderedQuery = renderTemplateValue(
    template.request.query ?? {},
    variables,
  ) as Record<string, string>;

  for (const [key, value] of Object.entries(renderedQuery)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

function renderTemplateValue(
  value: unknown,
  variables: Record<string, string>,
): unknown {
  if (typeof value === 'string') return renderTemplateString(value, variables);
  if (Array.isArray(value)) {
    return value.map((item) => renderTemplateValue(item, variables));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        renderTemplateValue(item, variables),
      ]),
    );
  }
  return value;
}

function renderTemplateString(value: string, variables: Record<string, string>) {
  return value.replaceAll(/{{([A-Z_]+)}}/g, (_, key: string) => {
    const variable = variables[key];
    if (variable === undefined) {
      throw new Error(`Unknown template variable: ${key}`);
    }
    return variable;
  });
}

type JsonRecord = Record<string, unknown>;

function extractOpenAiChatToken(chunk: string) {
  return extractJsonLineToken(chunk, (payload) => {
    const choices = isRecord(payload) ? payload.choices : undefined;
    if (!isUnknownArray(choices)) return null;
    const firstChoice = choices[0];
    const delta = isRecord(firstChoice) ? firstChoice.delta : undefined;
    if (!isRecord(delta)) return null;
    return delta.content;
  });
}

function extractOpenAiResponsesToken(chunk: string) {
  return extractJsonLineToken(chunk, (payload) => {
    if (!isRecord(payload)) return null;
    if (payload.type !== 'response.output_text.delta') return null;
    return payload.delta;
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
