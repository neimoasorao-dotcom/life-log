import type { AppData, Activity, WeekTemplate } from "./types";
import { atMinute, dayKey, dateFromKey, shiftDay } from "./time";
export function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // getRandomValues also works when developing over a local HTTP network on a phone.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function startActivity(
  data: AppData,
  categoryId: string,
  simultaneous: boolean,
  now: number,
): AppData {
  if (!data.categories.some((c) => c.id === categoryId)) return data;
  if (
    !simultaneous &&
    data.records.some(
      (r) =>
        r.id === data.mainRecordId &&
        r.endTime === null &&
        r.categoryId === categoryId,
    )
  )
    return data;
  const record: Activity = {
    id: newId(),
    categoryId,
    startTime: now,
    endTime: null,
    source: "stopwatch",
  };
  const records = data.records.map((r) =>
    !simultaneous && r.id === data.mainRecordId && r.endTime === null
      ? { ...r, endTime: Math.max(r.startTime + 1, now) }
      : r,
  );
  return {
    ...data,
    records: [...records, record],
    mainRecordId: simultaneous ? data.mainRecordId : record.id,
  };
}
export function stopActivity(data: AppData, id: string, now: number): AppData {
  return {
    ...data,
    records: data.records.map((r) =>
      r.id === id && r.endTime === null
        ? { ...r, endTime: Math.max(r.startTime + 1, now) }
        : r,
    ),
    mainRecordId: data.mainRecordId === id ? null : data.mainRecordId,
  };
}
export function putActivity(data: AppData, record: Activity): AppData {
  if (
    !data.categories.some((c) => c.id === record.categoryId) ||
    !Number.isFinite(record.startTime) ||
    (record.endTime !== null &&
      (!Number.isFinite(record.endTime) || record.endTime <= record.startTime))
  )
    throw new Error("終了時刻は開始時刻より後にしてください。");
  return {
    ...data,
    records: [...data.records.filter((r) => r.id !== record.id), record],
    mainRecordId:
      data.mainRecordId === record.id && record.endTime !== null
        ? null
        : data.mainRecordId,
  };
}
export function deleteActivity(data: AppData, id: string): AppData {
  return {
    ...data,
    records: data.records.filter((r) => r.id !== id),
    mainRecordId: data.mainRecordId === id ? null : data.mainRecordId,
  };
}
/** A durable occurrence ledger preserves exceptions even after the generated record is deleted. */
export function generateTemplates(data: AppData, today = dayKey()): AppData {
  const generated = new Set(data.generatedKeys);
  const additions: Activity[] = [];
  for (const template of data.templates) {
    for (let key = template.createdDay; key <= today; key = shiftDay(key, 1)) {
      if (dateFromKey(key).getDay() !== template.weekday) continue;
      const occurrence = `${template.id}:${key}`;
      if (generated.has(occurrence)) continue;
      generated.add(occurrence);
      additions.push({
        id: newId(),
        categoryId: template.categoryId,
        startTime: atMinute(key, template.startMinutes),
        endTime: atMinute(
          template.endMinutes <= template.startMinutes ? shiftDay(key, 1) : key,
          template.endMinutes,
        ),
        source: "template",
        templateKey: occurrence,
      });
    }
  }
  return additions.length
    ? {
        ...data,
        records: [...data.records, ...additions],
        generatedKeys: [...generated],
      }
    : data;
}
export function putTemplate(data: AppData, template: WeekTemplate): AppData {
  if (template.startMinutes === template.endMinutes)
    throw new Error("開始と終了には異なる時刻を指定してください。");
  return generateTemplates({
    ...data,
    templates: [
      ...data.templates.filter((t) => t.id !== template.id),
      template,
    ],
  });
}
