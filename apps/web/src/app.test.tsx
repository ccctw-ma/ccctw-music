import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  search: vi.fn(),
  playableUrl: vi.fn(),
}));

vi.mock("@ccctw-music/api-client", () => ({
  createMusicApiClient: () => ({
    search: apiMocks.search,
    playableUrl: apiMocks.playableUrl,
  }),
}));

const { App } = await import("./app");
const { usePlayerStore } = await import("./stores/player-store");

const mediaMocks = {
  play: vi.fn(),
  pause: vi.fn(),
  load: vi.fn(),
};

beforeEach(() => {
  localStorage.clear();
  usePlayerStore.setState({ current: undefined, isPlaying: false });
  mediaMocks.play.mockResolvedValue(undefined);
  Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: mediaMocks.play,
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: mediaMocks.pause,
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, "load", {
    configurable: true,
    value: mediaMocks.load,
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  usePlayerStore.setState({ current: undefined, isPlaying: false });
  apiMocks.search.mockReset();
  apiMocks.playableUrl.mockReset();
  mediaMocks.play.mockReset();
  mediaMocks.pause.mockReset();
  mediaMocks.load.mockReset();
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
    apiMocks.playableUrl.mockResolvedValue({
      source: "migu",
      url: "https://cdn.example.com/qingtian.mp3",
    });

    renderApp();

    const songButton = await screen.findByRole("button", { name: /晴天/ });
    expect(songButton).not.toBeNull();
    await userEvent.click(songButton);

    await waitFor(() => {
      expect(apiMocks.playableUrl).toHaveBeenCalledWith("migu", "1");
    });
    expect(mediaMocks.play).toHaveBeenCalled();
    expect(screen.getAllByRole("button", { name: "暂停" })[0]).not.toHaveProperty("disabled", true);
    expect(screen.getAllByText("周杰伦")[0]).not.toBeNull();

    await userEvent.click(screen.getAllByRole("button", { name: "暂停" })[0]);
    expect(mediaMocks.pause).toHaveBeenCalled();

    await userEvent.click(screen.getAllByRole("button", { name: "播放" })[0]);
    expect(mediaMocks.play).toHaveBeenCalledTimes(2);
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
    expect(await screen.findByText("没找到结果")).not.toBeNull();
  });

  it("shows a clear error when selected song has no playable url", async () => {
    apiMocks.search.mockResolvedValue([
      {
        source: "migu",
        total: 1,
        songs: [{ id: "2", source: "migu", name: "不能播放", artists: [{ name: "测试歌手" }], coverUrl: null }],
      },
    ]);
    apiMocks.playableUrl.mockResolvedValue({ source: "migu", url: null });

    renderApp();

    await userEvent.click(await screen.findByRole("button", { name: /不能播放/ }));

    expect(await screen.findByText("当前音源暂时无法播放，换一首试试。")).not.toBeNull();
    expect(screen.getAllByRole("button", { name: "播放" })[0]).not.toHaveProperty("disabled", true);
  });

  it("uses a song-provided playable url without requesting the url endpoint", async () => {
    apiMocks.search.mockResolvedValue([
      {
        source: "migu",
        total: 1,
        songs: [
          {
            id: "3",
            source: "migu",
            name: "本地音源",
            artists: [{ name: "测试歌手" }],
            playableUrl: "https://cdn.example.com/local.mp3",
            coverUrl: null,
          },
        ],
      },
    ]);

    renderApp();

    await userEvent.click(await screen.findByRole("button", { name: /本地音源/ }));

    expect(apiMocks.playableUrl).not.toHaveBeenCalled();
    expect(screen.getByTestId("audio-player")).toHaveProperty("src", "https://cdn.example.com/local.mp3");
  });

  it("shows a recovery message when the browser refuses playback", async () => {
    mediaMocks.play.mockRejectedValue(new Error("blocked"));
    apiMocks.search.mockResolvedValue([
      {
        source: "migu",
        total: 1,
        songs: [{ id: "4", source: "migu", name: "播放失败", artists: [{ name: "测试歌手" }], coverUrl: null }],
      },
    ]);
    apiMocks.playableUrl.mockResolvedValue({ source: "migu", url: "https://cdn.example.com/fail.mp3" });

    renderApp();

    await userEvent.click(await screen.findByRole("button", { name: /播放失败/ }));

    expect(await screen.findByText("播放加载失败，可能是音源失效或网络不可用。")).not.toBeNull();
  });

  it("handles audio element errors after a url has been attached", async () => {
    apiMocks.search.mockResolvedValue([
      {
        source: "migu",
        total: 1,
        songs: [{ id: "5", source: "migu", name: "资源错误", artists: [{ name: "测试歌手" }], coverUrl: null }],
      },
    ]);
    apiMocks.playableUrl.mockResolvedValue({ source: "migu", url: "https://cdn.example.com/broken.mp3" });

    renderApp();

    await userEvent.click(await screen.findByRole("button", { name: /资源错误/ }));
    fireEvent.error(screen.getByTestId("audio-player"));

    expect(await screen.findByText("音频资源无法读取，已停止播放。")).not.toBeNull();
    expect(screen.getAllByRole("button", { name: "播放" })[0]).not.toHaveProperty("disabled", true);
  });
});
