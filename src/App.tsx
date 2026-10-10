import { useState } from "react";
import {
  Clock3,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Settings2,
  Sprout,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";
import { useAppData } from "./lib/useAppData";
import { dayKey, dateLabel } from "./lib/time";
import { RecordPage } from "./pages/RecordPage";
import { TodayPage } from "./pages/TodayPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { SettingsPage } from "./pages/SettingsPage";
type Tab = "record" | "today" | "analysis" | "settings";
const tabs = [
  { id: "record" as Tab, label: "記録", icon: Clock3 },
  { id: "today" as Tab, label: "今日", icon: CalendarDays },
  { id: "analysis" as Tab, label: "分析", icon: ChartNoAxesColumnIncreasing },
  { id: "settings" as Tab, label: "設定", icon: Settings2 },
];
export default function App() {
  const [tab, setTab] = useState<Tab>("record");
  const { data, now, busy, error, change, reload } = useAppData();
  const goTab = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            goTab("record");
          }}
        >
          <span className="brand-mark">
            <Sprout size={25} strokeWidth={1.6} />
          </span>
          <span>
            life log<small>日々の時間を、そっと。</small>
          </span>
        </a>
        <nav aria-label="メインナビゲーション">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => goTab(id)}
            >
              <Icon size={21} strokeWidth={1.7} />
              <span>{label}</span>
              {tab === id && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Sprout size={29} strokeWidth={1.2} />
          <p>
            時間を残す。
            <br />
            自分を知る。
          </p>
          <span>YOUR EVERYDAY, GENTLY.</span>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <a
            className="mobile-brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              goTab("record");
            }}
          >
            <Sprout size={23} strokeWidth={1.6} />
            life log
          </a>
          <span className="topbar-date">{dateLabel(dayKey(now))}</span>
          <span className="local-badge">
            <span />
            この端末に保存
          </span>
        </header>
        <main id="main-content">
          {error && (
            <div className="error-banner" role="alert">
              <AlertCircle size={20} />
              <div>{error}</div>
              {!data && (
                <button onClick={() => void reload()}>
                  再試行
                  <ArrowUpRight size={16} />
                </button>
              )}
            </div>
          )}
          {!data ? (
            <div className="loading-state">
              <Sprout size={34} strokeWidth={1.3} />
              <p>
                {error
                  ? "ブラウザの保存設定をご確認ください。"
                  : "記録を読み込んでいます…"}
              </p>
            </div>
          ) : (
            <>
              {tab === "record" && (
                <RecordPage
                  data={data}
                  now={now}
                  busy={busy}
                  change={change}
                  goToday={() => goTab("today")}
                />
              )}
              {tab === "today" && (
                <TodayPage data={data} now={now} change={change} />
              )}
              {tab === "analysis" && <AnalysisPage data={data} now={now} />}
              {tab === "settings" && (
                <SettingsPage data={data} change={change} />
              )}
            </>
          )}
        </main>
        <footer className="desktop-footer">
          毎日に、少しの余白を。<span>life log</span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="タブナビゲーション">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => goTab(id)}
          >
            <span>
              <Icon size={23} strokeWidth={tab === id ? 2 : 1.6} />
            </span>
            <strong>{label}</strong>
          </button>
        ))}
      </nav>
    </div>
  );
}
