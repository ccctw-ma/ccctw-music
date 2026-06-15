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

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function miguCoverUrl(raw: UnknownRecord): string | undefined {
  const albumImages = Array.isArray(raw.albumImgs)
    ? raw.albumImgs
    : Array.isArray(raw.imgItems)
      ? raw.imgItems
      : undefined;
  if (albumImages) {
    const image = albumImages.find((item) => item?.imgSizeType === "03") ?? albumImages.at(-1);
    return normalizeCoverUrl(image?.img ?? image?.webpImg ?? image?.imgOri);
  }
  return normalizeCoverUrl(raw.cover ?? raw.coverUrl ?? raw.picUrl);
}

function miguArtists(raw: UnknownRecord): { name: string }[] {
  if (Array.isArray(raw.singers)) {
    return raw.singers.map((singer) => ({ name: String(singer?.name ?? "").trim() })).filter((singer) => singer.name);
  }
  return artistsFromNames(raw.singerName ?? raw.singer);
}

function miguAlbum(raw: UnknownRecord): { id?: string; name?: string } {
  if (Array.isArray(raw.albums) && raw.albums[0]) {
    const album = raw.albums[0];
    return { id: album.id ? String(album.id) : undefined, name: album.name };
  }
  return { id: raw.albumId ? String(raw.albumId) : undefined, name: raw.albumName ?? raw.album };
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
    source === "migu"
      ? "咪咕音乐"
      : source === "netease"
        ? "网易云音乐"
        : source === "qq"
          ? "QQ 音乐"
          : source === "itunes"
            ? "iTunes"
            : source === "deezer"
              ? "Deezer"
              : source === "bilibili"
                ? "Bilibili"
                : source;
  const official =
    source === "migu" || source === "netease" || source === "qq" || source === "itunes" || source === "deezer";
  const quality = input.lossless ? "lossless" : input.high ? "high" : input.playable ? "standard" : "unknown";
  const sourceScore =
    source === "migu"
      ? 30
      : source === "qq"
        ? 24
        : source === "netease"
          ? 22
          : source === "itunes" || source === "deezer"
            ? 18
            : 10;
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
  const formats = [
    ...(Array.isArray(raw.newRateFormats) ? raw.newRateFormats : []),
    ...(Array.isArray(raw.rateFormats) ? raw.rateFormats : []),
  ];
  const playableUrl =
    normalizeCoverUrl(
      firstString(
        raw.mp3,
        raw.url,
        raw.playUrl,
        raw.listenUrl,
        raw.downloadUrl,
        raw.m4a,
        ...formats.flatMap((format) => [
          format?.url,
          format?.androidUrl,
          format?.iosUrl,
          format?.fileUrl,
          format?.downloadUrl,
          format?.androidFileUrl,
          format?.iosFileUrl,
        ]),
      ),
    ) ?? null;
  const formatTypes = formats.map((item) => String(item?.formatType ?? "").toUpperCase());
  const album = miguAlbum(raw);
  const copyrightId = String(raw.copyrightId ?? raw.id ?? raw.songId ?? "");
  const contentId = typeof raw.contentId === "string" ? raw.contentId : "";
  return {
    id: contentId ? `${copyrightId}:${contentId}` : copyrightId,
    source: "migu",
    name: String(raw.songName ?? raw.name ?? ""),
    artists: miguArtists(raw),
    album: {
      id: album.id,
      name: album.name,
      coverUrl,
      source: "migu",
      raw,
    },
    duration: miguDuration(raw),
    lyricUrl: raw.lyrics ?? raw.lrcUrl ?? raw.lyricUrl,
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

export function formatBilibiliSong(raw: UnknownRecord): Song {
  const bvid = firstString(raw.bvid, raw.id, raw.aid === undefined ? undefined : String(raw.aid));
  const coverUrl = normalizeCoverUrl(raw.pic ?? raw.cover);
  const author = firstString(raw.author, raw.owner?.name, raw.name);
  const videoUrl = raw.bvid ? `https://www.bilibili.com/video/${bvid}` : normalizeCoverUrl(raw.arcurl ?? raw.url);

  return {
    id: String(bvid ?? ""),
    source: "bilibili",
    name: String(raw.title ?? raw.name ?? "").replace(/<[^>]+>/g, ""),
    artists: author ? [{ name: author }] : [],
    album: {
      name: "Bilibili 视频",
      coverUrl,
      source: "bilibili",
      raw,
    },
    duration: typeof raw.duration === "number" ? raw.duration : undefined,
    playableUrl: null,
    coverUrl: coverUrl ?? null,
    quality: qualityFor("bilibili", {
      playable: false,
      high: true,
    }),
    playbackMode: "external",
    externalUrl: videoUrl,
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

export function formatItunesSong(raw: UnknownRecord): Song {
  const id = raw.trackId ?? raw.collectionId;
  const coverUrl = normalizeCoverUrl(
    typeof raw.artworkUrl100 === "string" ? raw.artworkUrl100.replace("100x100bb", "600x600bb") : raw.artworkUrl100,
  );
  const playableUrl = normalizeCoverUrl(raw.previewUrl);

  return {
    id: String(id ?? ""),
    source: "itunes",
    name: String(raw.trackName ?? raw.collectionName ?? ""),
    artists: raw.artistName
      ? [{ id: raw.artistId ? String(raw.artistId) : undefined, name: String(raw.artistName) }]
      : [],
    album: {
      id: raw.collectionId ? String(raw.collectionId) : undefined,
      name: raw.collectionName,
      coverUrl,
      source: "itunes",
      raw,
    },
    duration: typeof raw.trackTimeMillis === "number" ? Math.round(raw.trackTimeMillis / 1000) : undefined,
    playableUrl,
    coverUrl: coverUrl ?? null,
    quality: qualityFor("itunes", {
      playable: Boolean(playableUrl),
      high: true,
    }),
    raw,
  };
}

export function formatDeezerSong(raw: UnknownRecord): Song {
  const album = isRecord(raw.album) ? raw.album : {};
  const artist = isRecord(raw.artist) ? raw.artist : {};
  const coverUrl = normalizeCoverUrl(album.cover_xl ?? album.cover_big ?? album.cover_medium ?? album.cover);
  const playableUrl = normalizeCoverUrl(raw.preview);

  return {
    id: String(raw.id ?? ""),
    source: "deezer",
    name: String(raw.title_short ?? raw.title ?? ""),
    artists: artist.name ? [{ id: artist.id ? String(artist.id) : undefined, name: String(artist.name) }] : [],
    album: {
      id: album.id ? String(album.id) : undefined,
      name: album.title,
      coverUrl,
      source: "deezer",
      raw: album,
    },
    duration: typeof raw.duration === "number" ? raw.duration : undefined,
    playableUrl,
    coverUrl: coverUrl ?? null,
    quality: qualityFor("deezer", {
      playable: Boolean(playableUrl),
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

  if (source === "itunes") {
    return rawSongs
      .filter(isRecord)
      .map((song) => formatItunesSong(song))
      .filter((song) => song.id && song.name)
      .sort((left, right) => right.quality.score - left.quality.score);
  }

  if (source === "deezer") {
    return rawSongs
      .filter(isRecord)
      .map((song) => formatDeezerSong(song))
      .filter((song) => song.id && song.name)
      .sort((left, right) => right.quality.score - left.quality.score);
  }

  if (source === "bilibili") {
    return rawSongs
      .filter(isRecord)
      .map((song) => formatBilibiliSong(song))
      .filter((song) => song.id && song.name)
      .sort((left, right) => right.quality.score - left.quality.score);
  }

  return [];
}
