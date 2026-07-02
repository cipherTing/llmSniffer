import { AlertTriangle, CheckCircle2, MinusCircle, TimerReset, XCircle } from "lucide-react";
import type { RelayStatus } from "@/lib/monitoring-types";
import { statusLabels } from "@/lib/monitoring-utils";

const statusClass: Record<RelayStatus, string> = {
  operational: "llms-status-operational",
  flaky: "llms-status-flaky",
  degraded: "llms-status-degraded",
  down: "llms-status-down",
  no_data: "llms-status-no-data",
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
      className={`llms-status-badge ${statusClass[status]}`}
    >
      <Icon aria-hidden="true" size={12} />
      {statusLabels[status]}
    </span>
  );
}
