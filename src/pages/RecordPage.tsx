import { useState } from "react";
import { Plus, ArrowUpRight, Check, Clock3, Square } from "lucide-react";
import type { AppData, Category } from "../lib/types";
import { startActivity, stopActivity } from "../lib/model";
import { dayKey, clockTime, formatClock, formatDuration } from "../lib/time";
import { summarize } from "../lib/analytics";
import { CategoryBadge } from "../components/Icon";
import { Modal } from "../components/Modal";
import type { Change } from "../components/RecordForm";
export function RecordPage({
  data,
  now,
  busy,
  change,
  goToday,
}: {
  data: AppData;
  now: number;
  busy: boolean;
  change: Change;
  goToday: () => void;
}) {
  const [simultaneous, setSimultaneous] = useState(false);
  const [notice, setNotice] = useState("");
  const running = data.records
    .filter((r) => r.endTime === null)
    .sort(
      (a, b) =>
        Number(b.id === data.mainRecordId) - Number(a.id === data.mainRecordId),
    );
  const summary = summarize(data, [dayKey(now)], now);
  const recent = data.records
    .filter((r) => r.endTime !== null && r.endTime <= now)
    .sort((a, b) => b.endTime! - a.endTime!)
    .slice(0, 4);
  async function start(category: Category, parallel = false) {
    if (
      await change((d) => startActivity(d, category.id, parallel, Date.now()))
    ) {
      setSimultaneous(false);
      setNotice(
        `${category.name}の${parallel ? "同時記録を" : "記録を"}開始しました`,
      );
    }
  }
  async function stop(id: string) {
    if (await change((d) => stopActivity(d, id, Date.now())))
      setNotice("記録を保存しました");
  }
  return (
    <>
      <div className="record-layout">
        <div className="record-main">
          <section
            className={`timer-card ${running.length ? "is-running" : ""}`}
            aria-label="現在の記録"
          >
            {running.length ? (
              running.map((record, index) => {
                const category = data.categories.find(
                  (c) => c.id === record.categoryId,
                )!;
                return (
                  <div
                    key={record.id}
                    className={`timer-item ${index ? "secondary-timer" : ""}`}
                  >
                    <div className="timer-top">
                      <CategoryBadge category={category} />
                      <div className="timer-details">
                        <h2>{category.name}</h2>
                        <div
                          className="timer-digits"
                          aria-label={`${category.name}の経過時間`}
                        >
                          {formatClock(now - record.startTime)}
                        </div>
                        <div className="timer-meta">
                          {clockTime(record.startTime)} から
                          {record.id !== data.mainRecordId && " · 同時記録"}
                        </div>
                      </div>
                      <span className="live-label">
                        <i />
                        記録中
                      </span>
                    </div>
                    <div className="timer-actions">
                      <button
                        className="button primary"
                        onClick={() => void stop(record.id)}
                        disabled={busy}
                      >
                        <Square size={13} fill="currentColor" />
                        終了
                      </button>
                      {index === 0 && (
                        <button
                          className="button white"
                          onClick={() => setSimultaneous(true)}
                        >
                          <Plus size={19} />
                          同時記録
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-timer">
                <span className="timer-symbol">
                  <Clock3 size={24} strokeWidth={1.6} />
                </span>
                <div>
                  <h2>記録をはじめる</h2>
                  <p>カテゴリーをタップして開始</p>
                </div>
              </div>
            )}
          </section>
          <section className="categories-section">
            <div className="section-title">
              <h2>カテゴリー</h2>
              <span>
                {running.length ? "メインの記録を切り替え" : "ワンタップで開始"}
              </span>
            </div>
            <div className="category-grid">
              {data.categories.map((c) => (
                <button
                  key={c.id}
                  className={`category-tile ${running.some((r) => r.id === data.mainRecordId && r.categoryId === c.id) ? "selected" : ""}`}
                  disabled={busy}
                  onClick={() => void start(c)}
                >
                  <CategoryBadge category={c} />
                  <span>{c.name}</span>
                  {running.some(
                    (r) => r.id === data.mainRecordId && r.categoryId === c.id,
                  ) && <Check className="tile-check" size={13} />}
                </button>
              ))}
            </div>
            <p className="quiet-note">
              {running.length
                ? "切り替えると、前のメイン記録は自動で終了します。"
                : "終了・切り替えで自動保存。入力は不要です。"}
            </p>
          </section>
        </div>
        <aside className="record-aside">
          <section className="overview-card">
            <div className="section-title">
              <h2>今日の積み重ね</h2>
            </div>
            <div className="overview-total">
              {formatDuration(summary.recorded)}
              <span>記録済み</span>
            </div>
            <div className="coverage-track">
              <div
                style={{
                  width: `${summary.available ? (summary.recorded / summary.available) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="overview-bottom">
              <span>
                勉強 <strong>{formatDuration(summary.study)}</strong>
              </span>
              <button onClick={goToday}>
                今日を見る
                <ArrowUpRight size={16} />
              </button>
            </div>
          </section>
          <section className="recent-section">
            <div className="section-title">
              <h2>最近の記録</h2>
              <Clock3 size={17} />
            </div>
            <div className="recent-list">
              {recent.length ? (
                recent.map((record) => {
                  const category = data.categories.find(
                    (c) => c.id === record.categoryId,
                  )!;
                  return (
                    <button
                      className="recent-row"
                      key={record.id}
                      onClick={goToday}
                    >
                      <CategoryBadge category={category} small />
                      <div>
                        <strong>{category.name}</strong>
                        <span>
                          {dayKey(record.startTime) === dayKey(now)
                            ? ""
                            : `${new Date(record.startTime).getMonth() + 1}/${new Date(record.startTime).getDate()} · `}
                          {clockTime(record.startTime)} –{" "}
                          {clockTime(record.endTime!)}
                        </span>
                      </div>
                      <span className="recent-duration">
                        {formatDuration(record.endTime! - record.startTime)}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="empty-recent">
                  <span className="empty-dashes">― · ―</span>
                  <p>最初の記録が、ここに並びます。</p>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
      <div className="sr-only" role="status">
        {notice}
      </div>
      {simultaneous && (
        <Modal
          title="同時に記録する"
          subtitle="今の記録を続けながら、もうひとつ。"
          onClose={() => setSimultaneous(false)}
        >
          <div className="category-grid modal-categories">
            {data.categories.map((c) => (
              <button
                className="category-tile"
                key={c.id}
                disabled={busy}
                onClick={() => void start(c, true)}
              >
                <CategoryBadge category={c} />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
