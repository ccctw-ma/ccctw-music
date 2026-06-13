import { describe, expect, it } from "vitest";
import {
  formatBilibiliSong,
  formatDeezerSong,
  formatItunesSong,
  formatMiguSong,
  formatNeteaseSong,
  formatQqSong,
  formatSongs,
} from "./formatters";

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
      quality: {
        sourceLabel: "咪咕音乐",
        official: true,
        free: true,
        playable: true,
      },
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
      quality: { sourceLabel: "网易云音乐", official: true, free: false, quality: "high" },
    });
  });

  it("uses netease blurPicUrl as album cover fallback", () => {
    expect(
      formatNeteaseSong({
        id: 100,
        name: "Blur Cover",
        artists: [],
        album: { id: 3, name: "Album", blurPicUrl: "http://p1.music.126.net/blur.jpg" },
        duration: 1000,
      }),
    ).toMatchObject({
      coverUrl: "https://p1.music.126.net/blur.jpg",
      album: { coverUrl: "https://p1.music.126.net/blur.jpg" },
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
      quality: { sourceLabel: "QQ 音乐", official: true, free: false, quality: "high" },
    });
    expect(song.coverUrl).toContain("album-mid");
  });

  it("normalizes itunes preview songs with larger artwork", () => {
    expect(
      formatItunesSong({
        trackId: 123,
        trackName: "iTunes Song",
        artistId: 9,
        artistName: "Artist",
        collectionId: 8,
        collectionName: "Album",
        artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music/100x100bb.jpg",
        previewUrl: "https://audio.example.com/preview.m4a",
        trackTimeMillis: 180000,
      }),
    ).toMatchObject({
      id: "123",
      source: "itunes",
      name: "iTunes Song",
      artists: [{ id: "9", name: "Artist" }],
      album: { id: "8", name: "Album", source: "itunes" },
      duration: 180,
      playableUrl: "https://audio.example.com/preview.m4a",
      coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music/600x600bb.jpg",
      quality: { sourceLabel: "iTunes", playable: true, quality: "high" },
    });
  });

  it("normalizes deezer preview songs", () => {
    expect(
      formatDeezerSong({
        id: 456,
        title_short: "Deezer Song",
        duration: 200,
        preview: "https://cdns-preview.dzcdn.net/preview.mp3",
        artist: { id: 7, name: "Singer" },
        album: { id: 6, title: "DZ Album", cover_xl: "https://e-cdns-images.dzcdn.net/cover.jpg" },
      }),
    ).toMatchObject({
      id: "456",
      source: "deezer",
      name: "Deezer Song",
      artists: [{ id: "7", name: "Singer" }],
      album: { id: "6", name: "DZ Album", source: "deezer" },
      duration: 200,
      playableUrl: "https://cdns-preview.dzcdn.net/preview.mp3",
      coverUrl: "https://e-cdns-images.dzcdn.net/cover.jpg",
      quality: { sourceLabel: "Deezer", playable: true, quality: "high" },
    });
  });

  it("normalizes bilibili videos as external playback entries", () => {
    expect(
      formatBilibiliSong({
        bvid: "BV1xx411c7mD",
        title: '<em class="keyword">Live</em> 视频',
        author: "Uploader",
        pic: "//i0.hdslb.com/cover.jpg",
        duration: 320,
      }),
    ).toMatchObject({
      id: "BV1xx411c7mD",
      source: "bilibili",
      name: "Live 视频",
      artists: [{ name: "Uploader" }],
      duration: 320,
      playbackMode: "external",
      externalUrl: "https://www.bilibili.com/video/BV1xx411c7mD",
      coverUrl: "https://i0.hdslb.com/cover.jpg",
    });
  });

  it("uses bilibili fallback ids and urls when bvid is missing", () => {
    expect(
      formatBilibiliSong({
        aid: 123,
        name: "Fallback Video",
        owner: { name: "Owner" },
        arcurl: "http://www.bilibili.com/video/av123",
      }),
    ).toMatchObject({
      id: "123",
      name: "Fallback Video",
      artists: [{ name: "Owner" }],
      externalUrl: "https://www.bilibili.com/video/av123",
    });
  });

  it("filters empty normalized songs and ignores unsupported sources", () => {
    expect(formatSongs([null, { id: "", name: "" }, { id: 1, name: "ok" }], "netease")).toHaveLength(1);
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
      formatMiguSong({
        copyrightId: "c2",
        name: "Format Url",
        singer: "A",
        rateFormats: [{ formatType: "HQ", androidUrl: "http://cdn.example.com/hq.mp3" }],
      }),
    ).toMatchObject({
      id: "c2",
      playableUrl: "https://cdn.example.com/hq.mp3",
      quality: { playable: true, quality: "high" },
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

  it("scores lossless, high quality, playable, and sorted songs", () => {
    const songs = formatSongs(
      [
        {
          copyrightId: "low",
          songName: "Low",
          singer: "A",
          rateFormats: [{ formatType: "LQ" }],
        },
        {
          copyrightId: "lossless",
          songName: "Lossless",
          singer: "A",
          mp3: "audio.mp3",
          newRateFormats: [{ formatType: "SQ" }],
        },
        {
          copyrightId: "high",
          songName: "High",
          singer: "A",
          url: "audio-high.mp3",
          rateFormats: [{ formatType: "HQ" }],
        },
      ],
      "migu",
    );

    expect(songs.map((song) => song.id)).toEqual(["lossless", "high", "low"]);
    expect(songs[0].quality).toMatchObject({
      quality: "lossless",
      playable: true,
      free: true,
      badges: expect.arrayContaining(["正版", "免费可播", "无损", "咪咕音乐"]),
    });
    expect(songs[1].quality).toMatchObject({
      quality: "high",
      badges: expect.arrayContaining(["高品质"]),
    });
    expect(songs[2].quality).toMatchObject({
      quality: "unknown",
      playable: false,
    });
  });
});
