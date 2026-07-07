import type { ProviderTag } from '../admin/admin.constants';
import type { ProbeRegion } from '../queue/queue.constants';

export const PROBE_RESULT_STATUSES = [
  'ok',
  'slow',
  'partial',
  'down',
  'config_error',
] as const;

export type ProbeResultStatus = (typeof PROBE_RESULT_STATUSES)[number];

export type NormalizedProbeResult = {
  siteId: string;
  probeId: string;
  region: ProbeRegion;
  provider: ProviderTag;
  modelName: string;
  bucketStart: Date;
  scheduledAt: Date;
  startedAt: Date;
  firstTokenAt: Date | null;
  finishedAt: Date;
  firstTokenLatencyMs: number | null;
  totalLatencyMs: number;
  status: ProbeResultStatus;
  httpStatus: number | null;
  errorCode: string | null;
  reason: string;
  attempt: number;
};
