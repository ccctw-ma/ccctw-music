import { describe, expect, it, vi } from "vitest";
import { createCipheriv } from "node:crypto";
import { bilibiliProvider } from "./bilibili";
import { deezerProvider } from "./deezer";
import { itunesProvider } from "./itunes";
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

function textResponse(body: string) {
  return {
    ok: true,
    text: async () => body,
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
          songResultData: {
            totalCount: "1",
            result: [
              {
                copyrightId: "c1",
                contentId: "ct1",
                name: "Migu",
                singers: [{ id: "9", name: "Singer" }],
                albums: [{ id: "5", name: "Album" }],
                imgItems: [{ imgSizeType: "03", img: "https://d.musicapp.migu.cn/cover.webp" }],
                rateFormats: [{ formatType: "PQ", url: "https://migu.example/audio.mp3" }],
              },
            ],
          },
        }),
      ),
    };

    await expect(miguProvider.search({ keyword: "migu" }, context)).resolves.toMatchObject({
      source: "migu",
      total: 1,
      songs: [
        {
          id: "c1:ct1",
          name: "Migu",
          artists: [{ name: "Singer" }],
          album: { id: "5", name: "Album", coverUrl: "https://d.musicapp.migu.cn/cover.webp" },
          playableUrl: "https://migu.example/audio.mp3",
        },
      ],
    });
    expect(context.fetch).toHaveBeenCalledWith(expect.stringContaining("search_all.do"), expect.anything());
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

  it("resolves migu playable url via the listenSong redirect", async () => {
    const headers = new Headers({ location: "https://freetyst.nf.migu.cn/audio.mp3" });
    const context: ProviderContext = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            resource: [{ copyrightId: "m1", songName: "Migu", singer: "S", contentId: "content-1" }],
          }),
        )
        .mockResolvedValueOnce({ ok: false, status: 302, headers } as Response),
    };

    await expect(miguProvider.playableUrl("m1", context)).resolves.toEqual({
      source: "migu",
      url: "https://freetyst.nf.migu.cn/audio.mp3",
      quality: "standard",
    });
  });

  it("returns null migu playable url when the song has no contentId", async () => {
    const context: ProviderContext = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ resource: [{ copyrightId: "m1", songName: "Migu", singer: "S" }] })),
    };

    await expect(miguProvider.playableUrl("m1", context)).resolves.toEqual({ source: "migu", url: null });
  });

  it("resolves migu playable url directly from a composite id without a detail lookup", async () => {
    const headers = new Headers({ location: "https://freetyst.nf.migu.cn/direct.mp3" });
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: false, status: 302, headers } as Response);
    const context: ProviderContext = { fetch: fetcher };

    await expect(miguProvider.playableUrl("copyright-1:content-1", context)).resolves.toEqual({
      source: "migu",
      url: "https://freetyst.nf.migu.cn/direct.mp3",
      quality: "standard",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining("contentId=content-1"), expect.anything());
  });

  it("returns null migu playable url when every listenSong tone is unavailable", async () => {
    const noLocation = { ok: false, status: 200, headers: new Headers() } as Response;
    const context: ProviderContext = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({ resource: [{ copyrightId: "m1", songName: "Migu", singer: "S", contentId: "content-1" }] }),
        )
        .mockResolvedValue(noLocation),
    };

    await expect(miguProvider.playableUrl("m1", context)).resolves.toEqual({ source: "migu", url: null });
  });

  it("falls back to the proxy when migu listenSong is blocked directly", async () => {
    const blocked = { ok: false, status: 200, headers: new Headers(), url: "" } as Response;
    const resolved = {
      ok: true,
      status: 200,
      headers: new Headers(),
      url: "https://freetyst.nf.migu.cn/proxied.mp3",
    } as Response;
    const fetcher = vi.fn().mockResolvedValueOnce(blocked).mockResolvedValueOnce(resolved);
    const context: ProviderContext = { fetch: fetcher, proxyUrl: "https://proxy.example/?url={url}" };

    await expect(miguProvider.playableUrl("copyright-1:content-1", context)).resolves.toEqual({
      source: "migu",
      url: "https://freetyst.nf.migu.cn/proxied.mp3",
      quality: "standard",
    });
    expect(fetcher).toHaveBeenLastCalledWith(
      expect.stringContaining("https://proxy.example/?url="),
      expect.objectContaining({ redirect: "follow" }),
    );
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

  it("falls back to migu search when detail has no resource", async () => {
    const context: ProviderContext = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(
          jsonResponse({ songResultData: { result: [{ copyrightId: "fallback", name: "Fallback", singers: [] }] } }),
        ),
    };

    await expect(miguProvider.songDetail("fallback", context)).resolves.toMatchObject({
      id: "fallback",
      name: "Fallback",
    });
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
        .mockResolvedValueOnce(
          jsonResponse({
            songs: [
              {
                id: 2,
                name: "Net",
                artists: [{ name: "A" }],
                album: { name: "Al", picUrl: "https://p1.music.126.net/net.jpg" },
                duration: 1000,
              },
            ],
          }),
        )
        .mockResolvedValueOnce(jsonResponse({ lrc: { lyric: "[00:01.00]hello" } })),
    };

    await expect(neteaseProvider.search({ keyword: "net" }, context)).resolves.toMatchObject({
      source: "netease",
      total: 1,
      songs: [{ id: "2", name: "Net", duration: 1, coverUrl: "https://p1.music.126.net/net.jpg" }],
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

  it("uses the browser-friendly netease url parser when public api is unavailable", async () => {
    const context: ProviderContext = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ data: [{ url: null }] }))
        .mockResolvedValueOnce(encryptedNeteaseResponse({ data: [{ url: null }] }))
        .mockResolvedValueOnce(jsonResponse({ status: 0 }))
        .mockResolvedValueOnce({
          ok: true,
          status: 206,
          headers: new Headers({ "content-type": "audio/mpeg" }),
        } as Response),
    };

    await expect(neteaseProvider.playableUrl("6", context)).resolves.toMatchObject({
      source: "netease",
      url: expect.stringContaining("music.3e0.cn"),
      quality: "public",
    });
  });

  it("accepts the browser-friendly netease url parser when it returns audio content with 200", async () => {
    const context: ProviderContext = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ data: [{ url: null }] }))
        .mockResolvedValueOnce(encryptedNeteaseResponse({ data: [{ url: null }] }))
        .mockResolvedValueOnce(jsonResponse({ status: 0 }))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "audio/mpeg" }),
        } as Response),
    };

    await expect(neteaseProvider.playableUrl("7", context)).resolves.toMatchObject({
      source: "netease",
      url: expect.stringContaining("music.3e0.cn"),
      quality: "public",
    });
  });

  it("ignores invalid netease search/detail rows while enriching covers", async () => {
    const context: ProviderContext = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce({
          ...jsonResponse({
            result: { songCount: 2, songs: [null, { id: 2, name: "Net", artists: [], album: {}, duration: 1000 }] },
          }),
        })
        .mockResolvedValueOnce(
          jsonResponse({
            songs: [
              { id: "", name: "Ignored", artists: [], album: { picUrl: "ignored.jpg" } },
              { id: 2, name: "Net", artists: [], album: { picUrl: "cover.jpg" }, duration: 1000 },
            ],
          }),
        ),
    };

    await expect(neteaseProvider.search({ keyword: "net" }, context)).resolves.toMatchObject({
      source: "netease",
      total: 2,
      songs: [{ id: "2", coverUrl: "cover.jpg" }],
    });
  });

  it("keeps netease search usable when detail enrichment fails", async () => {
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
        .mockRejectedValueOnce(new TypeError("detail upstream failed")),
    };

    await expect(neteaseProvider.search({ keyword: "net" }, context)).resolves.toMatchObject({
      source: "netease",
      total: 1,
      songs: [{ id: "2", name: "Net", coverUrl: null }],
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
        .mockResolvedValueOnce(jsonResponse({ data: { items: [{ filename: "M800song-mid.mp3", vkey: "vkey" }] } }))
        .mockResolvedValueOnce(jsonResponse({ lyric: btoa("[00:02.00]qq") })),
    };

    await expect(qqProvider.search({ keyword: "qq" }, context)).resolves.toMatchObject({
      source: "qq",
      total: 1,
      songs: [{ id: "song-mid", name: "QQ" }],
    });
    await expect(qqProvider.playableUrl("song-mid", context)).resolves.toEqual({
      source: "qq",
      url: "https://dl.stream.qqmusic.qq.com/M800song-mid.mp3?vkey=vkey&guid=10000&uin=0&fromtag=66",
      quality: "high",
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

  it("retries qq search through the proxy when the direct response is empty", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: { song: { list: [] } } }))
      .mockResolvedValueOnce(
        jsonResponse({ data: { song: { totalnum: 1, list: [{ songmid: "p1", songname: "Proxied", singer: [] }] } } }),
      );
    const context: ProviderContext = {
      fetch: fetcher,
      proxyUrl: "https://proxy.example/?url={url}",
    };

    await expect(qqProvider.search({ keyword: "proxy" }, context)).resolves.toMatchObject({
      source: "qq",
      total: 1,
      songs: [{ id: "p1", name: "Proxied" }],
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenLastCalledWith(expect.stringContaining("https://proxy.example/?url="), expect.anything());
  });

  it("retries itunes search through the proxy when blocked", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ resultCount: 0, results: [] }))
      .mockResolvedValueOnce(
        jsonResponse({ resultCount: 1, results: [{ trackId: 9, trackName: "Proxied", artistName: "A" }] }),
      );
    const context: ProviderContext = {
      fetch: fetcher,
      proxyUrl: "https://proxy.example/",
    };

    await expect(itunesProvider.search({ keyword: "proxy" }, context)).resolves.toMatchObject({
      source: "itunes",
      songs: [{ id: "9", name: "Proxied" }],
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("returns null for empty qq detail search", async () => {
    const context: ProviderContext = {
      fetch: vi.fn().mockResolvedValueOnce(jsonResponse({ data: { song: { list: [] } } })),
    };

    await expect(qqProvider.songDetail("missing", context)).resolves.toBeNull();
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

  it("tries lower qq quality filenames when high quality vkey is unavailable", async () => {
    const context: ProviderContext = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ data: { items: [{}] } }))
        .mockResolvedValueOnce(jsonResponse({ data: { items: [{ filename: "M500song-mid.mp3", vkey: "vkey" }] } })),
    };

    await expect(qqProvider.playableUrl("song-mid", context)).resolves.toEqual({
      source: "qq",
      url: "https://dl.stream.qqmusic.qq.com/M500song-mid.mp3?vkey=vkey&guid=10000&uin=0&fromtag=66",
      quality: "standard",
    });
    expect(context.fetch).toHaveBeenCalledTimes(2);
  });

  it("searches bilibili as an external video source", async () => {
    const context: ProviderContext = {
      fetch: vi.fn().mockResolvedValueOnce(
        jsonResponse({
          data: {
            numResults: 1,
            result: [{ bvid: "BV1xx411c7mD", title: "Live", author: "Uploader", pic: "cover.jpg" }],
          },
        }),
      ),
    };

    await expect(bilibiliProvider.search({ keyword: "live" }, context)).resolves.toMatchObject({
      source: "bilibili",
      total: 1,
      songs: [
        { id: "BV1xx411c7mD", playbackMode: "external", externalUrl: "https://www.bilibili.com/video/BV1xx411c7mD" },
      ],
    });
    expect(context.fetch).toHaveBeenCalledWith(
      expect.stringContaining("search_type=video"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/json, text/plain, */*",
          Origin: "https://search.bilibili.com",
          Referer: "https://search.bilibili.com/",
          Cookie: expect.stringContaining("buvid3="),
        }),
      }),
    );
    await expect(bilibiliProvider.playableUrl("BV1xx411c7mD", context)).resolves.toEqual({
      source: "bilibili",
      url: "https://www.bilibili.com/video/BV1xx411c7mD",
      quality: "external",
    });
  });

  it("falls back to bilibili search page cards when the json search is empty", async () => {
    const context: ProviderContext = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ data: { numResults: 0, result: [] } }))
        .mockResolvedValueOnce(
          textResponse(`
            <div class="col_3"><div class="bili-video-card">
              <a href="//www.bilibili.com/video/BV1htmlCard01/">
                <img src="//i0.hdslb.com/cover.jpg" alt="fallback cover">
              </a>
              <a href="//www.bilibili.com/video/BV1htmlCard01/">
                <h3 class="bili-video-card__info--tit" title="HTML &amp; fallback">HTML fallback</h3>
              </a>
              <span class="bili-video-card__info--author">Fallback UP</span>
            </div></div>
          `),
        ),
    };

    await expect(bilibiliProvider.search({ keyword: "live", pageSize: 5 }, context)).resolves.toMatchObject({
      source: "bilibili",
      songs: [
        {
          id: "BV1htmlCard01",
          name: "HTML & fallback",
          artists: [{ name: "Fallback UP" }],
          coverUrl: "https://i0.hdslb.com/cover.jpg",
          externalUrl: "https://www.bilibili.com/video/BV1htmlCard01",
        },
      ],
    });
    expect(context.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining("https://search.bilibili.com/video?keyword=live"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: expect.stringContaining("text/html"),
        }),
      }),
    );
  });

  it("returns a bilibili search entry when upstream video extraction is blocked", async () => {
    const context: ProviderContext = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ data: { result: [] } }))
        .mockRejectedValueOnce(new Error("412")),
    };

    await expect(bilibiliProvider.search({ keyword: "blocked" }, context)).resolves.toMatchObject({
      source: "bilibili",
      songs: [
        {
          id: "search-blocked",
          name: "在 Bilibili 查看「blocked」相关视频",
          externalUrl: "https://search.bilibili.com/video?keyword=blocked",
        },
      ],
    });
  });

  it("searches itunes and resolves preview playable url", async () => {
    const context: ProviderContext = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            resultCount: 1,
            results: [{ trackId: 11, trackName: "iTunes", artistName: "A", previewUrl: "preview.m4a" }],
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            results: [{ trackId: 11, trackName: "iTunes", artistName: "A", previewUrl: "preview.m4a" }],
          }),
        ),
    };

    await expect(itunesProvider.search({ keyword: "it" }, context)).resolves.toMatchObject({
      source: "itunes",
      total: 1,
      songs: [{ id: "11", name: "iTunes", playableUrl: "preview.m4a" }],
    });
    await expect(itunesProvider.playableUrl("11", context)).resolves.toEqual({
      source: "itunes",
      url: "preview.m4a",
      quality: "preview",
    });
  });

  it("searches deezer and resolves preview playable url", async () => {
    const context: ProviderContext = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            total: 1,
            data: [{ id: 22, title: "Deezer", artist: { name: "D" }, preview: "preview.mp3" }],
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({ id: 22, title: "Deezer", artist: { name: "D" }, preview: "preview.mp3" }),
        ),
    };

    await expect(deezerProvider.search({ keyword: "dz" }, context)).resolves.toMatchObject({
      source: "deezer",
      total: 1,
      songs: [{ id: "22", name: "Deezer", playableUrl: "preview.mp3" }],
    });
    await expect(deezerProvider.playableUrl("22", context)).resolves.toEqual({
      source: "deezer",
      url: "preview.mp3",
      quality: "preview",
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

  it("uses every default provider when sources are omitted", async () => {
    const context: ProviderContext = {
      fetch: vi.fn().mockResolvedValue(jsonResponse({})),
    };

    const results = await searchAcrossProviders({ keyword: "x" }, context);

    expect(results.map((result) => result.source).sort()).toEqual([
      "bilibili",
      "deezer",
      "itunes",
      "migu",
      "netease",
      "qq",
    ]);
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
          jsonResponse({
            songResultData: {
              result: [
                {
                  copyrightId: "1",
                  name: "Migu",
                  singers: [{ name: "A" }],
                  rateFormats: [{ formatType: "PQ", url: "migu.mp3" }],
                },
              ],
            },
          }),
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
