export const TIME_WINDOWS = ["90m", "24h", "7d", "30d"] as const;

export type TimeWindow = (typeof TIME_WINDOWS)[number];

export type RelayStatus = "operational" | "flaky" | "degraded" | "down" | "no_data";

export type ProviderTag = "OpenAI" | "Anthropic" | "Gemini";

export type SponsorTier = "standard" | "premium";

export type LatencyBand = "fast" | "normal" | "slow" | "very_slow" | "timeout";

export type TrendStatus = "ok" | "slow" | "partial" | "down" | "no_data";

export type TrendBucket = {
  timestamp: string;
  status: TrendStatus;
  latencyMs: number | null;
  failureCount: number;
};

export type RelayChannel = {
  id: string;
  provider: ProviderTag;
  label: string;
  trends: Record<TimeWindow, TrendBucket[]>;
};

export type WindowMetrics = {
  uptimePercent: number;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
  failureCount: number;
  longestOutageMinutes: number;
};

export type RelayMonitor = {
  id: string;
  name: string;
  domain: string;
  url: string;
  sponsorTier: SponsorTier;
  channels: RelayChannel[];
  collectedDays: number;
  monitorIntervalSeconds: number;
  current: {
    status: RelayStatus;
    latencyMs: number | null;
    firstTokenLatencyMs: number | null;
    latestCheckAt: string;
    reason: string;
  };
  windows: Record<TimeWindow, WindowMetrics>;
};

export type RelayHealthSnapshot = {
  generatedAt: string;
  relays: RelayMonitor[];
};
