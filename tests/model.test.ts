import { describe, expect, it } from "vitest";
import { emptyData } from "../src/lib/types";
import type { Activity, WeekTemplate } from "../src/lib/types";
import {
  startActivity,
  stopActivity,
  putActivity,
  deleteActivity,
  generateTemplates,
} from "../src/lib/model";
import {
  atMinute,
  dayKey,
  dayBounds,
  shiftDay,
  MINUTE,
  parseInputTime,
  toInputTime,
  formatClock,
} from "../src/lib/time";
import {
  mergeIntervals,
  summarize,
  layoutTimeline,
  periodDays,
} from "../src/lib/analytics";
const day = "2026-10-12"; // Monday, local calendar date
const record = (categoryId: string, start: number, end: number): Activity => ({
  id: crypto.randomUUID(),
  categoryId,
  startTime: atMinute(day, start),
  endTime: atMinute(day, end),
  source: "manual",
});
const template: WeekTemplate = {
  id: "school-monday",
  categoryId: "school",
  weekday: 1,
  startMinutes: 510,
  endMinutes: 930,
  createdDay: day,
};
describe("stopwatch transitions", () => {
  it("starts study and completes it with the original timestamp", () => {
    let data = startActivity(emptyData(), "study", false, atMinute(day, 600));
    const id = data.mainRecordId!;
    data = stopActivity(data, id, atMinute(day, 630));
    expect(data.records[0].endTime! - data.records[0].startTime).toBe(
      30 * MINUTE,
    );
    expect(data.mainRecordId).toBeNull();
  });
  it("switches the main task with exactly one action", () => {
    let data = startActivity(emptyData(), "study", false, atMinute(day, 600));
    data = startActivity(data, "meal", false, atMinute(day, 660));
    expect(data.records.map((r) => [r.categoryId, r.endTime])).toEqual([
      ["study", atMinute(day, 660)],
      ["meal", null],
    ]);
    expect(data.mainRecordId).toBe(data.records[1].id);
  });
  it("does not restart the main timer when tapping the same category", () => {
    const data = startActivity(emptyData(), "study", false, atMinute(day, 600));
    expect(startActivity(data, "study", false, atMinute(day, 630))).toBe(data);
  });
  it("keeps travel running during parallel study and switches only the main record", () => {
    let data = startActivity(emptyData(), "travel", false, atMinute(day, 440));
    const travelId = data.mainRecordId!;
    data = startActivity(data, "study", true, atMinute(day, 455));
    expect(data.mainRecordId).toBe(travelId);
    expect(data.records.every((r) => r.endTime === null)).toBe(true);
    data = startActivity(data, "meal", false, atMinute(day, 470));
    expect(data.records.find((r) => r.categoryId === "travel")?.endTime).toBe(
      atMinute(day, 470),
    );
    expect(
      data.records.find((r) => r.categoryId === "study")?.endTime,
    ).toBeNull();
  });
  it("does not auto-resume an older task when the main timer stops", () => {
    let data = startActivity(emptyData(), "travel", false, atMinute(day, 440));
    data = startActivity(data, "study", true, atMinute(day, 455));
    data = stopActivity(data, data.mainRecordId!, atMinute(day, 470));
    expect(data.mainRecordId).toBeNull();
    expect(data.records.filter((r) => r.endTime === null)).toHaveLength(1);
  });
  it("restores elapsed time from startTime, not interval ticks", () => {
    const data = JSON.parse(
      JSON.stringify(
        startActivity(emptyData(), "study", false, atMinute(day, 600)),
      ),
    );
    expect(
      formatClock(atMinute(day, 684) + 18_000 - data.records[0].startTime),
    ).toBe("01:24:18");
  });
});
describe("manual records and timeline", () => {
  it("accepts overlapping manual records and edits/removes them", () => {
    let data = putActivity(emptyData(), record("travel", 440, 510));
    const study = record("study", 455, 485);
    data = putActivity(data, study);
    expect(data.records).toHaveLength(2);
    data = putActivity(data, { ...study, endTime: atMinute(day, 490) });
    expect(data.records.find((r) => r.id === study.id)?.endTime).toBe(
      atMinute(day, 490),
    );
    expect(deleteActivity(data, study.id).records).toHaveLength(1);
  });
  it("rejects invalid or reversed time intervals", () => {
    expect(parseInputTime("2026-10-12T14:00")).toBe(atMinute(day, 840));
    expect(parseInputTime("2026-10-12T08:35")).toBe(atMinute(day, 515));
    expect(() => putActivity(emptyData(), record("study", 600, 590))).toThrow();
    expect(() =>
      putActivity(emptyData(), {
        ...record("study", 600, 630),
        startTime: NaN,
      }),
    ).toThrow();
    expect(parseInputTime("2026-02-30T12:00")).toBeNaN();
    expect(parseInputTime("2026-10-12T25:00")).toBeNaN();
  });
  it("assigns parallel lanes and reuses full width after overlaps", () => {
    const items = layoutTimeline(
      [
        record("travel", 440, 510),
        record("study", 455, 485),
        record("meal", 540, 570),
      ],
      day,
      atMinute(day, 1000),
    );
    expect(items[0].lanes).toBe(2);
    expect(items[1].lane).not.toBe(items[0].lane);
    expect(items[2].lanes).toBe(1);
  });
  it("splits midnight intervals without losing or duplicating duration", () => {
    const data = emptyData();
    data.records = [
      {
        ...record("study", 1410, 1455),
        endTime: atMinute(shiftDay(day, 1), 15),
      },
    ];
    const result = summarize(
      data,
      [day, shiftDay(day, 1)],
      atMinute(shiftDay(day, 1), 600),
    );
    expect(result.study).toBe(45 * MINUTE);
    expect(
      layoutTimeline(
        data.records,
        shiftDay(day, 1),
        atMinute(shiftDay(day, 1), 600),
        0,
      )[0].start,
    ).toBe(atMinute(shiftDay(day, 1), 0));
  });
});
describe("weekday templates and exceptions", () => {
  it("generates only the right weekday with one record per occurrence", () => {
    const data = { ...emptyData(), templates: [template] };
    const next = generateTemplates(data, "2026-10-20");
    expect(next.records).toHaveLength(2);
    expect(dayKey(next.records[1].startTime)).toBe("2026-10-19");
    expect(generateTemplates(next, "2026-10-20")).toBe(next);
  });
  it("does not recreate a deleted occurrence or overwrite an edited occurrence", () => {
    let data = generateTemplates(
      { ...emptyData(), templates: [template] },
      day,
    );
    const id = data.records[0].id;
    data = putActivity(data, {
      ...data.records[0],
      categoryId: "study",
      endTime: atMinute(day, 900),
    });
    data = generateTemplates(data, day);
    expect(data.records[0].categoryId).toBe("study");
    data = generateTemplates(deleteActivity(data, id), day);
    expect(data.records).toHaveLength(0);
  });
  it("template edits apply to ungenerated days while preserving existing exceptions", () => {
    const data = generateTemplates(
      { ...emptyData(), templates: [template] },
      day,
    );
    const next = generateTemplates(
      { ...data, templates: [{ ...template, startMinutes: 600 }] },
      "2026-10-19",
    );
    expect(next.records[0].startTime).toBe(atMinute(day, 510));
    expect(next.records[1].startTime).toBe(atMinute("2026-10-19", 600));
  });
  it("allows overnight template intervals", () => {
    const next = generateTemplates(
      {
        ...emptyData(),
        templates: [{ ...template, startMinutes: 1380, endMinutes: 60 }],
      },
      day,
    );
    expect(next.records[0].endTime).toBe(atMinute(shiftDay(day, 1), 60));
  });
});
describe("analysis totals", () => {
  it("sums activities separately but merges overlapping coverage", () => {
    const data = emptyData();
    data.records = [record("travel", 440, 500), record("study", 455, 485)];
    const summary = summarize(data, [day], atMinute(day, 500));
    expect(summary.totals.get("travel")).toBe(60 * MINUTE);
    expect(summary.study).toBe(30 * MINUTE);
    expect(summary.activity).toBe(90 * MINUTE);
    expect(summary.recorded).toBe(60 * MINUTE);
    expect(summary.unrecorded).toBe(80 * MINUTE);
  });
  it("clips running timers and future template records to now", () => {
    const data = startActivity(emptyData(), "study", false, atMinute(day, 600));
    data.records.push(record("school", 800, 1000));
    expect(summarize(data, [day], atMinute(day, 630)).study).toBe(30 * MINUTE);
    expect(
      summarize(data, [day], atMinute(day, 630)).totals.get("school"),
    ).toBe(0);
    expect(
      summarize(data, [shiftDay(day, 1)], atMinute(day, 630)).unrecorded,
    ).toBe(0);
  });
  it("merges nested, chained and identical intervals correctly", () => {
    expect(
      mergeIntervals([
        { start: 0, end: 60 },
        { start: 10, end: 30 },
        { start: 30, end: 90 },
        { start: 100, end: 110 },
      ]),
    ).toEqual([
      { start: 0, end: 90 },
      { start: 100, end: 110 },
    ]);
  });
  it("uses local calendar boundaries for weeks and months including leap years", () => {
    expect(periodDays("week", "2026-10-18")).toEqual(
      Array.from({ length: 7 }, (_, i) => shiftDay(day, i)),
    );
    expect(periodDays("month", "2024-02-11")).toHaveLength(29);
    expect(periodDays("month", "2026-10-11")).toHaveLength(31);
    const [start, end] = dayBounds(day);
    expect(toInputTime(start)).toBe("2026-10-12T00:00");
    expect(dayKey(end)).toBe("2026-10-13");
  });
});
