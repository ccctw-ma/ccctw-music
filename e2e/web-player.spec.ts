import { expect, test, type Page } from "@playwright/test";

const playableAudioUrl = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=";
const quality = {
  sourceLabel: "咪咕音乐",
  official: true,
  free: true,
  playable: true,
  quality: "standard",
  score: 81,
  badges: ["正版", "免费可播", "标准音质"],
};

const fixtureSongs = [
  {
    id: "1",
    source: "migu",
    name: "晴天",
    artists: [{ name: "周杰伦" }],
    coverUrl: null,
    duration: 120,
    quality,
  },
  {
    id: "2",
    source: "netease",
    name: "夜曲",
    artists: [{ name: "周杰伦" }],
    coverUrl: null,
    duration: 150,
    quality: { ...quality, sourceLabel: "网易云音乐", free: false, playable: false, score: 56 },
  },
];

async function mockAudio(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value() {
        window.dispatchEvent(new Event("ccctw-audio-play"));
        return Promise.resolve();
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "pause", {
      configurable: true,
      value() {
        window.dispatchEvent(new Event("ccctw-audio-pause"));
      },
    });
  });
}

async function mockApi(page: Page) {
  let playableUrlRequested = false;

  await page.route(/https:\/\/m\.music\.migu\.cn\/migu\/remoting\/scr_search_tag.*/, (route) => route.abort());
  await page.route(/https:\/\/music\.163\.com\/api\/search\/get.*/, (route) => route.abort());
  await page.route(/https:\/\/c\.y\.qq\.com\/soso\/fcgi-bin\/client_search_cp.*/, (route) => route.abort());

  await page.route(/.*\/(?:api\/)?v1\/search.*/, async (route) => {
    const url = new URL(route.request().url());
    const keyword = url.searchParams.get("keyword") ?? "";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            source: "migu",
            total: keyword === "不存在" ? 0 : fixtureSongs.length,
            songs: keyword === "不存在" ? [] : fixtureSongs,
          },
        ],
      }),
    });
  });

  await page.route(/.*\/(?:api\/)?v1\/songs\/migu\/1\/url.*/, async (route) => {
    playableUrlRequested = true;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          source: "migu",
          url: playableAudioUrl,
          quality: "standard",
        },
      }),
    });
  });

  await page.route(/.*\/(?:api\/)?v1\/songs\/netease\/2\/url.*/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          source: "netease",
          url: playableAudioUrl,
          quality: "standard",
        },
      }),
    });
  });

  await page.route(/.*\/(?:api\/)?v1\/songs\/.+\/\d+\/lyric.*/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          type: 2,
          raw: "[00:01.00]第一句\n[00:45.00]副歌来了",
          lines: [
            { id: "l1", sentence: "第一句", timeStamp: 1 },
            { id: "l2", sentence: "副歌来了", timeStamp: 45 },
          ],
        },
      }),
    });
  });

  return {
    playableUrlRequested: () => playableUrlRequested,
  };
}

test("searches, organizes library, controls queue, and displays lyrics", async ({ page }) => {
  await mockAudio(page);
  const apiState = await mockApi(page);

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "我喜欢的音乐" })).toBeVisible();
  await expect(page.getByText("新歌速递")).toBeVisible();
  await expect(page.getByText("华语夜航")).toBeVisible();
  await expect(page.getByRole("region", { name: "Library" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Queue" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Lyrics" })).toBeVisible();

  await page.getByPlaceholder("搜索歌曲、歌手或专辑").fill("晴天");
  await page.getByRole("button", { name: "搜索" }).click();

  const songButton = page.getByRole("button", { name: /播放 晴天/ }).first();
  await expect(songButton).toBeVisible();
  await expect(page.getByText("正版").first()).toBeVisible();
  await expect(page.getByText("免费可播").first()).toBeVisible();
  await songButton.click();

  await expect.poll(apiState.playableUrlRequested).toBe(true);
  await expect(page.getByTestId("audio-player")).toHaveAttribute("src", playableAudioUrl);
  await expect(page.getByRole("button", { name: /暂停/ }).first()).toBeVisible();
  await expect(page.getByText("第一句")).toBeVisible();

  await page.getByRole("button", { name: "收藏 晴天" }).first().click();
  await expect(page.getByRole("region", { name: "Favorites" }).getByText("晴天")).toBeVisible();
  await expect(page.getByRole("button", { name: "取消收藏 晴天" }).first()).toBeVisible();

  await page.getByRole("button", { name: "加入 Studio Mix 晴天" }).first().click();
  await expect(page.getByRole("region", { name: "Studio Mix" }).getByText("晴天")).toBeVisible();

  await expect(page.getByRole("region", { name: "Queue" }).getByText("夜曲")).toBeVisible();
  await page.getByRole("button", { name: "下一首" }).click();
  await expect(page.getByRole("region", { name: "Player" }).getByRole("heading", { name: "夜曲" })).toBeVisible();
  await page.getByRole("button", { name: "上一首" }).click();
  await expect(page.getByRole("region", { name: "Player" }).getByRole("heading", { name: "晴天" })).toBeVisible();
  await page.getByRole("button", { name: "底部切下一曲" }).click();
  await expect(page.getByRole("region", { name: "Player" }).getByRole("heading", { name: "夜曲" })).toBeVisible();
  await page.getByRole("button", { name: "底部切上一曲" }).click();
  await expect(page.getByRole("region", { name: "Player" }).getByRole("heading", { name: "晴天" })).toBeVisible();

  await page.evaluate(() => {
    const audio = document.querySelector('[data-testid="audio-player"]') as HTMLAudioElement;
    Object.defineProperty(audio, "currentTime", { configurable: true, value: 46 });
    Object.defineProperty(audio, "duration", { configurable: true, value: 120 });
    audio.dispatchEvent(new Event("timeupdate", { bubbles: true }));
  });
  await expect(page.locator(".lyric-list li.active", { hasText: "副歌来了" })).toBeVisible();
  await expect(page.getByLabel(/0:46 \/ 2:00/)).toBeVisible();
  await expect(page.getByText("0:46").first()).toBeVisible();

  await page.getByRole("button", { name: "取消收藏 晴天" }).first().click();
  await expect(page.getByRole("button", { name: "收藏 晴天" }).first()).toBeVisible();
  await page.getByRole("button", { name: "移出队列 夜曲" }).click();
  await expect(page.getByRole("region", { name: "Queue" }).getByText("夜曲")).toHaveCount(0);

  await page.screenshot({ path: "test-results/music-experience.png", fullPage: true });
});

test("search empty state and controls remain usable", async ({ page }) => {
  await mockAudio(page);
  await mockApi(page);
  await page.goto("/");

  await page.getByPlaceholder("搜索歌曲、歌手或专辑").fill("不存在");
  await page.getByRole("button", { name: "搜索" }).click();

  await expect(page.getByText("没找到结果")).toBeVisible();
  await expect(page.getByLabel("底部播放器")).toBeVisible();
  await expect(page.getByRole("search", { name: "音乐搜索" })).toBeVisible();
});

test("mobile layout keeps the mini player usable without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAudio(page);
  await mockApi(page);

  await page.goto("/");

  await expect(page.getByLabel("底部播放器")).toBeVisible();
  await expect(page.getByRole("search", { name: "音乐搜索" })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
});
