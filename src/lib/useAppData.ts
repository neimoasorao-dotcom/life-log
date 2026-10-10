import { useCallback, useEffect, useRef, useState } from "react";
import type { AppData } from "./types";
import { updateData } from "./storage";
import { generateTemplates } from "./model";
export function useAppData() {
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const current = useRef<AppData | null>(null);
  const queue = useRef(Promise.resolve());
  const channel = useRef<BroadcastChannel | null>(null);
  const change = useCallback(
    (operation: (data: AppData) => AppData): Promise<boolean> => {
      const result = queue.current
        .then(async () => {
          if (!current.current) return false;
          setBusy(true);
          try {
            let modified = false;
            const next = await updateData((existing) => {
              const updated = operation(existing);
              modified = updated !== existing;
              return updated;
            });
            current.current = next;
            setData(next);
            setNow(Date.now());
            setError("");
            if (modified) channel.current?.postMessage("updated");
            return true;
          } finally {
            setBusy(false);
          }
        })
        .catch((e: unknown) => {
          setError(
            `保存できませんでした。${e instanceof Error ? e.message : "空き容量とブラウザの設定をご確認ください。"} 操作は反映されていません。`,
          );
          return false;
        });
      queue.current = result.then(() => {});
      return result;
    },
    [],
  );
  const reload = useCallback(async () => {
    try {
      const next = await updateData((loaded) => generateTemplates(loaded));
      current.current = next;
      setData(next);
      setError("");
    } catch (e) {
      setError(
        `データを読み込めませんでした。${e instanceof Error ? e.message : "ブラウザの保存設定をご確認ください。"} 元のデータは削除していません。`,
      );
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;
    const messages = new BroadcastChannel("life-log-updates");
    channel.current = messages;
    messages.onmessage = () => {
      queue.current = queue.current.then(() => reload());
    };
    return () => {
      messages.close();
      channel.current = null;
    };
  }, [reload]);
  useEffect(() => {
    let previousMinute = -1;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      if (Math.floor(time / 60_000) !== previousMinute) {
        previousMinute = Math.floor(time / 60_000);
        void change((d) => generateTemplates(d));
      }
    };
    const interval = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("pageshow", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("pageshow", tick);
    };
  }, [change]);
  return { data, now, busy, error, change, reload };
}
