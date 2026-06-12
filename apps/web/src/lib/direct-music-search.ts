import { formatSongs, type MusicSource, type SearchResult, type Song } from "@ccctw-music/core";

interface DirectSearchInput {
  keyword: string;
  page?: number;
  pageSize?: number;
  sources: MusicSource[];
}

interface MiguSearchResponse {
  musics?: unknown[];
  pgt?: number;
}

interface NeteaseSearchResponse {
  result?: {
    songCount?: number;
    songs?: unknown[];
  };
}

interface NeteaseDetailResponse {
  songs?: unknown[];
}

interface QqSearchResponse {
  data?: {
    song?: {
      totalnum?: number;
      list?: unknown[];
    };
  };
}

function toSearchParams(input: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }
  return params;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Direct upstream failed: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  const normalized = text.replace(/^(callback|MusicJsonCallback|jsonCallback)\(/, "").replace(/\)$/, "");
  return JSON.parse(normalized) as T;
}

async function searchMigu(input: DirectSearchInput, fetcher: typeof fetch): Promise<SearchResult> {
  const params = toSearchParams({
    keyword: input.keyword,
    pgc: input.page ?? 1,
    rows: input.pageSize ?? 30,
    type: 2,
  });
  const data = await fetcher(`https://m.music.migu.cn/migu/remoting/scr_search_tag?${params.toString()}`, {
    signal: AbortSignal.timeout(6500),
  }).then((response) => readJson<MiguSearchResponse>(response));
  const songs = formatSongs(data.musics ?? [], "migu");
  return {
    source: "migu",
    total: data.pgt ?? songs.length,
    songs,
  };
}

async function searchNetease(input: DirectSearchInput, fetcher: typeof fetch): Promise<SearchResult> {
  const pageSize = input.pageSize ?? 30;
  const body = toSearchParams({
    s: input.keyword,
    type: 1,
    limit: pageSize,
    offset: ((input.page ?? 1) - 1) * pageSize,
  });
  const data = await fetcher("https://music.163.com/api/search/get", {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    signal: AbortSignal.timeout(6500),
  }).then((response) => readJson<NeteaseSearchResponse>(response));
  const rawSongs = data.result?.songs ?? [];
  const songs = formatSongs(await enrichNeteaseSongs(rawSongs, fetcher), "netease");
  return {
    source: "netease",
    total: data.result?.songCount ?? songs.length,
    songs,
  };
}

async function enrichNeteaseSongs(rawSongs: unknown[], fetcher: typeof fetch) {
  const ids = rawSongs
    .map((song) => (song && typeof song === "object" ? String((song as { id?: unknown }).id ?? "") : ""))
    .filter(Boolean);
  if (ids.length === 0) {
    return rawSongs;
  }

  const data = await fetcher(
    `https://music.163.com/api/song/detail?${toSearchParams({ ids: `[${ids.join(",")}]` }).toString()}`,
    {
      headers: {
        Referer: "https://music.163.com",
      },
      signal: AbortSignal.timeout(6500),
    },
  )
    .then((response) => readJson<NeteaseDetailResponse>(response))
    .catch(() => null);
  const detailsById = new Map(
    (data?.songs ?? [])
      .map((song) => [String((song as { id?: unknown })?.id ?? ""), song] as const)
      .filter(([id]) => id),
  );

  return rawSongs.map((song) => {
    const id = song && typeof song === "object" ? String((song as { id?: unknown }).id ?? "") : "";
    return detailsById.get(id) ?? song;
  });
}

async function searchQq(input: DirectSearchInput, fetcher: typeof fetch): Promise<SearchResult> {
  const params = toSearchParams({
    w: input.keyword,
    p: input.page ?? 1,
    n: input.pageSize ?? 30,
    format: "json",
    inCharset: "utf-8",
    outCharset: "utf-8",
    cr: 1,
  });
  const data = await fetcher(`https://c.y.qq.com/soso/fcgi-bin/client_search_cp?${params.toString()}`, {
    signal: AbortSignal.timeout(6500),
  }).then((response) => readJson<QqSearchResponse>(response));
  const songs = formatSongs(data.data?.song?.list ?? [], "qq");
  return {
    source: "qq",
    total: data.data?.song?.totalnum ?? songs.length,
    songs,
  };
}

function bestScore(result: SearchResult) {
  return result.songs[0]?.quality.score ?? 0;
}

function isLikelyResolvable(song: Song) {
  return Boolean(song.playableUrl) || song.source === "netease";
}

function bestPlaybackPriority(result: SearchResult) {
  return result.songs.some(isLikelyResolvable) ? 100 : 0;
}

export async function searchDirectMusic(input: DirectSearchInput, fetcher: typeof fetch = fetch) {
  const sources = Array.from(new Set(input.sources));
  const settled = await Promise.allSettled(
    sources.map(async (source) => {
      if (source === "migu") {
        return searchMigu(input, fetcher);
      }
      if (source === "netease") {
        return searchNetease(input, fetcher);
      }
      if (source === "qq") {
        return searchQq(input, fetcher);
      }
      throw new Error(`Unsupported direct source: ${source}`);
    }),
  );

  const results: SearchResult[] = [];
  const failedSources: MusicSource[] = [];
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      results.push(result.value);
    } else {
      failedSources.push(sources[index]);
    }
  });

  return {
    results: results.sort(
      (left, right) => bestPlaybackPriority(right) - bestPlaybackPriority(left) || bestScore(right) - bestScore(left),
    ),
    failedSources,
  };
}

export async function resolveDirectPlayableUrl(song: Song, fetcher: typeof fetch = fetch) {
  if (song.playableUrl) {
    return song.playableUrl;
  }

  if (song.source === "netease") {
    const url = `https://music.3e0.cn/?${toSearchParams({
      server: "netease",
      type: "url",
      id: song.id,
    }).toString()}`;
    const response = await fetcher(url, {
      headers: {
        Range: "bytes=0-1",
      },
      signal: AbortSignal.timeout(6500),
    });
    const contentType = response.headers?.get("content-type") ?? "";
    if (response.status === 206 || contentType.startsWith("audio/")) {
      return url;
    }
  }

  return null;
}
