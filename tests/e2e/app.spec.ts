import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
async function tab(page: Page, label: string) {
  await page
    .getByRole("navigation", { name: "タブナビゲーション" })
    .getByRole("button", { name: label, exact: true })
    .click();
}
async function read(page: Page) {
  return page.evaluate(async () => {
    const { loadData } = await import("/src/lib/storage.ts" as string);
    return loadData();
  });
}
async function addRecord(
  page: Page,
  category: string,
  start: string,
  end: string,
) {
  await page.getByRole("button", { name: "記録を追加" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "カテゴリー", exact: true })
    .selectOption({ label: category });
  await dialog.getByLabel("開始日時").fill(start);
  await dialog.getByLabel("終了日時").fill(end);
  await dialog.getByRole("button", { name: "保存する" }).click();
  await expect(dialog).not.toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-12T10:00:00+09:00") });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "記録", exact: true }),
  ).toBeVisible();
});
test("starts, switches, stops and restores an elapsed timer after reload", async ({
  page,
}) => {
  await page.getByRole("button", { name: "勉強", exact: true }).click();
  await expect(page.getByText("記録中", { exact: true })).toBeVisible();
  await page.clock.fastForward("01:24:18");
  await expect(page.getByLabel("勉強の経過時間")).toHaveText("01:24:18");
  await page.reload();
  await expect(page.getByLabel("勉強の経過時間")).toHaveText("01:24:18");
  await page.getByRole("button", { name: "食事", exact: true }).click();
  const data = await read(page);
  expect(data.records).toHaveLength(2);
  expect(data.records[0].endTime).not.toBeNull();
  expect(data.records[1].categoryId).toBe("meal");
  await page.getByRole("button", { name: "終了", exact: true }).click();
  await expect(page.getByText("あなたのペースで、はじめよう")).toBeVisible();
  expect(
    (await read(page)).records.every(
      (r: { endTime: number | null }) => r.endTime !== null,
    ),
  ).toBe(true);
});
test("parallel records show distinct timers and timeline lanes without double counting", async ({
  page,
}) => {
  await page.getByRole("button", { name: "移動", exact: true }).click();
  await page.clock.fastForward("15:00");
  await page.getByRole("button", { name: "同時記録", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "勉強", exact: true })
    .click();
  await page.clock.fastForward("30:00");
  await page.getByRole("button", { name: "終了", exact: true }).nth(1).click();
  await page.clock.fastForward("15:00");
  await page.getByRole("button", { name: "終了", exact: true }).click();
  await tab(page, "今日");
  await expect(page.locator(".timeline-event")).toHaveCount(2);
  const positions = await page
    .locator(".timeline-event")
    .evaluateAll((elements) =>
      elements.map((e) => e.getBoundingClientRect().left),
    );
  expect(positions[0]).not.toBe(positions[1]);
  await tab(page, "分析");
  await expect(
    page.locator(".coverage-stats").getByText("1時間", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".donut").getByText("1時間30分", { exact: true }),
  ).toBeVisible();
});
test("adds overlapping records, edits a timeline block and rejects reversed intervals", async ({
  page,
}) => {
  await tab(page, "今日");
  await addRecord(page, "移動", "2026-10-12T07:20", "2026-10-12T08:30");
  await addRecord(page, "勉強", "2026-10-12T07:35", "2026-10-12T08:05");
  await expect(page.locator(".timeline-event")).toHaveCount(2);
  await page.getByRole("button", { name: "勉強 07:35〜08:05を編集" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("終了日時")
    .fill("2026-10-12T07:00");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存する" })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "終了時刻は開始時刻より後",
  );
  await page
    .getByRole("dialog")
    .getByLabel("終了日時")
    .fill("2026-10-12T08:15");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存する" })
    .click();
  await expect(
    page.getByRole("button", { name: "勉強 07:35〜08:15を編集" }),
  ).toBeVisible();
  await page.reload();
  await tab(page, "今日");
  await expect(page.locator(".timeline-event")).toHaveCount(2);
  await tab(page, "分析");
  await expect(page.locator(".learning-total")).toHaveText("40分");
  await expect(
    page.locator(".coverage-stats").getByText("1時間10分"),
  ).toBeVisible();
});
test("generates weekday templates once, preserves individual edits and deletion after reload", async ({
  page,
}) => {
  await tab(page, "設定");
  await page.getByRole("button", { name: "月", exact: true }).click();
  await page.getByRole("button", { name: "テンプレートを追加" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存する" })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await tab(page, "今日");
  await expect(page.locator(".timeline-event")).toHaveCount(1);
  await page
    .getByRole("button", { name: "学校 08:30〜15:30 自動記録を編集" })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("終了日時")
    .fill("2026-10-12T14:00");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存する" })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await tab(page, "今日");
  await expect(page.locator(".timeline-event")).toHaveCount(1);
  await page
    .getByRole("button", { name: "学校 08:30〜14:00 自動記録を編集" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "この記録を削除" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "本当に削除する" })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await tab(page, "今日");
  await expect(page.locator(".timeline-event")).toHaveCount(0);
});
test("can customize a category and add a new one", async ({ page }) => {
  await tab(page, "設定");
  await page
    .locator(".manage-list")
    .getByRole("button", { name: "その他", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("名前", { exact: true })
    .fill("自由時間");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "アイコン music", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "紫", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存する" })
    .click();
  await page.getByRole("button", { name: "追加", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("名前", { exact: true })
    .fill("読書");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存する" })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "自由時間", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "読書", exact: true }),
  ).toBeVisible();
});
test("all four views and forms fit at 320px without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  for (const label of ["記録", "今日", "分析", "設定"]) {
    await tab(page, label);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/${test.info().project.name}-${label}-320.png`,
      fullPage: true,
    });
  }
  await tab(page, "今日");
  await page.getByRole("button", { name: "記録を追加" }).click();
  const dialog = page.getByRole("dialog");
  expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(
    true,
  );
  await expect(dialog.getByRole("button", { name: "保存する" })).toBeVisible();
});

test("exports and restores a backup, and retains data when an invalid file is selected", async ({
  page,
}) => {
  await page.getByRole("button", { name: "勉強", exact: true }).click();
  await page.clock.fastForward("30:00");
  await page.getByRole("button", { name: "終了", exact: true }).click();
  await expect(page.getByText("あなたのペースで、はじめよう")).toBeVisible();
  await tab(page, "設定");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "書き出す", exact: true }).click();
  const file = await downloaded;
  const backupPath = test.info().outputPath("backup.json");
  await file.saveAs(backupPath);
  await tab(page, "記録");
  await page.getByRole("button", { name: "食事", exact: true }).click();
  await expect(page.getByLabel("食事の経過時間")).toBeVisible();
  await tab(page, "設定");
  await page.locator("input[type=file]").setInputFiles(backupPath);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "置き換えて読み込む" })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const restored = await read(page);
  expect(restored.records).toHaveLength(1);
  expect(restored.mainRecordId).toBeNull();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":1}'),
    });
  await expect(page.getByRole("status")).toContainText(
    "このファイルは読み込めません",
  );
  expect((await read(page)).records).toHaveLength(1);
});

test("keeps records synchronized between two tabs", async ({
  page,
  context,
}) => {
  const second = await context.newPage();
  await second.clock.install({ time: new Date("2026-10-12T10:00:00+09:00") });
  await second.goto("/");
  await expect(
    second.getByRole("heading", { name: "記録", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "移動", exact: true }).click();
  await expect(second.getByLabel("移動の経過時間")).toBeVisible();
  await second.getByRole("button", { name: "同時記録", exact: true }).click();
  await second
    .getByRole("dialog")
    .getByRole("button", { name: "勉強", exact: true })
    .click();
  await expect(page.getByLabel("勉強の経過時間")).toBeVisible();
  expect((await read(page)).records).toHaveLength(2);
  await page.getByRole("button", { name: "終了", exact: true }).nth(1).click();
  await expect(second.getByLabel("勉強の経過時間")).not.toBeVisible();
  await expect(second.getByLabel("移動の経過時間")).toBeVisible();
});
