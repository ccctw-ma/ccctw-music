import { describe, expect, it } from "vitest";
import { usePlayerStore } from "./player-store";

describe("usePlayerStore", () => {
  it("persists current song and toggles playback", () => {
    const song = {
      id: "1",
      source: "migu" as const,
      name: "Song",
      artists: [{ name: "Artist" }],
    };

    usePlayerStore.getState().setCurrent(song);
    usePlayerStore.getState().play();

    expect(usePlayerStore.getState()).toMatchObject({
      current: song,
      isPlaying: true,
    });

    usePlayerStore.getState().pause();
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });
});
