export const ADMIN_SESSION_COOKIE = 'llms_admin_session';
export const ADMIN_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const ADMIN_ROLES = ['system', 'admin'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const PROVIDER_TAGS = ['OpenAI', 'Anthropic', 'Gemini'] as const;
export type ProviderTag = (typeof PROVIDER_TAGS)[number];

export const SPONSOR_TIERS = ['standard', 'premium'] as const;
export type SponsorTier = (typeof SPONSOR_TIERS)[number];

export const MONITOR_INTERVAL_OPTIONS = [
  60, 150, 300, 600, 900, 1800, 3600,
] as const;

export const REQUEST_TEMPLATES = [
  {
    id: 'openai-chat-basic',
    name: 'OpenAI Chat 基础探测',
    description: '占位模板：模拟 Chat Completions 风格请求。',
  },
  {
    id: 'anthropic-message-basic',
    name: 'Anthropic Messages 基础探测',
    description: '占位模板：模拟 Claude Messages 风格请求。',
  },
  {
    id: 'gemini-generate-basic',
    name: 'Gemini Generate 基础探测',
    description: '占位模板：模拟 Gemini generateContent 风格请求。',
  },
] as const;

export const REQUEST_TEMPLATE_IDS = REQUEST_TEMPLATES.map(
  (template) => template.id,
);
