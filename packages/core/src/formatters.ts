import type { MusicSource, Song } from "./types";

type UnknownRecord = Record<string, any>;

function artistsFromNames(names?: string): { name: string }[] {
  return names
    ? names
        .split(/[、,/]/)
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({ name }))
    : [];
}

export function formatMiguSong(raw: UnknownRecord): Song {
  return {
    id: String(raw.id ?? raw.copyrightId ?? raw.songId ?? ""),
    source: "migu",
    name: String(raw.songName ?? raw.name ?? ""),
    artists: artistsFromNames(raw.singerName ?? raw.singer),
    album: {
      id: raw.albumId ? String(raw.albumId) : undefined,
      name: raw.albumName,
      coverUrl: raw.cover,
      source: "migu",
      raw,
    },
    duration: raw.duration ? Number(raw.duration) : undefined,
    lyricUrl: raw.lyrics,
    playableUrl: raw.mp3 ?? null,
    coverUrl: raw.cover ?? null,
    raw,
  };
}

export function formatNeteaseSong(raw: UnknownRecord): Song {
  const artists = raw.artists ?? raw.ar ?? [];
  const album = raw.album ?? raw.al ?? {};

  return {
    id: String(raw.id ?? ""),
    source: "netease",
    name: String(raw.name ?? ""),
    artists: Array.isArray(artists)
      ? artists.map((artist) => ({ id: String(artist.id ?? ""), name: String(artist.name ?? "") }))
      : [],
    album: {
      id: album.id ? String(album.id) : undefined,
      name: album.name,
      coverUrl: album.picUrl ?? album.picUrl,
      source: "netease",
      raw: album,
    },
    duration: typeof raw.duration === "number" ? raw.duration / 1000 : undefined,
    playableUrl: null,
    coverUrl: album.picUrl ?? null,
    raw,
  };
}

export function formatQqSong(raw: UnknownRecord): Song {
  const singers = raw.singer ?? [];
  const albumMid = raw.albummid ?? raw.album?.mid;

  return {
    id: String(raw.songid ?? raw.id ?? raw.songmid ?? raw.mid ?? ""),
    source: "qq",
    name: String(raw.songname ?? raw.name ?? raw.title ?? ""),
    artists: Array.isArray(singers)
      ? singers.map((artist) => ({ id: String(artist.id ?? artist.mid ?? ""), name: String(artist.name ?? "") }))
      : [],
    album: {
      id: albumMid ? String(albumMid) : undefined,
      name: raw.albumname ?? raw.album?.name,
      coverUrl: albumMid ? `https://y.qq.com/music/photo_new/T002R300x300M000${albumMid}.jpg` : undefined,
      source: "qq",
      raw: raw.album ?? raw,
    },
    duration: typeof raw.interval === "number" ? raw.interval : undefined,
    playableUrl: null,
    coverUrl: albumMid ? `https://y.qq.com/music/photo_new/T002R300x300M000${albumMid}.jpg` : null,
    raw,
  };
}

export function formatSongs(rawSongs: unknown[], source: MusicSource): Song[] {
  if (!Array.isArray(rawSongs)) {
    return [];
  }

  if (source === "migu") {
    return rawSongs.map((song) => formatMiguSong(song as UnknownRecord)).filter((song) => song.id && song.name);
  }

  if (source === "netease") {
    return rawSongs.map((song) => formatNeteaseSong(song as UnknownRecord)).filter((song) => song.id && song.name);
  }

  if (source === "qq") {
    return rawSongs.map((song) => formatQqSong(song as UnknownRecord)).filter((song) => song.id && song.name);
  }

  return [];
}
