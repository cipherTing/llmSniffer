import type { LatencyBand, RelayStatus, TrendStatus } from "./monitoring-types";

export const statusLabels: Record<RelayStatus, string> = {
  operational: "可用",
  flaky: "波动",
  degraded: "降级",
  down: "不可用",
  no_data: "无数据",
};

export const trendLabels: Record<TrendStatus, string> = {
  ok: "可用",
  slow: "慢请求",
  partial: "部分失败",
  down: "不可用",
  no_data: "无数据",
};

export const statusRank: Record<RelayStatus, number> = {
  operational: 0,
  flaky: 1,
  degraded: 2,
  down: 3,
  no_data: 4,
};

export function formatLatency(latencyMs: number | null) {
  if (latencyMs === null) return "超时";
  return `${latencyMs}ms`;
}

export function formatPercent(value: number) {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(2)}%`;
}

export function latencyBand(latencyMs: number | null): LatencyBand {
  if (latencyMs === null) return "timeout";
  if (latencyMs < 800) return "fast";
  if (latencyMs < 2000) return "normal";
  if (latencyMs < 5000) return "slow";
  return "very_slow";
}

export function latencyBandLabel(band: LatencyBand) {
  const labels: Record<LatencyBand, string> = {
    fast: "快",
    normal: "正常",
    slow: "慢",
    very_slow: "很慢",
    timeout: "超时",
  };

  return labels[band];
}
