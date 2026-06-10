import { describe, expect, it } from "vitest";
import { formatMiguSong, formatNeteaseSong, formatQqSong, formatSongs } from "./formatters";

describe("song formatters", () => {
  it("normalizes migu songs from legacy fields", () => {
    expect(
      formatMiguSong({
        id: 12,
        songName: "Song",
        singerName: "A/B",
        albumName: "Album",
        lyrics: "lyric-url",
        mp3: "audio.mp3",
        cover: "cover.jpg",
      }),
    ).toMatchObject({
      id: "12",
      source: "migu",
      name: "Song",
      artists: [{ name: "A" }, { name: "B" }],
      album: { name: "Album", coverUrl: "cover.jpg" },
      lyricUrl: "lyric-url",
      playableUrl: "audio.mp3",
      coverUrl: "cover.jpg",
    });
  });

  it("normalizes netease songs and converts duration to seconds", () => {
    expect(
      formatNeteaseSong({
        id: 99,
        name: "Netease Song",
        artists: [{ id: 1, name: "Artist" }],
        album: { id: 2, name: "Album", picUrl: "cover.jpg" },
        duration: 210000,
      }),
    ).toMatchObject({
      id: "99",
      source: "netease",
      artists: [{ id: "1", name: "Artist" }],
      duration: 210,
      coverUrl: "cover.jpg",
    });
  });

  it("normalizes qq songs and builds album cover url", () => {
    const song = formatQqSong({
      songid: 7,
      songname: "QQ Song",
      singer: [{ mid: "s1", name: "Singer" }],
      albummid: "album-mid",
      albumname: "Album",
      interval: 180,
    });

    expect(song).toMatchObject({
      id: "7",
      source: "qq",
      artists: [{ id: "s1", name: "Singer" }],
      duration: 180,
    });
    expect(song.coverUrl).toContain("album-mid");
  });

  it("filters empty normalized songs and ignores unsupported sources", () => {
    expect(
      formatSongs(
        [
          { id: "", name: "" },
          { id: 1, name: "ok" },
        ],
        "netease",
      ),
    ).toHaveLength(1);
    expect(formatSongs([{ id: 1 }], "other")).toEqual([]);
    expect(formatSongs(null as unknown as unknown[], "migu")).toEqual([]);
  });

  it("supports fallback field names and missing arrays", () => {
    expect(formatMiguSong({ copyrightId: "c1", name: "Fallback", singer: "A、B", duration: "20" })).toMatchObject({
      id: "c1",
      name: "Fallback",
      artists: [{ name: "A" }, { name: "B" }],
      duration: 20,
      playableUrl: null,
      coverUrl: null,
    });

    expect(
      formatNeteaseSong({ id: "n1", name: "New", ar: [{ id: 1, name: "AR" }], al: { id: 2, name: "AL" } }),
    ).toMatchObject({
      artists: [{ id: "1", name: "AR" }],
      album: { id: "2", name: "AL" },
      duration: undefined,
    });

    expect(formatNeteaseSong({ id: "n2", name: "No Artist", artists: null })).toMatchObject({
      artists: [],
    });

    expect(
      formatQqSong({ mid: "mid", title: "Title", album: { mid: "album", name: "AL" }, singer: null }),
    ).toMatchObject({
      id: "mid",
      name: "Title",
      artists: [],
      album: { id: "album", name: "AL" },
    });

    expect(formatQqSong({ id: "id-only", name: "Name", singer: [{ id: 1, name: "Singer" }] })).toMatchObject({
      id: "id-only",
      name: "Name",
      coverUrl: null,
      album: { id: undefined, coverUrl: undefined },
    });

    expect(formatQqSong({ songmid: "song-mid", songname: "Song Mid", singer: [{ name: "Singer" }] })).toMatchObject({
      id: "song-mid",
      artists: [{ id: "", name: "Singer" }],
    });
  });
});
