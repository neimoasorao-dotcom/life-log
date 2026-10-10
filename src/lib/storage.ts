import { categoryColors, categoryIcons, emptyData } from "./types";
import type { AppData } from "./types";
import { dayKey, dateFromKey } from "./time";
const DATABASE = "life-log";
const STORE = "app";
let connection: Promise<IDBDatabase> | undefined;
function database(): Promise<IDBDatabase> {
  if (!connection)
    connection = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          connection = undefined;
        };
        resolve(db);
      };
      request.onerror = () => {
        connection = undefined;
        reject(request.error);
      };
      request.onblocked = () => {
        connection = undefined;
        reject(new Error("別のタブを閉じて、もう一度お試しください。"));
      };
    });
  return connection;
}
export function validateData(value: unknown): AppData {
  if (typeof value !== "object" || value === null)
    throw new Error("保存データの形式が正しくありません。");
  const data = value as AppData;
  const invalid = () => {
    throw new Error("保存データの形式が正しくありません。");
  };
  if (
    data.version !== 1 ||
    !Array.isArray(data.categories) ||
    !data.categories.length ||
    !Array.isArray(data.records) ||
    !Array.isArray(data.templates) ||
    !Array.isArray(data.generatedKeys)
  )
    return invalid();
  const ids = new Set<string>();
  const kinds = [
    "study",
    "school",
    "lesson",
    "travel",
    "meal",
    "rest",
    "other",
  ];
  for (const c of data.categories) {
    if (
      !c ||
      typeof c.id !== "string" ||
      !c.id ||
      ids.has(c.id) ||
      typeof c.name !== "string" ||
      !c.name.trim() ||
      c.name.length > 24 ||
      !categoryIcons.includes(c.icon) ||
      !categoryColors.includes(c.color) ||
      !kinds.includes(c.kind)
    )
      return invalid();
    ids.add(c.id);
  }
  const recordIds = new Set<string>();
  const validTime = (n: unknown): n is number =>
    typeof n === "number" && Number.isFinite(n) && n >= 0 && n < 8.64e15;
  for (const r of data.records) {
    if (
      !r ||
      typeof r.id !== "string" ||
      !r.id ||
      recordIds.has(r.id) ||
      !ids.has(r.categoryId) ||
      !validTime(r.startTime) ||
      (r.endTime !== null &&
        (!validTime(r.endTime) || r.endTime <= r.startTime)) ||
      !["stopwatch", "manual", "template"].includes(r.source) ||
      (r.endTime === null && r.source !== "stopwatch") ||
      (r.templateKey !== undefined && typeof r.templateKey !== "string")
    )
      return invalid();
    recordIds.add(r.id);
  }
  const templateIds = new Set<string>();
  for (const t of data.templates) {
    if (
      !t ||
      typeof t.id !== "string" ||
      !t.id ||
      templateIds.has(t.id) ||
      !ids.has(t.categoryId) ||
      !Number.isInteger(t.weekday) ||
      t.weekday < 0 ||
      t.weekday > 6 ||
      !Number.isInteger(t.startMinutes) ||
      !Number.isInteger(t.endMinutes) ||
      t.startMinutes < 0 ||
      t.endMinutes < 0 ||
      t.startMinutes >= 1440 ||
      t.endMinutes >= 1440 ||
      t.startMinutes === t.endMinutes ||
      typeof t.createdDay !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(t.createdDay) ||
      dayKey(dateFromKey(t.createdDay)) !== t.createdDay ||
      t.createdDay < "2000-01-01"
    )
      return invalid();
    templateIds.add(t.id);
  }
  if (
    data.generatedKeys.some((k) => typeof k !== "string") ||
    (data.mainRecordId !== null &&
      (typeof data.mainRecordId !== "string" ||
        !data.records.some(
          (r) => r.id === data.mainRecordId && r.endTime === null,
        )))
  )
    return invalid();
  return data;
}
export async function loadData(): Promise<AppData> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(STORE, "readonly")
      .objectStore(STORE)
      .get("state");
    request.onsuccess = () => {
      try {
        resolve(
          request.result === undefined
            ? emptyData()
            : validateData(request.result),
        );
      } catch (error) {
        reject(error);
      }
    };
    request.onerror = () => reject(request.error);
  });
}
export async function saveData(data: AppData): Promise<void> {
  validateData(data);
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(data, "state");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("保存が中断されました。"));
  });
}

/** Read and write in one transaction so multiple tabs cannot overwrite newer records. */
export async function updateData(
  operation: (data: AppData) => AppData,
): Promise<AppData> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    const request = store.get("state");
    let result: AppData;
    let failure: unknown;
    request.onsuccess = () => {
      try {
        const existing =
          request.result === undefined
            ? emptyData()
            : validateData(request.result);
        result = validateData(operation(existing));
        if (result !== existing || request.result === undefined)
          store.put(result, "state");
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(failure ?? transaction.error);
    transaction.onabort = () =>
      reject(
        failure ?? transaction.error ?? new Error("保存が中断されました。"),
      );
  });
}
