import { describe, expect, it, vi } from "vitest";

const providerMocks = vi.hoisted(() => ({
  searchAcrossProviders: vi.fn(),
  songDetail: vi.fn(),
  lyric: vi.fn(),
  playableUrl: vi.fn(),
}));

vi.mock("@ccctw-music/music-providers", async (importOriginal: () => Promise<object>) => {
  const actual = await importOriginal();
  return {
    ...actual,
    searchAcrossProviders: providerMocks.searchAcrossProviders,
    getProvider: (source: string) =>
      source === "migu"
        ? {
            source: "migu",
            songDetail: providerMocks.songDetail,
            lyric: providerMocks.lyric,
            playableUrl: providerMocks.playableUrl,
          }
        : undefined,
  };
});

const { default: app } = await import("./index");
const env = { APP_ENV: "test" };

describe("worker api", () => {
  it("returns health status", async () => {
    const response = await app.request("/health");

    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      service: "ccctw-music-api",
    });
  });

  it("validates search query", async () => {
    const response = await app.request("/v1/search");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "BAD_REQUEST" },
    });
  });

  it("returns aggregated search data", async () => {
    providerMocks.searchAcrossProviders.mockResolvedValue([{ source: "migu", total: 0, songs: [] }]);

    const response = await app.request("/v1/search?keyword=test&sources=migu", {}, env);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [{ source: "migu", total: 0, songs: [] }],
    });
  });

  it("returns lyric and playable url from provider", async () => {
    providerMocks.songDetail.mockResolvedValue({ id: "1", source: "migu", name: "Song", artists: [] });
    providerMocks.lyric.mockResolvedValue({ type: 1, lines: [{ id: "1", sentence: "lyric" }] });
    providerMocks.playableUrl.mockResolvedValue({ source: "migu", url: "audio.mp3" });

    await expect((await app.request("/v1/songs/migu/1", {}, env)).json()).resolves.toMatchObject({
      data: { id: "1", name: "Song" },
    });
    await expect((await app.request("/v1/songs/migu/1/lyric", {}, env)).json()).resolves.toMatchObject({
      data: { type: 1 },
    });
    await expect((await app.request("/v1/songs/migu/1/url", {}, env)).json()).resolves.toEqual({
      data: { source: "migu", url: "audio.mp3" },
    });
  });

  it("uses cache for lyric and playable url responses", async () => {
    const cache = {
      get: vi
        .fn()
        .mockResolvedValueOnce(JSON.stringify({ type: 1, lines: [{ id: "cached", sentence: "cached" }] }))
        .mockResolvedValueOnce(JSON.stringify({ source: "migu", url: "cached.mp3" })),
      put: vi.fn(),
    };
    const cacheEnv = { APP_ENV: "test", MUSIC_CACHE: cache };

    await expect((await app.request("/v1/songs/migu/1/lyric", {}, cacheEnv)).json()).resolves.toMatchObject({
      data: { type: 1 },
    });
    await expect((await app.request("/v1/songs/migu/1/url", {}, cacheEnv)).json()).resolves.toEqual({
      data: { source: "migu", url: "cached.mp3" },
    });

    expect(cache.get).toHaveBeenCalledWith("lyric:migu:1");
    expect(cache.get).toHaveBeenCalledWith("url:v3:migu:1");
    expect(cache.put).not.toHaveBeenCalled();
  });

  it("does not cache empty playable url responses", async () => {
    providerMocks.playableUrl.mockResolvedValue({ source: "migu", url: null });
    const cache = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn(),
    };

    await expect(
      (await app.request("/v1/songs/migu/empty/url", {}, { APP_ENV: "test", MUSIC_CACHE: cache })).json(),
    ).resolves.toEqual({
      data: { source: "migu", url: null },
    });

    expect(cache.put).not.toHaveBeenCalled();
  });

  it("rejects unsupported source", async () => {
    const response = await app.request("/v1/songs/other/1/url");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "SOURCE_NOT_SUPPORTED" },
    });
  });
});
