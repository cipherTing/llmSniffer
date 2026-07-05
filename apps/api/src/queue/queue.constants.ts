export const QUEUE_NAMES = {
  probeOpenai: 'probe:openai',
  probeAnthropic: 'probe:anthropic',
  probeGemini: 'probe:gemini',
  metricsAggregate: 'metrics:aggregate',
  snapshotRefresh: 'snapshot:refresh',
} as const;

export const WORKER_ROLES = [
  'scheduler',
  'probe-openai',
  'probe-anthropic',
  'probe-gemini',
  'metrics',
  'snapshot',
] as const;

export type WorkerRole = (typeof WORKER_ROLES)[number];
export type ProbeProvider = 'OpenAI' | 'Anthropic' | 'Gemini';
export type ProbeRegion = 'default';
