import { describe, expect, it, vi } from "vitest";
import { resolveDirectPlayableUrl, searchDirectMusic } from "./direct-music-search";

function jsonResponse(body: unknown) {
  return {
    ok: true,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("searchDirectMusic", () => {
  it("searches browser-accessible providers and normalizes songs", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ musics: [{ id: "m1", songName: "Migu", singerName: "A", mp3: "migu.mp3" }] }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          result: {
            songCount: 1,
            songs: [{ id: 2, name: "NetEase", artists: [], album: {}, duration: 1000 }],
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            song: {
              totalnum: 1,
              list: [{ songmid: "q1", songname: "QQ", singer: [{ name: "Q" }] }],
            },
          },
        }),
      );

    const result = await searchDirectMusic({ keyword: "周杰伦", sources: ["migu", "netease", "qq"] }, fetcher);

    expect(result.failedSources).toEqual([]);
    expect(result.results.map((group) => group.source)).toEqual(["migu", "qq", "netease"]);
    expect(result.results[0].songs[0]).toMatchObject({
      id: "m1",
      quality: { sourceLabel: "咪咕音乐", playable: true },
    });
  });

  it("returns failed sources for CORS or upstream failures", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("CORS blocked"))
      .mockResolvedValueOnce(jsonResponse({ result: { songs: [] } }));

    const result = await searchDirectMusic({ keyword: "x", sources: ["migu", "netease"] }, fetcher);

    expect(result.results).toEqual([{ source: "netease", total: 0, songs: [] }]);
    expect(result.failedSources).toEqual(["migu"]);
  });

  it("marks non-ok direct upstream responses as failed", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Unavailable",
      text: async () => "",
    });

    const result = await searchDirectMusic({ keyword: "x", sources: ["qq"] }, fetcher);

    expect(result.results).toEqual([]);
    expect(result.failedSources).toEqual(["qq"]);
  });

  it("handles empty direct provider payloads", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ pgt: 9 }))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({ data: { song: {} } }));

    const result = await searchDirectMusic(
      { keyword: "x", page: 2, pageSize: 5, sources: ["migu", "netease", "qq"] },
      fetcher,
    );

    expect(result.failedSources).toEqual([]);
    expect(result.results).toEqual([
      { source: "migu", total: 9, songs: [] },
      { source: "netease", total: 0, songs: [] },
      { source: "qq", total: 0, songs: [] },
    ]);
  });

  it("deduplicates direct sources and parses jsonp wrappers", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'callback({"musics":[{"id":"m1","songName":"Migu","singerName":"A"}],"pgt":1})',
    });

    const result = await searchDirectMusic({ keyword: "x", sources: ["migu", "migu"] }, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.results[0]).toMatchObject({ source: "migu", total: 1 });
  });

  it("marks unsupported direct sources as failed", async () => {
    const result = await searchDirectMusic({ keyword: "x", sources: ["other"] }, vi.fn());

    expect(result.results).toEqual([]);
    expect(result.failedSources).toEqual(["other"]);
  });

  it("resolves direct netease playable urls through a browser-friendly parser", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 206,
    });

    await expect(
      resolveDirectPlayableUrl(
        {
          id: "2653714443",
          source: "netease",
          name: "晴天",
          artists: [],
          quality: {
            sourceLabel: "网易云音乐",
            official: true,
            free: false,
            playable: false,
            quality: "high",
            score: 56,
            badges: [],
          },
        },
        fetcher,
      ),
    ).resolves.toContain("music.3e0.cn");
  });

  it("returns existing direct playable urls without resolving", async () => {
    await expect(
      resolveDirectPlayableUrl(
        {
          id: "m1",
          source: "migu",
          name: "Migu",
          artists: [],
          playableUrl: "https://cdn.example.com/migu.mp3",
          quality: {
            sourceLabel: "咪咕音乐",
            official: true,
            free: true,
            playable: true,
            quality: "standard",
            score: 81,
            badges: [],
          },
        },
        vi.fn(),
      ),
    ).resolves.toBe("https://cdn.example.com/migu.mp3");
  });

  it("returns null when direct playable resolution is unsupported or unavailable", async () => {
    await expect(
      resolveDirectPlayableUrl(
        {
          id: "q1",
          source: "qq",
          name: "QQ",
          artists: [],
          quality: {
            sourceLabel: "QQ 音乐",
            official: true,
            free: false,
            playable: false,
            quality: "high",
            score: 58,
            badges: [],
          },
        },
        vi.fn(),
      ),
    ).resolves.toBeNull();

    await expect(
      resolveDirectPlayableUrl(
        {
          id: "n1",
          source: "netease",
          name: "NetEase",
          artists: [],
          quality: {
            sourceLabel: "网易云音乐",
            official: true,
            free: false,
            playable: false,
            quality: "high",
            score: 56,
            badges: [],
          },
        },
        vi.fn().mockResolvedValue({ ok: false, status: 404 }),
      ),
    ).resolves.toBeNull();
  });
});
