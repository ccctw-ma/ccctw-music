import type { Lyric, MusicSource, SearchResult, Song } from "@ccctw-music/core";

export interface MusicApiClientOptions {
  baseUrl: string;
  fetcher?: typeof fetch;
}

export interface SearchParams {
  keyword: string;
  page?: number;
  pageSize?: number;
  sources?: MusicSource[];
}

export interface PlayableUrlResult {
  source: MusicSource;
  url: string | null;
  quality?: string;
  expiresAt?: string;
}

export interface MusicApiClient {
  search(params: SearchParams): Promise<SearchResult[]>;
  songDetail(source: MusicSource, id: string): Promise<Song | null>;
  playableUrl(source: MusicSource, id: string): Promise<PlayableUrlResult>;
  lyric(source: MusicSource, id: string): Promise<Lyric>;
}

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

export class MusicApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = "API_ERROR",
  ) {
    super(message);
    this.name = "MusicApiError";
  }
}

async function readError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (body.error?.message) {
      return new MusicApiError(body.error.message, response.status, body.error.code);
    }
  } catch {
    // Keep the original status fallback when the API did not return JSON.
  }

  return new MusicApiError(`${fallback}: ${response.status} ${response.statusText}`, response.status);
}

export function createMusicApiClient(options: MusicApiClientOptions): MusicApiClient {
  const fetcher = options.fetcher ?? fetch;
  const baseUrl = options.baseUrl.replace(/\/$/, "");

  return {
    async search(params) {
      const query = new URLSearchParams({
        keyword: params.keyword,
        page: String(params.page ?? 1),
        pageSize: String(params.pageSize ?? 30),
        sources: (params.sources ?? ["migu", "netease", "qq", "itunes", "deezer", "bilibili"]).join(","),
      });
      const response = await fetcher(`${baseUrl}/v1/search?${query.toString()}`);
      if (!response.ok) {
        throw await readError(response, "Search failed");
      }

      const data = (await response.json()) as { data: SearchResult[] };
      return data.data;
    },

    async songDetail(source, id) {
      const response = await fetcher(`${baseUrl}/v1/songs/${encodeURIComponent(source)}/${encodeURIComponent(id)}`);
      if (!response.ok) {
        throw await readError(response, "Song detail failed");
      }

      const data = (await response.json()) as { data: Song | null };
      return data.data;
    },

    async playableUrl(source, id) {
      const response = await fetcher(`${baseUrl}/v1/songs/${encodeURIComponent(source)}/${encodeURIComponent(id)}/url`);
      if (!response.ok) {
        throw await readError(response, "Playable URL failed");
      }

      const data = (await response.json()) as { data: PlayableUrlResult };
      return data.data;
    },

    async lyric(source, id) {
      const response = await fetcher(
        `${baseUrl}/v1/songs/${encodeURIComponent(source)}/${encodeURIComponent(id)}/lyric`,
      );
      if (!response.ok) {
        throw await readError(response, "Lyric failed");
      }

      const data = (await response.json()) as { data: Lyric };
      return data.data;
    },
  };
}
