import { resolveDirectPlayableUrl, searchDirectMusic } from "../apps/web/src/lib/direct-music-search";

type MusicSource = string;
type SearchResult = {
  source: MusicSource;
  total: number;
  songs: Song[];
};
type Song = {
  id: string;
  source: MusicSource;
  name: string;
  coverUrl?: string | null;
  playableUrl?: string | null;
  quality?: {
    score: number;
  };
};

const apiBaseUrl = process.env.PUBLIC_API_BASE_URL ?? "https://ccctw-music-api.1934202608.workers.dev";
const keywords = (process.env.MUSIC_VERIFY_KEYWORD ?? "晴天,偏爱,海阔天空")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const sources = (process.env.MUSIC_VERIFY_SOURCES ?? "migu,netease,qq")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean) as MusicSource[];
const REQUEST_TIMEOUT_MS = 15000;

async function readJson(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function fetchJson(url: string | URL) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return {
    response,
    body: await readJson(response),
  };
}

async function checkAudioUrl(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      Range: "bytes=0-63",
      "User-Agent": "Mozilla/5.0 CCCTW-Music-Live-Playback-Check",
    },
  });

  return {
    ok: response.ok || response.status === 206,
    status: response.status,
    contentType: response.headers.get("content-type"),
    contentRange: response.headers.get("content-range"),
    cors: response.headers.get("access-control-allow-origin"),
  };
}

let playableCount = 0;
let testedCount = 0;

function bestScore(result: SearchResult) {
  return result.songs[0]?.quality?.score ?? 0;
}

function isLikelyResolvable(song: Song) {
  return Boolean(song.playableUrl) || song.source === "netease";
}

function songScore(song: Song) {
  return (isLikelyResolvable(song) ? 100 : 0) + (song.quality?.score ?? 0);
}

async function serverSearch(keyword: string, requestedSources: MusicSource[]) {
  const searchUrl = new URL("/v1/search", apiBaseUrl);
  searchUrl.searchParams.set("keyword", keyword);
  searchUrl.searchParams.set("page", "1");
  searchUrl.searchParams.set("pageSize", "5");
  searchUrl.searchParams.set("sources", requestedSources.join(","));

  const { response: searchResponse, body: searchBody } = await fetchJson(searchUrl).catch((error) => ({
    response: { status: 0 },
    body: { error: error.message },
  }));
  console.log(
    JSON.stringify(
      {
        step: "server-search",
        status: searchResponse.status,
        keyword,
        sources: requestedSources.join(","),
        groups: searchBody.data?.map((group: SearchResult) => ({
          source: group.source,
          total: group.total,
          songs: group.songs?.length ?? 0,
        })),
        error: searchBody.error,
      },
      null,
      2,
    ),
  );
  return (searchBody.data ?? []) as SearchResult[];
}

async function clientFirstSearch(keyword: string) {
  const direct: { results: SearchResult[]; failedSources: MusicSource[]; error?: Error } = await searchDirectMusic(
    { keyword, pageSize: 5, sources: sources as never },
    fetch,
  ).catch((error: Error) => ({
    results: [],
    failedSources: sources,
    error,
  }));
  console.log(
    JSON.stringify(
      {
        step: "client-search",
        keyword,
        sources: sources.join(","),
        groups: direct.results.map((group) => ({
          source: group.source,
          total: group.total,
          songs: group.songs.length,
        })),
        failedSources: direct.failedSources,
        error: direct.error?.message,
      },
      null,
      2,
    ),
  );

  const directSources = new Set(direct.results.map((result) => result.source));
  const serverSources = sources.filter((source) => {
    const directResult = direct.results.find((result) => result.source === source);
    return direct.failedSources.includes(source) || !directResult || directResult.songs.length === 0;
  });
  const serverResults = serverSources.length ? await serverSearch(keyword, serverSources) : [];
  return [
    ...direct.results.filter((result) => result.songs.length > 0),
    ...serverResults.filter((result) => !directSources.has(result.source) || result.songs.length > 0),
  ].sort((left, right) => bestScore(right) - bestScore(left));
}

async function resolvePlayableUrl(song: Song) {
  if (song.playableUrl) {
    return {
      urlStatus: "client-direct",
      playableUrl: song.playableUrl,
      error: undefined,
    };
  }

  const directPlayableUrl = await resolveDirectPlayableUrl(song as never, fetch).catch(() => null);
  if (directPlayableUrl) {
    return {
      urlStatus: "client-playable-resolver",
      playableUrl: directPlayableUrl,
      error: undefined,
    };
  }

  const urlEndpoint = new URL(
    `/v1/songs/${encodeURIComponent(song.source)}/${encodeURIComponent(song.id)}/url`,
    apiBaseUrl,
  );
  const { response, body } = await fetchJson(urlEndpoint).catch((error) => ({
    response: { status: 0 },
    body: { error: error.message },
  }));
  return {
    urlStatus: response.status,
    playableUrl: body.data?.url ?? null,
    error: body.error,
  };
}

for (const keyword of keywords) {
  const searchResults = await clientFirstSearch(keyword);
  const orderedSongs = searchResults
    .flatMap((group) => group.songs ?? [])
    .sort((left, right) => songScore(right) - songScore(left));
  const firstSong = orderedSongs[0];
  if (firstSong) {
    console.log(
      JSON.stringify(
        {
          step: "first-song",
          keyword,
          source: firstSong.source,
          id: firstSong.id,
          name: firstSong.name,
          hasCoverUrl: Boolean(firstSong.coverUrl),
          likelyResolvable: isLikelyResolvable(firstSong),
        },
        null,
        2,
      ),
    );
    if (!firstSong.coverUrl) {
      console.error(
        JSON.stringify(
          {
            step: "result",
            ok: false,
            keyword,
            message: "First playable-ranked song has no coverUrl.",
          },
          null,
          2,
        ),
      );
      process.exit(1);
    }
  }

  for (const song of orderedSongs.slice(0, 6)) {
    testedCount += 1;
    const { urlStatus, playableUrl, error } = await resolvePlayableUrl(song);
    const audio: {
      ok?: boolean;
      status?: number;
      contentType?: string | null;
      contentRange?: string | null;
      cors?: string | null;
      error?: string;
    } | null = playableUrl
      ? await checkAudioUrl(playableUrl).catch((error: Error) => ({ error: error.message }))
      : null;
    if (audio?.ok) {
      playableCount += 1;
    }

    console.log(
      JSON.stringify(
        {
          step: "song",
          keyword,
          source: song.source,
          id: song.id,
          name: song.name,
          urlStatus,
          hasPlayableUrl: Boolean(playableUrl),
          audio,
          error,
        },
        null,
        2,
      ),
    );
    if (playableCount > 0) {
      break;
    }
  }

  if (playableCount > 0) {
    break;
  }
}

if (testedCount === 0 || playableCount === 0) {
  console.error(
    JSON.stringify(
      {
        step: "result",
        ok: false,
        testedCount,
        playableCount,
        message: "No live playable audio URL passed the byte-range check.",
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      step: "result",
      ok: true,
      testedCount,
      playableCount,
    },
    null,
    2,
  ),
);
