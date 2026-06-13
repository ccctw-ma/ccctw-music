import {
  formatSongs,
  parseLyrics,
  type Lyric,
  type SearchInput,
  type SearchResult,
  type Song,
} from "@ccctw-music/core";
import { getJson, toSearchParams } from "./http";
import type { MusicProvider, PlayableUrl, ProviderContext } from "./types";

interface QqSearchResponse {
  data?: {
    song?: {
      totalnum?: number;
      list?: unknown[];
    };
  };
}

interface QqPlayableResponse {
  data?: {
    items?: Array<{
      filename?: string;
      vkey?: string;
    }>;
  };
}

const QQ_GUID = "10000";
const QQ_FILENAME_PREFIXES = ["M800", "M500", "C400", "C200"];

function qqPlayableUrl(songMid: string, vkey?: string, filename = `C400${songMid}.m4a`) {
  if (!vkey) {
    return null;
  }

  return `https://dl.stream.qqmusic.qq.com/${filename}?vkey=${encodeURIComponent(vkey)}&guid=${QQ_GUID}&uin=0&fromtag=66`;
}

async function qqPlayableByFilename(id: string, filename: string, context: ProviderContext) {
  const data = await getJson<QqPlayableResponse>(
    context.fetch,
    `https://c.y.qq.com/base/fcgi-bin/fcg_music_express_mobile3.fcg?${toSearchParams({
      cid: "205361747",
      format: "json",
      guid: QQ_GUID,
      filename,
      songmid: id,
    }).toString()}`,
    {
      headers: {
        Referer: "https://y.qq.com",
      },
    },
  );
  const item = data.data?.items?.[0];
  return qqPlayableUrl(id, item?.vkey, item?.filename ?? filename);
}

export const qqProvider: MusicProvider = {
  source: "qq",

  async search(input: SearchInput, context: ProviderContext): Promise<SearchResult> {
    const params = toSearchParams({
      w: input.keyword,
      p: input.page ?? 1,
      n: input.pageSize ?? 30,
      format: "json",
      inCharset: "utf-8",
      outCharset: "utf-8",
      cr: 1,
    });
    const data = await getJson<QqSearchResponse>(
      context.fetch,
      `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?${params.toString()}`,
      {
        headers: {
          Referer: "https://y.qq.com",
        },
      },
    );

    const songs = formatSongs(data.data?.song?.list ?? [], "qq");
    return {
      source: "qq",
      total: data.data?.song?.totalnum ?? songs.length,
      songs,
    };
  },

  async songDetail(id: string, context: ProviderContext): Promise<Song | null> {
    const result = await this.search({ keyword: id, sources: ["qq"], pageSize: 1 }, context);
    return result.songs[0] ?? null;
  },

  async playableUrl(id: string, context: ProviderContext): Promise<PlayableUrl> {
    for (const prefix of QQ_FILENAME_PREFIXES) {
      const extension = prefix.startsWith("M") ? "mp3" : "m4a";
      const url = await qqPlayableByFilename(id, `${prefix}${id}.${extension}`, context).catch(() => null);
      if (url) {
        return {
          source: "qq",
          url,
          quality: prefix.startsWith("M8") ? "high" : "standard",
        };
      }
    }

    return {
      source: "qq",
      url: null,
      quality: "standard",
    };
  },

  async lyric(id: string, context: ProviderContext): Promise<Lyric> {
    const data = await getJson<{ lyric?: string }>(
      context.fetch,
      `https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?${toSearchParams({ songmid: id, format: "json" }).toString()}`,
      {
        headers: {
          Referer: "https://y.qq.com",
        },
      },
    );
    const decoded = data.lyric ? atob(data.lyric) : "";
    return parseLyrics(decoded);
  },
};
