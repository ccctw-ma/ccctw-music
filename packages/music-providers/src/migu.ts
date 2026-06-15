import {
  formatSongs,
  parseLyrics,
  type Lyric,
  type SearchInput,
  type SearchResult,
  type Song,
} from "@ccctw-music/core";
import { getJson, toSearchParams, withProxy } from "./http";
import type { MusicProvider, PlayableUrl, ProviderContext } from "./types";

interface MiguSearchResponse {
  songResultData?: {
    totalCount?: string;
    result?: unknown[];
  };
}

interface MiguResourceInfoResponse {
  resource?: unknown[];
}

const MIGU_HEADERS = {
  Referer: "https://m.music.migu.cn/v3",
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
};

const MIGU_LISTEN_CHANNEL = "0146951";
const MIGU_TONE_FLAGS = ["PQ", "HQ", "LQ"];

function miguContentId(song: Song | null): string | undefined {
  const raw = song?.raw as { contentId?: unknown } | undefined;
  const contentId = raw?.contentId;
  return typeof contentId === "string" && contentId ? contentId : undefined;
}

async function miguListenUrl(contentId: string, toneFlag: string, context: ProviderContext): Promise<string | null> {
  const params = toSearchParams({
    toneFlag,
    netType: "01",
    channel: MIGU_LISTEN_CHANNEL,
    contentId,
    resourceType: 2,
    copyrightId: 0,
  });
  const target = `https://app.pd.nf.migu.cn/MIGUM2.0/v1.0/content/sub/listenSong.do?${params.toString()}`;

  const readLocation = async (url: string, follow: boolean): Promise<string | null> => {
    const response = await context.fetch(url, {
      redirect: follow ? "follow" : "manual",
      headers: MIGU_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    const location = response.headers?.get("location");
    if (location && /^https?:\/\//.test(location)) {
      return location;
    }
    // When following through a proxy, the final resolved URL is the audio file.
    if (follow && response.ok && /freetyst\.nf\.migu\.cn/.test(response.url ?? "")) {
      return response.url;
    }
    return null;
  };

  const direct = await readLocation(target, false).catch(() => null);
  if (direct) {
    return direct;
  }

  if (context.proxyUrl) {
    return readLocation(withProxy(context.proxyUrl, target), true).catch(() => null);
  }
  return null;
}

function splitMiguId(id: string): { copyrightId: string; contentId?: string } {
  const [copyrightId, contentId] = id.split(":");
  return { copyrightId, contentId: contentId || undefined };
}

async function miguSongDetail(id: string, context: ProviderContext) {
  const params = toSearchParams({
    copyrightId: splitMiguId(id).copyrightId,
    resourceType: 2,
  });
  const data = await getJson<MiguResourceInfoResponse>(
    context.fetch,
    `https://app.c.nf.migu.cn/MIGUM3.0/v1.0/content/resourceinfo.do?${params.toString()}`,
    {
      headers: {
        referer: "https://music.migu.cn",
      },
    },
  );
  return formatSongs(data.resource ?? [], "migu")[0] ?? null;
}

export const miguProvider: MusicProvider = {
  source: "migu",

  async search(input: SearchInput, context: ProviderContext): Promise<SearchResult> {
    const params = toSearchParams({
      text: input.keyword,
      pageNo: input.page ?? 1,
      pageSize: input.pageSize ?? 30,
      searchSwitch: '{"song":1}',
    });
    const data = await getJson<MiguSearchResponse>(
      context.fetch,
      `https://pd.musicapp.migu.cn/MIGUM2.0/v1.0/content/search_all.do?${params.toString()}`,
      {
        headers: MIGU_HEADERS,
      },
    );

    const songs = formatSongs(data.songResultData?.result ?? [], "migu");
    return {
      source: "migu",
      total: Number(data.songResultData?.totalCount ?? songs.length) || songs.length,
      songs,
    };
  },

  async songDetail(id: string, context: ProviderContext): Promise<Song | null> {
    const detail = await miguSongDetail(id, context).catch(() => null);
    if (detail) {
      return detail;
    }

    const result = await this.search({ keyword: id, sources: ["migu"], pageSize: 1 }, context);
    return result.songs[0] ?? null;
  },

  async playableUrl(id: string, context: ProviderContext): Promise<PlayableUrl> {
    const contentId = splitMiguId(id).contentId ?? miguContentId(await this.songDetail(id, context));
    if (contentId) {
      for (const toneFlag of MIGU_TONE_FLAGS) {
        const url = await miguListenUrl(contentId, toneFlag, context).catch(() => null);
        if (url) {
          return {
            source: "migu",
            url,
            quality: toneFlag === "HQ" ? "high" : "standard",
          };
        }
      }
    }

    return {
      source: "migu",
      url: null,
    };
  },

  async lyric(id: string, context: ProviderContext): Promise<Lyric> {
    const params = toSearchParams({ copyrightId: splitMiguId(id).copyrightId });
    const data = await getJson<{ lyric?: string }>(
      context.fetch,
      `https://music.migu.cn/v3/api/music/audioPlayer/getLyric?${params.toString()}`,
    );
    return parseLyrics(data.lyric ?? "");
  },
};
