import { expect, test } from "@playwright/test";

test("searches and selects a song in the web player", async ({ page }) => {
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

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /跨 Web、桌面、移动与鸿蒙/ })).toBeVisible();
  await expect(page.getByText("晴天")).toBeVisible();

  await page.getByText("晴天").click();
  await expect(page.getByRole("button", { name: "暂停" })).toBeVisible();
});
