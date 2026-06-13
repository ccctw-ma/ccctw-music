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

interface DeezerSearchResponse {
  total?: number;
  data?: unknown[];
}

export const deezerProvider: MusicProvider = {
  source: "deezer",

  async search(input: SearchInput, context: ProviderContext): Promise<SearchResult> {
    const pageSize = input.pageSize ?? 30;
    const params = toSearchParams({
      q: input.keyword,
      limit: pageSize,
      index: ((input.page ?? 1) - 1) * pageSize,
    });
    const data = await getJson<DeezerSearchResponse>(
      context.fetch,
      `https://api.deezer.com/search?${params.toString()}`,
    );
    const songs = formatSongs(data.data ?? [], "deezer");
    return {
      source: "deezer",
      total: data.total ?? songs.length,
      songs,
    };
  },

  async songDetail(id: string, context: ProviderContext): Promise<Song | null> {
    const data = await getJson<unknown>(context.fetch, `https://api.deezer.com/track/${encodeURIComponent(id)}`);
    return formatSongs([data], "deezer")[0] ?? null;
  },

  async playableUrl(id: string, context: ProviderContext): Promise<PlayableUrl> {
    const song = await this.songDetail(id, context);
    return {
      source: "deezer",
      url: song?.playableUrl ?? null,
      quality: song?.playableUrl ? "preview" : undefined,
    };
  },

  async lyric(): Promise<Lyric> {
    return parseLyrics("");
  },
};
