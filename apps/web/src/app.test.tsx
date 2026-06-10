import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  search: vi.fn(),
}));

vi.mock("@ccctw-music/api-client", () => ({
  createMusicApiClient: () => ({
    search: apiMocks.search,
  }),
}));

const { App } = await import("./app");
const { usePlayerStore } = await import("./stores/player-store");

afterEach(() => {
  cleanup();
  localStorage.clear();
  usePlayerStore.setState({ current: undefined, isPlaying: false });
  apiMocks.search.mockReset();
});

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

describe("App", () => {
  it("renders search results and selects a song", async () => {
    apiMocks.search.mockResolvedValue([
      {
        source: "migu",
        total: 1,
        songs: [
          {
            id: "1",
            source: "migu",
            name: "晴天",
            artists: [{ name: "周杰伦" }],
            coverUrl: null,
          },
        ],
      },
    ]);

    renderApp();

    expect(await screen.findByText("晴天")).not.toBeNull();
    await userEvent.click(screen.getByText("晴天"));

    expect(screen.getByRole("button", { name: "暂停" })).not.toHaveProperty("disabled", true);
    expect(screen.getAllByText("周杰伦")[0]).not.toBeNull();
  });

  it("submits new keyword and shows empty state", async () => {
    apiMocks.search.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    renderApp();

    await userEvent.clear(screen.getByPlaceholderText("搜索歌曲、歌手或专辑"));
    await userEvent.type(screen.getByPlaceholderText("搜索歌曲、歌手或专辑"), "不存在");
    await userEvent.click(screen.getByRole("button", { name: "搜索" }));

    await waitFor(() => {
      expect(apiMocks.search).toHaveBeenLastCalledWith({ keyword: "不存在", sources: ["migu", "netease", "qq"] });
    });
    expect(await screen.findByText("暂无搜索结果")).not.toBeNull();
  });
});
