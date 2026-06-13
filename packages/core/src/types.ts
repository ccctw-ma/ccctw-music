export type MusicSource = "netease" | "qq" | "migu" | "itunes" | "deezer" | "bilibili" | "other";

export interface Artist {
  id?: string;
  name: string;
}

export interface Album {
  id?: string;
  name?: string;
  coverUrl?: string;
  source: MusicSource;
  raw?: unknown;
}

export interface LyricLine {
  id: string;
  sentence: string;
  timeStamp?: number;
}

export interface Lyric {
  lines: LyricLine[];
  type: 0 | 1 | 2;
  raw?: string;
}

export interface SongQuality {
  sourceLabel: string;
  official: boolean;
  free: boolean;
  playable: boolean;
  quality: "lossless" | "high" | "standard" | "unknown";
  score: number;
  badges: string[];
}

export interface Song {
  id: string;
  source: MusicSource;
  name: string;
  artists: Artist[];
  album?: Album;
  duration?: number;
  lyric?: Lyric;
  lyricUrl?: string;
  playableUrl?: string | null;
  coverUrl?: string | null;
  quality: SongQuality;
  raw?: unknown;
}

export interface SearchInput {
  keyword: string;
  page?: number;
  pageSize?: number;
  sources?: MusicSource[];
}

export interface SearchResult {
  source: MusicSource;
  total: number;
  songs: Song[];
}

export interface AudioSource {
  songId: string;
  url: string;
  title: string;
  artist?: string;
  coverUrl?: string | null;
}

export interface PlayerState {
  current?: Song;
  queue: Song[];
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  volume: number;
  mode: "sequence" | "single" | "shuffle";
}

export type PlayerEvent =
  | { type: "loaded"; state: PlayerState }
  | { type: "play"; state: PlayerState }
  | { type: "pause"; state: PlayerState }
  | { type: "timeupdate"; state: PlayerState }
  | { type: "ended"; state: PlayerState }
  | { type: "error"; error: Error; state: PlayerState };
