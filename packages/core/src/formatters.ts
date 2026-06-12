import type { MusicSource, Song, SongQuality } from "./types";

type UnknownRecord = Record<string, any>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === "object");
}

function artistsFromNames(names?: string): { name: string }[] {
  return names
    ? names
        .split(/[、,/]/)
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({ name }))
    : [];
}

function normalizeCoverUrl(url?: unknown): string | undefined {
  if (typeof url !== "string" || !url.trim()) {
    return undefined;
  }
  const trimmed = url.trim();
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  if (trimmed.startsWith("http://")) {
    return trimmed.replace(/^http:\/\//, "https://");
  }
  return trimmed;
}

function miguCoverUrl(raw: UnknownRecord): string | undefined {
  const albumImages = raw.albumImgs;
  if (Array.isArray(albumImages)) {
    const image = albumImages.find((item) => item?.imgSizeType === "03") ?? albumImages.at(-1);
    return normalizeCoverUrl(image?.img ?? image?.webpImg ?? image?.imgOri);
  }
  return normalizeCoverUrl(raw.cover ?? raw.coverUrl ?? raw.picUrl);
}

function neteaseCoverUrl(raw: UnknownRecord, album: UnknownRecord): string | undefined {
  return normalizeCoverUrl(
    album.picUrl ??
      album.blurPicUrl ??
      album.img1v1Url ??
      album.coverUrl ??
      raw.picUrl ??
      raw.blurPicUrl ??
      raw.coverUrl ??
      raw.albumPic ??
      raw.album?.picUrl ??
      raw.album?.blurPicUrl ??
      raw.al?.picUrl,
  );
}

function miguDuration(raw: UnknownRecord): number | undefined {
  const duration = Number(raw.duration ?? raw.length);
  if (!Number.isFinite(duration) || duration <= 0) {
    return undefined;
  }
  return duration > 1000 ? Math.round(duration / 1000) : duration;
}

function qualityFor(
  source: MusicSource,
  input: { playable?: boolean; lossless?: boolean; high?: boolean },
): SongQuality {
  const sourceLabel =
    source === "migu" ? "咪咕音乐" : source === "netease" ? "网易云音乐" : source === "qq" ? "QQ 音乐" : source;
  const official = source === "migu" || source === "netease" || source === "qq";
  const quality = input.lossless ? "lossless" : input.high ? "high" : input.playable ? "standard" : "unknown";
  const sourceScore = source === "migu" ? 30 : source === "qq" ? 24 : source === "netease" ? 22 : 10;
  const score =
    sourceScore +
    (official ? 20 : 0) +
    (input.playable ? 25 : 0) +
    (quality === "lossless" ? 20 : quality === "high" ? 14 : 6);
  const badges = [
    official ? "正版" : undefined,
    input.playable ? "免费可播" : undefined,
    quality === "lossless" ? "无损" : quality === "high" ? "高品质" : quality === "standard" ? "标准音质" : undefined,
    sourceLabel,
  ].filter((badge): badge is string => Boolean(badge));

  return {
    sourceLabel,
    official,
    free: Boolean(input.playable),
    playable: Boolean(input.playable),
    quality,
    score,
    badges,
  };
}

export function formatMiguSong(raw: UnknownRecord): Song {
  const coverUrl = miguCoverUrl(raw);
  const playableUrl = raw.mp3 ?? raw.url ?? null;
  const formats = [
    ...(Array.isArray(raw.newRateFormats) ? raw.newRateFormats : []),
    ...(Array.isArray(raw.rateFormats) ? raw.rateFormats : []),
  ];
  const formatTypes = formats.map((item) => String(item?.formatType ?? "").toUpperCase());
  return {
    id: String(raw.id ?? raw.copyrightId ?? raw.songId ?? ""),
    source: "migu",
    name: String(raw.songName ?? raw.name ?? ""),
    artists: artistsFromNames(raw.singerName ?? raw.singer),
    album: {
      id: raw.albumId ? String(raw.albumId) : undefined,
      name: raw.albumName ?? raw.album,
      coverUrl,
      source: "migu",
      raw,
    },
    duration: miguDuration(raw),
    lyricUrl: raw.lyrics ?? raw.lrcUrl,
    playableUrl,
    coverUrl: coverUrl ?? null,
    quality: qualityFor("migu", {
      playable: Boolean(playableUrl),
      lossless: formatTypes.some((value) => value.includes("SQ") || value.includes("ZQ")),
      high: formatTypes.some((value) => value.includes("HQ") || value.includes("PQ")),
    }),
    raw,
  };
}

export function formatNeteaseSong(raw: UnknownRecord): Song {
  const artists = raw.artists ?? raw.ar ?? [];
  const album = raw.album ?? raw.al ?? {};
  const coverUrl = neteaseCoverUrl(raw, album);

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
      coverUrl,
      source: "netease",
      raw: album,
    },
    duration: typeof raw.duration === "number" ? raw.duration / 1000 : undefined,
    playableUrl: null,
    coverUrl: coverUrl ?? null,
    quality: qualityFor("netease", {
      playable: false,
      high: true,
    }),
    raw,
  };
}

export function formatQqSong(raw: UnknownRecord): Song {
  const singers = raw.singer ?? [];
  const albumMid = raw.albummid ?? raw.album?.mid;
  const songMid = raw.songmid ?? raw.mid;
  const coverUrl = albumMid ? `https://y.qq.com/music/photo_new/T002R300x300M000${albumMid}.jpg` : undefined;

  return {
    id: String(songMid ?? raw.songid ?? raw.id ?? ""),
    source: "qq",
    name: String(raw.songname ?? raw.name ?? raw.title ?? ""),
    artists: Array.isArray(singers)
      ? singers.map((artist) => ({ id: String(artist.id ?? artist.mid ?? ""), name: String(artist.name ?? "") }))
      : [],
    album: {
      id: albumMid ? String(albumMid) : undefined,
      name: raw.albumname ?? raw.album?.name,
      coverUrl,
      source: "qq",
      raw: raw.album ?? raw,
    },
    duration: typeof raw.interval === "number" ? raw.interval : undefined,
    playableUrl: null,
    coverUrl: coverUrl ?? null,
    quality: qualityFor("qq", {
      playable: false,
      high: true,
    }),
    raw,
  };
}

export function formatSongs(rawSongs: unknown[], source: MusicSource): Song[] {
  if (!Array.isArray(rawSongs)) {
    return [];
  }

  if (source === "migu") {
    return rawSongs
      .filter(isRecord)
      .map((song) => formatMiguSong(song))
      .filter((song) => song.id && song.name)
      .sort((left, right) => right.quality.score - left.quality.score);
  }

  if (source === "netease") {
    return rawSongs
      .filter(isRecord)
      .map((song) => formatNeteaseSong(song))
      .filter((song) => song.id && song.name)
      .sort((left, right) => right.quality.score - left.quality.score);
  }

  if (source === "qq") {
    return rawSongs
      .filter(isRecord)
      .map((song) => formatQqSong(song))
      .filter((song) => song.id && song.name)
      .sort((left, right) => right.quality.score - left.quality.score);
  }

  return [];
}
