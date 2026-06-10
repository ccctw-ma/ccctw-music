import type { MusicSource, SearchResult } from "@ccctw-music/core";

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

export interface MusicApiClient {
  search(params: SearchParams): Promise<SearchResult[]>;
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
        sources: (params.sources ?? ["migu", "netease", "qq"]).join(","),
      });
      const response = await fetcher(`${baseUrl}/v1/search?${query.toString()}`);
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as { data: SearchResult[] };
      return data.data;
    },
  };
}
