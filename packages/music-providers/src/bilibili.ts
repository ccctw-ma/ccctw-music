import {
  formatSongs,
  parseLyrics,
  type Lyric,
  type SearchInput,
  type SearchResult,
  type Song,
} from "@ccctw-music/core";
import { fetchWithTimeout, getJson, toSearchParams } from "./http";
import type { MusicProvider, PlayableUrl, ProviderContext } from "./types";

interface BilibiliSearchResponse {
  data?: {
    numResults?: number;
    result?: unknown[];
  };
}

const BILIBILI_SEARCH_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  Origin: "https://search.bilibili.com",
  Referer: "https://search.bilibili.com/",
  Cookie: "buvid3=00000000-0000-4000-8000-00000000000000000infoc; b_nut=1710000000",
};

const BILIBILI_PAGE_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  Referer: "https://www.bilibili.com/",
  Cookie: BILIBILI_SEARCH_HEADERS.Cookie,
};

function cleanHtmlText(text: string) {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function parseBilibiliHtmlVideos(html: string, limit: number) {
  const videos: unknown[] = [];
  const seen = new Set<string>();
  const cardPattern = /<div class="bili-video-card"[\s\S]*?(?=<div class="col_|<footer|<\/body>|$)/g;

  for (const [card] of html.matchAll(cardPattern)) {
    const bvid = card.match(/\/\/www\.bilibili\.com\/video\/(BV[0-9A-Za-z]+)/)?.[1];
    if (!bvid || seen.has(bvid)) {
      continue;
    }

    const title = card.match(/class="bili-video-card__info--tit"[^>]*title="([^"]+)"/)?.[1];
    const image = card.match(/<img[^>]+src="([^"]+)"/)?.[1];
    const author = card.match(/class="bili-video-card__info--author"[^>]*>([^<]+)</)?.[1];
    seen.add(bvid);
    videos.push({
      bvid,
      title: cleanHtmlText(title ?? ""),
      author: cleanHtmlText(author ?? ""),
      pic: image,
    });

    if (videos.length >= limit) {
      break;
    }
  }

  return videos;
}

async function searchBilibiliHtml(input: SearchInput, context: ProviderContext) {
  const params = toSearchParams({ keyword: input.keyword });
  const response = await fetchWithTimeout(context.fetch, `https://search.bilibili.com/video?${params.toString()}`, {
    headers: BILIBILI_PAGE_HEADERS,
  });
  if (!response.ok) {
    return [];
  }

  return parseBilibiliHtmlVideos(await response.text(), input.pageSize ?? 30);
}

function fallbackSearchEntry(keyword: string) {
  const searchUrl = `https://search.bilibili.com/video?keyword=${encodeURIComponent(keyword)}`;
  return [
    {
      id: `search-${encodeURIComponent(keyword)}`,
      title: `在 Bilibili 查看「${keyword}」相关视频`,
      author: "Bilibili",
      url: searchUrl,
    },
  ];
}

export const bilibiliProvider: MusicProvider = {
  source: "bilibili",

  async search(input: SearchInput, context: ProviderContext): Promise<SearchResult> {
    const params = toSearchParams({
      keyword: input.keyword,
      page: input.page ?? 1,
      page_size: input.pageSize ?? 30,
      search_type: "video",
    });
    const data = await getJson<BilibiliSearchResponse>(
      context.fetch,
      `https://api.bilibili.com/x/web-interface/search/type?${params.toString()}`,
      {
        headers: BILIBILI_SEARCH_HEADERS,
      },
    ).catch(() => null);
    const rawSongs = data?.data?.result?.length
      ? data.data.result
      : await searchBilibiliHtml(input, context).catch(() => []);
    const songs = formatSongs(rawSongs.length ? rawSongs : fallbackSearchEntry(input.keyword), "bilibili");
    return {
      source: "bilibili",
      total: data?.data?.numResults ?? songs.length,
      songs,
    };
  },

  async songDetail(id: string, context: ProviderContext): Promise<Song | null> {
    const result = await this.search({ keyword: id, sources: ["bilibili"], pageSize: 1 }, context);
    return result.songs[0] ?? null;
  },

  async playableUrl(id: string): Promise<PlayableUrl> {
    return {
      source: "bilibili",
      url: `https://www.bilibili.com/video/${encodeURIComponent(id)}`,
      quality: "external",
    };
  },

  async lyric(): Promise<Lyric> {
    return parseLyrics("");
  },
};
