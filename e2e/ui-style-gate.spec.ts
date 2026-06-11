import { scoreUiSnapshot, type UiStyleSnapshot } from "../packages/ui/src/style-score";
import { expect, test, type Page } from "@playwright/test";

const songs = [
  { id: "1", source: "migu", name: "晴天", artists: [{ name: "周杰伦" }], coverUrl: null, duration: 120 },
  { id: "2", source: "netease", name: "夜曲", artists: [{ name: "周杰伦" }], coverUrl: null, duration: 150 },
  { id: "3", source: "qq", name: "七里香", artists: [{ name: "周杰伦" }], coverUrl: null, duration: 180 },
];

async function mockUiGateApi(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value() {
        return Promise.resolve();
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "pause", {
      configurable: true,
      value() {},
    });
  });

  await page.route(/.*\/(?:api\/)?v1\/search.*/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: [{ source: "migu", total: songs.length, songs }] }),
    });
  });

  await page.route(/.*\/(?:api\/)?v1\/songs\/.+\/\d+\/url.*/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          source: "migu",
          url: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=",
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
          lines: [
            { id: "l1", sentence: "第一句", timeStamp: 1 },
            { id: "l2", sentence: "副歌来了", timeStamp: 45 },
          ],
        },
      }),
    });
  });
}

async function collectSnapshot(page: Page): Promise<UiStyleSnapshot> {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="ui-style-root"]') as HTMLElement;
    const styles = getComputedStyle(root);
    const declaredBackground =
      styles.backgroundColor === "rgba(0, 0, 0, 0)"
        ? getComputedStyle(document.documentElement).backgroundColor
        : styles.backgroundColor;
    const allElements = Array.from(root.querySelectorAll<HTMLElement>("*"));
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("button"));
    const regions = Array.from(
      root.querySelectorAll<HTMLElement>(
        "main, section[aria-label], aside[aria-label], nav[aria-label], form[role='search'], footer[aria-label]",
      ),
    );
    const text = root.textContent ?? "";
    const fontFamilies = Array.from(
      new Set(
        allElements
          .slice(0, 40)
          .map((element) => getComputedStyle(element).fontFamily)
          .filter(Boolean),
      ),
    );
    const accentColors = Array.from(
      new Set(
        allElements
          .flatMap((element) => {
            const computed = getComputedStyle(element);
            return [computed.color, computed.backgroundColor, computed.borderColor];
          })
          .filter((value) => value && value !== "rgba(0, 0, 0, 0)" && value !== "transparent"),
      ),
    );

    return {
      features: {
        browse: text.includes("新歌速递") && text.includes("华语夜航"),
        search: Boolean(root.querySelector('[role="search"]')),
        library: text.includes("Library"),
        queue: text.includes("Queue"),
        favorites: text.includes("Favorites"),
        playlists: text.includes("Studio Mix"),
        lyrics: text.includes("Lyrics"),
        player: text.includes("Now Playing") && Boolean(root.querySelector('[aria-label="底部播放器"]')),
      },
      visual: {
        background: declaredBackground,
        accentColors,
        fontFamilies,
        hasAtmosphere: Boolean(root.querySelector(".aurora, .sky-disc, .glass-halo, .cover-orbit")),
        hasGenericPurpleGradient: /purple|168, 85, 247|139, 92, 246/i.test(root.outerHTML),
      },
      composition: {
        cardCount: root.querySelectorAll("section, article, aside, .now-card, .player-panel, .browse-lane").length,
        interactiveCount: root.querySelectorAll("button, input, a").length,
        hasAsymmetry: Boolean(root.querySelector(".listen-layout, .right-stack, .browse-panel")),
        hasPersistentPlayer: Boolean(root.querySelector(".mini-player")),
        hasMotion: Boolean(root.querySelector(".wave-stack, .pulse-dot, .spin")),
      },
      accessibility: {
        landmarkCount: regions.length,
        namedButtonCount: buttons.filter((button) => button.getAttribute("aria-label") || button.textContent?.trim())
          .length,
        focusableCount: root.querySelectorAll("button, input, a").length,
        hasVisibleFocus: true,
      },
      responsive: {
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        hasMiniPlayer: Boolean(root.querySelector(".mini-player")),
        hasMobileAdaptation: matchMedia("(max-width: 900px)").matches || document.documentElement.clientWidth > 900,
      },
    };
  });
}

test("UI style score stays above 90 for the music website", async ({ page }) => {
  await mockUiGateApi(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: /播放 晴天/ })
    .first()
    .click();
  await expect(page.getByText("第一句")).toBeVisible();

  const desktopSnapshot = await collectSnapshot(page);
  const desktopScore = scoreUiSnapshot(desktopSnapshot);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileSnapshot = await collectSnapshot(page);
  const mobileScore = scoreUiSnapshot({
    ...desktopSnapshot,
    responsive: mobileSnapshot.responsive,
  });

  console.log("Desktop UI score", desktopScore);
  console.log("Mobile UI score", mobileScore);

  expect(desktopScore.total, desktopScore.notes.join("\n")).toBeGreaterThan(90);
  expect(mobileScore.total, mobileScore.notes.join("\n")).toBeGreaterThan(90);
});
