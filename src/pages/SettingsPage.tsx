import { useRef, useState } from "react";
import {
  Plus,
  ChevronRight,
  CalendarDays,
  Download,
  Upload,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type {
  AppData,
  Category,
  CategoryColor,
  CategoryIcon,
  WeekTemplate,
} from "../lib/types";
import { categoryColors, categoryIcons } from "../lib/types";
import { dayKey, minutesLabel, timeMinutes } from "../lib/time";
import { newId, putTemplate } from "../lib/model";
import { validateData } from "../lib/storage";
import { CategoryBadge, ActivityIcon } from "../components/Icon";
import { Modal } from "../components/Modal";
import type { Change } from "../components/RecordForm";
const weekdays = ["月", "火", "水", "木", "金", "土", "日"];
export function SettingsPage({
  data,
  change,
}: {
  data: AppData;
  change: Change;
}) {
  const [weekday, setWeekday] = useState((new Date().getDay() + 6) % 7);
  const [template, setTemplate] = useState<WeekTemplate | "new" | null>(null);
  const [category, setCategory] = useState<Category | "new" | null>(null);
  const [importData, setImportData] = useState<AppData | null>(null);
  const [message, setMessage] = useState("");
  const upload = useRef<HTMLInputElement>(null);
  const templates = data.templates
    .filter((t) => t.weekday === (weekday + 1) % 7)
    .sort((a, b) => a.startMinutes - b.startMinutes);
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `life-log-${dayKey()}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(
      "バックアップを書き出しました。大切な記録は定期的に保存してください。",
    );
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error("ファイルが大きすぎます。");
      setImportData(validateData(JSON.parse(await file.text())));
      setMessage("");
    } catch {
      setMessage(
        "このファイルは読み込めません。life logのバックアップを選んでください。",
      );
    }
    if (upload.current) upload.current.value = "";
  }
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">KEEP IT SIMPLE</div>
        <h1>自分に合う設定</h1>
        <p>いつもの予定を、いつものリズムで。</p>
      </div>
      <div className="settings-grid">
        <section className="panel template-panel">
          <div className="section-title">
            <h2>
              <CalendarDays size={20} />
              曜日テンプレート
            </h2>
            <span className="subtle-tag">自動記録</span>
          </div>
          <p className="section-description">
            学校や塾など、毎週の活動を登録。
            <br />
            タイマーを押さなくても記録が残ります。
          </p>
          <div className="weekday-tabs" aria-label="テンプレートの曜日">
            {weekdays.map((day, i) => (
              <button
                className={i === weekday ? "active" : ""}
                key={day}
                onClick={() => setWeekday(i)}
                aria-pressed={i === weekday}
              >
                {day}
              </button>
            ))}
          </div>
          <div className="template-list">
            {templates.length ? (
              templates.map((t) => {
                const c = data.categories.find((c) => c.id === t.categoryId)!;
                return (
                  <button
                    className="template-row"
                    key={t.id}
                    onClick={() => setTemplate(t)}
                  >
                    <span>
                      {minutesLabel(t.startMinutes)} –{" "}
                      {minutesLabel(t.endMinutes)}
                      {t.endMinutes < t.startMinutes && <small>翌日</small>}
                    </span>
                    <CategoryBadge category={c} small />
                    <strong>{c.name}</strong>
                    <ChevronRight size={16} />
                  </button>
                );
              })
            ) : (
              <div className="empty-template">
                <CalendarDays size={25} strokeWidth={1.3} />
                <p>{weekdays[weekday]}曜日のテンプレートはまだありません。</p>
              </div>
            )}
          </div>
          <button
            className="button soft full"
            onClick={() => setTemplate("new")}
          >
            <Plus size={18} />
            テンプレートを追加
          </button>
          <p className="field-hint template-hint">
            登録した日から毎週生成されます。アプリを開くと、開かなかった日の分も補完。変更は未生成の記録に反映し、その日の記録は「今日」で自由に編集できます。
          </p>
        </section>
        <section className="panel manage-panel">
          <div className="section-title">
            <h2>カテゴリー</h2>
            <button className="text-button" onClick={() => setCategory("new")}>
              <Plus size={16} />
              追加
            </button>
          </div>
          <p className="section-description">
            名前・アイコン・色を、自分好みに。
          </p>
          <div className="manage-list">
            {data.categories.map((c) => (
              <button
                className="manage-row"
                key={c.id}
                onClick={() => setCategory(c)}
              >
                <CategoryBadge category={c} small />
                <span>{c.name}</span>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
        </section>
        <section className="panel backup-panel">
          <div className="section-title">
            <h2>
              <ShieldCheck size={20} />
              大切な記録の保存
            </h2>
            <span className="tiny-label">LOCAL FIRST</span>
          </div>
          <p className="section-description">
            データはこのブラウザの中だけに保存されます。
            <br />
            ブラウザのデータを消す前に、バックアップを。
          </p>
          <div className="backup-buttons">
            <button className="button outline" onClick={download}>
              <Download size={17} />
              書き出す
            </button>
            <button
              className="button outline"
              onClick={() => upload.current?.click()}
            >
              <Upload size={17} />
              読み込む
            </button>
            <input
              type="file"
              ref={upload}
              hidden
              accept="application/json,.json"
              onChange={(e) => void importFile(e.target.files?.[0])}
            />
          </div>
          {message && (
            <p className="field-hint" role="status">
              {message}
            </p>
          )}
        </section>
      </div>
      <p className="settings-footer">
        life log <span>·</span> 日々の時間を、そっと記録。
      </p>
      {template && (
        <TemplateForm
          template={template === "new" ? undefined : template}
          weekday={(weekday + 1) % 7}
          data={data}
          change={change}
          onClose={() => setTemplate(null)}
        />
      )}
      {category && (
        <CategoryForm
          category={category === "new" ? undefined : category}
          data={data}
          change={change}
          onClose={() => setCategory(null)}
        />
      )}
      {importData && (
        <Modal
          title="バックアップを読み込む"
          subtitle="現在の記録を、このファイルの内容で置き換えます。"
          onClose={() => setImportData(null)}
        >
          <p className="import-description">
            {importData.records.length}件の記録・{importData.templates.length}
            件のテンプレート
            <br />
            必要なら先に現在のデータを書き出してください。
          </p>
          <div className="form">
            <button className="button outline" onClick={download}>
              現在のデータを書き出す
            </button>
            <button
              className="button primary"
              onClick={async () => {
                if (await change(() => importData)) {
                  setImportData(null);
                  setMessage("バックアップを読み込みました。");
                }
              }}
            >
              置き換えて読み込む
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function TemplateForm({
  template,
  weekday,
  data,
  change,
  onClose,
}: {
  template?: WeekTemplate;
  weekday: number;
  data: AppData;
  change: Change;
  onClose: () => void;
}) {
  const [category, setCategory] = useState(
    template?.categoryId ??
      data.categories.find((c) => c.kind === "school")?.id ??
      data.categories[0].id,
  );
  const [start, setStart] = useState(
    minutesLabel(template?.startMinutes ?? 510),
  );
  const [end, setEnd] = useState(minutesLabel(template?.endMinutes ?? 930));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const startMinutes = timeMinutes(start),
      endMinutes = timeMinutes(end);
    if (
      !Number.isFinite(startMinutes) ||
      !Number.isFinite(endMinutes) ||
      startMinutes === endMinutes
    ) {
      setError("開始と終了には異なる時刻を指定してください。");
      return;
    }
    setBusy(true);
    const success = await change((d) =>
      putTemplate(d, {
        id: template?.id ?? newId(),
        categoryId: category,
        weekday,
        startMinutes,
        endMinutes,
        createdDay: template?.createdDay ?? dayKey(),
      }),
    );
    setBusy(false);
    if (success) onClose();
    else setError("保存できませんでした。もう一度お試しください。");
  }
  async function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    const success = await change((d) => ({
      ...d,
      templates: d.templates.filter((t) => t.id !== template?.id),
    }));
    setBusy(false);
    if (success) onClose();
  }
  return (
    <Modal
      title={`${["日", "月", "火", "水", "木", "金", "土"][weekday]}曜日のテンプレート`}
      subtitle="一度決めれば、あとは自動で。"
      onClose={onClose}
    >
      <form className="form" onSubmit={submit}>
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
        <div className="form-pair">
          <label>
            開始時刻
            <input
              type="time"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            終了時刻
            <input
              type="time"
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        {end < start && (
          <p className="field-hint">終了は翌日の {end} として記録します。</p>
        )}
        <p className="field-hint">
          生成済みの記録は変更しません。変更は次回の生成から反映されます。
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {busy ? "保存中…" : "保存する"}
        </button>
        {template && (
          <button
            type="button"
            className="button danger-text"
            onClick={remove}
            disabled={busy}
          >
            <Trash2 size={17} />
            {confirmDelete ? "本当に削除する" : "テンプレートを削除"}
          </button>
        )}
      </form>
    </Modal>
  );
}
function CategoryForm({
  category,
  data,
  change,
  onClose,
}: {
  category?: Category;
  data: AppData;
  change: Change;
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState<CategoryIcon>(category?.icon ?? "dots");
  const [color, setColor] = useState<CategoryColor>(category?.color ?? "sage");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("カテゴリー名を入力してください。");
      return;
    }
    if (
      data.categories.some(
        (c) => c.id !== category?.id && c.name === name.trim(),
      )
    ) {
      setError("同じ名前のカテゴリーがあります。");
      return;
    }
    setBusy(true);
    const updated: Category = {
      id: category?.id ?? newId(),
      name: name.trim(),
      icon,
      color,
      kind: category?.kind ?? "other",
    };
    const success = await change((d) => ({
      ...d,
      categories: category
        ? d.categories.map((c) => (c.id === category.id ? updated : c))
        : [...d.categories, updated],
    }));
    setBusy(false);
    if (success) onClose();
    else setError("保存できませんでした。もう一度お試しください。");
  }
  return (
    <Modal
      title={category ? "カテゴリーを編集" : "カテゴリーを追加"}
      subtitle="毎日使うものを、わかりやすく。"
      onClose={onClose}
    >
      <form className="form" onSubmit={submit}>
        <label>
          名前
          <input
            value={name}
            required
            maxLength={24}
            placeholder="例：読書"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <fieldset>
          <legend>アイコン</legend>
          <div className="icon-options">
            {categoryIcons.map((i) => (
              <button
                type="button"
                className={`option-button ${icon === i ? "active" : ""}`}
                key={i}
                aria-label={`アイコン ${i}`}
                aria-pressed={icon === i}
                onClick={() => setIcon(i)}
              >
                <ActivityIcon name={i} />
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>表示色</legend>
          <div className="color-options">
            {categoryColors.map((c) => (
              <button
                type="button"
                className={`color-option color-${c} ${color === c ? "active" : ""}`}
                key={c}
                aria-label={`${{ sage: "緑", blue: "青", sand: "ベージュ", lavender: "紫", rose: "ピンク", gray: "グレー" }[c]}`}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
              >
                <span />
              </button>
            ))}
          </div>
        </fieldset>
        <div className="category-preview">
          <CategoryBadge
            category={{ id: "", name, icon, color, kind: "other" }}
          />
          <span>{name || "カテゴリー名"}</span>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {busy ? "保存中…" : "保存する"}
        </button>
      </form>
    </Modal>
  );
}
