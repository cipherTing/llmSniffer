import { AlertTriangle, CheckCircle2, MinusCircle, TimerReset, XCircle } from "lucide-react";
import type { RelayStatus } from "@/lib/monitoring-types";
import { statusLabels } from "@/lib/monitoring-utils";

const statusClass: Record<RelayStatus, string> = {
  operational: "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  flaky: "border-amber-500/25 bg-amber-500/14 text-amber-700 dark:text-amber-300",
  degraded: "border-orange-500/25 bg-orange-500/14 text-orange-700 dark:text-orange-300",
  down: "border-red-500/25 bg-red-500/14 text-red-700 dark:text-red-300",
  no_data: "border-slate-500/25 bg-slate-500/12 text-slate-600 dark:text-slate-300",
};

const statusIcon = {
  operational: CheckCircle2,
  flaky: AlertTriangle,
  degraded: TimerReset,
  down: XCircle,
  no_data: MinusCircle,
};

export function StatusBadge({ status }: { status: RelayStatus }) {
  const Icon = statusIcon[status];

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass[status]}`}
    >
      <Icon aria-hidden="true" size={12} />
      {statusLabels[status]}
    </span>
  );
}
