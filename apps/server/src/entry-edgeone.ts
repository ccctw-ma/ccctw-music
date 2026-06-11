import type { Env } from "./env";

const DEFAULT_UNIFIED_API_BASE_URL = "https://ccctw-music-api.1934202608.workers.dev";

function proxyTarget(request: Request, env: Env) {
  const baseUrl = new URL(env.UNIFIED_API_BASE_URL ?? DEFAULT_UNIFIED_API_BASE_URL);
  const incomingUrl = new URL(request.url);
  baseUrl.pathname = incomingUrl.pathname;
  baseUrl.search = incomingUrl.search;
  return baseUrl;
}

async function proxyToUnifiedApi(request: Request, env: Env) {
  const headers = new Headers(request.headers);
  headers.set("x-ccctw-edgeone-proxy", "1");
  headers.set("x-forwarded-host", new URL(request.url).host);

  const response = await fetch(proxyTarget(request, env), {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });

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
