import { useState } from "react";
import type { FormEvent } from "react";
import { Link2, NotebookPen, Plus, Send } from "lucide-react";
import AdminSlideOver from "@/components/admin/AdminSlideOver";
import { useAdminToast } from "@/components/admin/AdminToast";
import { usePortalExpert } from "@/components/portal/PortalLayout";
import { PORTAL_FIELD, WEEKLY_INSIGHT_QUOTA } from "@/components/portal/portal-ui";
import { cn } from "@/lib/utils";

/**
 * 本機情報草稿 — 投稿後端(submissions 表)未接之前,
 * 「新增情報」寫嘅內容只存呢個瀏覽器 localStorage,
 * 一律標明「草稿 — 未發佈」;冇任何虛構嘅已發佈文章或瀏覽數。
 */
interface LocalInsightDraft {
  id: string;
  title: string;
  summary: string;
  hkAngle: string;
  sourceUrl: string;
  date: string;
}

function storageKey(slug: string) {
  return `aigro-portal-insights-${slug}`;
}

function loadDrafts(slug: string): LocalInsightDraft[] {
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as LocalInsightDraft[];
    }
  } catch {
    /* private mode — 回空陣列 */
  }
  return [];
}

function persistDrafts(slug: string, list: LocalInsightDraft[]) {
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(list));
  } catch {
    /* noop */
  }
}

/* ---------------- 新增情報 editor ---------------- */

function InsightEditor({
  onSave,
  onCancel,
}: {
  onSave: (draft: {
    title: string;
    summary: string;
    hkAngle: string;
    sourceUrl: string;
  }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [hkAngle, setHkAngle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const valid =
    title.trim() !== "" && summary.trim() !== "" && hkAngle.trim() !== "";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSave({
      title: title.trim(),
      summary: summary.trim(),
      hkAngle: hkAngle.trim(),
      sourceUrl: sourceUrl.trim(),
    });
  };

  return (
    <form onSubmit={submit} className="flex h-full flex-col">
      <div className="flex-1 space-y-4 px-6 py-5">
        <div>
          <label
            htmlFor="pi-title"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted"
          >
            標題 *
          </label>
          <input
            id="pi-title"
            className={cn(PORTAL_FIELD, "mt-1.5")}
            placeholder="例:OpenAI 發佈 GPT-5 統一模型"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="pi-summary"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted"
          >
            摘要 *
          </label>
          <textarea
            id="pi-summary"
            rows={3}
            className={cn(PORTAL_FIELD, "mt-1.5 resize-none leading-relaxed")}
            placeholder="兩三句講清事件本身 — 重質唔重量。"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="pi-angle"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted"
          >
            香港視角 *
          </label>
          <textarea
            id="pi-angle"
            rows={4}
            className={cn(PORTAL_FIELD, "mt-1.5 resize-none leading-relaxed")}
            placeholder="呢單嘢對香港讀者有咩意義?本地場景、限制、時間窗。"
            value={hkAngle}
            onChange={(e) => setHkAngle(e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="pi-source"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted"
          >
            原文連結
          </label>
          <div className="relative mt-1.5">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              id="pi-source"
              className={cn(PORTAL_FIELD, "pl-9")}
              placeholder="https://"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
          </div>
        </div>
        <p className="rounded-md border border-dashed border-border-strong bg-card/60 px-3.5 py-2.5 text-xs leading-relaxed text-text-muted">
          投稿後端(submissions 表)即將推出 — 而家提交只會存做本機草稿
          (未發佈),後端就位之後先會送去編輯部審核上線。
        </p>
      </div>
      <div className="flex gap-2 border-t border-border px-6 py-4">
        <button
          type="submit"
          disabled={!valid}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            valid
              ? "bg-lime text-on-accent hover:bg-lime-hover"
              : "cursor-not-allowed bg-card text-text-muted"
          )}
        >
          <Send className="h-4 w-4" />
          儲存草稿(未發佈)
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm text-text-secondary transition-colors hover:border-border-strong"
        >
          取消
        </button>
      </div>
    </form>
  );
}

/* ---------------- Page ---------------- */

/**
 * PortalInsights `/portal/insights` — 我的情報。
 * 後端未接:已發佈 = 真實嘅 0;本機草稿標明未發佈。
 */
export default function PortalInsights() {
  const { slug } = usePortalExpert();
  const toast = useAdminToast();
  const [list, setList] = useState<LocalInsightDraft[]>(() => loadDrafts(slug));
  const [editorOpen, setEditorOpen] = useState(false);

  const saveDraft = (draft: {
    title: string;
    summary: string;
    hkAngle: string;
    sourceUrl: string;
  }) => {
    const item: LocalInsightDraft = {
      id: `pi-local-${Date.now()}`,
      ...draft,
      date: new Date().toISOString().slice(0, 10),
    };
    const next = [item, ...list];
    setList(next);
    persistDrafts(slug, next);
    setEditorOpen(false);
    toast("已儲存本機草稿(未發佈)— 投稿後端就位後先會送審");
  };

  const removeDraft = (id: string) => {
    const next = list.filter((i) => i.id !== id);
    setList(next);
    persistDrafts(slug, next);
    toast("已刪除草稿");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header + quota + CTA */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
            My Insights
          </p>
          <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
            我的情報
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            以你嘅名義發佈嘅情報 — 每週最多 {WEEKLY_INSIGHT_QUOTA} 條,保持質量密度。
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Quota indicator — 已發佈真實係 0(後端未接) */}
          <div className="w-40">
            <p className="flex items-baseline justify-between font-mono text-xs text-text-muted">
              <span>
                <span className="text-text-primary">0</span>/
                {WEEKLY_INSIGHT_QUOTA} 已發佈
              </span>
              <span>本週</span>
            </p>
            <div className="mt-1.5 flex gap-1">
              {Array.from({ length: WEEKLY_INSIGHT_QUOTA }).map((_, i) => (
                <span key={i} className="h-1 flex-1 rounded-full bg-border" />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover"
          >
            <Plus className="h-4 w-4" />
            新增情報
          </button>
        </div>
      </div>

      <p className="rounded-md border border-border bg-card/60 px-4 py-2.5 text-xs text-text-muted">
        投稿後端即將推出 — 你而家有 {list.length} 份本機草稿(未發佈),
        已發佈情報真實數目係 0。
      </p>

      {/* Draft list */}
      <div className="space-y-4">
        {list.map((i) => (
          <article
            key={i.id}
            className="rounded-lg border border-dashed border-border-strong bg-surface px-5 py-4 transition-colors hover:border-border-strong"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-[17px] font-medium text-text-primary">
                    {i.title}
                  </h2>
                  <span className="rounded-sm border border-dashed border-[#A36A0F]/50 bg-card px-2 py-0.5 text-xs font-medium text-[#A36A0F]">
                    草稿 — 未發佈
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                  {i.summary}
                </p>
                <p className="mt-2 border-l-2 border-lime pl-3 text-xs leading-relaxed text-text-muted">
                  <span className="font-medium text-lime-text">香港視角 — </span>
                  {i.hkAngle}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-xs text-text-muted">{i.date}</p>
                {i.sourceUrl && (
                  <p className="mt-1.5">
                    <a
                      href={i.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-lime-text underline-offset-2 hover:underline"
                    >
                      <Link2 className="h-3 w-3" />
                      原文
                    </a>
                  </p>
                )}
                <p className="mt-1.5">
                  <button
                    type="button"
                    onClick={() => removeDraft(i.id)}
                    className="text-xs text-text-muted underline-offset-2 hover:text-[#A63A30] hover:underline"
                  >
                    刪除草稿
                  </button>
                </p>
              </div>
            </div>
          </article>
        ))}
        {list.length === 0 && (
          <div className="rounded-lg border border-dashed border-border-strong px-6 py-14 text-center">
            <NotebookPen className="mx-auto h-6 w-6 text-text-muted" />
            <p className="mt-3 text-sm font-medium text-text-primary">
              未有已發佈情報
            </p>
            <p className="mx-auto mt-1.5 max-w-[380px] text-xs leading-relaxed text-text-muted">
              投稿後端(submissions 表)即將推出 — 你可以先用「新增情報」寫本機草稿,
              後端就位之後一次過送審上線。
            </p>
          </div>
        )}
      </div>

      {/* Editor slide-over */}
      <AdminSlideOver
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title="新增情報"
        subtitle="投稿後端未接 — 提交會存做本機草稿(未發佈)"
        width={520}
      >
        <InsightEditor
          onSave={saveDraft}
          onCancel={() => setEditorOpen(false)}
        />
      </AdminSlideOver>
    </div>
  );
}
