import { useState } from "react";
import type { FormEvent } from "react";
import { Eye, Link2, NotebookPen, Plus, Send } from "lucide-react";
import AdminSlideOver from "@/components/admin/AdminSlideOver";
import { useAdminToast } from "@/components/admin/AdminToast";
import { usePortalExpert } from "@/components/portal/PortalLayout";
import { PORTAL_FIELD } from "@/components/portal/portal-ui";
import { cn } from "@/lib/utils";
import {
  PORTAL_INSIGHT_QUOTA,
  portalInsights,
} from "@/data/portal-mock";
import type { PortalInsight, PortalInsightStatus } from "@/data/portal-mock";

/** 示範模式本地持久化(Supabase 接入後由 table 取代) */
function storageKey(slug: string) {
  return `aigro-portal-insights-${slug}`;
}

function loadInsights(slug: string): PortalInsight[] {
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* private mode — fall through to mock */
  }
  return portalInsights[slug] ?? [];
}

function persistInsights(slug: string, list: PortalInsight[]) {
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(list));
  } catch {
    /* noop */
  }
}

function statusChipClass(s: PortalInsightStatus) {
  if (s === "已發佈") return "bg-lime-soft text-lime-text";
  if (s === "待審核") return "bg-card text-[#A36A0F]";
  return "bg-card text-text-muted";
}

/* ---------------- 新增情報 editor ---------------- */

function InsightEditor({
  onPublish,
  onCancel,
}: {
  onPublish: (draft: {
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
    onPublish({
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
        <p className="rounded-md border border-border bg-card/60 px-3.5 py-2.5 text-xs leading-relaxed text-text-muted">
          提交後狀態為「待審核」— 編輯部審核通過先會喺公開情報區上線。
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
          發佈(提交審核)
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
 * PortalInsights `/portal/insights` — 我的情報(每週 max 3 規則)。
 * 列表 + quota hairline bar + 新增情報 slide-over editor。
 */
export default function PortalInsights() {
  const { slug } = usePortalExpert();
  const toast = useAdminToast();
  const [list, setList] = useState<PortalInsight[]>(() => loadInsights(slug));
  const [editorOpen, setEditorOpen] = useState(false);

  /** 已用配額 = 已發佈 + 待審核(已下架唔佔位) */
  const used = list.filter((i) => i.status !== "已下架").length;
  const full = used >= PORTAL_INSIGHT_QUOTA;

  const publish = (draft: {
    title: string;
    summary: string;
    hkAngle: string;
    sourceUrl: string;
  }) => {
    const item: PortalInsight = {
      id: `pi-local-${Date.now()}`,
      ...draft,
      date: new Date().toISOString().slice(0, 10),
      status: "待審核",
      views: 0,
    };
    const next = [item, ...list];
    setList(next);
    persistInsights(slug, next);
    setEditorOpen(false);
    toast("已提交,編輯部審核後上線");
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
            以你嘅名義發佈嘅情報 — 每週最多 {PORTAL_INSIGHT_QUOTA} 條,保持質量密度。
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Quota indicator */}
          <div className="w-40">
            <p className="flex items-baseline justify-between font-mono text-xs text-text-muted">
              <span>
                <span className="text-text-primary">{used}</span>/
                {PORTAL_INSIGHT_QUOTA} 已使用
              </span>
              <span>本週</span>
            </p>
            <div className="mt-1.5 flex gap-1">
              {Array.from({ length: PORTAL_INSIGHT_QUOTA }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full",
                    i < used ? "bg-lime" : "bg-border"
                  )}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            disabled={full}
            title={full ? "每週最多 3 條 — 保持質量密度" : undefined}
            onClick={() => setEditorOpen(true)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              full
                ? "cursor-not-allowed bg-card text-text-muted"
                : "bg-lime text-on-accent hover:bg-lime-hover"
            )}
          >
            <Plus className="h-4 w-4" />
            新增情報
          </button>
        </div>
      </div>
      {full && (
        <p className="rounded-md border border-border bg-card/60 px-4 py-2.5 text-xs text-text-muted">
          本週配額已用完 — 每週最多 {PORTAL_INSIGHT_QUOTA} 條,保持質量密度。下週一重置。
        </p>
      )}

      {/* List */}
      <div className="space-y-4">
        {list.map((i) => (
          <article
            key={i.id}
            className="rounded-lg border border-border bg-surface px-5 py-4 transition-colors hover:border-border-strong"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-[17px] font-medium text-text-primary">
                    {i.title}
                  </h2>
                  <span
                    className={cn(
                      "rounded-sm px-2 py-0.5 text-xs font-medium",
                      statusChipClass(i.status)
                    )}
                  >
                    {i.status}
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
                <p className="mt-1.5 inline-flex items-center gap-1 font-mono text-xs text-text-secondary">
                  <Eye className="h-3.5 w-3.5 text-text-muted" />
                  {i.status === "待審核" ? "—" : i.views.toLocaleString()}
                </p>
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
              </div>
            </div>
          </article>
        ))}
        {list.length === 0 && (
          <div className="rounded-lg border border-dashed border-border-strong px-6 py-14 text-center">
            <NotebookPen className="mx-auto h-6 w-6 text-text-muted" />
            <p className="mt-3 text-sm text-text-muted">
              仲未有情報 — 撳「新增情報」提交你嘅第一條香港視角。
            </p>
          </div>
        )}
      </div>

      {/* Editor slide-over */}
      <AdminSlideOver
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title="新增情報"
        subtitle={`本週配額 ${used}/${PORTAL_INSIGHT_QUOTA} — 提交後由編輯部審核`}
        width={520}
      >
        <InsightEditor
          onPublish={publish}
          onCancel={() => setEditorOpen(false)}
        />
      </AdminSlideOver>
    </div>
  );
}
