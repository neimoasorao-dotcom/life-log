import type { Activity, AppData } from "./types";
import {
  atMinute,
  dayBounds,
  dayKey,
  dateFromKey,
  shiftDay,
  MINUTE,
} from "./time";
export type Period = "day" | "week" | "month";
export interface Interval {
  start: number;
  end: number;
}
export function mergeIntervals(intervals: Interval[]): Interval[] {
  const merged: Interval[] = [];
  for (const interval of [...intervals]
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start)) {
    const last = merged.at(-1);
    if (last && interval.start <= last.end)
      last.end = Math.max(last.end, interval.end);
    else merged.push({ ...interval });
  }
  return merged;
}
export function clipActivity(
  record: Activity,
  start: number,
  end: number,
  now: number,
): Interval | null {
  const interval = {
    start: Math.max(record.startTime, start),
    end: Math.min(record.endTime ?? now, end, now),
  };
  return interval.end > interval.start ? interval : null;
}
export function periodDays(period: Period, anchor: string): string[] {
  const d = dateFromKey(anchor);
  if (period === "day") return [anchor];
  let first: string, count: number;
  if (period === "week") {
    first = shiftDay(anchor, -((d.getDay() + 6) % 7));
    count = 7;
  } else {
    first = dayKey(new Date(d.getFullYear(), d.getMonth(), 1));
    count = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }
  return Array.from({ length: count }, (_, i) => shiftDay(first, i));
}
export function summarize(data: AppData, days: string[], now: number) {
  const totals = new Map(data.categories.map((c) => [c.id, 0]));
  let recorded = 0,
    available = 0,
    activity = 0;
  const daily = days.map((day) => {
    const [start, end] = dayBounds(day);
    // Activity totals cover the entire local day. Coverage refers to the displayed waking window, 06:00–24:00.
    const coverageStart = atMinute(day, 360);
    const coverageEnd = Math.min(end, now);
    const intervals: Interval[] = [];
    let study = 0,
      dailyActivity = 0;
    for (const r of data.records) {
      const clipped = clipActivity(r, start, end, now);
      if (!clipped) continue;
      const duration = clipped.end - clipped.start;
      totals.set(r.categoryId, (totals.get(r.categoryId) ?? 0) + duration);
      dailyActivity += duration;
      if (data.categories.find((c) => c.id === r.categoryId)?.kind === "study")
        study += duration;
      const coverage = clipActivity(r, coverageStart, end, now);
      if (coverage) intervals.push(coverage);
    }
    const covered = mergeIntervals(intervals).reduce(
      (sum, i) => sum + i.end - i.start,
      0,
    );
    const window = Math.max(0, coverageEnd - coverageStart);
    recorded += covered;
    available += window;
    activity += dailyActivity;
    return { day, study, recorded: covered, unrecorded: window - covered };
  });
  const study = data.categories
    .filter((c) => c.kind === "study")
    .reduce((sum, c) => sum + (totals.get(c.id) ?? 0), 0);
  const learning = data.categories
    .filter((c) => ["study", "school", "lesson"].includes(c.kind))
    .reduce((sum, c) => sum + (totals.get(c.id) ?? 0), 0);
  return {
    totals,
    recorded,
    available,
    unrecorded: Math.max(0, available - recorded),
    activity,
    daily,
    study,
    learning,
  };
}
export interface TimelineItem {
  record: Activity;
  start: number;
  end: number;
  top: number;
  height: number;
  lane: number;
  lanes: number;
}
/** Greedy lanes within connected collision groups; tiny entries use readable visual intervals. */
export function layoutTimeline(
  records: Activity[],
  day: string,
  now: number,
  startHour = 6,
  pixelsPerHour = 76,
): TimelineItem[] {
  const [dayStart, dayEnd] = dayBounds(day);
  const origin = atMinute(day, startHour * 60);
  const items: TimelineItem[] = records
    .flatMap((record) => {
      const start = Math.max(record.startTime, origin);
      const end = Math.min(
        record.endTime ?? Math.max(now, record.startTime + MINUTE),
        dayEnd,
      );
      if (end <= start || end <= dayStart) return [];
      const top = ((start - origin) / (60 * MINUTE)) * pixelsPerHour;
      const height = Math.max(
        48,
        ((end - start) / (60 * MINUTE)) * pixelsPerHour,
      );
      return [{ record, start, end, top, height, lane: 0, lanes: 1 }];
    })
    .sort((a, b) => a.top - b.top || b.height - a.height);
  let group: TimelineItem[] = [],
    groupEnd = -1,
    laneEnds: number[] = [];
  const finish = () =>
    group.forEach((i) => {
      i.lanes = laneEnds.length;
    });
  for (const item of items) {
    if (item.top >= groupEnd) {
      finish();
      group = [];
      laneEnds = [];
      groupEnd = -1;
    }
    let lane = laneEnds.findIndex((end) => end <= item.top);
    if (lane === -1) lane = laneEnds.length;
    item.lane = lane;
    laneEnds[lane] = item.top + item.height;
    group.push(item);
    groupEnd = Math.max(groupEnd, item.top + item.height);
  }
  finish();
  return items;
}
