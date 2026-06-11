import { describe, expect, it, vi } from "vitest";

const providerMocks = vi.hoisted(() => ({
  searchAcrossProviders: vi.fn(),
}));

vi.mock("@ccctw-music/music-providers", async (importOriginal: () => Promise<object>) => {
  const actual = await importOriginal();
  return {
    ...actual,
    searchAcrossProviders: providerMocks.searchAcrossProviders,
  };
});

const { default: entry } = await import("./entry-edgeone");

interface HealthResponse {
  runtime: string;
}

describe("EdgeOne entry", () => {
  it("delegates to Hono app and returns health", async () => {
    const response = await entry.fetch(new Request("http://localhost/health"), {
      APP_ENV: "test",
      RUNTIME: "edgeone",
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      service: "ccctw-music-api",
      runtime: "edgeone",
    });
  });

  it("falls back to cloudflare-workers runtime when RUNTIME is not set", async () => {
    const response = await entry.fetch(new Request("http://localhost/health"), {
      APP_ENV: "test",
    });

    const body = (await response.json()) as HealthResponse;
    expect(body.runtime).toBe("cloudflare-workers");
  });
});
