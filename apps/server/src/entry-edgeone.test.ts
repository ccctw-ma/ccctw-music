import { afterEach, describe, expect, it, vi } from "vitest";

const { default: entry } = await import("./entry-edgeone");

describe("EdgeOne entry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("proxies health requests to the unified Cloudflare backend", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, runtime: "cloudflare-workers" }), {
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetcher);

    const response = await entry.fetch(new Request("https://music.ccctw.com/health"), {
      APP_ENV: "test",
      RUNTIME: "edgeone",
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, runtime: "cloudflare-workers" });
    expect(fetcher).toHaveBeenCalledWith(
      new URL("https://ccctw-music-api.1934202608.workers.dev/health"),
      expect.objectContaining({
        method: "GET",
        body: undefined,
        redirect: "manual",
      }),
    );
  });

  it("uses configured unified API base URL and preserves path, query, and method", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetcher);

    const response = await entry.fetch(new Request("https://music.ccctw.com/v1/search?keyword=test"), {
      APP_ENV: "test",
      RUNTIME: "edgeone",
      UNIFIED_API_BASE_URL: "https://api.example.com/base",
    });

    expect(response.status).toBe(201);
    expect(fetcher).toHaveBeenCalledWith(
      new URL("https://api.example.com/v1/search?keyword=test"),
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("falls back to the direct workers.dev origin when the configured base URL points to an app entry host", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetcher);

    await entry.fetch(new Request("https://music-cn.ccctw.com/v1/search?keyword=test"), {
      APP_ENV: "test",
      RUNTIME: "edgeone",
      UNIFIED_API_BASE_URL: "https://music-cn.ccctw.com",
    });

    expect(fetcher).toHaveBeenCalledWith(
      new URL("https://ccctw-music-api.1934202608.workers.dev/v1/search?keyword=test"),
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("falls back to the direct workers.dev origin when the configured base URL points to the public Cloudflare entry", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetcher);

    await entry.fetch(new Request("https://music-cn.ccctw.com/health"), {
      APP_ENV: "test",
      RUNTIME: "edgeone",
      UNIFIED_API_BASE_URL: "https://music.ccctw.com",
    });

    expect(fetcher).toHaveBeenCalledWith(
      new URL("https://ccctw-music-api.1934202608.workers.dev/health"),
      expect.objectContaining({
        method: "GET",
      }),
    );
  });
});
