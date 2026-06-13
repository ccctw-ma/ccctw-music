import type { MusicSource, SearchInput, SearchResult } from "@ccctw-music/core";
import { deezerProvider } from "./deezer";
import { itunesProvider } from "./itunes";
import { miguProvider } from "./migu";
import { neteaseProvider } from "./netease";
import { qqProvider } from "./qq";
import type { MusicProvider, ProviderContext } from "./types";

export * from "./types";

export const providers = {
  migu: miguProvider,
  netease: neteaseProvider,
  qq: qqProvider,
  itunes: itunesProvider,
  deezer: deezerProvider,
} satisfies Partial<Record<MusicSource, MusicProvider>>;

const DEFAULT_SOURCES: MusicSource[] = ["migu", "netease", "qq", "itunes", "deezer"];

export function getProvider(source: MusicSource): MusicProvider | undefined {
  return providers[source as keyof typeof providers];
}

function bestScore(result: SearchResult) {
  return result.songs[0]?.quality.score ?? 0;
}

export async function searchAcrossProviders(input: SearchInput, context: ProviderContext): Promise<SearchResult[]> {
  const sources = Array.from(new Set(input.sources?.length ? input.sources : DEFAULT_SOURCES));
  const tasks = sources
    .map((source) => getProvider(source))
    .filter((provider): provider is MusicProvider => Boolean(provider))
    .map(async (provider) => {
      const cacheKey = `search:${provider.source}:${input.keyword}:${input.page ?? 1}:${input.pageSize ?? 30}`;
      const cached = await context.cache?.get<SearchResult>(cacheKey);
      if (cached) {
        return cached;
      }

      const result = await provider.search(input, context);
      await context.cache?.set(cacheKey, result, 60 * 10);
      return result;
    });

  const settled = await Promise.allSettled(tasks);
  return settled
    .flatMap((result) => (result.status === "fulfilled" ? [result.value] : []))
    .sort((left, right) => bestScore(right) - bestScore(left));
}
