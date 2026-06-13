import type { Song } from "@ccctw-music/core";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Playlist {
  id: string;
  name: string;
  songs: Song[];
}

interface PlayerStore {
  current?: Song;
  queue: Song[];
  recentlyPlayed: Song[];
  favorites: Song[];
  playlists: Playlist[];
  ownedAudios: Song[];
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  volume: number;
  mode: "sequence" | "single" | "shuffle";
  setCurrent: (song: Song) => void;
  loadQueue: (queue: Song[], current?: Song) => void;
  enqueue: (song: Song) => void;
  removeFromQueue: (key: string) => void;
  playNext: () => void;
  playPrevious: () => void;
  toggleFavorite: (song: Song) => void;
  isFavorite: (song: Song) => boolean;
  addToPlaylist: (playlistId: string, song: Song) => void;
  addOwnedAudio: (song: Song) => void;
  removeOwnedAudio: (key: string) => void;
  play: () => void;
  pause: () => void;
  setProgress: (currentTime: number, duration?: number) => void;
  setVolume: (volume: number) => void;
}

const RECENT_LIMIT = 12;
const DEFAULT_PLAYLIST_ID = "studio-mix";
const DEFAULT_PLAYLIST_NAME = "Studio Mix";

export function songKey(song: Song): string {
  return `${song.source}:${song.id}`;
}

function dedupeSongs(songs: Song[]): Song[] {
  const seen = new Set<string>();
  return songs.filter((song) => {
    const key = songKey(song);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function withRecent(recentlyPlayed: Song[], song?: Song): Song[] {
  if (!song) {
    return recentlyPlayed;
  }

  return dedupeSongs([song, ...recentlyPlayed]).slice(0, RECENT_LIMIT);
}

function playlistName(playlistId: string): string {
  return playlistId === DEFAULT_PLAYLIST_ID ? DEFAULT_PLAYLIST_NAME : playlistId;
}

function nextSong(queue: Song[], current: Song | undefined, offset: 1 | -1): Song | undefined {
  if (queue.length === 0) {
    return current;
  }

  const currentIndex = current ? queue.findIndex((song) => songKey(song) === songKey(current)) : -1;
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;
  const targetIndex = (safeIndex + offset + queue.length) % queue.length;
  return queue[targetIndex];
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      current: undefined,
      queue: [],
      recentlyPlayed: [],
      favorites: [],
      playlists: [],
      ownedAudios: [],
      isPlaying: false,
      duration: 0,
      currentTime: 0,
      volume: 1,
      mode: "sequence",
      setCurrent: (song) =>
        set((state) => ({
          current: song,
          duration: song.duration ?? state.duration,
          recentlyPlayed: withRecent(state.recentlyPlayed, song),
        })),
      loadQueue: (queue, current = queue[0]) =>
        set((state) => ({
          queue: dedupeSongs(queue),
          current,
          currentTime: 0,
          duration: current?.duration ?? 0,
          recentlyPlayed: withRecent(state.recentlyPlayed, current),
        })),
      enqueue: (song) =>
        set((state) => ({
          queue: dedupeSongs([...state.queue, song]),
        })),
      removeFromQueue: (key) =>
        set((state) => {
          if (state.current && songKey(state.current) === key) {
            return state;
          }

          return {
            queue: state.queue.filter((song) => songKey(song) !== key),
          };
        }),
      playNext: () =>
        set((state) => {
          const current = nextSong(state.queue, state.current, 1);
          return {
            current,
            currentTime: 0,
            duration: current?.duration ?? 0,
            recentlyPlayed: withRecent(state.recentlyPlayed, current),
          };
        }),
      playPrevious: () =>
        set((state) => {
          const current = nextSong(state.queue, state.current, -1);
          return {
            current,
            currentTime: 0,
            duration: current?.duration ?? 0,
            recentlyPlayed: withRecent(state.recentlyPlayed, current),
          };
        }),
      toggleFavorite: (song) =>
        set((state) => {
          const key = songKey(song);
          const exists = state.favorites.some((favorite) => songKey(favorite) === key);
          return {
            favorites: exists
              ? state.favorites.filter((favorite) => songKey(favorite) !== key)
              : [song, ...state.favorites],
          };
        }),
      isFavorite: (song) => get().favorites.some((favorite) => songKey(favorite) === songKey(song)),
      addToPlaylist: (playlistId, song) =>
        set((state) => {
          const existing = state.playlists.find((playlist) => playlist.id === playlistId);
          if (!existing) {
            return {
              playlists: [
                ...state.playlists,
                {
                  id: playlistId,
                  name: playlistName(playlistId),
                  songs: [song],
                },
              ],
            };
          }

          return {
            playlists: state.playlists.map((playlist) =>
              playlist.id === playlistId ? { ...playlist, songs: dedupeSongs([...playlist.songs, song]) } : playlist,
            ),
          };
        }),
      addOwnedAudio: (song) =>
        set((state) => ({
          ownedAudios: dedupeSongs([song, ...state.ownedAudios]),
        })),
      removeOwnedAudio: (key) =>
        set((state) => ({
          ownedAudios: state.ownedAudios.filter((song) => songKey(song) !== key),
        })),
      play: () => set({ isPlaying: true }),
      pause: () => set({ isPlaying: false }),
      setProgress: (currentTime, duration = get().duration) => set({ currentTime, duration }),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
    }),
    {
      name: "ccctw-music-player",
      partialize: (state) => ({
        current: state.current,
        queue: state.queue,
        recentlyPlayed: state.recentlyPlayed,
        favorites: state.favorites,
        playlists: state.playlists,
        ownedAudios: state.ownedAudios,
        duration: state.duration,
        currentTime: state.currentTime,
        volume: state.volume,
        mode: state.mode,
      }),
    },
  ),
);
