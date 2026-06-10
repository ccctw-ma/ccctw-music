import type { ProviderContext } from "@ccctw-music/music-providers";
import type { Env } from "./env";

export function createProviderContext(env: Env): ProviderContext {
  return {
    fetch,
    cache: env.MUSIC_CACHE
      ? {
          async get<T>(key: string) {
            const value = await env.MUSIC_CACHE?.get(key);
            return value ? (JSON.parse(value) as T) : null;
          },
          async set<T>(key: string, value: T, ttlSeconds = 600) {
            await env.MUSIC_CACHE?.put(key, JSON.stringify(value), {
              expirationTtl: ttlSeconds,
            });
          },
        }
      : undefined,
  };
}
