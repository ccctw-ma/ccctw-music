import {
  formatSongs,
  parseLyrics,
  type Lyric,
  type SearchInput,
  type SearchResult,
  type Song,
} from "@ccctw-music/core";
import { getJson, toSearchParams } from "./http";
import type { MusicProvider, PlayableUrl, ProviderContext } from "./types";

interface NeteaseSearchResponse {
  result?: {
    songCount?: number;
    songs?: unknown[];
  };
}

export const neteaseProvider: MusicProvider = {
  source: "netease",

  async search(input: SearchInput, context: ProviderContext): Promise<SearchResult> {
    const body = toSearchParams({
      s: input.keyword,
      type: 1,
      limit: input.pageSize ?? 30,
      offset: ((input.page ?? 1) - 1) * (input.pageSize ?? 30),
    });
    const data = await getJson<NeteaseSearchResponse>(context.fetch, "https://music.163.com/api/search/get", {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: "https://music.163.com",
      },
    });

    const songs = formatSongs(data.result?.songs ?? [], "netease");
    return {
      source: "netease",
      total: data.result?.songCount ?? songs.length,
      songs,
    };
  },

  async songDetail(id: string, context: ProviderContext): Promise<Song | null> {
    const data = await getJson<{ songs?: unknown[] }>(
      context.fetch,
      `https://music.163.com/api/song/detail?${toSearchParams({ ids: `[${id}]` }).toString()}`,
      {
        headers: {
          Referer: "https://music.163.com",
        },
      },
    );
    return formatSongs(data.songs ?? [], "netease")[0] ?? null;
  },

  async playableUrl(id: string, context: ProviderContext): Promise<PlayableUrl> {
    const data = await getJson<{ data?: Array<{ url?: string | null }> }>(
      context.fetch,
      `https://music.163.com/api/song/enhance/player/url?${toSearchParams({ ids: `[${id}]`, br: 320000 }).toString()}`,
      {
        headers: {
          Referer: "https://music.163.com",
        },
      },
    );
    return {
      source: "netease",
      url: data.data?.[0]?.url ?? null,
    };
  },

  async lyric(id: string, context: ProviderContext): Promise<Lyric> {
    const data = await getJson<{ lrc?: { lyric?: string } }>(
      context.fetch,
      `https://music.163.com/api/song/lyric?${toSearchParams({ id, lv: -1, kv: -1, tv: -1 }).toString()}`,
      {
        headers: {
          Referer: "https://music.163.com",
        },
      },
    );
    return parseLyrics(data.lrc?.lyric ?? "");
  },
};
