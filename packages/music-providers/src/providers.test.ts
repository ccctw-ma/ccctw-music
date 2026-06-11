import { describe, expect, it, vi } from "vitest";
import { createCipheriv } from "node:crypto";
import { miguProvider } from "./migu";
import { neteaseProvider } from "./netease";
import { qqProvider } from "./qq";
import { getProvider, searchAcrossProviders } from "./index";
import type { ProviderContext } from "./types";

function jsonResponse(body: unknown) {
  return {
    ok: true,
    text: async () => JSON.stringify(body),
  } as Response;
}

function encryptedNeteaseResponse(body: unknown) {
  const cipher = createCipheriv("aes-128-ecb", "e82ckenh8dichen8", null);
  const buffer = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(body))), cipher.final()]);
  return {
    ok: true,
    arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  } as Response;
}

describe("music providers", () => {
  it("searches migu and normalizes songs", async () => {
    const context: ProviderContext = {
      fetch: vi.fn().mockResolvedValue(
        jsonResponse({
          musics: [{ id: "1", songName: "Migu", singerName: "Singer", mp3: "url" }],
          pgt: 1,
        }),
      ),
    };

    await expect(miguProvider.search({ keyword: "migu" }, context)).resolves.toMatchObject({
      source: "migu",
      total: 1,
      songs: [{ id: "1", name: "Migu", playableUrl: "url" }],
    });
  });

  it("loads migu detail, playable url and lyric", async () => {
    const context: ProviderContext = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            resource: [
              {
                copyrightId: "m1",
                songName: "Migu Detail",
                singer: "Singer",
                album: "Album",
                length: 123000,
                lrcUrl: "lyric-url",
                albumImgs: [{ imgSizeType: "03", img: "cover.webp" }],
              },
            ],
          }),
        )
        .mockResolvedValueOnce(jsonResponse({ resource: [] }))
        .mockResolvedValueOnce(jsonResponse({ musics: [] }))
        .mockResolvedValueOnce(jsonResponse({ lyric: "plain lyric" })),
    };

    await expect(miguProvider.songDetail("m1", context)).resolves.toMatchObject({
      id: "m1",
      name: "Migu Detail",
      duration: 123,
      coverUrl: "cover.webp",
      lyricUrl: "lyric-url",
    });
    await expect(miguProvider.playableUrl("missing", context)).resolves.toEqual({ source: "migu", url: null });
    await expect(miguProvider.lyric("m1", context)).resolves.toMatchObject({
      type: 1,
      lines: [{ sentence: "plain lyric" }],
    });
  });

  it("handles empty migu search and lyric responses", async () => {
    const context: ProviderContext = {
      fetch: vi.fn().mockResolvedValueOnce(jsonResponse({})).mockResolvedValueOnce(jsonResponse({})),
    };

    await expect(miguProvider.search({ keyword: "empty" }, context)).resolves.toEqual({
      source: "migu",
      total: 0,
      songs: [],
    });
    await expect(miguProvider.lyric("empty", context)).resolves.toMatchObject({ type: 0, lines: [] });
  });

  it("searches netease and parses lyrics", async () => {
    const context: ProviderContext = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            result: {
              songCount: 1,
              songs: [{ id: 2, name: "Net", artists: [{ name: "A" }], album: { name: "Al" }, duration: 1000 }],
            },
          }),
        )
        .mockResolvedValueOnce(jsonResponse({ lrc: { lyric: "[00:01.00]hello" } })),
    };

    await expect(neteaseProvider.search({ keyword: "net" }, context)).resolves.toMatchObject({
      source: "netease",
      total: 1,
      songs: [{ id: "2", name: "Net", duration: 1 }],
    });
    await expect(neteaseProvider.lyric("2", context)).resolves.toMatchObject({
      type: 2,
      lines: [{ sentence: "hello", timeStamp: 1 }],
    });
  });

  it("loads netease detail and playable url", async () => {
    const context: ProviderContext = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ songs: [{ id: 2, name: "Detail", artists: [], album: {} }] }))
        .mockResolvedValueOnce(jsonResponse({ data: [{ url: "net.mp3" }] }))
        .mockResolvedValueOnce(jsonResponse({ data: [{}] })),
    };

    await expect(neteaseProvider.songDetail("2", context)).resolves.toMatchObject({ id: "2", name: "Detail" });
    await expect(neteaseProvider.playableUrl("2", context)).resolves.toEqual({
      source: "netease",
      url: "net.mp3",
      quality: "standard",
    });
    await expect(neteaseProvider.playableUrl("3", context)).resolves.toEqual({ source: "netease", url: null });
  });

  it("falls back to netease eapi when the public playable url is empty", async () => {
    const context: ProviderContext = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ data: [{ url: null }] }))
        .mockResolvedValueOnce(encryptedNeteaseResponse({ data: [{ url: "eapi.mp3" }] })),
    };

    await expect(neteaseProvider.playableUrl("4", context)).resolves.toEqual({
      source: "netease",
      url: "eapi.mp3",
      quality: "eapi",
    });
  });

  it("falls back to a public netease url parser when eapi has no url", async () => {
    const context: ProviderContext = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ data: [{ url: null }] }))
        .mockResolvedValueOnce(encryptedNeteaseResponse({ data: [{ url: null }] }))
        .mockResolvedValueOnce(jsonResponse({ status: 1, musicurl: "http://cdn.example.com/public.mp3" })),
    };

    await expect(neteaseProvider.playableUrl("5", context)).resolves.toEqual({
      source: "netease",
      url: "https://cdn.example.com/public.mp3",
      quality: "public",
    });
  });

  it("handles empty netease responses", async () => {
    const context: ProviderContext = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(jsonResponse({})),
    };

    await expect(neteaseProvider.search({ keyword: "empty", page: 2, pageSize: 10 }, context)).resolves.toEqual({
      source: "netease",
      total: 0,
      songs: [],
    });
    await expect(neteaseProvider.songDetail("missing", context)).resolves.toBeNull();
    await expect(neteaseProvider.playableUrl("missing", context)).resolves.toEqual({ source: "netease", url: null });
    await expect(neteaseProvider.lyric("missing", context)).resolves.toMatchObject({ type: 0, lines: [] });
  });

  it("searches qq, decodes lyrics and returns playable url", async () => {
    const context: ProviderContext = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            data: {
              song: {
                totalnum: 1,
                list: [{ songid: 3, songmid: "song-mid", songname: "QQ", singer: [{ name: "Q" }], albummid: "mid" }],
              },
            },
          }),
        )
        .mockResolvedValueOnce(jsonResponse({ data: { items: [{ filename: "C400song-mid.m4a", vkey: "vkey" }] } }))
        .mockResolvedValueOnce(jsonResponse({ lyric: btoa("[00:02.00]qq") })),
    };

    await expect(qqProvider.search({ keyword: "qq" }, context)).resolves.toMatchObject({
      source: "qq",
      total: 1,
      songs: [{ id: "song-mid", name: "QQ" }],
    });
    await expect(qqProvider.playableUrl("song-mid", context)).resolves.toEqual({
      source: "qq",
      url: "https://dl.stream.qqmusic.qq.com/C400song-mid.m4a?vkey=vkey&guid=10000&uin=0&fromtag=66",
      quality: "standard",
    });
    await expect(qqProvider.lyric("song-mid", context)).resolves.toMatchObject({
      type: 2,
      lines: [{ sentence: "qq", timeStamp: 2 }],
    });
  });

  it("loads qq detail through search and handles empty lyric", async () => {
    const context: ProviderContext = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({ data: { song: { list: [{ songmid: "mid", songname: "Detail", singer: [] }] } } }),
        )
        .mockResolvedValueOnce(jsonResponse({})),
    };

    await expect(qqProvider.songDetail("mid", context)).resolves.toMatchObject({ id: "mid", name: "Detail" });
    await expect(qqProvider.lyric("mid", context)).resolves.toMatchObject({ type: 0, lines: [] });
  });

  it("handles empty qq search responses", async () => {
    const context: ProviderContext = {
      fetch: vi.fn().mockResolvedValue(jsonResponse({})),
    };

    await expect(qqProvider.search({ keyword: "empty" }, context)).resolves.toEqual({
      source: "qq",
      total: 0,
      songs: [],
    });
  });

  it("returns null qq playable url when vkey is missing", async () => {
    const context: ProviderContext = {
      fetch: vi.fn().mockResolvedValue(jsonResponse({ data: { items: [{}] } })),
    };

    await expect(qqProvider.playableUrl("missing", context)).resolves.toEqual({
      source: "qq",
      url: null,
      quality: "standard",
    });
  });

  it("searches across providers and uses cache", async () => {
    const context: ProviderContext = {
      fetch: vi.fn().mockResolvedValue(jsonResponse({ musics: [{ id: "1", songName: "Cached" }] })),
      cache: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
      },
    };

    const results = await searchAcrossProviders({ keyword: "x", sources: ["migu"] }, context);

    expect(results).toHaveLength(1);
    expect(context.cache?.set).toHaveBeenCalledWith("search:migu:x:1:30", results[0], 600);
    expect(getProvider("other")).toBeUndefined();
  });

  it("deduplicates repeated providers before searching", async () => {
    const context: ProviderContext = {
      fetch: vi.fn().mockResolvedValue(jsonResponse({ musics: [{ id: "1", songName: "Unique" }] })),
    };

    const results = await searchAcrossProviders({ keyword: "x", sources: ["migu", "migu"] }, context);

    expect(results).toHaveLength(1);
    expect(context.fetch).toHaveBeenCalledTimes(1);
  });

  it("orders provider groups by the best normalized quality score", async () => {
    const context: ProviderContext = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            result: {
              songCount: 1,
              songs: [{ id: 2, name: "Net", artists: [], album: {}, duration: 1000 }],
            },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({ musics: [{ id: "1", songName: "Migu", singerName: "A", mp3: "migu.mp3" }] }),
        ),
    };

    const results = await searchAcrossProviders({ keyword: "x", sources: ["netease", "migu"] }, context);

    expect(results.map((result) => result.source)).toEqual(["migu", "netease"]);
  });

  it("returns cached results and ignores rejected providers", async () => {
    const cached = { source: "migu" as const, total: 1, songs: [] };
    const cachedContext: ProviderContext = {
      fetch: vi.fn(),
      cache: {
        get: vi.fn().mockResolvedValue(cached),
        set: vi.fn(),
      },
    };
    await expect(searchAcrossProviders({ keyword: "x", sources: ["migu"] }, cachedContext)).resolves.toEqual([cached]);
    expect(cachedContext.cache?.set).not.toHaveBeenCalled();

    const failedContext: ProviderContext = {
      fetch: vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: "bad" }),
    };
    await expect(searchAcrossProviders({ keyword: "x", sources: ["migu"] }, failedContext)).resolves.toEqual([]);
  });
});
