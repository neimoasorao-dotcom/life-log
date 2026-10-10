import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { Activity, AppData } from "../lib/types";
import { newId, putActivity, deleteActivity } from "../lib/model";
import { atMinute, parseInputTime, toInputTime } from "../lib/time";
import { Modal } from "./Modal";
export type Change = (
  operation: (data: AppData) => AppData,
) => Promise<boolean>;
export function RecordForm({
  record,
  day,
  data,
  now,
  change,
  onClose,
}: {
  record?: Activity;
  day: string;
  data: AppData;
  now: number;
  change: Change;
  onClose: () => void;
}) {
  const defaultEnd = Math.min(
    atMinute(day, 23 * 60 + 59),
    Math.max(atMinute(day, 6 * 60 + 30), now),
  );
  const [category, setCategory] = useState(
    record?.categoryId ?? data.categories[0].id,
  );
  const [start, setStart] = useState(
    toInputTime(record?.startTime ?? defaultEnd - 30 * 60_000),
  );
  const [end, setEnd] = useState(
    toInputTime(record?.endTime ?? (record ? now : defaultEnd)),
  );
  const [running, setRunning] = useState(!!record && record.endTime === null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const startTime = parseInputTime(start),
      endTime = running ? null : parseInputTime(end);
    if (
      !Number.isFinite(startTime) ||
      (endTime !== null && (!Number.isFinite(endTime) || endTime <= startTime))
    ) {
      setError(
        "終了時刻は開始時刻より後にしてください。日をまたぐ場合は終了の日付も変更できます。",
      );
      return;
    }
    if (running && startTime > Date.now()) {
      setError("記録中の開始時刻は現在より前にしてください。");
      return;
    }
    setBusy(true);
    const success = await change((d) =>
      putActivity(d, {
        ...(record ?? {}),
        id: record?.id ?? newId(),
        categoryId: category,
        startTime,
        endTime,
        source: record?.source ?? "manual",
      }),
    );
    setBusy(false);
    if (success) onClose();
    else setError("保存できませんでした。もう一度お試しください。");
  }
  async function remove() {
    if (!record) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    const success = await change((d) => deleteActivity(d, record.id));
    setBusy(false);
    if (success) onClose();
  }
  return (
    <Modal
      title={record ? "記録を編集" : "記録を追加"}
      subtitle="記録し忘れた時間も、あとからそっと。"
      onClose={onClose}
    >
      <form onSubmit={submit} className="form">
        <label>
          カテゴリー
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          開始日時
          <input
            type="datetime-local"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        {record?.endTime === null && (
          <label className="check-label">
            <input
              type="checkbox"
              checked={running}
              onChange={(e) => setRunning(e.target.checked)}
            />
            記録を続ける
          </label>
        )}
        <label>
          終了日時
          <input
            type="datetime-local"
            required={!running}
            disabled={running}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <p className="field-hint">
          ほかの記録と時間が重なっていても追加できます。
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {busy ? "保存中…" : "保存する"}
        </button>
        {record && (
          <button
            type="button"
            className="button danger-text"
            disabled={busy}
            onClick={remove}
          >
            <Trash2 size={17} />
            {confirmDelete ? "本当に削除する" : "この記録を削除"}
          </button>
        )}
      </form>
    </Modal>
  );
}
