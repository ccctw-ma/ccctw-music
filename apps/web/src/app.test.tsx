import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  search: vi.fn(),
  playableUrl: vi.fn(),
  lyric: vi.fn(),
}));

const directMocks = vi.hoisted(() => ({
  resolveDirectPlayableUrl: vi.fn(),
}));

vi.mock("@ccctw-music/api-client", () => ({
  createMusicApiClient: () => ({
    search: apiMocks.search,
    playableUrl: apiMocks.playableUrl,
    lyric: apiMocks.lyric,
  }),
}));

vi.mock("./lib/direct-music-search", () => ({
  resolveDirectPlayableUrl: directMocks.resolveDirectPlayableUrl,
}));

const { App } = await import("./app");
const { usePlayerStore, songKey } = await import("./stores/player-store");

const mediaMocks = {
  play: vi.fn(),
  pause: vi.fn(),
  load: vi.fn(),
};

const quality = {
  sourceLabel: "咪咕音乐",
  official: true,
  free: true,
  playable: true,
  quality: "standard" as const,
  score: 81,
  badges: ["正版", "免费可播", "标准音质"],
};

const songs = [
  {
    id: "1",
    source: "migu" as const,
    name: "晴天",
    artists: [{ name: "周杰伦" }],
    coverUrl: null,
    duration: 120,
    quality,
  },
  {
    id: "2",
    source: "netease" as const,
    name: "夜曲",
    artists: [{ name: "周杰伦" }],
    coverUrl: null,
    duration: 150,
    quality: { ...quality, sourceLabel: "网易云音乐", free: false, playable: false, score: 56 },
  },
];
const qqSong = {
  id: "3",
  source: "qq" as const,
  name: "稻香",
  artists: [{ name: "周杰伦" }],
  coverUrl: null,
  duration: 180,
  quality: { ...quality, sourceLabel: "QQ 音乐", free: false, playable: false, score: 58 },
};

beforeEach(() => {
  localStorage.clear();
  usePlayerStore.setState(usePlayerStore.getInitialState(), true);
  directMocks.resolveDirectPlayableUrl.mockResolvedValue(null);
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
  directMocks.resolveDirectPlayableUrl.mockReset();
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
  it("renders a lean search/results/player layout without the removed right-side modules", async () => {
    renderApp();

    await screen.findByRole("button", { name: /播放 晴天/ });
    expect(screen.queryByText("精选")).toBeNull();
    expect(screen.queryByText("播客")).toBeNull();
    expect(screen.queryByText("新歌速递")).toBeNull();
    expect(screen.queryByRole("region", { name: "Library" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Queue" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Lyrics" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Player" })).toBeNull();
    expect(screen.getByRole("search", { name: "音乐搜索" })).not.toBeNull();
    expect(screen.getByRole("region", { name: "Search" })).not.toBeNull();
    expect(screen.getByLabelText("底部播放器")).not.toBeNull();
    expect(screen.getByTestId("ui-style-root")).not.toBeNull();
  });

  it("renders active controls through local shadcn-style primitives", async () => {
    renderApp();

    expect(await screen.findByTestId("shadcn-button:primary-play")).not.toBeNull();
    expect(screen.getByTestId("shadcn-input:music-search")).toBe(
      screen.getByRole("searchbox", { name: "搜索歌曲、歌手或专辑" }),
    );
    expect(screen.getAllByTestId(/shadcn-card:/).length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByTestId(/shadcn-button:/).length).toBeGreaterThanOrEqual(6);
  });

  it("shows normalized source and quality badges", async () => {
    renderApp();

    await screen.findByRole("button", { name: /播放 晴天/ });
    expect(screen.getAllByText("正版").length).toBeGreaterThan(0);
    expect(screen.getAllByText("免费可播").length).toBeGreaterThan(0);
    expect(screen.getAllByText("标准音质").length).toBeGreaterThan(0);
    expect(screen.getAllByText((content) => content.includes("咪咕音乐")).length).toBeGreaterThan(0);
  });

  it("searches through the API with all configured sources", async () => {
    apiMocks.search.mockResolvedValueOnce([
      { source: "migu", total: 1, songs: [songs[0]] },
      {
        source: "itunes",
        total: 1,
        songs: [{ ...qqSong, source: "itunes", id: "it1", quality: { ...quality, sourceLabel: "iTunes" } }],
      },
    ]);

    renderApp();

    expect((await screen.findAllByRole("button", { name: /播放 晴天/ })).length).toBeGreaterThan(0);
    expect(apiMocks.search).toHaveBeenCalledWith({
      keyword: "周杰伦",
      sources: ["migu", "netease", "qq", "itunes", "deezer"],
    });
  });

  it("keeps all API source groups in the result list", async () => {
    apiMocks.search.mockResolvedValueOnce([
      { source: "migu", total: 1, songs: [{ ...songs[0], coverUrl: "migu.jpg" }] },
      { source: "qq", total: 1, songs: [{ ...qqSong, coverUrl: "qq.jpg" }] },
      { source: "netease", total: 1, songs: [{ ...songs[1], coverUrl: "net.jpg" }] },
    ]);

    renderApp();

    expect(await screen.findByRole("button", { name: /播放 稻香/ })).not.toBeNull();
    expect(apiMocks.search).toHaveBeenCalledWith({
      keyword: "周杰伦",
      sources: ["migu", "netease", "qq", "itunes", "deezer"],
    });
  });

  it("puts likely playable netease songs before non-playable qq songs", async () => {
    apiMocks.search.mockResolvedValueOnce([
      { source: "qq", total: 1, songs: [qqSong] },
      { source: "netease", total: 1, songs: [{ ...songs[1], coverUrl: "net.jpg" }] },
    ]);

    renderApp();

    const buttons = await screen.findAllByRole("button", { name: /播放 / });
    expect(buttons[0].textContent).toContain("夜曲");
    expect(apiMocks.search).toHaveBeenCalledWith({
      keyword: "周杰伦",
      sources: ["migu", "netease", "qq", "itunes", "deezer"],
    });
  });

  it("renders API-enriched netease covers", async () => {
    apiMocks.search.mockResolvedValueOnce([
      { source: "netease", total: 1, songs: [{ ...songs[1], coverUrl: "https://p1.music.126.net/net.jpg" }] },
    ]);

    renderApp();

    await waitFor(() => {
      expect(
        screen
          .getAllByRole("presentation")
          .some((image) => image.getAttribute("src") === "https://p1.music.126.net/net.jpg"),
      ).toBe(true);
    });
    expect(apiMocks.search).toHaveBeenCalledWith({
      keyword: "周杰伦",
      sources: ["migu", "netease", "qq", "itunes", "deezer"],
    });
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
      expect(apiMocks.search).toHaveBeenLastCalledWith({
        keyword: "不存在",
        sources: ["migu", "netease", "qq", "itunes", "deezer"],
      });
    });
    expect(await screen.findByText("没找到结果")).not.toBeNull();
  });

  it("shows a search error when the API search fails", async () => {
    apiMocks.search.mockRejectedValueOnce(new Error("search down"));

    renderApp();

    expect(await screen.findByText("搜索暂时不可用，请稍后再试。")).not.toBeNull();
  });

  it("selects a song and controls playback from the bottom player", async () => {
    await selectFirstSong();

    expect(mediaMocks.play).toHaveBeenCalled();
    expect(screen.getByTestId("audio-player")).toHaveProperty("src", "https://cdn.example.com/qingtian.mp3");
    expect(screen.getAllByRole("button", { name: /暂停/ })[0]).not.toHaveProperty("disabled", true);
    expect(apiMocks.lyric).not.toHaveBeenCalled();

    await userEvent.click(screen.getAllByRole("button", { name: /暂停/ })[0]);
    expect(mediaMocks.pause).toHaveBeenCalled();
  });

  it("opens an immersive detail page from the currently playing cover", async () => {
    await selectFirstSong();

    await userEvent.click(screen.getByRole("button", { name: "打开正在播放详情" }));

    expect(screen.getByRole("region", { name: "歌曲详情页" })).not.toBeNull();
    expect(await screen.findByText("第一句")).not.toBeNull();
    expect(apiMocks.lyric).toHaveBeenCalledWith("migu", "1");
    expect(screen.getByRole("heading", { name: "各平台热门评论" })).not.toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "关闭正在播放详情" }));

    expect(screen.queryByRole("region", { name: "歌曲详情页" })).toBeNull();
  });

  it("shows detail fallback copy when lyrics are empty", async () => {
    apiMocks.lyric.mockResolvedValueOnce({ type: 1, raw: "", lines: [] });
    await selectFirstSong();

    await userEvent.click(screen.getByRole("button", { name: "打开正在播放详情" }));

    expect(await screen.findByText("沉浸播放中")).not.toBeNull();
    expect(screen.getByText("下滑查看各平台热门评论")).not.toBeNull();
  });

  it("shows detail lyric errors when lyric loading fails", async () => {
    apiMocks.lyric.mockRejectedValueOnce(new Error("lyric down"));
    await selectFirstSong();

    await userEvent.click(screen.getByRole("button", { name: "打开正在播放详情" }));

    expect(await screen.findByText("歌词暂时加载失败。")).not.toBeNull();
  });

  it("favorites a song from the compact controls", async () => {
    await selectFirstSong();

    await userEvent.click(screen.getAllByRole("button", { name: "收藏 晴天" })[0]);
    expect(usePlayerStore.getState().isFavorite(songs[0])).toBe(true);
    expect(screen.getAllByRole("button", { name: "取消收藏 晴天" })[0]).not.toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /我的喜欢/ }));
    expect(screen.getByRole("heading", { name: "我的喜欢" })).not.toBeNull();
    expect(screen.getAllByText("晴天").length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole("button", { name: /播放 晴天/ }));
    expect(apiMocks.playableUrl).toHaveBeenCalledWith("migu", "1");
  });

  it("shows empty states for favorites and playlist views", async () => {
    renderApp();

    await userEvent.click(screen.getByRole("button", { name: "我的喜欢" }));
    expect(screen.getByRole("heading", { name: "我的喜欢" })).not.toBeNull();
    expect(screen.getByText("暂无收藏")).not.toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "播放列表" }));
    expect(screen.getByRole("heading", { name: "播放列表" })).not.toBeNull();
    expect(screen.getByText("暂无播放列表")).not.toBeNull();
  });

  it("shows and edits the current playlist from the rail", async () => {
    await selectFirstSong();

    await userEvent.click(screen.getByRole("button", { name: /播放列表/ }));

    expect(screen.getByRole("heading", { name: "播放列表" })).not.toBeNull();
    expect(screen.getAllByText("夜曲").length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole("button", { name: "从播放列表移除 夜曲" }));

    expect(screen.queryByRole("button", { name: "从播放列表移除 夜曲" })).toBeNull();
    expect(usePlayerStore.getState().queue.map((song) => song.id)).toEqual(["1"]);
  });

  it("returns to the discover search view from library navigation", async () => {
    await selectFirstSong();

    await userEvent.click(screen.getByRole("button", { name: /播放列表/ }));
    expect(screen.getByRole("heading", { name: "播放列表" })).not.toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "推荐" }));
    expect(screen.getByRole("heading", { name: "搜索结果" })).not.toBeNull();
  });

  it("moves to next and previous songs from the bottom player", async () => {
    await selectFirstSong();

    await userEvent.click(screen.getByRole("button", { name: "底部切下一曲" }));
    expect(screen.getAllByText("夜曲")[0]).not.toBeNull();
    expect(usePlayerStore.getState().current?.id).toBe("2");

    await userEvent.click(screen.getByRole("button", { name: "底部切上一曲" }));
    expect(usePlayerStore.getState().current?.id).toBe("1");
  });

  it("advances to the next queued song when audio ends", async () => {
    await selectFirstSong();

    fireEvent.ended(screen.getByTestId("audio-player"));

    await waitFor(() => expect(usePlayerStore.getState().current?.id).toBe("2"));
  });

  it("shows recoverable playback errors", async () => {
    mediaMocks.play.mockRejectedValue(new Error("blocked"));

    await selectFirstSong();

    expect(await screen.findByText("当前搜索结果暂时没有可播放音源，已尝试前端直连和服务端兜底。")).not.toBeNull();
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

  it("falls back to Cloudflare playable url when direct frontend playback fails", async () => {
    apiMocks.search.mockResolvedValue([
      {
        source: "migu",
        total: 1,
        songs: [{ ...songs[0], playableUrl: "https://cdn.example.com/direct-fail.mp3" }],
      },
    ]);
    mediaMocks.play.mockRejectedValueOnce(new Error("direct failed")).mockResolvedValueOnce(undefined);
    apiMocks.playableUrl.mockResolvedValueOnce({ source: "migu", url: "https://cdn.example.com/server.mp3" });

    renderApp();
    await userEvent.click(await screen.findByRole("button", { name: /播放 晴天/ }));

    expect(apiMocks.playableUrl).toHaveBeenCalledWith("migu", "1");
    expect(screen.getByTestId("audio-player")).toHaveProperty("src", "https://cdn.example.com/server.mp3");
  });

  it("uses browser playable resolver before Cloudflare url fallback", async () => {
    apiMocks.search.mockResolvedValueOnce([{ source: "netease", total: 1, songs: [songs[1]] }]);
    directMocks.resolveDirectPlayableUrl.mockResolvedValueOnce("https://music.3e0.cn/?server=netease&type=url&id=2");

    renderApp();
    await userEvent.click(await screen.findByRole("button", { name: /播放 夜曲/ }));

    expect(directMocks.resolveDirectPlayableUrl).toHaveBeenCalledWith(
      expect.objectContaining({ source: "netease", id: "2" }),
    );
    expect(apiMocks.playableUrl).not.toHaveBeenCalled();
    expect(screen.getByTestId("audio-player")).toHaveProperty(
      "src",
      "https://music.3e0.cn/?server=netease&type=url&id=2",
    );
  });

  it("falls back to Cloudflare when browser playable resolver throws", async () => {
    apiMocks.search.mockResolvedValueOnce([{ source: "netease", total: 1, songs: [songs[1]] }]);
    directMocks.resolveDirectPlayableUrl.mockRejectedValueOnce(new Error("resolver down"));
    apiMocks.playableUrl.mockResolvedValueOnce({
      source: "netease",
      url: "https://cdn.example.com/server-netease.mp3",
    });

    renderApp();
    await userEvent.click(await screen.findByRole("button", { name: /播放 夜曲/ }));

    expect(apiMocks.playableUrl).toHaveBeenCalledWith("netease", "2");
    expect(screen.getByTestId("audio-player")).toHaveProperty("src", "https://cdn.example.com/server-netease.mp3");
  });

  it("skips unavailable search results and plays the next playable song", async () => {
    apiMocks.playableUrl
      .mockResolvedValueOnce({ source: "migu", url: null })
      .mockResolvedValueOnce({ source: "netease", url: "https://cdn.example.com/yequ.mp3" });

    renderApp();
    await userEvent.click(await screen.findByRole("button", { name: /播放 晴天/ }));

    expect(apiMocks.playableUrl).toHaveBeenCalledWith("migu", "1");
    expect(apiMocks.playableUrl).toHaveBeenCalledWith("netease", "2");
    expect(screen.getByTestId("audio-player")).toHaveProperty("src", "https://cdn.example.com/yequ.mp3");
    expect(usePlayerStore.getState().current?.id).toBe("2");
  });

  it("handles unavailable playable urls, audio element errors, and disabled playback", async () => {
    apiMocks.search.mockResolvedValue([
      {
        source: "migu",
        total: 1,
        songs: [{ id: "3", source: "migu", name: "静音曲", artists: [], coverUrl: null, quality }],
      },
    ]);
    apiMocks.playableUrl
      .mockResolvedValueOnce({ source: "migu", url: null })
      .mockResolvedValueOnce({ source: "migu", url: "https://cdn.example.com/silent.mp3" });
    renderApp();
    expect(screen.getByRole("button", { name: /^播放$/ })).toHaveProperty("disabled", true);

    await userEvent.click(await screen.findByRole("button", { name: /播放 静音曲/ }));
    expect(await screen.findByText("当前搜索结果暂时没有可播放音源，已尝试前端直连和服务端兜底。")).not.toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /播放 静音曲/ }));
    fireEvent.error(screen.getByTestId("audio-player"));
    expect(await screen.findByText("音频资源无法读取，已停止播放。")).not.toBeNull();
  });

  it("does not show an audio error before a source has been loaded", () => {
    renderApp();

    fireEvent.error(screen.getByTestId("audio-player"));

    expect(screen.queryByText("音频资源无法读取，已停止播放。")).toBeNull();
  });

  it("renders decorative album art with stable image dimensions", async () => {
    renderApp();

    const coverImages = await screen.findAllByRole("presentation");

    expect(coverImages.length).toBeGreaterThanOrEqual(2);
    for (const image of coverImages) {
      expect(image.getAttribute("width")).not.toBeNull();
      expect(image.getAttribute("height")).not.toBeNull();
      expect(image.getAttribute("src")).not.toBe("/favicon.svg");
    }
  });

  it("falls back to generated album art when upstream cover images fail", async () => {
    renderApp();
    usePlayerStore.getState().setCurrent({
      ...songs[0],
      name: "晴天 & 夜曲",
      coverUrl: "https://cdn.example.com/broken-cover.jpg",
    });

    await waitFor(() => {
      expect(
        screen.getAllByRole("presentation").some((image) => image.getAttribute("src")?.includes("broken-cover")),
      ).toBe(true);
    });
    const brokenCover = screen
      .getAllByRole("presentation")
      .find((image) => image.getAttribute("src")?.includes("broken-cover")) as HTMLImageElement;

    fireEvent.error(brokenCover);

    expect(brokenCover.getAttribute("src")).toContain("data:image/svg+xml");
  });

  it("seeks playback from the draggable progress slider", async () => {
    await selectFirstSong();

    fireEvent.change(screen.getByTestId("shadcn-slider:mini-progress"), { target: { value: "42" } });

    expect(usePlayerStore.getState().currentTime).toBe(42);
  });

  it("ignores progress seek before duration metadata is available", () => {
    renderApp();

    fireEvent.change(screen.getByTestId("shadcn-slider:mini-progress"), { target: { value: "42" } });

    expect(usePlayerStore.getState().currentTime).toBe(0);
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

    await userEvent.click(screen.getByRole("button", { name: /^播放$/ }));

    await waitFor(() => expect(apiMocks.playableUrl).toHaveBeenCalledWith("migu", "1"));
  });

  it("keeps rendering legacy persisted songs without quality metadata", async () => {
    renderApp();
    usePlayerStore.getState().setCurrent({
      id: "legacy",
      source: "other",
      name: "Legacy",
      artists: [{ name: "Old" }],
      duration: 90,
    } as never);

    await waitFor(() => expect(screen.getAllByRole("heading", { name: "Legacy" }).length).toBeGreaterThan(0));
    expect(screen.getAllByText((content) => content.includes("other")).length).toBeGreaterThan(0);
  });
});
