import { describe, expect, it, vi } from "vitest";
import { createMusicApiClient } from "./index";

describe("createMusicApiClient", () => {
  it("searches with default paging and source params", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ source: "migu", total: 0, songs: [] }] }),
    });
    const client = createMusicApiClient({ baseUrl: "https://api.example.com/", fetcher });

    await expect(client.search({ keyword: "hello" })).resolves.toEqual([{ source: "migu", total: 0, songs: [] }]);

    const url = new URL(fetcher.mock.calls[0][0]);
    expect(url.origin).toBe("https://api.example.com");
    expect(url.pathname).toBe("/v1/search");
    expect(url.searchParams.get("keyword")).toBe("hello");
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("sources")).toBe("migu,netease,qq");
  });

  it("throws when search response is not ok", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Server Error",
    });
    const client = createMusicApiClient({ baseUrl: "https://api.example.com", fetcher });

    await expect(client.search({ keyword: "bad" })).rejects.toThrow("Search failed: 500 Server Error");
  });
});
