import { PROBE_TEMPLATES, type ProbeTemplate } from '../probes/templates';

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

const CURL_LINE_CONTINUATION = ' \\' + '\n';

export const REQUEST_TEMPLATES = PROBE_TEMPLATES.map((template) => ({
  id: template.id,
  provider: template.provider,
  name: template.name,
  description: template.description,
  curl: buildTemplateCurl(template),
})) as readonly {
  id: string;
  provider: ProviderTag;
  name: string;
  description: string;
  curl: string;
}[];

export const REQUEST_TEMPLATE_IDS = REQUEST_TEMPLATES.map(
  (template) => template.id,
);

function buildTemplateCurl(template: ProbeTemplate) {
  const url = templateUrl(template);
  const headers = Object.entries(template.request.headers).map(
    ([key, value]) => `  -H ${shellQuote(`${key}: ${value}`)}`,
  );
  const body = JSON.stringify(template.request.body, null, 2);

  return [
    `curl -N -X ${template.request.method} ${shellQuote(url)}`,
    ...headers,
    `  --data ${shellQuote(body)}`,
  ].join(CURL_LINE_CONTINUATION);
}

function templateUrl(template: ProbeTemplate) {
  const path = template.request.path.startsWith('/')
    ? template.request.path
    : `/${template.request.path}`;
  const query = Object.entries(template.request.query ?? {})
    .map(([key, value]) => `${encodeURIComponent(key)}=${value}`)
    .join('&');

  return `{{BASE_URL}}${path}${query ? `?${query}` : ''}`;
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
