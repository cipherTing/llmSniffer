"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import type { PublicRelaysResponse } from "@/lib/admin-types";
import type { RelayHealthSnapshot } from "@/lib/monitoring-types";
import { MonitoringDashboard } from "./monitoring-dashboard";

export function DashboardLoader() {
  const [snapshot, setSnapshot] = useState<RelayHealthSnapshot>(emptySnapshot());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSnapshot() {
      setLoading(true);
      setError(null);
      try {
        setSnapshot(await apiRequest<PublicRelaysResponse>("/api/public/relays"));
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "无法加载监控列表");
        setSnapshot(emptySnapshot());
      } finally {
        setLoading(false);
      }
    }

    void loadSnapshot();
  }, []);

  return <MonitoringDashboard error={error} loading={loading} snapshot={snapshot} />;
}

function emptySnapshot(): RelayHealthSnapshot {
  return {
    generatedAt: "",
    relays: [],
  };
}
