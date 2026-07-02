export function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configuredUrl) return normalizeConfiguredLocalUrl(configuredUrl);

  if (typeof window === "undefined") return "http://localhost:3001";

  const url = new URL(window.location.href);
  url.port = "3001";
  url.pathname = "";
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

function normalizeConfiguredLocalUrl(configuredUrl: string) {
  if (typeof window === "undefined") return configuredUrl.replace(/\/$/, "");

  const apiUrl = new URL(configuredUrl);
  const pageUrl = new URL(window.location.href);
  if (isLoopbackHost(apiUrl.hostname) && isLoopbackHost(pageUrl.hostname)) {
    apiUrl.hostname = pageUrl.hostname;
  }

  return apiUrl.toString().replace(/\/$/, "");
}

function isLoopbackHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: "no-store",
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(await responseText(response), response.status);
  }

  return response.json() as Promise<T>;
}

async function responseText(response: Response) {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join("；");
    return body.message ?? `请求失败：${response.status}`;
  } catch {
    return `请求失败：${response.status}`;
  }
}
