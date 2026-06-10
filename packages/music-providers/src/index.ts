import type { MusicSource, SearchInput, SearchResult } from "@ccctw-music/core";
import { miguProvider } from "./migu";
import { neteaseProvider } from "./netease";
import { qqProvider } from "./qq";
import type { MusicProvider, ProviderContext } from "./types";

export * from "./types";

export const providers = {
  migu: miguProvider,
  netease: neteaseProvider,
  qq: qqProvider,
} satisfies Partial<Record<MusicSource, MusicProvider>>;

export function getProvider(source: MusicSource): MusicProvider | undefined {
  return providers[source as keyof typeof providers];
}

export async function searchAcrossProviders(input: SearchInput, context: ProviderContext): Promise<SearchResult[]> {
  const sources: MusicSource[] = input.sources?.length ? input.sources : ["migu", "netease", "qq"];
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
  return settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}
