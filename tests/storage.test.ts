import "fake-indexeddb/auto";
import { beforeEach, expect, it } from "vitest";
import { emptyData } from "../src/lib/types";
import {
  loadData,
  saveData,
  updateData,
  validateData,
} from "../src/lib/storage";
import { startActivity } from "../src/lib/model";
beforeEach(async () => {
  await saveData(emptyData());
});
it("round-trips timers, categories, templates and the exception ledger", async () => {
  const data = startActivity(
    emptyData(),
    "study",
    false,
    Date.now() - 3_600_000,
  );
  data.generatedKeys = ["template:2026-10-12"];
  await saveData(data);
  expect(await loadData()).toEqual(data);
});
it("preserves updates made by concurrent tabs", async () => {
  await Promise.all([
    updateData((data) => startActivity(data, "travel", false, 10_000)),
    updateData((data) => startActivity(data, "study", true, 20_000)),
  ]);
  const data = await loadData();
  expect(data.records).toHaveLength(2);
  expect(data.records.every((r) => r.endTime === null)).toBe(true);
});
it("rolls back failed updates and retains previously saved data", async () => {
  const data = startActivity(emptyData(), "study", false, 10_000);
  await saveData(data);
  await expect(updateData((d) => ({ ...d, categories: [] }))).rejects.toThrow();
  expect(await loadData()).toEqual(data);
});
it("rejects invalid imported data including broken references and calendar dates", () => {
  expect(() =>
    validateData({
      ...emptyData(),
      records: [
        {
          id: "bad",
          categoryId: "missing",
          startTime: 0,
          endTime: 100,
          source: "manual",
        },
      ],
    }),
  ).toThrow();
  expect(() =>
    validateData({
      ...emptyData(),
      templates: [
        {
          id: "x",
          weekday: 1,
          categoryId: "school",
          startMinutes: 0,
          endMinutes: 60,
          createdDay: "2026-02-30",
        },
      ],
    }),
  ).toThrow();
  expect(() =>
    validateData({ ...emptyData(), mainRecordId: "missing" }),
  ).toThrow();
});
