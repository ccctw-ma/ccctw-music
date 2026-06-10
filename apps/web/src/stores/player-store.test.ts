import { describe, expect, it, beforeEach } from "vitest";
import { usePlayerStore, songKey } from "./player-store";
import type { Song } from "@ccctw-music/core";

const song: Song = {
  id: "1",
  source: "migu",
  name: "Song",
  artists: [{ name: "Artist" }],
  duration: 200,
};

const nextSong: Song = {
  id: "2",
  source: "netease",
  name: "Next Song",
  artists: [{ name: "Next Artist" }],
  duration: 180,
};

const thirdSong: Song = {
  id: "3",
  source: "qq",
  name: "Third Song",
  artists: [{ name: "Third Artist" }],
  duration: 160,
};

beforeEach(() => {
  localStorage.clear();
  usePlayerStore.setState(usePlayerStore.getInitialState(), true);
});

describe("songKey", () => {
  it("builds a stable source-prefixed key", () => {
    expect(songKey(song)).toBe("migu:1");
  });
});

describe("usePlayerStore", () => {
  it("persists current song and toggles playback", () => {
    usePlayerStore.getState().setCurrent(song);
    usePlayerStore.getState().play();

    expect(usePlayerStore.getState()).toMatchObject({
      current: song,
      isPlaying: true,
    });

    usePlayerStore.getState().pause();
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it("loads queue, resets progress, and records recently played", () => {
    usePlayerStore.getState().setProgress(33, 99);
    usePlayerStore.getState().loadQueue([song, nextSong], nextSong);

    expect(usePlayerStore.getState()).toMatchObject({
      current: nextSong,
      queue: [song, nextSong],
      currentTime: 0,
      duration: 180,
      recentlyPlayed: [nextSong],
    });
  });

  it("deduplicates queued and recently played songs by source id", () => {
    usePlayerStore.getState().loadQueue([song], song);
    usePlayerStore.getState().enqueue(song);
    usePlayerStore.getState().enqueue(nextSong);
    usePlayerStore.getState().setCurrent(song);

    expect(usePlayerStore.getState().queue).toEqual([song, nextSong]);
    expect(usePlayerStore.getState().recentlyPlayed).toEqual([song]);
  });

  it("moves to next and previous songs in the queue", () => {
    usePlayerStore.getState().loadQueue([song, nextSong, thirdSong], nextSong);

    usePlayerStore.getState().playNext();
    expect(usePlayerStore.getState().current).toEqual(thirdSong);

    usePlayerStore.getState().playNext();
    expect(usePlayerStore.getState().current).toEqual(song);

    usePlayerStore.getState().playPrevious();
    expect(usePlayerStore.getState().current).toEqual(thirdSong);
  });

  it("toggles favorites and reports favorite state", () => {
    expect(usePlayerStore.getState().isFavorite(song)).toBe(false);

    usePlayerStore.getState().toggleFavorite(song);
    expect(usePlayerStore.getState().favorites).toEqual([song]);
    expect(usePlayerStore.getState().isFavorite(song)).toBe(true);

    usePlayerStore.getState().toggleFavorite(song);
    expect(usePlayerStore.getState().favorites).toEqual([]);
    expect(usePlayerStore.getState().isFavorite(song)).toBe(false);
  });

  it("creates the Studio Mix playlist and deduplicates playlist songs", () => {
    usePlayerStore.getState().addToPlaylist("studio-mix", song);
    usePlayerStore.getState().addToPlaylist("studio-mix", song);
    usePlayerStore.getState().addToPlaylist("studio-mix", nextSong);

    expect(usePlayerStore.getState().playlists).toEqual([
      {
        id: "studio-mix",
        name: "Studio Mix",
        songs: [song, nextSong],
      },
    ]);
  });

  it("removes non-current queued songs without clearing the current song", () => {
    usePlayerStore.getState().loadQueue([song, nextSong, thirdSong], song);

    usePlayerStore.getState().removeFromQueue(songKey(nextSong));
    expect(usePlayerStore.getState().queue).toEqual([song, thirdSong]);
    expect(usePlayerStore.getState().current).toEqual(song);

    usePlayerStore.getState().removeFromQueue(songKey(song));
    expect(usePlayerStore.getState().queue).toEqual([song, thirdSong]);
    expect(usePlayerStore.getState().current).toEqual(song);
  });

  it("updates progress and clamps volume", () => {
    usePlayerStore.getState().setProgress(45, 120);
    usePlayerStore.getState().setVolume(1.4);

    expect(usePlayerStore.getState()).toMatchObject({ currentTime: 45, duration: 120, volume: 1 });

    usePlayerStore.getState().setVolume(-0.2);
    expect(usePlayerStore.getState().volume).toBe(0);
  });

  it("persists library state but not active playback", () => {
    usePlayerStore.getState().loadQueue([song, nextSong], song);
    usePlayerStore.getState().toggleFavorite(song);
    usePlayerStore.getState().addToPlaylist("studio-mix", nextSong);
    usePlayerStore.getState().setVolume(0.42);
    usePlayerStore.getState().play();

    const persisted = JSON.parse(localStorage.getItem("ccctw-music-player") ?? "{}");

    expect(persisted.state).toMatchObject({
      current: song,
      queue: [song, nextSong],
      recentlyPlayed: [song],
      favorites: [song],
      playlists: [{ id: "studio-mix", name: "Studio Mix", songs: [nextSong] }],
      volume: 0.42,
      mode: "sequence",
    });
    expect(persisted.state).not.toHaveProperty("isPlaying");
  });

  it("handles empty queues, missing current songs, and custom playlist names", () => {
    usePlayerStore.getState().setCurrent({ ...song, duration: undefined });
    expect(usePlayerStore.getState().duration).toBe(0);

    usePlayerStore.getState().loadQueue([]);
    expect(usePlayerStore.getState().current).toBeUndefined();

    usePlayerStore.getState().playNext();
    expect(usePlayerStore.getState().current).toBeUndefined();

    usePlayerStore.getState().loadQueue([song, nextSong], { ...thirdSong, id: "missing" });
    usePlayerStore.getState().playNext();
    expect(usePlayerStore.getState().current).toEqual(nextSong);

    usePlayerStore.getState().addToPlaylist("late-night", song);
    expect(usePlayerStore.getState().playlists.at(-1)).toMatchObject({ id: "late-night", name: "late-night" });
  });
});
