import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Info,
  ChartNoAxesColumnIncreasing,
} from "lucide-react";
import type { AppData } from "../lib/types";
import { summarize, periodDays } from "../lib/analytics";
import type { Period } from "../lib/analytics";
import {
  dayKey,
  dateFromKey,
  dateLabel,
  shiftDay,
  formatDuration,
  HOUR,
} from "../lib/time";
import { CategoryBadge } from "../components/Icon";
const chartColors = {
  sage: "#739c87",
  blue: "#91afc9",
  sand: "#d4b88f",
  lavender: "#b0a3cf",
  rose: "#d0a4b1",
  gray: "#b5bcb8",
};
export function AnalysisPage({ data, now }: { data: AppData; now: number }) {
  const [period, setPeriod] = useState<Period>("day");
  const [anchor, setAnchor] = useState(dayKey(now));
  const days = useMemo(() => periodDays(period, anchor), [period, anchor]);
  const summary = useMemo(() => summarize(data, days, now), [data, days, now]);
  const categories = data.categories
    .map((c) => ({ ...c, duration: summary.totals.get(c.id) ?? 0 }))
    .sort((a, b) => b.duration - a.duration);
  const activeCategories = categories.filter((c) => c.duration > 0);
  const maxDuration = Math.max(HOUR, ...categories.map((c) => c.duration));
  let cumulative = 0;
  const gradient = activeCategories
    .map((c) => {
      const start = cumulative;
      cumulative += (c.duration / summary.activity) * 100;
      return `${chartColors[c.color]} ${start}% ${cumulative}%`;
    })
    .join(", ");
  const trendDays = period === "day" ? periodDays("week", anchor) : days;
  const trend = summarize(data, trendDays, now).daily;
  const maxStudy = Math.max(HOUR, ...trend.map((d) => d.study));
  function move(direction: number) {
    if (period === "day") setAnchor(shiftDay(anchor, direction));
    else if (period === "week") setAnchor(shiftDay(anchor, direction * 7));
    else {
      const d = dateFromKey(anchor);
      setAnchor(dayKey(new Date(d.getFullYear(), d.getMonth() + direction, 1)));
    }
  }
  const label =
    period === "day"
      ? dateLabel(anchor, true)
      : period === "month"
        ? dateFromKey(anchor).toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "long",
          })
        : `${dateLabel(days[0])} – ${dateLabel(days.at(-1)!)}`;
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">FIND YOUR OWN RHYTHM</div>
        <h1>時間のふりかえり</h1>
        <p>数字で見える、日々の積み重ね。</p>
      </div>
      <div className="analysis-controls">
        <div className="segmented" aria-label="集計期間">
          {(["day", "week", "month"] as Period[]).map((p, i) => (
            <button
              key={p}
              className={period === p ? "active" : ""}
              onClick={() => {
                setPeriod(p);
                setAnchor(dayKey(now));
              }}
            >
              {["今日", "今週", "今月"][i]}
            </button>
          ))}
        </div>
        <div className="date-toolbar analysis-date">
          <button
            className="icon-button"
            aria-label="前の期間"
            onClick={() => move(-1)}
          >
            <ChevronLeft size={20} />
          </button>
          <strong>{label}</strong>
          <button
            className="icon-button"
            aria-label="次の期間"
            onClick={() => move(1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      <div className="analysis-grid">
        <section className="learning-card">
          <span className="learning-icon">
            <BookOpen size={25} strokeWidth={1.6} />
          </span>
          <div>
            <div className="tiny-label">勉強時間</div>
            <div className="learning-total">
              {formatDuration(summary.study)}
            </div>
            <p>
              学校・塾も含む学習時間{" "}
              <strong>{formatDuration(summary.learning)}</strong>
            </p>
          </div>
        </section>
        <div className="coverage-stats">
          <div>
            <span>記録済み時間</span>
            <strong>{formatDuration(summary.recorded)}</strong>
          </div>
          <div>
            <span>未記録時間</span>
            <strong>{formatDuration(summary.unrecorded)}</strong>
          </div>
        </div>
        <section className="panel distribution">
          <div className="section-title">
            <h2>時間の内訳</h2>
            <span className="tiny-label">ACTIVITY</span>
          </div>
          <div className="donut-area">
            <div
              className="donut"
              role="img"
              aria-label={`活動時間の合計 ${formatDuration(summary.activity)}`}
              style={{
                background: gradient
                  ? `conic-gradient(${gradient})`
                  : "#e9ece7",
              }}
            >
              <div>
                <span>活動時間の合計</span>
                <strong>{formatDuration(summary.activity)}</strong>
              </div>
            </div>
            <div className="donut-legend">
              {(activeCategories.length
                ? activeCategories
                : categories.slice(0, 4)
              ).map((c) => (
                <div key={c.id}>
                  <i style={{ background: chartColors[c.color] }} />
                  <span>{c.name}</span>
                  <strong>{formatDuration(c.duration)}</strong>
                </div>
              ))}
            </div>
          </div>
          {!summary.activity && (
            <p className="chart-empty">
              記録をすると、時間の内訳が見えてきます。
            </p>
          )}
        </section>
        <section className="panel category-totals">
          <div className="section-title">
            <h2>カテゴリー別</h2>
            <span>合計時間</span>
          </div>
          <div className="total-list">
            {categories.map((c) => (
              <div className="total-row" key={c.id}>
                <CategoryBadge category={c} small />
                <div>
                  <div className="total-label">
                    <span>{c.name}</span>
                    <strong>{formatDuration(c.duration)}</strong>
                  </div>
                  <div className="bar-track">
                    <span
                      style={{
                        width: `${(c.duration / maxDuration) * 100}%`,
                        background: chartColors[c.color],
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel trend-panel">
          <div className="section-title">
            <h2>
              <ChartNoAxesColumnIncreasing size={19} />
              勉強時間の推移
            </h2>
            <span>
              {period === "day"
                ? "今週"
                : period === "week"
                  ? "この週"
                  : "この月"}
            </span>
          </div>
          <div className="trend-chart">
            <div className="trend-axis">
              <span>{Math.ceil(maxStudy / HOUR)}h</span>
              <span>{Math.ceil(maxStudy / HOUR) / 2}h</span>
              <span>0</span>
            </div>
            <div className="trend-bars">
              {trend.map((d, i) => (
                <div
                  className={`trend-column ${d.day === dayKey(now) ? "current-day" : ""}`}
                  key={d.day}
                >
                  <div className="trend-bar-space">
                    <div
                      className="trend-bar"
                      style={{
                        height: `${(d.study / (Math.ceil(maxStudy / HOUR) * HOUR)) * 100}%`,
                      }}
                      title={`${dateLabel(d.day)}：${formatDuration(d.study)}`}
                      aria-label={`${dateLabel(d.day)}の勉強 ${formatDuration(d.study)}`}
                    />
                  </div>
                  <span>
                    {period === "month"
                      ? i === 0 || (i + 1) % 5 === 0
                        ? i + 1
                        : ""
                      : ["日", "月", "火", "水", "木", "金", "土"][
                          dateFromKey(d.day).getDay()
                        ]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <div className="analysis-explanation">
        <Info size={17} />
        <p>
          活動時間は同時記録をそれぞれ加算。記録済み時間は重なりをまとめ、二重に数えません。
          <br />
          記録済み・未記録は6:00〜24:00の範囲で集計します。今日の未来の時間は含みません。活動時間は0:00〜24:00の記録を集計します。
        </p>
      </div>
    </>
  );
}
