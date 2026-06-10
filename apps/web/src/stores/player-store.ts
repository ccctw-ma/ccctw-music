import type { Song } from "@ccctw-music/core";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PlayerStore {
  current?: Song;
  isPlaying: boolean;
  setCurrent: (song: Song) => void;
  play: () => void;
  pause: () => void;
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set) => ({
      current: undefined,
      isPlaying: false,
      setCurrent: (song) => set({ current: song }),
      play: () => set({ isPlaying: true }),
      pause: () => set({ isPlaying: false }),
    }),
    {
      name: "ccctw-music-player",
      partialize: (state) => ({
        current: state.current,
      }),
    },
  ),
);
