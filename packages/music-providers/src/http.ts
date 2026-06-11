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
