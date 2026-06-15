import { describe, expect, it, vi } from "vitest";
import { fetchWithTimeout, getJson, getJsonWithProxyFallback, toSearchParams, withProxy } from "./http";

describe("http helpers", () => {
  it("parses jsonp-like responses", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'callback({"ok":true})',
    });

    await expect(getJson(fetcher, "https://example.com")).resolves.toEqual({ ok: true });
  });

  it("throws on non-ok responses", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Unavailable",
    });

    await expect(getJson(fetcher, "https://example.com")).rejects.toThrow("Request failed: 503 Unavailable");
  });

  it("adds a timeout signal to upstream requests", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '{"ok":true}',
    });

    await expect(fetchWithTimeout(fetcher, "https://example.com")).resolves.toMatchObject({ ok: true });
    expect(fetcher).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("keeps an explicit request signal when provided", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '{"ok":true}',
    });

    await fetchWithTimeout(fetcher, "https://example.com", { signal: controller.signal });

    expect(fetcher).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({
        signal: controller.signal,
      }),
    );
  });

  it("normalizes timeout and abort errors", async () => {
    const error = new Error("aborted");
    error.name = "AbortError";
    const fetcher = vi.fn().mockRejectedValue(error);

    await expect(fetchWithTimeout(fetcher, "https://example.com", undefined, 10)).rejects.toThrow(
      "Upstream request timed out after 10ms",
    );
  });

  it("rethrows non-timeout fetch failures", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network failed"));

    await expect(fetchWithTimeout(fetcher, "https://example.com")).rejects.toThrow("network failed");
  });

  it("builds search params without undefined values", () => {
    const params = toSearchParams({ keyword: "abc", page: 1, empty: undefined });

    expect(params.toString()).toBe("keyword=abc&page=1");
    expect(params.has("empty")).toBe(false);
  });

  it("returns the target url unchanged when no proxy is configured", () => {
    expect(withProxy(undefined, "https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
  });

  it("supports placeholder and append-style proxy formats", () => {
    expect(withProxy("https://proxy/{url}", "https://e.com/a")).toBe(
      `https://proxy/${encodeURIComponent("https://e.com/a")}`,
    );
    expect(withProxy("https://proxy/?url=", "https://e.com/a")).toBe(
      `https://proxy/?url=${encodeURIComponent("https://e.com/a")}`,
    );
  });

  it("returns the direct response when it is not empty", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, text: async () => '{"items":[1]}' });
    const data = await getJsonWithProxyFallback<{ items: number[] }>(
      { fetch: fetcher },
      "https://example.com",
      undefined,
      (value) => value.items.length === 0,
    );
    expect(data).toEqual({ items: [1] });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("returns the empty direct response when no proxy is configured", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, text: async () => '{"items":[]}' });
    const data = await getJsonWithProxyFallback<{ items: number[] }>(
      { fetch: fetcher },
      "https://example.com",
      undefined,
      (value) => value.items.length === 0,
    );
    expect(data).toEqual({ items: [] });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("throws when the direct request fails and no proxy is configured", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: "Error" });
    await expect(
      getJsonWithProxyFallback<{ items: number[] }>(
        { fetch: fetcher },
        "https://example.com",
        undefined,
        (value) => value.items.length === 0,
      ),
    ).rejects.toThrow("Upstream request failed");
  });

  it("falls back to an empty direct response when the proxy also fails", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, text: async () => '{"items":[]}' })
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: "Error" });
    const data = await getJsonWithProxyFallback<{ items: number[] }>(
      { fetch: fetcher, proxyUrl: "https://proxy/?url=" },
      "https://example.com",
      undefined,
      (value) => value.items.length === 0,
    );
    expect(data).toEqual({ items: [] });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
