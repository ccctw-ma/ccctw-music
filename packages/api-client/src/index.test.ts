import { describe, expect, it, vi } from "vitest";
import { createMusicApiClient } from "./index";

describe("createMusicApiClient", () => {
  it("searches with default paging and source params", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ source: "migu", total: 0, songs: [] }] }),
    });
    const client = createMusicApiClient({ baseUrl: "https://api.example.com/", fetcher });

    await expect(client.search({ keyword: "hello" })).resolves.toEqual([{ source: "migu", total: 0, songs: [] }]);

    const url = new URL(fetcher.mock.calls[0][0]);
    expect(url.origin).toBe("https://api.example.com");
    expect(url.pathname).toBe("/v1/search");
    expect(url.searchParams.get("keyword")).toBe("hello");
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("sources")).toBe("migu,netease,qq,itunes,deezer,bilibili");
  });

  it("throws when search response is not ok", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Server Error",
      json: async () => ({ error: { code: "UPSTREAM_ERROR", message: "上游不可用" } }),
    });
    const client = createMusicApiClient({ baseUrl: "https://api.example.com", fetcher });

    await expect(client.search({ keyword: "bad" })).rejects.toThrow("上游不可用");
  });

  it("loads song detail with encoded source and song id", async () => {
    const song = { id: "song id", source: "migu", name: "Song", artists: [] };
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: song }),
    });
    const client = createMusicApiClient({ baseUrl: "https://api.example.com/", fetcher });

    await expect(client.songDetail("migu", "song id")).resolves.toEqual(song);

    expect(fetcher).toHaveBeenCalledWith("https://api.example.com/v1/songs/migu/song%20id");
  });

  it("loads playable urls with encoded source and song id", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { source: "migu", url: "https://cdn.example.com/song.mp3", quality: "standard" } }),
    });
    const client = createMusicApiClient({ baseUrl: "https://api.example.com/", fetcher });

    await expect(client.playableUrl("migu", "song id")).resolves.toEqual({
      source: "migu",
      url: "https://cdn.example.com/song.mp3",
      quality: "standard",
    });

    expect(fetcher).toHaveBeenCalledWith("https://api.example.com/v1/songs/migu/song%20id/url");
  });

  it("throws when playable url response is not ok", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });
    const client = createMusicApiClient({ baseUrl: "https://api.example.com", fetcher });

    await expect(client.playableUrl("migu", "missing")).rejects.toThrow("Playable URL failed: 404 Not Found");
  });

  it("loads lyrics with encoded source and song id", async () => {
    const lyric = {
      type: 2,
      raw: "[00:01.00]hello",
      lines: [{ id: "line-1", sentence: "hello", timeStamp: 1 }],
    };
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: lyric }),
    });
    const client = createMusicApiClient({ baseUrl: "https://api.example.com/", fetcher });

    await expect(client.lyric("migu", "song id")).resolves.toEqual(lyric);

    expect(fetcher).toHaveBeenCalledWith("https://api.example.com/v1/songs/migu/song%20id/lyric");
  });

  it("throws when lyric response is not ok", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });
    const client = createMusicApiClient({ baseUrl: "https://api.example.com", fetcher });

    await expect(client.lyric("migu", "missing")).rejects.toThrow("Lyric failed: 404 Not Found");
  });
});
