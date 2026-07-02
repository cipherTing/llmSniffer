"use client";

import { Tooltip } from "antd";
import type { TrendBucket, TrendStatus } from "@/lib/monitoring-types";
import { formatLatency, trendLabels } from "@/lib/monitoring-utils";

const statusClass: Record<TrendStatus, string> = {
  ok: "bg-emerald-500 hover:bg-emerald-400",
  slow: "bg-lime-500 hover:bg-lime-400",
  partial: "bg-amber-400 hover:bg-amber-300",
  down: "bg-rose-500 hover:bg-rose-400",
  no_data: "bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600",
};

export function TrendBar({ buckets, className = "gap-1", itemClassName = "h-6" }: { buckets: TrendBucket[]; className?: string; itemClassName?: string }) {
  return (
    <div aria-label="近期稳定性" className={`relative flex min-w-0 flex-1 items-center ${className}`}>
      {buckets.map((bucket) => {
        const label = bucketLabel(bucket);

        return (
          <Tooltip destroyOnHidden key={bucket.timestamp} mouseEnterDelay={0} mouseLeaveDelay={0} title={<TrendTooltipContent bucket={bucket} />}>
            <span
              aria-label={label}
              className={`${itemClassName} min-w-0 flex-1 basis-0 rounded-[3px] transition hover:scale-y-110 ${statusClass[bucket.status]}`}
            />
          </Tooltip>
        );
      })}
    </div>
  );
}

function TrendTooltipContent({ bucket }: { bucket: TrendBucket }) {
  return (
    <div className="w-32 text-[10px] leading-tight">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{trendLabels[bucket.status]}</span>
        <span className="whitespace-nowrap text-white/70">{formatBucketTime(bucket.timestamp)}</span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <span className="text-white/70">延迟</span>
        <span className="font-semibold tabular-nums">{formatBucketLatency(bucket)}</span>
      </div>
      {bucket.failureCount > 0 ? (
        <div className="mt-0.5 flex items-center justify-between gap-2 text-amber-200">
          <span>异常次数</span>
          <span className="font-semibold tabular-nums">{bucket.failureCount}</span>
        </div>
      ) : null}
    </div>
  );
}

function bucketLabel(bucket: TrendBucket) {
  return `${formatBucketTime(bucket.timestamp)} · ${trendLabels[bucket.status]} · 延迟 ${formatBucketLatency(bucket)}`;
}

function formatBucketLatency(bucket: TrendBucket) {
  if (bucket.status === "no_data") return "暂无数据";
  return formatLatency(bucket.latencyMs);
}

function formatBucketTime(timestamp: string) {
  return new Date(timestamp).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
