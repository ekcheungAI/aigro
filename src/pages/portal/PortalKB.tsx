import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  Clapperboard,
  FileText,
  Link2,
  NotebookPen,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Workflow,
} from "lucide-react";
import AdminSlideOver from "@/components/admin/AdminSlideOver";
import { useAdminToast } from "@/components/admin/AdminToast";
import QueryState from "@/components/QueryState";
import { usePortalExpert } from "@/components/portal/PortalLayout";
import { PORTAL_FIELD } from "@/components/portal/portal-ui";
import { timeAgo, useAdminQuery } from "@/components/admin/adminData";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

/* ---------------- 型別 ---------------- */

/** expert_knowledge.kind — 五種素材類型(v3 SQL CHECK) */
type KnowledgeKind = "note" | "link" | "file" | "video" | "playbook";
type KnowledgeStatus = "active" | "archived";

/** expert_knowledge 表行(updated_at / created_at 由 v3 SQL 提供,防禦性 optional) */
interface KnowledgeRow {
  id: string;
  expert_slug: string;
  kind: KnowledgeKind;
  title: string;
  content: string | null;
  url: string | null;
  tags: string[] | null;
  status: KnowledgeStatus;
  created_at?: string | null;
  updated_at?: string | null;
}

/** editor 欄位 */
interface KBFields {
  kind: KnowledgeKind;
  title: string;
  content: string;
  url: string;
  tags: string;
}

const EMPTY_FIELDS: KBFields = {
  kind: "note",
  title: "",
  content: "",
  url: "",
  tags: "",
};

const KIND_META: Record<
  KnowledgeKind,
  { label: string; desc: string; icon: typeof NotebookPen; chip: string }
> = {
  note: {
    label: "觀點 note",
    desc: "觀點 / 心得 — 你嘅第一手睇法,分身答相關問題會引用",
    icon: NotebookPen,
    chip: "bg-lime-soft text-lime-text",
  },
  link: {
    label: "文章 link",
    desc: "文章連結 + 摘要 — 分身會用你寫嘅摘要,唔係齋條 URL",
    icon: Link2,
    chip: "bg-card text-text-secondary",
  },
  video: {
    label: "影片 video",
    desc: "影片連結 + 重點 — 內容重點先係分身讀嘅部分",
    icon: Clapperboard,
    chip: "bg-card text-text-secondary",
  },
  playbook: {
    label: "方法論 playbook",
    desc: "方法論 / SOP — 分身指導訪客時照你嘅步驟行",
    icon: Workflow,
    chip: "bg-ink-soft text-ink",
  },
  file: {
    label: "文件 file",
    desc: "文件內容直接貼上 — 全文會注入分身上下文",
    icon: FileText,
    chip: "bg-card text-text-secondary",
  },
};

const KIND_ORDER: KnowledgeKind[] = ["note", "link", "video", "playbook", "file"];

/* ---------------- 查詢 + helpers ---------------- */

async function fetchMyKnowledge(slug: string): Promise<KnowledgeRow[]> {
  if (!supabase) throw new Error("Supabase 未連接 — 請檢查環境變數。");
  // select("*"):v3 SQL 嘅 timestamp 欄位名以最終 migration 為準,客戶端排序
  const { data, error } = await supabase
    .from("expert_knowledge")
    .select("*")
    .eq("expert_slug", slug)
    .limit(200);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as KnowledgeRow[];
  return rows.sort((a, b) =>
    (b.updated_at ?? b.created_at ?? "").localeCompare(
      a.updated_at ?? a.created_at ?? ""
    )
  );
}

function rlsHint(message: string): string {
  return `${message} — 可能係權限未開或表未建立:請先喺 Supabase SQL Editor 執行 supabase/v3-policies.sql(expert_knowledge 表 + expert CRUD policy)。`;
}

function fieldsToTags(tags: string): string[] {
  return tags
    .split(/[,，、]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/* ---------------- 新增 / 編輯 editor ---------------- */

function KBEditor({
  mode,
  initial,
  onSubmit,
  onCancel,
}: {
  mode: "new" | "edit";
  initial: KBFields;
  /** 回傳 null = 成功;否則係誠實 error 訊息 */
  onSubmit: (fields: KBFields) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<KnowledgeKind>(initial.kind);
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [url, setUrl] = useState(initial.url);
  const [tags, setTags] = useState(initial.tags);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = title.trim() !== "" && content.trim() !== "";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    const err = await onSubmit({ kind, title, content, url, tags });
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="flex h-full flex-col">
      <div className="flex-1 space-y-4 px-6 py-5">
        <div>
          <label
            htmlFor="kb-kind"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted"
          >
            素材類型 *
          </label>
          <select
            id="kb-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as KnowledgeKind)}
            className={cn(PORTAL_FIELD, "mt-1.5")}
          >
            {KIND_ORDER.map((k) => (
              <option key={k} value={k}>
                {KIND_META[k].label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
            {KIND_META[kind].desc}
          </p>
        </div>
        <div>
          <label
            htmlFor="kb-title"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted"
          >
            標題 *
          </label>
          <input
            id="kb-title"
            className={cn(PORTAL_FIELD, "mt-1.5")}
            placeholder="例:香港中小企導入 AI 客服嘅三個坑"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="kb-content"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted"
          >
            內容 / 重點摘要 *
          </label>
          <textarea
            id="kb-content"
            rows={8}
            className={cn(PORTAL_FIELD, "mt-1.5 resize-none leading-relaxed")}
            placeholder="分身會原句讀呢段 — 寫重點、立場、數字、步驟。越具體,分身答得越似你。"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <p className="mt-1 text-right font-mono text-[11px] text-text-muted">
            {content.length} 字
          </p>
        </div>
        <div>
          <label
            htmlFor="kb-url"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted"
          >
            連結(可選)
          </label>
          <div className="relative mt-1.5">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              id="kb-url"
              className={cn(PORTAL_FIELD, "pl-9")}
              placeholder="https://(原文 / 影片 / 文件連結)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="kb-tags"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted"
          >
            標籤
          </label>
          <input
            id="kb-tags"
            className={cn(PORTAL_FIELD, "mt-1.5")}
            placeholder="逗號分隔:AI 客服, 中小企"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
        <p className="rounded-md border border-dashed border-border-strong bg-card/60 px-3.5 py-2.5 text-xs leading-relaxed text-text-muted">
          儲存後即時生效 — active 狀態嘅知識會喺下一次對話注入你嘅 AI 分身,
          訪客問相關問題時分身會用呢啲第一手資料回答。
        </p>
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
          disabled={!valid || saving}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            valid && !saving
              ? "bg-lime text-on-accent hover:bg-lime-hover"
              : "cursor-not-allowed bg-card text-text-muted"
          )}
        >
          <Save className="h-4 w-4" />
          {saving ? "儲存中…" : mode === "edit" ? "儲存變更" : "加入知識庫"}
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
 * PortalKB `/portal/kb` — 分身知識庫(真產品)。
 * CRUD 全走 Supabase `expert_knowledge`(RLS:expert 管自己 slug);
 * active 知識由 argro /chat 即時注入分身 persona context — 上傳即用得上。
 */
export default function PortalKB() {
  const { slug, expert } = usePortalExpert();
  const toast = useAdminToast();
  const firstName = expert?.nameEn.split(" ")[0] ?? slug;

  const { data, loading, error, refetch } = useAdminQuery(
    () => fetchMyKnowledge(slug),
    [slug]
  );
  const [editorMode, setEditorMode] = useState<"new" | "edit" | null>(null);
  const [editingRow, setEditingRow] = useState<KnowledgeRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = useMemo(() => data ?? [], [data]);
  const activeCount = rows.filter((r) => r.status === "active").length;

  const submitNew = async (fields: KBFields): Promise<string | null> => {
    if (!supabase) return "Supabase 未連接 — 請檢查環境變數。";
    const { error: insertError } = await supabase
      .from("expert_knowledge")
      .insert({
        expert_slug: slug,
        kind: fields.kind,
        title: fields.title.trim(),
        content: fields.content.trim(),
        url: fields.url.trim() || null,
        tags: fieldsToTags(fields.tags),
        status: "active",
      });
    if (insertError) return rlsHint(`新增失敗:${insertError.message}`);
    setEditorMode(null);
    toast("已加入知識庫 — 分身下一次對話即時用得上");
    refetch();
    return null;
  };

  const submitEdit = async (
    row: KnowledgeRow,
    fields: KBFields
  ): Promise<string | null> => {
    if (!supabase) return "Supabase 未連接 — 請檢查環境變數。";
    const { error: updateError } = await supabase
      .from("expert_knowledge")
      .update({
        kind: fields.kind,
        title: fields.title.trim(),
        content: fields.content.trim(),
        url: fields.url.trim() || null,
        tags: fieldsToTags(fields.tags),
      })
      .eq("id", row.id);
    if (updateError) return rlsHint(`更新失敗:${updateError.message}`);
    setEditorMode(null);
    setEditingRow(null);
    toast("已更新 — 分身上下文同步更新");
    refetch();
    return null;
  };

  /** archive / restore(軟刪)— status 切換,行保留 */
  const toggleStatus = async (row: KnowledgeRow) => {
    if (!supabase) {
      toast("Supabase 未連接 — 請檢查環境變數");
      return;
    }
    const next: KnowledgeStatus = row.status === "active" ? "archived" : "active";
    setBusyId(row.id);
    const { error: updateError } = await supabase
      .from("expert_knowledge")
      .update({ status: next })
      .eq("id", row.id);
    setBusyId(null);
    if (updateError) {
      toast(rlsHint(`狀態切換失敗:${updateError.message}`));
      return;
    }
    toast(
      next === "archived"
        ? "已封存 — 分身唔會再用呢條(隨時可還原)"
        : "已還原 — 分身即刻用得返"
    );
    refetch();
  };

  const editorInitial: KBFields =
    editorMode === "edit" && editingRow
      ? {
          kind: editingRow.kind,
          title: editingRow.title,
          content: editingRow.content ?? "",
          url: editingRow.url ?? "",
          tags: (editingRow.tags ?? []).join(", "),
        }
      : EMPTY_FIELDS;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header + CTA */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
            Knowledge Base
          </p>
          <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
            分身知識庫
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {firstName} 嘅 AI 分身嘅第一手知識來源 — 你上傳,分身即刻用。
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingRow(null);
            setEditorMode("new");
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover"
        >
          <Plus className="h-4 w-4" />
          新增知識
        </button>
      </div>

      {/* 說明卡 — 後端已接通,呢段係真嘅 */}
      <div className="rounded-lg border border-lime/40 bg-lime-soft/50 px-5 py-4">
        <p className="flex items-start gap-2.5 text-sm leading-relaxed text-text-primary">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-lime-text" />
          <span>
            你上傳嘅內容會<span className="font-medium">即時注入你嘅 AI 分身</span>
            — 訪客問相關問題時,分身會用你嘅第一手資料回答。
            而家有 <span className="font-mono font-medium">{activeCount}</span> 條
            active 知識喺分身上下文。
          </span>
        </p>
      </div>

      {/* kind 指引 */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {KIND_ORDER.map((k) => {
          const meta = KIND_META[k];
          return (
            <div
              key={k}
              className="rounded-md border border-border bg-surface px-3.5 py-3"
            >
              <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                <meta.icon className="h-3.5 w-3.5 text-lime-text" />
                {meta.label}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
                {meta.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* 列表(expert_knowledge 真數據) */}
      <QueryState
        loading={loading}
        error={
          error
            ? `載入失敗:${error} — 可能係表未建立或權限未開:請先喺 Supabase SQL Editor 執行 supabase/v3-policies.sql。`
            : null
        }
        retry={refetch}
        empty={
          data && rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-strong px-6 py-14 text-center">
              <BookOpen className="mx-auto h-6 w-6 text-text-muted" />
              <p className="mt-3 text-sm font-medium text-text-primary">
                知識庫仲係空
              </p>
              <p className="mx-auto mt-1.5 max-w-[400px] text-xs leading-relaxed text-text-muted">
                用「新增知識」上傳你嘅觀點、文章摘要、方法論 —
                第一條加入之後,分身答相關問題就會引用你嘅資料。
              </p>
            </div>
          ) : null
        }
      >
        {rows.length > 0 && (
          <div className="space-y-3">
            {rows.map((row) => {
              const meta = KIND_META[row.kind] ?? KIND_META.note;
              const archived = row.status === "archived";
              const stamp = row.updated_at ?? row.created_at ?? null;
              return (
                <article
                  key={row.id}
                  className={cn(
                    "rounded-lg border border-border bg-surface px-5 py-4 transition-colors hover:border-border-strong",
                    archived && "opacity-60"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium",
                            meta.chip
                          )}
                        >
                          <meta.icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                        <h2 className="font-display text-[17px] font-medium text-text-primary">
                          {row.title}
                        </h2>
                        {archived && (
                          <span className="rounded-sm border border-dashed border-border-strong bg-card px-2 py-0.5 text-xs font-medium text-text-muted">
                            已封存
                          </span>
                        )}
                      </div>
                      {row.content && (
                        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-text-secondary">
                          {row.content}
                        </p>
                      )}
                      {row.tags && row.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {row.tags.map((t) => (
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
                      {stamp && (
                        <p className="font-mono text-xs text-text-muted">
                          更新於 {timeAgo(stamp)}
                        </p>
                      )}
                      {row.url && (
                        <p className="mt-1.5">
                          <a
                            href={row.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-lime-text underline-offset-2 hover:underline"
                          >
                            <Link2 className="h-3 w-3" />
                            連結
                          </a>
                        </p>
                      )}
                      <div className="mt-1.5 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRow(row);
                            setEditorMode("edit");
                          }}
                          className="inline-flex items-center gap-1 text-xs text-text-secondary underline-offset-2 hover:text-lime-text hover:underline"
                        >
                          <Pencil className="h-3 w-3" />
                          編輯
                        </button>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void toggleStatus(row)}
                          className="inline-flex items-center gap-1 text-xs text-text-secondary underline-offset-2 hover:text-[#A36A0F] hover:underline disabled:opacity-40"
                        >
                          {archived ? (
                            <>
                              <ArchiveRestore className="h-3 w-3" />
                              還原
                            </>
                          ) : (
                            <>
                              <Archive className="h-3 w-3" />
                              封存
                            </>
                          )}
                        </button>
                      </div>
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
          setEditingRow(null);
        }}
        title={editorMode === "edit" ? "編輯知識" : "新增知識"}
        subtitle="儲存後即時注入分身上下文(active 狀態先會注入)"
        width={520}
      >
        {editorMode !== null && (
          <KBEditor
            key={editorMode === "edit" ? editingRow?.id : "new"}
            mode={editorMode}
            initial={editorInitial}
            onSubmit={async (fields) =>
              editorMode === "edit" && editingRow
                ? submitEdit(editingRow, fields)
                : submitNew(fields)
            }
            onCancel={() => {
              setEditorMode(null);
              setEditingRow(null);
            }}
          />
        )}
      </AdminSlideOver>
    </div>
  );
}
