import { useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Layers2,
} from "lucide-react";
import type { Activity, AppData } from "../lib/types";
import {
  dayBounds,
  dayKey,
  shiftDay,
  clockTime,
  dateLabel,
  formatDuration,
  atMinute,
} from "../lib/time";
import { layoutTimeline, summarize } from "../lib/analytics";
import { RecordForm } from "../components/RecordForm";
import type { Change } from "../components/RecordForm";
import { ActivityIcon } from "../components/Icon";
export function TodayPage({
  data,
  now,
  change,
}: {
  data: AppData;
  now: number;
  change: Change;
}) {
  const [day, setDay] = useState(dayKey(now));
  const [editing, setEditing] = useState<Activity | "new" | null>(null);
  const [start, end] = dayBounds(day);
  const todaysRecords = useMemo(
    () =>
      data.records.filter(
        (r) =>
          r.startTime < end &&
          (r.endTime ?? Math.max(now, r.startTime + 1)) > start,
      ),
    [data.records, start, end, now],
  );
  const startHour = todaysRecords.some((r) => r.startTime < atMinute(day, 360))
    ? 0
    : 6;
  const hourHeight = 76;
  const items = layoutTimeline(todaysRecords, day, now, startHour, hourHeight);
  const summary = summarize(data, [day], now);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initializedDay = useRef("");
  const hours = Array.from({ length: 25 - startHour }, (_, i) => startHour + i);
  const currentTop =
    ((now - atMinute(day, startHour * 60)) / 3_600_000) * hourHeight;
  function initScroll(node: HTMLDivElement | null) {
    scrollRef.current = node;
    if (node && initializedDay.current !== day) {
      initializedDay.current = day;
      const target =
        items.find((i) => i.start <= now && i.end >= now) ?? items[0];
      node.scrollTop = target
        ? Math.max(0, target.top - 90)
        : day === dayKey(now)
          ? Math.max(0, currentTop - 160)
          : 0;
    }
  }
  return (
    <>
      <section className="today-card">
        <div className="date-toolbar">
          <button
            className="icon-button"
            aria-label="前の日"
            onClick={() => setDay(shiftDay(day, -1))}
          >
            <ChevronLeft size={21} />
          </button>
          <div className="date-picker">
            <strong>{dateLabel(day)}</strong>
            <label className="calendar-pick">
              <CalendarDays size={18} />
              <input
                type="date"
                aria-label="表示する日付"
                value={day}
                onChange={(e) => {
                  if (e.target.value) setDay(e.target.value);
                }}
              />
            </label>
          </div>
          <button
            className="icon-button"
            aria-label="次の日"
            onClick={() => setDay(shiftDay(day, 1))}
          >
            <ChevronRight size={21} />
          </button>
        </div>
        <div className="timeline-summary">
          <span>
            記録済み <strong>{formatDuration(summary.recorded)}</strong>
          </span>
          <span>
            勉強 <strong>{formatDuration(summary.study)}</strong>
          </span>
          {day !== dayKey(now) && (
            <button className="text-button" onClick={() => setDay(dayKey(now))}>
              今日へ
            </button>
          )}
        </div>
        {!todaysRecords.length && (
          <div className="timeline-empty">
            <span>まだ記録のない一日。</span>
            <button onClick={() => setEditing("new")}>
              ＋ あとから追加できます
            </button>
          </div>
        )}
        <div className="timeline-scroll" ref={initScroll}>
          <div
            className="timeline"
            style={{ height: (24 - startHour) * hourHeight + 24 }}
          >
            <div className="hour-grid">
              {hours.map((hour) => (
                <div
                  className="hour-line"
                  key={hour}
                  style={{ top: (hour - startHour) * hourHeight }}
                >
                  <span>{hour}:00</span>
                </div>
              ))}
            </div>
            <div className="timeline-events">
              {items.map((item) => {
                const category = data.categories.find(
                  (c) => c.id === item.record.categoryId,
                )!;
                const future = item.record.startTime > now;
                return (
                  <button
                    key={item.record.id}
                    className={`timeline-event color-${category.color} ${future ? "future-event" : ""} ${item.height < 55 ? "compact-event" : ""}`}
                    style={{
                      top: item.top,
                      height: item.height - 3,
                      left: `calc(${(item.lane / item.lanes) * 100}% + 2px)`,
                      width: `calc(${100 / item.lanes}% - 5px)`,
                    }}
                    aria-label={`${category.name} ${clockTime(item.start)}〜${item.end === end ? "24:00" : clockTime(item.end)}${item.record.source === "template" ? " 自動記録" : ""}を編集`}
                    onClick={() => setEditing(item.record)}
                  >
                    <div className="event-name">
                      <ActivityIcon name={category.icon} size={15} />
                      <strong>{category.name}</strong>
                      {item.record.source === "template" && (
                        <span className="auto-badge">自動</span>
                      )}
                      {item.record.endTime === null && (
                        <span className="event-live" />
                      )}
                    </div>
                    <span className="event-time">
                      {clockTime(item.start)} –{" "}
                      {item.record.endTime === null
                        ? "記録中"
                        : item.end === end
                          ? "24:00"
                          : clockTime(item.end)}
                    </span>
                  </button>
                );
              })}
              {day === dayKey(now) &&
                currentTop >= 0 &&
                currentTop < (24 - startHour) * hourHeight && (
                  <div className="now-line" style={{ top: currentTop }}>
                    <span>{clockTime(now)}</span>
                    <i />
                  </div>
                )}
            </div>
          </div>
        </div>
        <button
          className="button primary add-record"
          aria-label="記録を追加"
          onClick={() => setEditing("new")}
        >
          <Plus size={22} />
        </button>
        <div className="timeline-footer">
          <Layers2 size={16} />
          <span>重なった記録は横に並びます。タップで編集。</span>
        </div>
      </section>
      <p className="quiet-note timeline-note">
        空白は「未記録」の時間。あとから自由に追加できます。
      </p>
      {editing && (
        <RecordForm
          record={editing === "new" ? undefined : editing}
          day={day}
          data={data}
          now={now}
          change={change}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
