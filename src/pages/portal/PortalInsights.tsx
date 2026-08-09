import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link2, NotebookPen, Pencil, Plus, Send, Trash2 } from "lucide-react";
import AdminSlideOver from "@/components/admin/AdminSlideOver";
import { useAdminToast } from "@/components/admin/AdminToast";
import QueryState from "@/components/QueryState";
import { usePortalExpert } from "@/components/portal/PortalLayout";
import { PORTAL_FIELD, WEEKLY_INSIGHT_QUOTA } from "@/components/portal/portal-ui";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  formatDate,
  timeAgo,
  useAdminQuery,
} from "@/components/admin/adminData";
import type { ItemStatus } from "@/components/admin/adminData";
import { INSIGHT_CATEGORIES } from "@/data/insights";

/* ---------------- 型別 ---------------- */

/** items 表 — 專家自己嘅投稿(items_expert_read_own 先睇到 pending/rejected) */
interface PortalItemRow {
  id: string;
  title: string;
  summary: string | null;
  local_commentary: string | null;
  original_url: string | null;
  category: string | null;
  tags: string[] | null;
  status: ItemStatus;
  published_at: string | null;
  fetched_at: string | null;
}

/** editor 欄位(本機草稿同投稿共用) */
interface DraftFields {
  title: string;
  summary: string;
  body: string;
  category: string;
  tags: string;
  sourceUrl: string;
}

interface LocalDraft extends DraftFields {
  /** 最後自動暫存時間(ISO) */
  savedAt: string;
}

const EMPTY_FIELDS: DraftFields = {
  title: "",
  summary: "",
  body: "",
  category: INSIGHT_CATEGORIES[0] ?? "行業動態",
  tags: "",
  sourceUrl: "",
};

const STATUS_META: Record<ItemStatus, { label: string; chip: string }> = {
  pending: { label: "審核中", chip: "bg-card text-[#A36A0F]" },
  reviewed: { label: "已檢閱", chip: "bg-card text-text-secondary" },
  published: { label: "已發佈", chip: "bg-lime-soft text-lime-text" },
  rejected: {
    label: "被拒",
    chip: "bg-card text-[#A63A30] line-through",
  },
};

/* ---------------- 本機草稿自動暫存(未提交先存本機) ---------------- */

function draftKey(slug: string) {
  return `aigro-portal-insight-draft-${slug}`;
}

function loadDraft(slug: string): LocalDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(slug));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalDraft>;
      if (parsed && typeof parsed === "object") {
        return { ...EMPTY_FIELDS, ...parsed, savedAt: parsed.savedAt ?? "" };
      }
    }
  } catch {
    /* private mode — 回 null */
  }
  return null;
}

function persistDraft(slug: string, draft: LocalDraft) {
  try {
    window.localStorage.setItem(draftKey(slug), JSON.stringify(draft));
  } catch {
    /* noop */
  }
}

function clearDraft(slug: string) {
  try {
    window.localStorage.removeItem(draftKey(slug));
  } catch {
    /* noop */
  }
}

function hasContent(f: DraftFields): boolean {
  return (
    f.title.trim() !== "" ||
    f.summary.trim() !== "" ||
    f.body.trim() !== "" ||
    f.tags.trim() !== "" ||
    f.sourceUrl.trim() !== ""
  );
}

/* ---------------- 投稿查詢 + helpers ---------------- */

async function fetchMyItems(slug: string): Promise<PortalItemRow[]> {
  if (!supabase) throw new Error("Supabase 未連接 — 請檢查環境變數。");
  const { data, error } = await supabase
    .from("items")
    .select(
      "id,title,summary,local_commentary,original_url,category,tags,status,published_at,fetched_at"
    )
    .eq("expert_slug", slug)
    .order("fetched_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as PortalItemRow[];
}

/** 本週一 00:00(本地時間)— 每週投稿配額嘅週界 */
function weekStartMs(): number {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
}

function newFingerprint(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `expert-${crypto.randomUUID()}`;
  }
  return `expert-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function rlsHint(message: string): string {
  return `${message} — 請由 Master Admin 檢查最新 migration 同 RLS readiness；唔好再執行已退役嘅 v2/v3 policy SQL。`;
}

function fieldsToTags(tags: string): string[] {
  return tags
    .split(/[,，、]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/* ---------------- 新增 / 編輯 editor ---------------- */

function InsightEditor({
  mode,
  initial,
  quotaFull,
  weeklyUsed,
  onAutosave,
  onSubmit,
  onCancel,
}: {
  /** new = 新投稿(insert);edit = 修改已提交嘅 pending/rejected(update 同 row) */
  mode: "new" | "edit";
  initial: DraftFields;
  /** 本週配額已滿(只影響新投稿;修改舊稿唔限) */
  quotaFull: boolean;
  weeklyUsed: number;
  /** new 模式:欄位變更自動暫存本機草稿 */
  onAutosave?: (fields: DraftFields) => void;
  /** 回傳 null = 成功;否則係誠實 error 訊息 */
  onSubmit: (fields: DraftFields) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [summary, setSummary] = useState(initial.summary);
  const [body, setBody] = useState(initial.body);
  const [category, setCategory] = useState(initial.category);
  const [tags, setTags] = useState(initial.tags);
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const fields: DraftFields = { title, summary, body, category, tags, sourceUrl };
  const valid =
    title.trim() !== "" && summary.trim() !== "" && body.trim() !== "";
  const blockNew = mode === "new" && quotaFull;

  // 自動暫存(debounce 600ms)— 只限 new 模式嘅本機草稿
  useEffect(() => {
    if (!onAutosave) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      onAutosave({ title, summary, body, category, tags, sourceUrl });
    }, 600);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, summary, body, category, tags, sourceUrl]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || saving || blockNew) return;
    setSaving(true);
    setError(null);
    const err = await onSubmit(fields);
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="flex h-full flex-col">
      <div className="flex-1 space-y-4 px-6 py-5">
        {blockNew && (
          <p className="rounded-md border border-[#A36A0F]/40 bg-card px-3.5 py-2.5 text-xs leading-relaxed text-[#A36A0F]">
            本週已提交 {weeklyUsed}/{WEEKLY_INSIGHT_QUOTA} 條,配額已滿 —
            提交掣已停用。內容會繼續自動暫存做本機草稿,下週一配額重置後先送審。
          </p>
        )}
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
            htmlFor="pi-body"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted"
          >
            全文 / 香港視角 *
          </label>
          <textarea
            id="pi-body"
            rows={7}
            className={cn(PORTAL_FIELD, "mt-1.5 resize-none leading-relaxed")}
            placeholder="完整內容 — 呢單嘢對香港讀者有咩意義?本地場景、限制、時間窗。"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="pi-category"
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted"
            >
              分類
            </label>
            <select
              id="pi-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={cn(PORTAL_FIELD, "mt-1.5")}
            >
              {INSIGHT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="pi-tags"
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted"
            >
              標籤
            </label>
            <input
              id="pi-tags"
              className={cn(PORTAL_FIELD, "mt-1.5")}
              placeholder="逗號分隔:GPT-5, 代理"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
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
        {mode === "new" ? (
          <p className="rounded-md border border-dashed border-border-strong bg-card/60 px-3.5 py-2.5 text-xs leading-relaxed text-text-muted">
            未提交嘅內容會自動暫存做本機草稿;提交後直入編輯部審核佇列
            (status = pending),審核通過先會上線。
          </p>
        ) : (
          <p className="rounded-md border border-dashed border-border-strong bg-card/60 px-3.5 py-2.5 text-xs leading-relaxed text-text-muted">
            修改會寫返同一條投稿,並重置做「審核中」重新送審。
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-md border border-[#A63A30]/40 bg-card px-3.5 py-2.5 text-xs leading-relaxed text-[#A63A30]"
          >
            {error}
          </p>
        )}
      </div>
      <div className="flex gap-2 border-t border-border px-6 py-4">
        <button
          type="submit"
          disabled={!valid || saving || blockNew}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            valid && !saving && !blockNew
              ? "bg-lime text-on-accent hover:bg-lime-hover"
              : "cursor-not-allowed bg-card text-text-muted"
          )}
        >
          <Send className="h-4 w-4" />
          {saving
            ? "提交中…"
            : blockNew
              ? "本週配額已滿"
              : mode === "edit"
                ? "儲存並重新送審"
                : "提交審核"}
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
 * 已投稿 = items 表真數據(expert_slug = 自己);
 * 未提交嘅內容自動暫存做本機草稿(localStorage,標明「本機草稿」)。
 */
export default function PortalInsights() {
  const { slug } = usePortalExpert();
  const toast = useAdminToast();
  const { data, loading, error, refetch } = useAdminQuery(
    () => fetchMyItems(slug),
    [slug]
  );
  const [draft, setDraft] = useState<LocalDraft | null>(() => loadDraft(slug));
  const [editorMode, setEditorMode] = useState<"new" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<PortalItemRow | null>(null);

  const items = useMemo(() => data ?? [], [data]);

  // 每週配額:本週(週一起)已提交嘅投稿數
  const weeklyUsed = useMemo(() => {
    const start = weekStartMs();
    return items.filter(
      (i) => i.fetched_at && Date.parse(i.fetched_at) >= start
    ).length;
  }, [items]);
  const quotaFull = weeklyUsed >= WEEKLY_INSIGHT_QUOTA;

  const autosaveDraft = (fields: DraftFields) => {
    if (!hasContent(fields)) return;
    const next: LocalDraft = { ...fields, savedAt: new Date().toISOString() };
    setDraft(next);
    persistDraft(slug, next);
  };

  const removeDraft = () => {
    clearDraft(slug);
    setDraft(null);
    toast("已刪除本機草稿");
  };

  const submitNew = async (fields: DraftFields): Promise<string | null> => {
    if (!supabase) return "Supabase 未連接 — 請檢查環境變數。";
    const { error: insertError } = await supabase.from("items").insert({
      title: fields.title.trim(),
      summary: fields.summary.trim(),
      local_commentary: fields.body.trim(),
      original_url: fields.sourceUrl.trim() || null,
      category: fields.category || null,
      tags: fieldsToTags(fields.tags),
      lang: "zh",
      status: "pending",
      placement: "normal",
      expert_slug: slug,
      fingerprint: newFingerprint(),
    });
    if (insertError) return rlsHint(`提交失敗:${insertError.message}`);
    clearDraft(slug);
    setDraft(null);
    setEditorMode(null);
    toast("已提交審核 — 編輯部審核通過後會上線");
    refetch();
    return null;
  };

  const submitEdit = async (
    item: PortalItemRow,
    fields: DraftFields
  ): Promise<string | null> => {
    if (!supabase) return "Supabase 未連接 — 請檢查環境變數。";
    const { error: updateError } = await supabase
      .from("items")
      .update({
        title: fields.title.trim(),
        summary: fields.summary.trim(),
        local_commentary: fields.body.trim(),
        original_url: fields.sourceUrl.trim() || null,
        category: fields.category || null,
        tags: fieldsToTags(fields.tags),
        status: "pending", // 被拒後修改 → 重新排隊審核
      })
      .eq("id", item.id);
    if (updateError) return rlsHint(`更新失敗:${updateError.message}`);
    setEditorMode(null);
    setEditingItem(null);
    toast("已更新並重新送審");
    refetch();
    return null;
  };

  const editorInitial: DraftFields =
    editorMode === "edit" && editingItem
      ? {
          title: editingItem.title,
          summary: editingItem.summary ?? "",
          body: editingItem.local_commentary ?? "",
          category: editingItem.category ?? EMPTY_FIELDS.category,
          tags: (editingItem.tags ?? []).join(", "),
          sourceUrl: editingItem.original_url ?? "",
        }
      : (draft ?? EMPTY_FIELDS);

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
          {/* Quota indicator — 真實本週提交數(items 表) */}
          <div className="w-40">
            <p className="flex items-baseline justify-between font-mono text-xs text-text-muted">
              <span>
                <span className="text-text-primary">{weeklyUsed}</span>/
                {WEEKLY_INSIGHT_QUOTA} 已提交
              </span>
              <span>本週</span>
            </p>
            <div className="mt-1.5 flex gap-1">
              {Array.from({ length: WEEKLY_INSIGHT_QUOTA }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full",
                    i < weeklyUsed ? "bg-lime" : "bg-border"
                  )}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setEditorMode("new");
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover"
          >
            <Plus className="h-4 w-4" />
            新增情報
          </button>
        </div>
      </div>

      {quotaFull && (
        <p className="rounded-md border border-[#A36A0F]/40 bg-card px-4 py-2.5 text-xs text-[#A36A0F]">
          本週已提交 {weeklyUsed}/{WEEKLY_INSIGHT_QUOTA} 條 — 新投稿暫停,
          下週一配額重置;審核中或舊稿修改唔受影響。
        </p>
      )}

      {/* 本機草稿(未提交)— 同已提交分開標示 */}
      {draft && hasContent(draft) && (
        <article className="rounded-lg border border-dashed border-border-strong bg-surface px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-[17px] font-medium text-text-primary">
                  {draft.title.trim() || "(無標題草稿)"}
                </h2>
                <span className="rounded-sm border border-dashed border-[#A36A0F]/50 bg-card px-2 py-0.5 text-xs font-medium text-[#A36A0F]">
                  本機草稿 — 未提交
                </span>
              </div>
              {draft.summary.trim() && (
                <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                  {draft.summary}
                </p>
              )}
              <p className="mt-2 font-mono text-[11px] text-text-muted">
                自動暫存於 {timeAgo(draft.savedAt)} — 只存喺呢個瀏覽器
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setEditorMode("new");
                }}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-lime hover:text-lime-text"
              >
                <Pencil className="h-3 w-3" />
                繼續編輯
              </button>
              <button
                type="button"
                onClick={removeDraft}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-muted transition-colors hover:border-[#A63A30]/50 hover:text-[#A63A30]"
              >
                <Trash2 className="h-3 w-3" />
                刪除
              </button>
            </div>
          </div>
        </article>
      )}

      {/* 已提交投稿(items 表真數據) */}
      <QueryState
        loading={loading}
        error={
          error
            ? `載入失敗:${error} — 請由 Master Admin 檢查最新 migration 同 RLS readiness。`
            : null
        }
        retry={refetch}
        empty={
          data && items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-strong px-6 py-14 text-center">
              <NotebookPen className="mx-auto h-6 w-6 text-text-muted" />
              <p className="mt-3 text-sm font-medium text-text-primary">
                未有已提交情報
              </p>
              <p className="mx-auto mt-1.5 max-w-[380px] text-xs leading-relaxed text-text-muted">
                用「新增情報」寫稿 — 未提交會自動暫存做本機草稿;
                提交後會喺呢度見到審核進度。
              </p>
            </div>
          ) : null
        }
      >
        {items.length > 0 && (
          <div className="space-y-4">
            {items.map((i) => {
              const meta = STATUS_META[i.status];
              const editable =
                i.status === "pending" || i.status === "rejected";
              return (
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
                            meta.chip
                          )}
                        >
                          {meta.label}
                        </span>
                        {i.category && (
                          <span className="rounded-sm bg-card px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                            {i.category}
                          </span>
                        )}
                      </div>
                      {i.summary && (
                        <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                          {i.summary}
                        </p>
                      )}
                      {i.tags && i.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {i.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-sm border border-lime/40 bg-lime-soft px-2 py-0.5 font-mono text-[11px] text-lime-text"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-xs text-text-muted">
                        {i.status === "published" && i.published_at
                          ? `發佈於 ${formatDate(i.published_at)}`
                          : `提交 ${timeAgo(i.fetched_at)}`}
                      </p>
                      {i.original_url && (
                        <p className="mt-1.5">
                          <a
                            href={i.original_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-lime-text underline-offset-2 hover:underline"
                          >
                            <Link2 className="h-3 w-3" />
                            原文
                          </a>
                        </p>
                      )}
                      {editable ? (
                        <p className="mt-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(i);
                              setEditorMode("edit");
                            }}
                            className="inline-flex items-center gap-1 text-xs text-text-secondary underline-offset-2 hover:text-lime-text hover:underline"
                          >
                            <Pencil className="h-3 w-3" />
                            {i.status === "rejected" ? "修改再提交" : "編輯"}
                          </button>
                        </p>
                      ) : (
                        <p className="mt-1.5 text-[11px] text-text-muted">
                          {i.status === "published"
                            ? "已發佈 — 唯讀"
                            : "已由編輯部檢閱"}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </QueryState>

      {/* Editor slide-over */}
      <AdminSlideOver
        open={editorMode !== null}
        onClose={() => {
          setEditorMode(null);
          setEditingItem(null);
        }}
        title={editorMode === "edit" ? "編輯投稿" : "新增情報"}
        subtitle={
          editorMode === "edit"
            ? "修改同一條投稿,儲存後重新送審"
            : "提交後直入編輯部審核佇列(status = pending)"
        }
        width={520}
      >
        {editorMode !== null && (
          <InsightEditor
            key={editorMode === "edit" ? editingItem?.id : "new"}
            mode={editorMode}
            initial={editorInitial}
            quotaFull={quotaFull}
            weeklyUsed={weeklyUsed}
            onAutosave={editorMode === "new" ? autosaveDraft : undefined}
            onSubmit={async (fields) =>
              editorMode === "edit" && editingItem
                ? submitEdit(editingItem, fields)
                : submitNew(fields)
            }
            onCancel={() => {
              setEditorMode(null);
              setEditingItem(null);
            }}
          />
        )}
      </AdminSlideOver>
    </div>
  );
}
