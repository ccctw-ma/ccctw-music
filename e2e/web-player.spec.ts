import { expect, test } from "@playwright/test";

test("searches, resolves a playable url, and updates the web player", async ({ page }) => {
  let playableUrlRequested = false;
  const playableAudioUrl = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=";

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

  await page.route(/.*\/(?:api\/)?v1\/search.*/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: [
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

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "今天想听什么？" })).toBeVisible();
  const songButton = page.getByRole("button", { name: /晴天/ });
  await expect(songButton).toBeVisible();

  await songButton.click();
  await expect.poll(() => playableUrlRequested).toBe(true);
  await expect(page.getByTestId("audio-player")).toHaveAttribute("src", playableAudioUrl);
  await expect(page.getByRole("button", { name: "暂停" }).first()).toBeVisible();
  await page.screenshot({ path: "test-results/web-player-blue.png", fullPage: true });
});
