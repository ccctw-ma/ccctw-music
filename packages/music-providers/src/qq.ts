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

interface QqSearchResponse {
  data?: {
    song?: {
      totalnum?: number;
      list?: unknown[];
    };
  };
}

export const qqProvider: MusicProvider = {
  source: "qq",

  async search(input: SearchInput, context: ProviderContext): Promise<SearchResult> {
    const params = toSearchParams({
      w: input.keyword,
      p: input.page ?? 1,
      n: input.pageSize ?? 30,
      format: "json",
      inCharset: "utf-8",
      outCharset: "utf-8",
      cr: 1,
    });
    const data = await getJson<QqSearchResponse>(
      context.fetch,
      `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?${params.toString()}`,
      {
        headers: {
          Referer: "https://y.qq.com",
        },
      },
    );

    const songs = formatSongs(data.data?.song?.list ?? [], "qq");
    return {
      source: "qq",
      total: data.data?.song?.totalnum ?? songs.length,
      songs,
    };
  },

  async songDetail(id: string, context: ProviderContext): Promise<Song | null> {
    const result = await this.search({ keyword: id, sources: ["qq"], pageSize: 1 }, context);
    return result.songs[0] ?? null;
  },

  async playableUrl(_id: string): Promise<PlayableUrl> {
    return {
      source: "qq",
      url: null,
    };
  },

  async lyric(id: string, context: ProviderContext): Promise<Lyric> {
    const data = await getJson<{ lyric?: string }>(
      context.fetch,
      `https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?${toSearchParams({ songmid: id, format: "json" }).toString()}`,
      {
        headers: {
          Referer: "https://y.qq.com",
        },
      },
    );
    const decoded = data.lyric ? atob(data.lyric) : "";
    return parseLyrics(decoded);
  },
};
