export const QUEUE_NAMES = {
  probe: 'probe',
  metricsAggregate: 'metrics-aggregate',
  snapshotRefresh: 'snapshot-refresh',
} as const;

export const WORKER_ROLES = [
  'scheduler',
  'probe',
  'metrics',
  'snapshot',
] as const;

export type WorkerRole = (typeof WORKER_ROLES)[number];
export type ProbeRegion = 'default';
