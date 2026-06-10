import { describe, expect, it, vi } from "vitest";
import { getJson, toSearchParams } from "./http";

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

  it("builds search params without undefined values", () => {
    const params = toSearchParams({ keyword: "abc", page: 1, empty: undefined });

    expect(params.toString()).toBe("keyword=abc&page=1");
    expect(params.has("empty")).toBe(false);
  });
});
