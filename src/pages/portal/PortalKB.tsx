import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Archive,
  BookOpen,
  Check,
  Clapperboard,
  Clock3,
  FileText,
  Link2,
  LoaderCircle,
  NotebookPen,
  Plus,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";
import AdminSlideOver from "@/components/admin/AdminSlideOver";
import { useAdminToast } from "@/components/admin/AdminToast";
import QueryState from "@/components/QueryState";
import { usePortalExpert } from "@/components/portal/PortalLayout";
import { PORTAL_FIELD } from "@/components/portal/portal-ui";
import { timeAgo, useAdminQuery } from "@/components/admin/adminData";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type SourceType = "manual" | "url" | "pdf" | "youtube";
type RevisionStatus =
  | "queued"
  | "processing"
  | "review"
  | "approved"
  | "rejected"
  | "failed"
  | "archived";

interface RevisionRow {
  id: string;
  revision_no: number;
  extracted_text: string | null;
  distilled_json: Record<string, unknown> | null;
  status: RevisionStatus;
  error_message: string | null;
  approved_at: string | null;
  created_at: string;
  distillation_jobs?: Array<{
    stage: string;
    status: string;
    attempts: number;
    error_message: string | null;
  }>;
}

interface SourceRow {
  id: string;
  source_type: SourceType;
  title: string;
  source_url: string | null;
  tags: string[];
  published_revision_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  knowledge_revisions: RevisionRow[];
}

const SOURCE_META: Record<
  SourceType,
  { label: string; description: string; icon: typeof NotebookPen }
> = {
  manual: {
    label: "文字",
    description: "第一手觀點、方法、例子或完整筆記",
    icon: NotebookPen,
  },
  url: {
    label: "網頁 URL",
    description: "系統會抽取主要文章內容，再交俾你審批",
    icon: Link2,
  },
  pdf: {
    label: "PDF",
    description: "私人上傳；原檔不會公開",
    icon: FileText,
  },
  youtube: {
    label: "YouTube",
    description: "先讀字幕，沒有字幕時使用語音轉錄",
    icon: Clapperboard,
  },
};

const STATUS_LABEL: Record<RevisionStatus, string> = {
  queued: "等待處理",
  processing: "蒸餾中",
  review: "等待審批",
  approved: "已批准",
  rejected: "已拒絕",
  failed: "處理失敗",
  archived: "已封存",
};

async function fetchKnowledge(slug: string): Promise<SourceRow[]> {
  if (!supabase) throw new Error("Supabase 未連接");
  const { data: expert, error: expertError } = await supabase
    .from("experts")
    .select("id")
    .eq("slug", slug)
    .single();
  if (expertError || !expert) throw new Error(expertError?.message ?? "專家身份未建立");
  const { data, error } = await supabase
    .from("knowledge_sources")
    .select(
      "id,source_type,title,source_url,tags,published_revision_id,archived_at,created_at,updated_at,knowledge_revisions(id,revision_no,extracted_text,distilled_json,status,error_message,approved_at,created_at,distillation_jobs(stage,status,attempts,error_message))"
    )
    .eq("expert_id", expert.id)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SourceRow[];
}

function latestRevision(source: SourceRow): RevisionRow | null {
  return [...(source.knowledge_revisions ?? [])]
    .sort((a, b) => b.revision_no - a.revision_no)[0] ?? null;
}

function safeFilename(name: string): string {
  const extension = name.toLowerCase().endsWith(".pdf") ? ".pdf" : "";
  const base = name
    .replace(/\.pdf$/i, "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "document";
  return `${base}${extension}`;
}

function SourceEditor({ slug, onDone }: { slug: string; onDone: () => void }) {
  const toast = useAdminToast();
  const [sourceType, setSourceType] = useState<SourceType>("manual");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = title.trim().length >= 2 && (
    (sourceType === "manual" && content.trim().length >= 20) ||
    ((sourceType === "url" || sourceType === "youtube") && /^https:\/\//i.test(url.trim())) ||
    (sourceType === "pdf" && file?.type === "application/pdf")
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || saving || !supabase) return;
    setSaving(true);
    setError(null);
    let storagePath: string | null = null;
    try {
      if (sourceType === "pdf" && file) {
        storagePath = `${slug}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("expert-kb")
          .upload(storagePath, file, { contentType: "application/pdf", upsert: false });
        if (uploadError) throw uploadError;
      }
      const { error: rpcError } = await supabase.rpc("create_knowledge_source", {
        p_expert_slug: slug,
        p_source_type: sourceType,
        p_title: title.trim(),
        p_source_url: url.trim() || null,
        p_raw_text: sourceType === "manual" ? content.trim() : null,
        p_storage_path: storagePath,
        p_tags: tags.split(/[,，、]/).map((tag) => tag.trim()).filter(Boolean),
      });
      if (rpcError) {
        if (storagePath) await supabase.storage.from("expert-kb").remove([storagePath]);
        throw rpcError;
      }
      toast("素材已進入蒸餾佇列；完成後要審批先會發佈");
      onDone();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "未能建立素材";
      setError(message.includes("cms_ingestion_disabled")
        ? "CMS 尚未為呢位導師開啟，請由 admin Studio 啟用。"
        : message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="flex h-full flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(SOURCE_META) as SourceType[]).map((type) => {
            const meta = SOURCE_META[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSourceType(type)}
                className={cn(
                  "press rounded-md border px-3 py-3 text-left transition-colors",
                  sourceType === type ? "border-lime bg-lime-soft" : "border-border bg-surface"
                )}
              >
                <meta.icon className="h-4 w-4 text-lime-text" strokeWidth={1.5} />
                <span className="mt-1.5 block text-sm font-medium text-text-primary">{meta.label}</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-text-muted">
                  {meta.description}
                </span>
              </button>
            );
          })}
        </div>

        <label className="block text-xs text-text-muted">
          標題
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={cn(PORTAL_FIELD, "mt-1.5")}
            placeholder="例：香港中小企導入 AI 客服嘅三個坑"
          />
        </label>

        {sourceType === "manual" && (
          <label className="block text-xs text-text-muted">
            原文
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={12}
              className={cn(PORTAL_FIELD, "mt-1.5 resize-y leading-relaxed")}
              placeholder="寫低觀點、證據、數字、步驟同適用界線。"
            />
            <span className="mt-1 block text-right font-mono text-[11px]">{content.length} 字</span>
          </label>
        )}

        {(sourceType === "url" || sourceType === "youtube") && (
          <label className="block text-xs text-text-muted">
            {sourceType === "youtube" ? "YouTube URL" : "文章 URL"}
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className={cn(PORTAL_FIELD, "mt-1.5")}
              placeholder="https://"
            />
          </label>
        )}

        {sourceType === "pdf" && (
          <label className="block rounded-md border border-dashed border-border-strong bg-card p-5 text-xs text-text-muted">
            PDF（最多 25 MB）
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-xs"
            />
          </label>
        )}

        <label className="block text-xs text-text-muted">
          標籤
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            className={cn(PORTAL_FIELD, "mt-1.5")}
            placeholder="AI 客服, 中小企"
          />
        </label>

        <p className="rounded-md border border-border bg-card px-4 py-3 text-xs leading-relaxed text-text-muted">
          素材會先經抽取、蒸餾和切塊。只有你或 admin 明確批准嘅 revision，先會成為分身回答來源。
        </p>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      </div>
      <div className="border-t border-border px-6 py-4">
        <button
          type="submit"
          disabled={!valid || saving}
          className="press inline-flex w-full items-center justify-center gap-2 rounded-md bg-lime px-4 py-2.5 text-sm font-medium text-on-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {saving ? "建立中…" : "加入蒸餾佇列"}
        </button>
      </div>
    </form>
  );
}

function RevisionPreview({ source, revision }: { source: SourceRow; revision: RevisionRow }) {
  const distilled = revision.distilled_json;
  return (
    <div className="space-y-5 px-6 py-5">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">Revision {revision.revision_no}</p>
        <h2 className="mt-1 font-display text-xl text-text-primary">{source.title}</h2>
      </div>
      {revision.error_message && (
        <p className="rounded-md border border-border bg-card px-4 py-3 text-xs text-destructive">
          {revision.error_message}
        </p>
      )}
      {distilled && (
        <section>
          <h3 className="text-sm font-medium text-text-primary">蒸餾結果</h3>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-card p-4 font-mono text-[11px] leading-relaxed text-text-secondary">
            {JSON.stringify(distilled, null, 2)}
          </pre>
        </section>
      )}
      <section>
        <h3 className="text-sm font-medium text-text-primary">抽取原文</h3>
        <div className="mt-2 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface p-4 text-xs leading-relaxed text-text-secondary">
          {revision.extracted_text || "仍在處理，暫未有可預覽內容。"}
        </div>
      </section>
    </div>
  );
}

export default function PortalKB() {
  const { slug, expert } = usePortalExpert();
  const toast = useAdminToast();
  const { data, loading, error, refetch } = useAdminQuery(() => fetchKnowledge(slug), [slug]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [preview, setPreview] = useState<{ source: SourceRow; revision: RevisionRow } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const rows = useMemo(() => data ?? [], [data]);
  const publishedCount = rows.filter((row) => row.published_revision_id && !row.archived_at).length;
  const reviewCount = rows.filter((row) => latestRevision(row)?.status === "review").length;

  const reviewRevision = async (revision: RevisionRow, decision: "approve" | "reject") => {
    if (!supabase) return;
    setBusyId(revision.id);
    const { error: reviewError } = await supabase.rpc("review_knowledge_revision", {
      p_revision_id: revision.id,
      p_decision: decision,
      p_notes: null,
    });
    setBusyId(null);
    if (reviewError) {
      toast(`審批失敗：${reviewError.message}`);
      return;
    }
    toast(decision === "approve" ? "Revision 已批准並發佈" : "Revision 已拒絕");
    refetch();
  };

  const archiveSource = async (source: SourceRow) => {
    if (!supabase) return;
    setBusyId(source.id);
    const archived = !source.archived_at;
    const { error: archiveError } = await supabase
      .from("knowledge_sources")
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq("id", source.id);
    setBusyId(null);
    if (archiveError) toast(`狀態更新失敗：${archiveError.message}`);
    else {
      toast(archived ? "素材已封存；已發佈 revision 不再列入管理工作流" : "素材已還原");
      refetch();
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">Knowledge Studio</p>
          <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">分身知識蒸餾</h1>
          <p className="mt-1 text-sm text-text-muted">
            {expert?.nameEn ?? slug} 嘅素材會經處理及審批，唔會未經確認直接進入分身。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditorOpen(true)}
          className="press inline-flex items-center gap-2 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent"
        >
          <Plus className="h-4 w-4" /> 新增素材
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "素材", value: rows.length, icon: BookOpen },
          { label: "待審批", value: reviewCount, icon: Clock3 },
          { label: "已發佈", value: publishedCount, icon: ShieldCheck },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-border bg-surface p-4">
            <item.icon className="h-4 w-4 text-lime-text" strokeWidth={1.5} />
            <p className="mt-3 font-mono text-2xl text-text-primary">{item.value}</p>
            <p className="mt-1 text-xs text-text-muted">{item.label}</p>
          </div>
        ))}
      </div>

      <QueryState
        loading={loading}
        error={error ? `載入失敗：${error}` : null}
        retry={refetch}
        empty={data && rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong px-6 py-16 text-center">
            <BookOpen className="mx-auto h-6 w-6 text-text-muted" />
            <p className="mt-3 text-sm font-medium text-text-primary">知識庫仲係空</p>
            <p className="mt-1 text-xs text-text-muted">新增文字、URL、PDF 或 YouTube 開始蒸餾。</p>
          </div>
        ) : null}
      >
        <div className="space-y-3">
          {rows.map((source) => {
            const revision = latestRevision(source);
            const status = revision?.status ?? "queued";
            const meta = SOURCE_META[source.source_type];
            const archived = Boolean(source.archived_at);
            return (
              <article key={source.id} className={cn("rounded-lg border border-border bg-surface p-5", archived && "opacity-60")}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-sm bg-card px-2 py-1 text-xs text-text-secondary">
                        <meta.icon className="h-3.5 w-3.5" strokeWidth={1.5} /> {meta.label}
                      </span>
                      <span className={cn(
                        "rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-wider",
                        status === "approved" ? "border-lime bg-lime-soft text-lime-text" : "border-border text-text-muted"
                      )}>
                        {archived ? "已封存" : STATUS_LABEL[status]}
                      </span>
                      {source.published_revision_id && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-lime-text">
                          <Check className="h-3 w-3" /> 已上線
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 font-display text-lg text-text-primary">{source.title}</h2>
                    <p className="mt-1 text-xs text-text-muted">
                      {revision ? `Revision ${revision.revision_no} · ${timeAgo(revision.created_at)}` : "等待建立 revision"}
                      {revision?.distillation_jobs?.[0]
                        ? ` · ${revision.distillation_jobs[0].stage} · 嘗試 ${revision.distillation_jobs[0].attempts}/3`
                        : ""}
                    </p>
                    {revision?.error_message && <p className="mt-2 text-xs text-destructive">{revision.error_message}</p>}
                    {source.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {source.tags.map((tag) => <span key={tag} className="rounded-sm border border-border px-2 py-0.5 text-[11px] text-text-muted">{tag}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {revision && (
                      <button type="button" onClick={() => setPreview({ source, revision })} className="press rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary">
                        預覽
                      </button>
                    )}
                    {revision?.status === "review" && (
                      <>
                        <button disabled={busyId === revision.id} type="button" onClick={() => void reviewRevision(revision, "approve")} className="press inline-flex items-center gap-1 rounded-md bg-lime px-3 py-1.5 text-xs font-medium text-on-accent disabled:opacity-40">
                          <Check className="h-3.5 w-3.5" /> 批准
                        </button>
                        <button disabled={busyId === revision.id} type="button" onClick={() => void reviewRevision(revision, "reject")} className="press inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary disabled:opacity-40">
                          <X className="h-3.5 w-3.5" /> 拒絕
                        </button>
                      </>
                    )}
                    <button disabled={busyId === source.id} type="button" onClick={() => void archiveSource(source)} className="press inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-muted disabled:opacity-40">
                      {archived ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      {archived ? "還原" : "封存"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </QueryState>

      <AdminSlideOver open={editorOpen} onClose={() => setEditorOpen(false)} title="新增知識素材">
        <SourceEditor slug={slug} onDone={() => { setEditorOpen(false); refetch(); }} />
      </AdminSlideOver>
      <AdminSlideOver open={preview !== null} onClose={() => setPreview(null)} title="Revision 預覽">
        {preview && <RevisionPreview source={preview.source} revision={preview.revision} />}
      </AdminSlideOver>
    </div>
  );
}
