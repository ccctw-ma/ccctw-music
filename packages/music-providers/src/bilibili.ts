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

interface BilibiliSearchResponse {
  data?: {
    numResults?: number;
    result?: unknown[];
  };
}

const BILIBILI_SEARCH_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  Origin: "https://search.bilibili.com",
  Referer: "https://search.bilibili.com/",
  Cookie: "buvid3=00000000-0000-4000-8000-00000000000000000infoc; b_nut=1710000000",
};

export const bilibiliProvider: MusicProvider = {
  source: "bilibili",

  async search(input: SearchInput, context: ProviderContext): Promise<SearchResult> {
    const params = toSearchParams({
      keyword: input.keyword,
      page: input.page ?? 1,
      page_size: input.pageSize ?? 30,
      search_type: "video",
    });
    const data = await getJson<BilibiliSearchResponse>(
      context.fetch,
      `https://api.bilibili.com/x/web-interface/search/type?${params.toString()}`,
      {
        headers: BILIBILI_SEARCH_HEADERS,
      },
    );
    const songs = formatSongs(data.data?.result ?? [], "bilibili");
    return {
      source: "bilibili",
      total: data.data?.numResults ?? songs.length,
      songs,
    };
  },

  async songDetail(id: string, context: ProviderContext): Promise<Song | null> {
    const result = await this.search({ keyword: id, sources: ["bilibili"], pageSize: 1 }, context);
    return result.songs[0] ?? null;
  },

  async playableUrl(id: string): Promise<PlayableUrl> {
    return {
      source: "bilibili",
      url: `https://www.bilibili.com/video/${encodeURIComponent(id)}`,
      quality: "external",
    };
  },

  async lyric(): Promise<Lyric> {
    return parseLyrics("");
  },
};
