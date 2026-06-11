import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  search: vi.fn(),
  playableUrl: vi.fn(),
  lyric: vi.fn(),
}));

vi.mock("@ccctw-music/api-client", () => ({
  createMusicApiClient: () => ({
    search: apiMocks.search,
    playableUrl: apiMocks.playableUrl,
    lyric: apiMocks.lyric,
  }),
}));

const { App } = await import("./app");
const { usePlayerStore, songKey } = await import("./stores/player-store");

const mediaMocks = {
  play: vi.fn(),
  pause: vi.fn(),
  load: vi.fn(),
};

const songs = [
  {
    id: "1",
    source: "migu" as const,
    name: "晴天",
    artists: [{ name: "周杰伦" }],
    coverUrl: null,
    duration: 120,
  },
  {
    id: "2",
    source: "netease" as const,
    name: "夜曲",
    artists: [{ name: "周杰伦" }],
    coverUrl: null,
    duration: 150,
  },
];

beforeEach(() => {
  localStorage.clear();
  usePlayerStore.setState(usePlayerStore.getInitialState(), true);
  apiMocks.search.mockResolvedValue([{ source: "migu", total: songs.length, songs }]);
  apiMocks.playableUrl.mockResolvedValue({ source: "migu", url: "https://cdn.example.com/qingtian.mp3" });
  apiMocks.lyric.mockResolvedValue({
    type: 2,
    raw: "[00:01.00]第一句\n[00:45.00]副歌来了",
    lines: [
      { id: "l1", sentence: "第一句", timeStamp: 1 },
      { id: "l2", sentence: "副歌来了", timeStamp: 45 },
    ],
  });
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
  usePlayerStore.setState(usePlayerStore.getInitialState(), true);
  apiMocks.search.mockReset();
  apiMocks.playableUrl.mockReset();
  apiMocks.lyric.mockReset();
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

async function selectFirstSong() {
  renderApp();
  const songButton = await screen.findByRole("button", { name: /播放 晴天/ });
  await userEvent.click(songButton);
  await waitFor(() => expect(apiMocks.playableUrl).toHaveBeenCalledWith("migu", "1"));
  return songButton;
}

describe("App", () => {
  it("renders browse lanes, search, library, queue, lyrics, and player regions", async () => {
    renderApp();

    expect(await screen.findByText("新歌速递")).not.toBeNull();
    expect(screen.getByText("华语夜航")).not.toBeNull();
    expect(screen.getByText("城市电子")).not.toBeNull();
    expect(screen.getByText("复古浪漫")).not.toBeNull();
    expect(screen.getByRole("search", { name: "音乐搜索" })).not.toBeNull();
    expect(screen.getByRole("region", { name: "Library" })).not.toBeNull();
    expect(screen.getByRole("region", { name: "Queue" })).not.toBeNull();
    expect(screen.getByRole("region", { name: "Lyrics" })).not.toBeNull();
    expect(screen.getByTestId("ui-style-root")).not.toBeNull();
  });

  it("renders active controls through local shadcn-style primitives", async () => {
    renderApp();

    expect(await screen.findByTestId("shadcn-button:primary-play")).not.toBeNull();
    expect(screen.getByTestId("shadcn-input:music-search")).toBe(
      screen.getByRole("searchbox", { name: "搜索歌曲、歌手或专辑" }),
    );
    expect(screen.getAllByTestId(/shadcn-card:/).length).toBeGreaterThanOrEqual(8);
    expect(screen.getAllByTestId(/shadcn-button:/).length).toBeGreaterThanOrEqual(6);
  });

  it("submits new keyword from an accessible search field and shows loading and empty states", async () => {
    let resolveSecondSearch: (value: []) => void = () => {};
    apiMocks.search.mockResolvedValueOnce([{ source: "migu", total: songs.length, songs }]).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSecondSearch = resolve;
      }),
    );
    renderApp();

    const searchField = screen.getByRole("searchbox", { name: "搜索歌曲、歌手或专辑" });
    expect(searchField.getAttribute("type")).toBe("search");
    expect(searchField.getAttribute("name")).toBe("keyword");
    expect(searchField.getAttribute("autocomplete")).toBe("off");
    expect(searchField.getAttribute("placeholder")).toBe("搜索歌曲、歌手或专辑…");

    await userEvent.clear(searchField);
    await userEvent.type(searchField, "不存在");
    await userEvent.click(screen.getByRole("button", { name: "搜索" }));

    expect((await screen.findByRole("button", { name: "搜索中…" })).hasAttribute("disabled")).toBe(true);
    resolveSecondSearch([]);

    await waitFor(() => {
      expect(apiMocks.search).toHaveBeenLastCalledWith({ keyword: "不存在", sources: ["migu", "netease", "qq"] });
    });
    expect(await screen.findByText("没找到结果")).not.toBeNull();
  });

  it("selects a song, loads lyrics, and controls playback", async () => {
    await selectFirstSong();

    expect(mediaMocks.play).toHaveBeenCalled();
    expect(screen.getByTestId("audio-player")).toHaveProperty("src", "https://cdn.example.com/qingtian.mp3");
    expect(screen.getAllByRole("button", { name: /暂停/ })[0]).not.toHaveProperty("disabled", true);
    expect(await screen.findByText("第一句")).not.toBeNull();
    expect(apiMocks.lyric).toHaveBeenCalledWith("migu", "1");

    await userEvent.click(screen.getAllByRole("button", { name: /暂停/ })[0]);
    expect(mediaMocks.pause).toHaveBeenCalled();
  });

  it("favorites a song and adds it to Studio Mix", async () => {
    await selectFirstSong();

    await userEvent.click(screen.getAllByRole("button", { name: "收藏 晴天" })[0]);
    expect(within(screen.getByRole("region", { name: "Favorites" })).getByText("晴天")).not.toBeNull();

    await userEvent.click(screen.getAllByRole("button", { name: "加入 Studio Mix 晴天" })[0]);
    const playlist = screen.getByRole("region", { name: "Studio Mix" });
    expect(within(playlist).getByText("晴天")).not.toBeNull();
  });

  it("shows queue and moves to next and previous songs", async () => {
    await selectFirstSong();

    const queue = screen.getByRole("region", { name: "Queue" });
    expect(within(queue).getByText("晴天")).not.toBeNull();
    expect(within(queue).getByText("夜曲")).not.toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "下一首" }));
    expect(screen.getAllByText("夜曲")[0]).not.toBeNull();
    expect(usePlayerStore.getState().current?.id).toBe("2");

    await userEvent.click(screen.getByRole("button", { name: "上一首" }));
    expect(usePlayerStore.getState().current?.id).toBe("1");
  });

  it("highlights timed lyrics after an audio time update", async () => {
    await selectFirstSong();
    const audio = screen.getByTestId("audio-player");
    Object.defineProperty(audio, "currentTime", { configurable: true, value: 46 });
    Object.defineProperty(audio, "duration", { configurable: true, value: 120 });

    fireEvent.timeUpdate(audio);

    expect(screen.getByText("副歌来了").closest("li")?.className).toContain("active");
  });

  it("shows recoverable playback and lyric errors", async () => {
    mediaMocks.play.mockRejectedValue(new Error("blocked"));
    apiMocks.lyric.mockRejectedValue(new Error("lyric down"));

    await selectFirstSong();

    expect(await screen.findByText("播放加载失败，可能是音源失效或网络不可用。")).not.toBeNull();
    expect(await screen.findByText("歌词暂时加载失败。")).not.toBeNull();
  });

  it("does not request url endpoint when a song already has a playable url", async () => {
    apiMocks.search.mockResolvedValue([
      {
        source: "migu",
        total: 1,
        songs: [{ ...songs[0], playableUrl: "https://cdn.example.com/local.mp3" }],
      },
    ]);

    renderApp();
    await userEvent.click(await screen.findByRole("button", { name: /播放 晴天/ }));

    expect(apiMocks.playableUrl).not.toHaveBeenCalled();
    expect(screen.getByTestId("audio-player")).toHaveProperty("src", "https://cdn.example.com/local.mp3");
    expect(usePlayerStore.getState().queue.map(songKey)).toEqual(["migu:1"]);
  });

  it("handles unavailable playable urls, audio element errors, empty lyric responses, and disabled playback", async () => {
    apiMocks.search.mockResolvedValue([
      {
        source: "migu",
        total: 1,
        songs: [{ id: "3", source: "migu", name: "静音曲", artists: [], coverUrl: null }],
      },
    ]);
    apiMocks.playableUrl
      .mockResolvedValueOnce({ source: "migu", url: null })
      .mockResolvedValueOnce({ source: "migu", url: "https://cdn.example.com/silent.mp3" });
    apiMocks.lyric.mockResolvedValue({ type: 1, lines: [] });

    renderApp();
    expect(screen.getAllByRole("button", { name: /播放/ })[0]).toHaveProperty("disabled", true);

    await userEvent.click(await screen.findByRole("button", { name: /播放 静音曲/ }));
    expect(await screen.findByText("当前音源暂时无法播放，换一首试试。")).not.toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /播放 静音曲/ }));
    fireEvent.error(screen.getByTestId("audio-player"));
    expect(await screen.findByText("音频资源无法读取，已停止播放。")).not.toBeNull();
    expect(await screen.findByText("暂无歌词，先选择一首歌。")).not.toBeNull();
  });

  it("plays from recent, queue, favorites, and playlist panels and changes volume", async () => {
    await selectFirstSong();

    fireEvent.change(screen.getByLabelText("音量"), { target: { value: "0.35" } });
    expect(usePlayerStore.getState().volume).toBe(0.35);

    await userEvent.click(screen.getAllByRole("button", { name: "收藏 晴天" })[0]);
    await userEvent.click(screen.getAllByRole("button", { name: "加入 Studio Mix 晴天" })[0]);

    await userEvent.click(
      within(screen.getByRole("region", { name: "Library" })).getByRole("button", { name: "晴天" }),
    );
    await userEvent.click(
      within(screen.getByRole("region", { name: "Queue" })).getByRole("button", { name: "移出队列 夜曲" }),
    );
    expect(usePlayerStore.getState().queue.map(songKey)).toEqual(["migu:1"]);

    await userEvent.click(
      within(screen.getByRole("region", { name: "Favorites" })).getByRole("button", { name: "晴天" }),
    );
    await userEvent.click(
      within(screen.getByRole("region", { name: "Studio Mix" })).getByRole("button", { name: "晴天" }),
    );
  });

  it("renders decorative album art with stable image dimensions", async () => {
    renderApp();

    const coverImages = await screen.findAllByRole("presentation");

    expect(coverImages.length).toBeGreaterThanOrEqual(3);
    for (const image of coverImages) {
      expect(image.getAttribute("width")).not.toBeNull();
      expect(image.getAttribute("height")).not.toBeNull();
    }
  });

  it("gives the compact mini player an accessible play label", async () => {
    renderApp();
    usePlayerStore.getState().setCurrent(songs[0]);

    expect(screen.getByRole("button", { name: "迷你播放器播放" })).not.toBeNull();
  });

  it("keeps song-row actions as sibling buttons instead of invalid nested controls", async () => {
    renderApp();

    const firstSongRow = await screen.findByRole("button", { name: /播放 晴天/ });

    expect(firstSongRow.querySelector("button")).toBeNull();
  });

  it("starts current song from play control when the audio element has no source", async () => {
    renderApp();
    usePlayerStore.getState().setCurrent(songs[0]);

    await userEvent.click(screen.getAllByRole("button", { name: /播放/ })[0]);

    await waitFor(() => expect(apiMocks.playableUrl).toHaveBeenCalledWith("migu", "1"));
  });
});
