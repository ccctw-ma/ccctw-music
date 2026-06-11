import {
  formatSongs,
  parseLyrics,
  type Lyric,
  type SearchInput,
  type SearchResult,
  type Song,
} from "@ccctw-music/core";
import CryptoJS from "crypto-js";
import { getJson, toSearchParams } from "./http";
import type { MusicProvider, PlayableUrl, ProviderContext } from "./types";

interface NeteaseSearchResponse {
  result?: {
    songCount?: number;
    songs?: unknown[];
  };
}

const NETEASE_EAPI_KEY = "e82ckenh8dichen8";
const NETEASE_PLAYER_URL_PATH = "/api/song/enhance/player/url";

function aes128EcbEncrypt(text: string) {
  return CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(text), CryptoJS.enc.Utf8.parse(NETEASE_EAPI_KEY), {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  })
    .ciphertext.toString(CryptoJS.enc.Hex)
    .toUpperCase();
}

function wordArrayFromArrayBuffer(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const words: number[] = [];
  for (let index = 0; index < bytes.length; index += 1) {
    words[index >>> 2] |= bytes[index] << (24 - (index % 4) * 8);
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length);
}

function aes128EcbDecrypt(buffer: ArrayBuffer) {
  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: wordArrayFromArrayBuffer(buffer) } as CryptoJS.lib.CipherParams,
    CryptoJS.enc.Utf8.parse(NETEASE_EAPI_KEY),
    {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    },
  );
  return decrypted.toString(CryptoJS.enc.Utf8);
}

function createNeteaseEapiParams(path: string, payload: Record<string, unknown>) {
  const text = JSON.stringify(payload);
  const digest = CryptoJS.MD5(`nobody${path}use${text}md5forencrypt`).toString();
  return aes128EcbEncrypt(`${path}-36cd479b6b5-${text}-36cd479b6b5-${digest}`);
}

async function postNeteaseEapi<T>(
  context: ProviderContext,
  path: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const header = {
    appver: "8.0.0",
    versioncode: "140",
    buildver: String(Math.floor(Date.now() / 1000)),
    resolution: "1920x1080",
    os: "android",
    requestId: `${Date.now()}_${String(Math.floor(Math.random() * 1000)).padStart(4, "0")}`,
    __csrf: "",
  };
  const params = createNeteaseEapiParams(path, { ...payload, header });
  const response = await context.fetch(`https://interface3.music.163.com/eapi/song/enhance/player/url`, {
    method: "POST",
    body: toSearchParams({ params }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: Object.entries(header)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join("; "),
      Referer: "https://music.163.com",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Netease eapi failed: ${response.status} ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const decrypted = aes128EcbDecrypt(buffer);
  return JSON.parse(decrypted) as T;
}

export const neteaseProvider: MusicProvider = {
  source: "netease",

  async search(input: SearchInput, context: ProviderContext): Promise<SearchResult> {
    const body = toSearchParams({
      s: input.keyword,
      type: 1,
      limit: input.pageSize ?? 30,
      offset: ((input.page ?? 1) - 1) * (input.pageSize ?? 30),
    });
    const data = await getJson<NeteaseSearchResponse>(context.fetch, "https://music.163.com/api/search/get", {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: "https://music.163.com",
      },
    });

    const songs = formatSongs(data.result?.songs ?? [], "netease");
    return {
      source: "netease",
      total: data.result?.songCount ?? songs.length,
      songs,
    };
  },

  async songDetail(id: string, context: ProviderContext): Promise<Song | null> {
    const data = await getJson<{ songs?: unknown[] }>(
      context.fetch,
      `https://music.163.com/api/song/detail?${toSearchParams({ ids: `[${id}]` }).toString()}`,
      {
        headers: {
          Referer: "https://music.163.com",
        },
      },
    );
    return formatSongs(data.songs ?? [], "netease")[0] ?? null;
  },

  async playableUrl(id: string, context: ProviderContext): Promise<PlayableUrl> {
    const data = await getJson<{ data?: Array<{ url?: string | null }> }>(
      context.fetch,
      `https://music.163.com/api/song/enhance/player/url?${toSearchParams({ ids: `[${id}]`, br: 320000 }).toString()}`,
      {
        headers: {
          Referer: "https://music.163.com",
        },
      },
    );
    const standardUrl = data.data?.[0]?.url ?? null;
    if (standardUrl) {
      return {
        source: "netease",
        url: standardUrl,
        quality: "standard",
      };
    }

    const eapiData = await postNeteaseEapi<{ data?: Array<{ url?: string | null }> }>(
      context,
      NETEASE_PLAYER_URL_PATH,
      {
        ids: `[${id}]`,
        br: 999000,
      },
    ).catch(() => null);

    return {
      source: "netease",
      url: eapiData?.data?.[0]?.url ?? null,
      quality: eapiData?.data?.[0]?.url ? "eapi" : undefined,
    };
  },

  async lyric(id: string, context: ProviderContext): Promise<Lyric> {
    const data = await getJson<{ lrc?: { lyric?: string } }>(
      context.fetch,
      `https://music.163.com/api/song/lyric?${toSearchParams({ id, lv: -1, kv: -1, tv: -1 }).toString()}`,
      {
        headers: {
          Referer: "https://music.163.com",
        },
      },
    );
    return parseLyrics(data.lrc?.lyric ?? "");
  },
};
