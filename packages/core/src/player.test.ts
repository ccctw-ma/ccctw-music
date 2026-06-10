import { describe, expect, it, vi } from "vitest";
import { PlayerStore } from "./player";
import type { Song } from "./types";

const song: Song = {
  id: "1",
  source: "migu",
  name: "Song",
  artists: [{ name: "Artist" }],
  duration: 200,
};

describe("PlayerStore", () => {
  it("sets queue and emits loaded state", () => {
    const store = new PlayerStore();
    const listener = vi.fn();

    store.subscribe(listener);
    const state = store.setQueue([song]);

    expect(state.current).toBe(song);
    expect(state.duration).toBe(200);
    expect(listener).toHaveBeenCalledWith({ type: "loaded", state });
  });

  it("updates play, pause and progress state", () => {
    const store = new PlayerStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.setQueue([song]);
    expect(store.play().isPlaying).toBe(true);
    expect(store.updateProgress(10, 200)).toMatchObject({ currentTime: 10, duration: 200 });
    unsubscribe();
    expect(store.pause().isPlaying).toBe(false);

    const eventTypes = listener.mock.calls.map(([event]) => event.type);
    expect(eventTypes).toEqual(["loaded", "play", "timeupdate"]);
  });

  it("uses initial state and handles empty queue", () => {
    const store = new PlayerStore();

    expect(store.getState()).toMatchObject({
      queue: [],
      isPlaying: false,
      duration: 0,
      currentTime: 0,
      volume: 1,
      mode: "sequence",
    });
    expect(store.setQueue([])).toMatchObject({
      current: undefined,
      duration: 0,
    });
  });
});
