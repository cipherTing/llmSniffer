import { create } from "zustand";
import type { ProviderTag, RelayStatus, TimeWindow } from "@/lib/monitoring-types";

type DashboardState = {
  window: TimeWindow;
  query: string;
  status: RelayStatus | "all";
  provider: ProviderTag | "all";
  setWindow: (window: TimeWindow) => void;
  setQuery: (query: string) => void;
  setStatus: (status: RelayStatus | "all") => void;
  setProvider: (provider: ProviderTag | "all") => void;
  resetFilters: () => void;
};

export const useDashboardStore = create<DashboardState>()((set) => ({
  window: "24h",
  query: "",
  status: "all",
  provider: "all",
  setWindow: (window) => set({ window }),
  setQuery: (query) => set({ query }),
  setStatus: (status) => set({ status }),
  setProvider: (provider) => set({ provider }),
  resetFilters: () => set({ query: "", status: "all", provider: "all" }),
}));
