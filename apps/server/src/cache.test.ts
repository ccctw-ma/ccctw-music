import { describe, expect, it, vi } from "vitest";
import { createProviderContext } from "./cache";

describe("createProviderContext", () => {
  it("serializes cache values through KV", async () => {
    const kv = {
      get: vi.fn().mockResolvedValue(JSON.stringify({ value: 1 })),
      put: vi.fn().mockResolvedValue(undefined),
    };
    const context = createProviderContext({ APP_ENV: "test", MUSIC_CACHE: kv as unknown as KVNamespace });

    await expect(context.cache?.get("key")).resolves.toEqual({ value: 1 });
    await context.cache?.set("key", { value: 2 }, 30);

    expect(kv.put).toHaveBeenCalledWith("key", JSON.stringify({ value: 2 }), { expirationTtl: 30 });
  });

  it("returns null for cache miss and supports no KV binding", async () => {
    const kv = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn(),
    };
    const context = createProviderContext({ APP_ENV: "test", MUSIC_CACHE: kv as unknown as KVNamespace });

    await expect(context.cache?.get("missing")).resolves.toBeNull();
    expect(createProviderContext({ APP_ENV: "test" }).cache).toBeUndefined();
  });
});
