import { describe, expect, it, vi } from "vitest";
import { fetchWithTimeout, getJson, toSearchParams } from "./http";

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
});
