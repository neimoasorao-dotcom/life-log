export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export function dayKey(date: Date | number = new Date()): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function shiftDay(key: string, offset: number): string {
  const d = dateFromKey(key);
  d.setDate(d.getDate() + offset);
  return dayKey(d);
}
export function atMinute(key: string, minute: number): number {
  const d = dateFromKey(key);
  d.setMinutes(minute);
  return d.getTime();
}
export function dayBounds(key: string): [number, number] {
  return [atMinute(key, 0), atMinute(shiftDay(key, 1), 0)];
}
export function formatClock(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
export function formatDuration(ms: number): string {
  const mins = Math.max(0, Math.floor(ms / MINUTE));
  return mins >= 60
    ? `${Math.floor(mins / 60)}時間${mins % 60 ? `${mins % 60}分` : ""}`
    : `${mins}分`;
}
export function clockTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
export function dateLabel(key: string, year = false): string {
  return dateFromKey(key).toLocaleDateString("ja-JP", {
    ...(year ? { year: "numeric" as const } : {}),
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}
export function toInputTime(timestamp: number): string {
  return `${dayKey(timestamp)}T${clockTime(timestamp)}`;
}
export function parseInputTime(value: string): number {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return NaN;
  const h = Number(match[2]),
    m = Number(match[3]);
  const time = atMinute(match[1], h * 60 + m);
  return toInputTime(time) === value ? time : NaN;
}
export function minutesLabel(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
export function timeMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}
