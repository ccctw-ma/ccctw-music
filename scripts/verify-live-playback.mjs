const apiBaseUrl = process.env.PUBLIC_API_BASE_URL ?? "https://ccctw-music-api.1934202608.workers.dev";
const keyword = process.env.MUSIC_VERIFY_KEYWORD ?? "晴天";
const sources = process.env.MUSIC_VERIFY_SOURCES ?? "migu,netease,qq";

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  return {
    response,
    body: await readJson(response),
  };
}

async function checkAudioUrl(url) {
  const response = await fetch(url, {
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

const searchUrl = new URL("/v1/search", apiBaseUrl);
searchUrl.searchParams.set("keyword", keyword);
searchUrl.searchParams.set("page", "1");
searchUrl.searchParams.set("pageSize", "5");
searchUrl.searchParams.set("sources", sources);

const { response: searchResponse, body: searchBody } = await fetchJson(searchUrl);
console.log(
  JSON.stringify(
    {
      step: "search",
      status: searchResponse.status,
      keyword,
      sources,
      groups: searchBody.data?.map((group) => ({
        source: group.source,
        total: group.total,
        songs: group.songs?.length ?? 0,
      })),
    },
    null,
    2,
  ),
);

let playableCount = 0;
let testedCount = 0;

for (const group of searchBody.data ?? []) {
  for (const song of (group.songs ?? []).slice(0, 3)) {
    testedCount += 1;
    const urlEndpoint = new URL(
      `/v1/songs/${encodeURIComponent(song.source)}/${encodeURIComponent(song.id)}/url`,
      apiBaseUrl,
    );
    const { response, body } = await fetchJson(urlEndpoint);
    const playableUrl = body.data?.url ?? null;
    const audio = playableUrl ? await checkAudioUrl(playableUrl).catch((error) => ({ error: error.message })) : null;
    if (audio?.ok) {
      playableCount += 1;
    }

    console.log(
      JSON.stringify(
        {
          step: "song",
          source: song.source,
          id: song.id,
          name: song.name,
          urlStatus: response.status,
          hasPlayableUrl: Boolean(playableUrl),
          audio,
        },
        null,
        2,
      ),
    );
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
