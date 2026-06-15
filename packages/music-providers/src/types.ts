import type { Lyric, MusicSource, SearchInput, SearchResult, Song } from "@ccctw-music/core";

export interface PlayableUrl {
  url: string | null;
  source: MusicSource;
  quality?: string;
  expiresAt?: string;
}

export interface ProviderContext {
  fetch: typeof fetch;
  proxyUrl?: string;
  cache?: {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  };
}

export interface MusicProvider {
  source: MusicSource;
  search(input: SearchInput, context: ProviderContext): Promise<SearchResult>;
  songDetail(id: string, context: ProviderContext): Promise<Song | null>;
  playableUrl(id: string, context: ProviderContext): Promise<PlayableUrl>;
  lyric(id: string, context: ProviderContext): Promise<Lyric>;
}
