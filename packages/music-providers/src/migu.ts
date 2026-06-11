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

interface MiguSearchResponse {
  musics?: unknown[];
  pgt?: number;
}

interface MiguResourceInfoResponse {
  resource?: unknown[];
}

async function miguSongDetail(id: string, context: ProviderContext) {
  const params = toSearchParams({
    copyrightId: id,
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
      keyword: input.keyword,
      pgc: input.page ?? 1,
      rows: input.pageSize ?? 30,
      type: 2,
    });
    const data = await getJson<MiguSearchResponse>(
      context.fetch,
      `https://m.music.migu.cn/migu/remoting/scr_search_tag?${params.toString()}`,
      {
        headers: {
          referer: "https://m.music.migu.cn/v3",
        },
      },
    );

    const songs = formatSongs(data.musics ?? [], "migu");
    return {
      source: "migu",
      total: data.pgt ?? songs.length,
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
    const detail = await this.songDetail(id, context);
    return {
      source: "migu",
      url: detail?.playableUrl ?? null,
    };
  },

  async lyric(id: string, context: ProviderContext): Promise<Lyric> {
    const params = toSearchParams({ copyrightId: id });
    const data = await getJson<{ lyric?: string }>(
      context.fetch,
      `https://music.migu.cn/v3/api/music/audioPlayer/getLyric?${params.toString()}`,
    );
    return parseLyrics(data.lyric ?? "");
  },
};
