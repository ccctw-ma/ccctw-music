import type { AudioSource, PlayerEvent, PlayerState } from "@ccctw-music/core";

export interface AudioPort {
  load(source: AudioSource): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(seconds: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  getState(): Promise<PlayerState>;
  subscribe(listener: (event: PlayerEvent) => void): () => void;
}

export interface StoragePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface NotificationPort {
  requestPermission(): Promise<boolean>;
  show(title: string, options?: { body?: string; icon?: string }): Promise<void>;
}

export interface DownloadPort {
  cacheAudio(url: string, cacheKey: string): Promise<string>;
  removeCachedAudio(cacheKey: string): Promise<void>;
}
