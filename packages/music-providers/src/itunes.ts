import {
  formatSongs,
  parseLyrics,
  type Lyric,
  type SearchInput,
  type SearchResult,
  type Song,
} from "@ccctw-music/core";
import { getJson, getJsonWithProxyFallback, toSearchParams } from "./http";
import type { MusicProvider, PlayableUrl, ProviderContext } from "./types";

interface ItunesSearchResponse {
  resultCount?: number;
  results?: unknown[];
}

export const itunesProvider: MusicProvider = {
  source: "itunes",

  async search(input: SearchInput, context: ProviderContext): Promise<SearchResult> {
    const pageSize = input.pageSize ?? 30;
    const params = toSearchParams({
      term: input.keyword,
      media: "music",
      entity: "song",
      limit: pageSize,
      offset: ((input.page ?? 1) - 1) * pageSize,
    });
    const data = await getJsonWithProxyFallback<ItunesSearchResponse>(
      context,
      `https://itunes.apple.com/search?${params.toString()}`,
      undefined,
      (value) => (value.results?.length ?? 0) === 0,
    );
    const songs = formatSongs(data.results ?? [], "itunes");
    return {
      source: "itunes",
      total: data.resultCount ?? songs.length,
      songs,
    };
  },

  async songDetail(id: string, context: ProviderContext): Promise<Song | null> {
    const data = await getJson<ItunesSearchResponse>(
      context.fetch,
      `https://itunes.apple.com/lookup?${toSearchParams({ id, entity: "song" }).toString()}`,
    );
    return formatSongs(data.results ?? [], "itunes")[0] ?? null;
  },

  async playableUrl(id: string, context: ProviderContext): Promise<PlayableUrl> {
    const song = await this.songDetail(id, context);
    return {
      source: "itunes",
      url: song?.playableUrl ?? null,
      quality: song?.playableUrl ? "preview" : undefined,
    };
  },

  async lyric(): Promise<Lyric> {
    return parseLyrics("");
  },
};
