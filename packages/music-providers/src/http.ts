export const DEFAULT_UPSTREAM_TIMEOUT_MS = 8000;

export async function fetchWithTimeout(
  fetcher: typeof fetch,
  url: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_UPSTREAM_TIMEOUT_MS,
): Promise<Response> {
  const timeoutSignal = init?.signal ? undefined : AbortSignal.timeout(timeoutMs);

  try {
    return await fetcher(url, {
      ...init,
      signal: init?.signal ?? timeoutSignal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        ...init?.headers,
      },
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
      throw new Error(`Upstream request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  }
}

export async function getJson<T>(fetcher: typeof fetch, url: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithTimeout(fetcher, url, init);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  const normalized = text.replace(/^(callback|MusicJsonCallback|jsonCallback)\(/, "").replace(/\)$/, "");
  return JSON.parse(normalized) as T;
}

export function toSearchParams(input: Record<string, string | number | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }
  return params;
}

/**
 * Wrap an upstream URL with a configured proxy endpoint. The proxy URL may use a
 * `{url}` placeholder (replaced with the encoded target). When no placeholder is
 * present, the encoded target is appended, which matches common `?url=`-style proxies.
 */
export function withProxy(proxyUrl: string | undefined, targetUrl: string): string {
  if (!proxyUrl) {
    return targetUrl;
  }
  const encoded = encodeURIComponent(targetUrl);
  if (proxyUrl.includes("{url}")) {
    return proxyUrl.replace("{url}", encoded);
  }
  return `${proxyUrl}${encoded}`;
}

export async function getJsonWithProxyFallback<T>(
  context: { fetch: typeof fetch; proxyUrl?: string },
  url: string,
  init: RequestInit | undefined,
  isEmpty: (data: T) => boolean,
): Promise<T> {
  const direct = await getJson<T>(context.fetch, url, init).catch(() => null);
  if (direct && !isEmpty(direct)) {
    return direct;
  }

  if (context.proxyUrl) {
    const proxied = await getJson<T>(context.fetch, withProxy(context.proxyUrl, url), init).catch(() => null);
    if (proxied) {
      return proxied;
    }
  }

  if (direct) {
    return direct;
  }
  throw new Error(`Upstream request failed for ${url}`);
}
