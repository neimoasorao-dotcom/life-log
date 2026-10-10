import { test, expect } from "@playwright/test";

test("the built app loads assets and restores records under the GitHub Pages path", async ({
  page,
  request,
}, testInfo) => {
  if (process.env.EXPECTED_BUILD_SHA) {
    await expect
      .poll(
        async () => {
          const response = await request.get(
            `/life-log/version.json?check=${Date.now()}`,
          );
          if (!response.ok()) return `HTTP ${response.status()}`;
          return (await response.json()).revision;
        },
        { timeout: 60_000, intervals: [1000, 2000, 5000] },
      )
      .toBe(process.env.EXPECTED_BUILD_SHA);
  }
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("requestfailed", (request) => failures.push(request.url()));
  page.on("response", (response) => {
    if (response.status() >= 400)
      failures.push(`${response.status()} ${response.url()}`);
  });
  await page.clock.install({ time: new Date("2026-10-12T10:00:00+09:00") });
  await page.goto(
    `/life-log/?build=${process.env.EXPECTED_BUILD_SHA ?? "local"}`,
  );
  await expect(
    page.getByRole("heading", { name: "記録", exact: true }),
  ).toBeVisible();
  const script = page.locator('script[type="module"][src]');
  await expect(script).toHaveAttribute("src", /^\/life-log\/assets\//);
  await expect(page.locator('link[rel="stylesheet"]')).toHaveAttribute(
    "href",
    /^\/life-log\/assets\//,
  );
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    "href",
    "/life-log/favicon.svg",
  );
  await page.getByRole("button", { name: "勉強", exact: true }).click();
  await page.clock.fastForward("01:00");
  await expect(page.getByLabel("勉強の経過時間")).toHaveText("00:01:00");
  await page.reload();
  await expect(page.getByLabel("勉強の経過時間")).toHaveText("00:01:00");
  await page.getByRole("button", { name: "終了", exact: true }).click();
  await expect(page.getByText("あなたのペースで、はじめよう")).toBeVisible();
  const navigation = page.getByRole("navigation", {
    name: "タブナビゲーション",
  });
  await navigation.getByRole("button", { name: "今日", exact: true }).click();
  await expect(page.locator(".timeline-event")).toHaveCount(1);
  await navigation.getByRole("button", { name: "分析", exact: true }).click();
  await expect(page.locator(".learning-total")).toHaveText("1分");
  await navigation.getByRole("button", { name: "設定", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "曜日テンプレート" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(failures).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("published-app.png"),
    fullPage: true,
  });
});
