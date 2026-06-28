'use client';

import { useState } from 'react';

type HealthResponse = {
  ok: boolean;
  service: string;
  message: string;
  timestamp: string;
  dependencies: Record<
    string,
    {
      ok: boolean;
      latencyMs: number;
      detail?: string;
    }
  >;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export default function Home() {
  const [result, setResult] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function checkApi() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/health`);
      if (!response.ok) {
        throw new Error(`接口返回 ${response.status}`);
      }

      setResult((await response.json()) as HealthResponse);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : '接口请求失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-6 py-8 text-[#111827]">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col justify-center gap-8">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#2563eb]">
            LLMSniffer
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
            LLM 号池健康监控骨架已就绪
          </h1>
          <p className="max-w-2xl text-base leading-7 text-[#4b5563]">
            点击按钮会从 Next.js 页面请求 NestJS 的健康检查接口，同时验证 MongoDB 和 Redis 是否连通。
          </p>
        </div>

        <div className="rounded-lg border border-[#d8dee9] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">接口连通性测试</h2>
              <p className="mt-1 text-sm text-[#6b7280]">GET {apiBaseUrl}/health</p>
            </div>
            <button
              className="h-11 rounded-md bg-[#2563eb] px-5 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#93c5fd]"
              disabled={loading}
              onClick={checkApi}
              type="button"
            >
              {loading ? '请求中...' : '测试接口'}
            </button>
          </div>

          <div className="mt-6 rounded-md bg-[#f3f4f6] p-4 font-mono text-sm text-[#1f2937]">
            {error ? (
              <span className="text-[#dc2626]">请求失败：{error}</span>
            ) : result ? (
              <div className="space-y-4 font-sans">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${
                      result.ok ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fee2e2] text-[#991b1b]'
                    }`}
                  >
                    {result.ok ? '全链路正常' : '存在异常'}
                  </span>
                  <span className="text-sm text-[#4b5563]">{result.message}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(result.dependencies).map(([name, dependency]) => (
                    <div key={name} className="rounded-md border border-[#d8dee9] bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold uppercase text-[#111827]">{name}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            dependency.ok
                              ? 'bg-[#dcfce7] text-[#166534]'
                              : 'bg-[#fee2e2] text-[#991b1b]'
                          }`}
                        >
                          {dependency.ok ? '正常' : '异常'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[#4b5563]">延迟 {dependency.latencyMs}ms</p>
                      {dependency.detail ? (
                        <p className="mt-1 text-sm text-[#dc2626]">{dependency.detail}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
                <pre className="overflow-auto rounded-md bg-[#111827] p-3 font-mono text-xs text-white">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            ) : (
              <span className="text-[#6b7280]">等待测试请求...</span>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
