import type { Env } from "./env";

const DEFAULT_UNIFIED_API_BASE_URL = "https://ccctw-music-api.1934202608.workers.dev";
const PUBLIC_ENTRY_HOSTS = new Set(["music.ccctw.com", "music-cn.ccctw.com"]);
const PROXY_TIMEOUT_MS = 6000;

function proxyTarget(request: Request, env: Env) {
  const incomingUrl = new URL(request.url);
  const baseUrl = new URL(safeUnifiedApiBaseUrl(incomingUrl, env));
  baseUrl.pathname = incomingUrl.pathname;
  baseUrl.search = incomingUrl.search;
  return baseUrl;
}

function safeUnifiedApiBaseUrl(incomingUrl: URL, env: Env) {
  const configuredUrl = env.UNIFIED_API_BASE_URL ?? DEFAULT_UNIFIED_API_BASE_URL;
  const configuredBase = new URL(configuredUrl);

  if (configuredBase.host === incomingUrl.host || PUBLIC_ENTRY_HOSTS.has(configuredBase.host)) {
    return DEFAULT_UNIFIED_API_BASE_URL;
  }

  return configuredBase.toString();
}

async function proxyToUnifiedApi(request: Request, env: Env) {
  const headers = new Headers(request.headers);
  headers.set("x-ccctw-edgeone-proxy", "1");
  headers.set("x-forwarded-host", new URL(request.url).host);

  const target = proxyTarget(request, env);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
      signal: controller.signal,
    });
  } catch {
    if (request.method === "GET" || request.method === "HEAD") {
      return Response.redirect(target, 307);
    }

    return new Response(JSON.stringify({ error: "Unified API proxy failed" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  } finally {
    clearTimeout(timeout);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

/**
 * EdgeOne Pages Functions entry point.
 *
 * EdgeOne serves the domestic static SPA, while API requests are proxied to the
 * unified Cloudflare Worker backend. This keeps KV, D1, and object storage in a
 * single source of truth instead of splitting data across two edge platforms.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return proxyToUnifiedApi(request, env);
  },
};
