import { MonitoringDashboard } from "@/components/dashboard/monitoring-dashboard";
import { relayHealthSnapshot } from "@/lib/monitoring-snapshot";

export default function Home() {
  return <MonitoringDashboard snapshot={relayHealthSnapshot} />;
}
