"use client";

import { ConfigProvider, Table, Tooltip, message, theme as antTheme, type TableColumnsType } from "antd";
import { Crown, ExternalLink, Gauge, Handshake, LoaderCircle, RotateCcw, Tag, TriangleAlert, Zap } from "lucide-react";
import { useTheme } from "next-themes";
import { useDeferredValue, useEffect, useId, useMemo, type CSSProperties } from "react";
import type { ProviderTag, RelayHealthSnapshot, RelayMonitor, RelayStatus, SponsorTier, TimeWindow } from "@/lib/monitoring-types";
import { TIME_WINDOWS } from "@/lib/monitoring-types";
import { useMounted } from "@/lib/use-mounted";
import { formatPercent, statusLabels } from "@/lib/monitoring-utils";
import { useDashboardStore } from "@/stores/dashboard-store";
import { StatusBadge } from "./status-badge";
import { ThemeToggle } from "./theme-toggle";
import { TrendBar } from "./trend-bar";

const windowLabels: Record<TimeWindow, string> = {
  "90m": "近90分钟",
  "24h": "近24小时",
  "7d": "近7天",
  "30d": "近30天",
};

const providerMeta: Record<ProviderTag, { label: string; className: string }> = {
  OpenAI: { label: "OpenAI", className: "llms-provider-openai" },
  Anthropic: { label: "Anthropic", className: "llms-provider-anthropic" },
  Gemini: { label: "Gemini", className: "llms-provider-gemini" },
};

const sponsorMeta: Record<SponsorTier, { label: string; icon: "standard" | "premium"; className: string }> = {
  standard: {
    label: "普通赞助商",
    icon: "standard",
    className: "llms-marker-standard",
  },
  premium: {
    label: "高级赞助商",
    icon: "premium",
    className: "llms-marker-premium",
  },
};

const gitShortHash = "ca60c3d";

const loadingPanelStyle: CSSProperties = {
  display: "grid",
  placeItems: "center",
  gap: 10,
  minHeight: 220,
  border: "1px solid var(--border)",
  borderRadius: 14,
  background: "radial-gradient(circle at 50% 42%, rgba(31, 95, 216, 0.08), transparent 12rem), var(--surface)",
  color: "var(--text)",
  textAlign: "center",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

const loadingMarkBaseStyle: CSSProperties = {
  display: "inline-grid",
  placeItems: "center",
  width: 42,
  height: 42,
  border: "1px solid var(--border)",
  borderRadius: 999,
  color: "var(--accent)",
};

const loadingTitleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
};

export function MonitoringDashboard({
  snapshot,
  error,
  loading = false,
}: {
  snapshot: RelayHealthSnapshot;
  error?: string | null;
  loading?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const [messageApi, messageContextHolder] = message.useMessage();
  const { window, query, status, provider, setWindow, setQuery, setStatus, setProvider, resetFilters } = useDashboardStore();
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    if (error) void messageApi.error(error);
  }, [error, messageApi]);

  const filteredRelays = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return snapshot.relays.filter((relay) => {
      const relayProviders = channelProviders(relay);
      const matchesStatus = status === "all" || relay.current.status === status;
      const matchesProvider = provider === "all" || relayProviders.includes(provider);
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [relay.name, relay.domain, relayProviders.join(" "), relay.channels.map((channel) => channel.label).join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesStatus && matchesProvider && matchesQuery;
    }).sort(compareSponsorTier);
  }, [deferredQuery, provider, snapshot.relays, status]);

  const statusOptions = useMemo(() => {
    const statuses = Array.from(new Set(snapshot.relays.map((relay) => relay.current.status)));
    return [
      { value: "all" as const, label: "全部状态" },
      ...statuses.map((value) => ({ value, label: statusLabels[value] })),
    ];
  }, [snapshot.relays]);

  const providerOptions = useMemo(() => {
    const providers = Array.from(new Set(snapshot.relays.flatMap((relay) => relay.channels.map((channel) => channel.provider))));
    return [{ value: "all" as const, label: "全部厂商" }, ...providers.map((value) => ({ value, label: value }))];
  }, [snapshot.relays]);

  const columns = useMemo(() => buildColumns(window), [window]);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <ConfigProvider
      getPopupContainer={getPopupContainer}
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorBgContainer: "var(--surface)",
          colorBgElevated: "var(--surface)",
          colorBorderSecondary: "var(--row-border)",
          colorText: "var(--text)",
          colorTextSecondary: "var(--muted)",
          borderRadius: 6,
          fontFamily: "var(--font-sans)",
        },
        components: {
          Table: {
            cellPaddingBlock: 8,
            cellPaddingInline: 10,
            headerBg: "var(--table-head)",
            headerColor: "var(--muted)",
            rowHoverBg: "var(--surface-hover)",
          },
          Tooltip: {
            fontSize: 11,
          },
          Empty: {
            colorTextDescription: "var(--muted)",
          },
        },
      }}
      renderEmpty={() => <div className="llms-empty-state">{loading ? "正在加载监控列表" : snapshot.relays.length === 0 ? "还没有收录中转站" : "没有符合当前筛选条件的中转站"}</div>}
    >
      {messageContextHolder}
      <main className="llms-dashboard min-h-screen bg-[var(--background)] text-[var(--text)]">
        <div className="w-full px-4 py-4 md:px-16">
          <header className="llms-header flex items-center justify-between gap-5 border-b border-[var(--border)] pb-3">
            <div>
              <h1 className="text-lg font-semibold tracking-normal">LLMSniffer</h1>
              <p className="mt-0.5 text-xs text-[var(--muted)]">第三方 AI 中转站可用性、延迟和近期稳定性</p>
            </div>
            <ThemeToggle />
          </header>

          <section className="llms-toolbar sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--background)]/95 py-2 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="llms-window-tabs flex items-center gap-0.5 rounded-md border border-[var(--border)] bg-[var(--surface)] p-0.5">
                {TIME_WINDOWS.map((option) => (
                  <button
                    className={`llms-window-tab h-6 rounded px-2 text-xs font-medium transition ${
                      option === window
                        ? "llms-window-tab-active bg-[var(--accent)]"
                        : "text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                    }`}
                    key={option}
                    onClick={() => setWindow(option)}
                    style={activeTextStyle(option === window)}
                    type="button"
                  >
                    {windowLabels[option]}
                  </button>
                ))}
              </div>

              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5 md:flex-none">
                <label className="relative block min-w-[180px] flex-1 md:min-w-0 md:flex-none">
                  <input
                    className="h-7 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] md:w-[240px]"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索站名、域名、通道"
                    type="search"
                    value={query}
                  />
                </label>
                <select
                  className="h-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs font-medium text-[var(--text)] outline-none focus:border-[var(--accent)]"
                  onChange={(event) => setStatus(event.target.value as RelayStatus | "all")}
                  value={status}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  className="h-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs font-medium text-[var(--text)] outline-none focus:border-[var(--accent)]"
                  onChange={(event) => setProvider(event.target.value as ProviderTag | "all")}
                  value={provider}
                >
                  {providerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs font-medium text-[var(--text)] transition hover:bg-[var(--surface-hover)]"
                  onClick={resetFilters}
                  type="button"
                >
                  <RotateCcw aria-hidden="true" size={13} />
                  重置
                </button>
              </div>
            </div>
          </section>

          <section className="py-3">
            <div className="hidden md:block">
              {loading && snapshot.relays.length === 0 ? (
                <LoadingPanel isDark={isDark} />
              ) : (
                <Table<RelayMonitor>
                  className="llms-table"
                  columns={columns}
                  dataSource={filteredRelays}
                  pagination={false}
                  rowClassName={(relay: RelayMonitor) => (relay.sponsorTier === "premium" ? "llms-table-row-premium" : "")}
                  rowKey="id"
                  showSorterTooltip={false}
                  sortDirections={["ascend", "descend"]}
                  tableLayout="fixed"
                />
              )}
            </div>

            <div className="space-y-2 md:hidden">
              {loading ? (
                <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--muted)]">正在加载监控列表</div>
              ) : null}
              {!loading && filteredRelays.map((relay) => (
                <RelayCard key={relay.id} relay={relay} window={window} />
              ))}
              {!loading && filteredRelays.length === 0 ? (
                <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--muted)]">
                  {snapshot.relays.length === 0 ? "还没有收录中转站" : "没有符合当前筛选条件的中转站"}
                </div>
              ) : null}
            </div>
          </section>

          <PlatformStatement />
        </div>
      </main>
    </ConfigProvider>
  );
}

function buildColumns(window: TimeWindow): TableColumnsType<RelayMonitor> {
  return [
    {
      title: "标注",
      key: "sponsorTier",
      align: "center",
      onCell: (relay) => ({
        style: relay.sponsorTier === "premium" ? { boxShadow: "inset 3px 0 0 #f59e0b" } : undefined,
      }),
      render: (_, relay) => (
        <div className="flex items-center justify-center gap-0.5">
          <SponsorIcon tier={relay.sponsorTier} />
          <IntervalIcon seconds={relay.monitorIntervalSeconds} />
        </div>
      ),
      width: "7%",
    },
    {
      title: "中转站",
      key: "relay",
      dataIndex: "name",
      render: (_, relay) => (
        <div className="flex min-w-0 items-center gap-2">
          <a className="truncate font-semibold text-[var(--text)] underline-offset-4 hover:underline" href={relay.url} rel="noreferrer" target="_blank">
            {relay.name}
          </a>
          <ExternalLink aria-hidden="true" className="shrink-0 text-[var(--muted)]" size={14} />
        </div>
      ),
      sorter: (a, b) => compareRelayName(a, b),
      width: "19%",
    },
    {
      title: "状态",
      key: "status",
      align: "center",
      render: (_, relay) => <StatusBadge status={relay.current.status} />,
      sorter: (a, b) => statusSortValue(a.current.status) - statusSortValue(b.current.status),
      width: "10%",
    },
    {
      title: "厂商",
      key: "providers",
      render: (_, relay) => <ProviderIcons providers={channelProviders(relay)} />,
      width: "9%",
    },
    {
      title: "可用率",
      key: "uptime",
      align: "center",
      render: (_, relay) => <UptimeValue relay={relay} window={window} />,
      sorter: (a, b, sortOrder) => {
        const sponsorCompare = compareSponsorTier(a, b);
        if (sponsorCompare !== 0) return sortOrder === "descend" ? -sponsorCompare : sponsorCompare;

        return uptimeSortValue(a, window) - uptimeSortValue(b, window);
      },
      defaultSortOrder: "descend",
      width: "8%",
    },
    {
      title: "趋势",
      key: "trend",
      render: (_, relay) => <ChannelTrends relay={relay} window={window} />,
      width: "47%",
    },
  ];
}

function RelayCard({ relay, window }: { relay: RelayMonitor; window: TimeWindow }) {
  return (
    <article className={`rounded-md border border-[var(--border)] bg-[var(--surface)] p-2.5 ${relay.sponsorTier === "premium" ? "border-l-4 border-l-amber-400" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <SponsorIcon tier={relay.sponsorTier} />
          <IntervalIcon seconds={relay.monitorIntervalSeconds} />
          <a className="truncate font-semibold text-[var(--text)] underline-offset-4 hover:underline" href={relay.url} rel="noreferrer" target="_blank">
            {relay.name}
          </a>
        </div>
        <StatusBadge status={relay.current.status} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-[var(--muted)]">厂商</div>
          <div className="mt-1"><ProviderIcons providers={channelProviders(relay)} /></div>
        </div>
        <div>
          <div className="text-[var(--muted)]">可用率</div>
          <div className="mt-0.5"><UptimeValue relay={relay} window={window} /></div>
        </div>
      </div>

      <div className="mt-2 min-w-0">
        <ChannelTrends relay={relay} window={window} />
      </div>
    </article>
  );
}

function LoadingPanel({ isDark }: { isDark: boolean }) {
  return (
    <div className="llms-loading-panel" aria-busy="true" aria-live="polite" style={loadingPanelStyle}>
      <div
        className="llms-loading-mark"
        style={{
          ...loadingMarkBaseStyle,
          background: isDark ? "rgba(59, 130, 246, 0.16)" : "#e8f0ff",
        }}
      >
        <LoaderCircle aria-hidden="true" className="animate-spin" size={20} />
      </div>
      <div>
        <div className="llms-loading-title" style={loadingTitleStyle}>加载中</div>
      </div>
    </div>
  );
}

function PlatformStatement() {
  return (
    <section className="mt-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <h2 className="text-sm font-semibold text-[var(--text)]">平台声明</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="flex gap-3 rounded-md border border-[var(--row-border)] bg-[var(--table-head)] p-3">
          <Zap aria-hidden="true" className="mt-0.5 shrink-0 text-cyan-500" size={17} />
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">探测说明</div>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              当前已接入收录管理；正式探测接入前，趋势数据仅作为列表结构占位展示。
            </p>
          </div>
        </div>
        <div className="flex gap-3 rounded-md border border-[var(--row-border)] bg-[var(--table-head)] p-3">
          <TriangleAlert aria-hidden="true" className="mt-0.5 shrink-0 text-amber-500" size={17} />
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">免责声明</div>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              监测数据仅供技术参考，不构成对任何第三方服务商信誉或资金安全的背书；用户与服务商的交互风险自负。
            </p>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center border-t border-[var(--row-border)] pt-3 text-xs text-[var(--muted)]">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--row-border)] bg-[var(--table-head)] px-2.5 py-1.5 font-mono">
          <Tag aria-hidden="true" size={14} />
          <span>{gitShortHash}</span>
        </span>
      </div>
    </section>
  );
}

function SponsorIcon({ tier }: { tier: SponsorTier }) {
  const meta = sponsorMeta[tier];

  return (
    <Tooltip destroyOnHidden title={meta.label} mouseEnterDelay={0} mouseLeaveDelay={0}>
      <span className={`llms-marker ${meta.className} inline-flex items-center justify-center`}>
        {meta.icon === "premium" ? <Crown aria-hidden="true" size={11} strokeWidth={2.2} /> : <Handshake aria-hidden="true" size={11} strokeWidth={2.2} />}
      </span>
    </Tooltip>
  );
}

function IntervalIcon({ seconds }: { seconds: number }) {
  return (
    <Tooltip destroyOnHidden title={`探测间隔 ${formatDuration(seconds)}`} mouseEnterDelay={0} mouseLeaveDelay={0}>
      <span className="llms-marker llms-marker-interval inline-flex items-center justify-center">
        <Gauge aria-hidden="true" size={11} strokeWidth={2.2} />
      </span>
    </Tooltip>
  );
}

function ProviderIcons({ providers }: { providers: ProviderTag[] }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1" title={providers.join(" / ")}>
      {providers.map((provider) => {
        const meta = providerMeta[provider];

        return (
          <span
            aria-label={meta.label}
            className={`llms-provider-chip ${meta.className} inline-flex items-center`}
            key={provider}
          >
            <ProviderLogo provider={provider} />
            <span>{meta.label}</span>
          </span>
        );
      })}
    </div>
  );
}

function ProviderLogo({ provider }: { provider: ProviderTag }) {
  const geminiGradientId = `gemini-gradient-${useId().replaceAll(":", "")}`;

  if (provider === "OpenAI") {
    return (
      <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 320 320">
        <path
          d="M297.06 130.97c7.26-21.79 4.76-45.66-6.85-65.48-17.46-30.4-52.56-46.04-86.84-38.68-15.25-17.18-37.16-26.95-60.13-26.81-35.04-.08-66.13 22.48-76.91 55.82-22.51 4.61-41.94 18.7-53.31 38.67-17.59 30.32-13.58 68.54 9.92 94.54-7.26 21.79-4.76 45.66 6.85 65.48 17.46 30.4 52.56 46.04 86.84 38.68 15.24 17.18 37.16 26.95 60.13 26.8 35.06.09 66.16-22.49 76.94-55.86 22.51-4.61 41.94-18.7 53.31-38.67 17.57-30.32 13.55-68.51-9.94-94.51zm-120.28 168.11c-14.03.02-27.62-4.89-38.39-13.88.49-.26 1.34-.73 1.89-1.07l63.72-36.8c3.26-1.85 5.26-5.32 5.24-9.07v-89.83l26.93 15.55c.29.14.48.42.52.74v74.39c-.04 33.08-26.83 59.9-59.91 59.97zm-128.84-55.03c-7.03-12.14-9.56-26.37-7.15-40.18.47.28 1.3.79 1.89 1.13l63.72 36.8c3.23 1.89 7.23 1.89 10.47 0l77.79-44.92v31.1c.02.32-.13.63-.38.83l-64.41 37.19c-28.69 16.52-65.33 6.7-81.92-21.95zm-16.77-139.09c7-12.16 18.05-21.46 31.21-26.29 0 .55-.03 1.52-.03 2.2v73.61c-.02 3.74 1.98 7.21 5.23 9.06l77.79 44.91-26.93 15.55c-.27.18-.61.21-.91.08l-64.42-37.22c-28.63-16.58-38.45-53.21-21.95-81.89zm221.26 51.49-77.79-44.92 26.93-15.54c.27-.18.61-.21.91-.08l64.42 37.19c28.68 16.57 38.51 53.26 21.94 81.94-7.01 12.14-18.05 21.44-31.2 26.28v-75.81c.03-3.74-1.96-7.2-5.2-9.06zm26.8-40.34c-.47-.29-1.3-.79-1.89-1.13l-63.72-36.8c-3.23-1.89-7.23-1.89-10.47 0l-77.79 44.92v-31.1c-.02-.32.13-.63.38-.83l64.41-37.16c28.69-16.55 65.37-6.7 81.91 22 6.99 12.12 9.52 26.31 7.15 40.1zm-168.51 55.43-26.94-15.55c-.29-.14-.48-.42-.52-.74v-74.39c.02-33.12 26.89-59.96 60.01-59.94 14.01 0 27.57 4.92 38.34 13.88-.49.26-1.33.73-1.89 1.07l-63.72 36.8c-3.26 1.85-5.26 5.31-5.24 9.06l-.04 89.79zm14.63-31.54 34.65-20.01 34.65 20v40.01l-34.65 20-34.65-20z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (provider === "Gemini") {
    return (
      <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 192 192">
        <defs>
          <linearGradient id={geminiGradientId} x1="36" x2="164" y1="156" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2A7FFF" />
            <stop offset="0.46" stopColor="#9B72CB" />
            <stop offset="0.78" stopColor="#D96570" />
            <stop offset="1" stopColor="#F2A60C" />
          </linearGradient>
        </defs>
        <path
          d="M164.93 86.68c-13.56-5.84-25.42-13.84-35.6-24.01-10.17-10.17-18.18-22.04-24.01-35.6-2.23-5.19-4.04-10.54-5.42-16.02C99.45 9.26 97.85 8 96 8s-3.45 1.26-3.9 3.05c-1.38 5.48-3.18 10.81-5.42 16.02-5.84 13.56-13.84 25.43-24.01 35.6-10.17 10.16-22.04 18.17-35.6 24.01-5.19 2.23-10.54 4.04-16.02 5.42C9.26 92.55 8 94.15 8 96s1.26 3.45 3.05 3.9c5.48 1.38 10.81 3.18 16.02 5.42 13.56 5.84 25.42 13.84 35.6 24.01 10.17 10.17 18.18 22.04 24.01 35.6 2.24 5.2 4.04 10.54 5.42 16.02A4.03 4.03 0 0 0 96 184c1.85 0 3.45-1.26 3.9-3.05 1.38-5.48 3.18-10.81 5.42-16.02 5.84-13.56 13.84-25.42 24.01-35.6 10.17-10.17 22.04-18.18 35.6-24.01 5.2-2.24 10.54-4.04 16.02-5.42A4.03 4.03 0 0 0 184 96c0-1.85-1.26-3.45-3.05-3.9-5.48-1.38-10.81-3.18-16.02-5.42Z"
          fill={`url(#${geminiGradientId})`}
        />
      </svg>
    );
  }

  if (provider === "Anthropic") {
    return (
      <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
        <path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z" fill="currentColor" />
      </svg>
    );
  }

  return null;
}

function ChannelTrends({ relay, window }: { relay: RelayMonitor; window: TimeWindow }) {
  const layout = trendLayout(relay.channels.length);

  return (
    <div
      className={`grid min-w-0 ${layout.containerClassName}`}
      style={{ gridTemplateRows: `repeat(${relay.channels.length}, minmax(0, 1fr))` }}
    >
      {relay.channels.map((channel) => (
        <div className="grid min-h-0 min-w-0 grid-cols-[54px_minmax(0,1fr)] items-center gap-2" key={channel.id}>
          <span className="truncate text-[10px] font-medium leading-none text-[var(--muted)]" title={`${channel.provider} / ${channel.label}`}>
            {channel.label}
          </span>
          <TrendBar buckets={channel.trends[window]} className="h-full gap-0.5" itemClassName={layout.itemClassName} />
        </div>
      ))}
    </div>
  );
}

function UptimeValue({ relay, window }: { relay: RelayMonitor; window: TimeWindow }) {
  if (relay.current.status === "no_data") {
    return <span className="font-medium text-[var(--muted)]">无数据</span>;
  }

  return <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{formatPercent(relay.windows[window].uptimePercent)}</span>;
}

function uptimeSortValue(relay: RelayMonitor, window: TimeWindow) {
  return relay.current.status === "no_data" ? -1 : relay.windows[window].uptimePercent;
}

function compareRelayName(a: RelayMonitor, b: RelayMonitor) {
  return a.name.localeCompare(b.name, "zh-CN") || a.domain.localeCompare(b.domain, "zh-CN");
}

function statusSortValue(status: RelayStatus) {
  const order: Record<RelayStatus, number> = {
    operational: 0,
    flaky: 1,
    degraded: 2,
    down: 3,
    no_data: 4,
  };

  return order[status];
}

function trendLayout(channelCount: number) {
  if (channelCount === 1) return { containerClassName: "h-7", itemClassName: "h-5" };
  if (channelCount === 2) return { containerClassName: "h-[35px] gap-[3px]", itemClassName: "h-full max-h-4" };
  if (channelCount === 3) return { containerClassName: "h-[52px] gap-[3px]", itemClassName: "h-3.5" };
  return { containerClassName: "h-[52px] gap-[3px]", itemClassName: "h-full min-h-2 max-h-3" };
}

function compareSponsorTier(a: RelayMonitor, b: RelayMonitor) {
  return sponsorPriority(a.sponsorTier) - sponsorPriority(b.sponsorTier);
}

function sponsorPriority(tier: SponsorTier) {
  return tier === "premium" ? 0 : 1;
}

function getPopupContainer(triggerNode?: HTMLElement) {
  return triggerNode?.closest(".llms-dashboard") ?? document.body;
}

function channelProviders(relay: RelayMonitor) {
  if (relay.providers && relay.providers.length > 0) return relay.providers;

  return relay.channels.reduce<ProviderTag[]>((providers, channel) => {
    if (!providers.includes(channel.provider)) providers.push(channel.provider);
    return providers;
  }, []);
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours > 0 ? `${hours}h` : ""}${minutes > 0 ? `${minutes}m` : ""}${seconds > 0 || totalSeconds === 0 ? `${seconds}s` : ""}`;
}

function activeTextStyle(active: boolean) {
  return active ? { color: "#ffffff" } : undefined;
}
