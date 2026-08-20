import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Archive,
  BookOpen,
  Check,
  Clapperboard,
  Clock3,
  ExternalLink,
  FileText,
  History,
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
import { safeHttpsUrl } from "@/lib/instructorRelease";
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
  storage_path: string | null;
  source_commit_sha: string | null;
  source_file_path: string | null;
  source_blob_url: string | null;
  content_hash: string | null;
  provider_meta: Record<string, unknown>;
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
  public_citation_url: string | null;
  public_citation_reviewed_by: string | null;
  public_citation_reviewed_at: string | null;
  public_citation_review_note: string | null;
  external_key: string | null;
  source_meta: Record<string, unknown>;
  tags: string[];
  rights_status: "unknown" | "requested" | "granted" | "restricted" | "revoked";
  rights_holder: string | null;
  rights_evidence_ref: string | null;
  rights_scope: Record<string, unknown>;
  expires_at: string | null;
  revoked_at: string | null;
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
      "id,source_type,title,source_url,public_citation_url,public_citation_reviewed_by,public_citation_reviewed_at,public_citation_review_note,external_key,source_meta,tags,rights_status,rights_holder,rights_evidence_ref,rights_scope,expires_at,revoked_at,published_revision_id,archived_at,created_at,updated_at,knowledge_revisions(id,revision_no,extracted_text,distilled_json,status,error_message,approved_at,created_at,storage_path,source_commit_sha,source_file_path,source_blob_url,content_hash,provider_meta,distillation_jobs(stage,status,attempts,error_message))"
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
  const [rightsHolder, setRightsHolder] = useState("");
  const [rightsEvidenceRef, setRightsEvidenceRef] = useState("");
  const [commercialRag, setCommercialRag] = useState(false);
  const [distillation, setDistillation] = useState(false);
  const [personaSynthesis, setPersonaSynthesis] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = title.trim().length >= 2 && (
    (sourceType === "manual" && content.trim().length >= 20) ||
    ((sourceType === "url" || sourceType === "youtube") && /^https:\/\//i.test(url.trim())) ||
    (sourceType === "pdf" && file?.type === "application/pdf")
  ) && rightsHolder.trim().length >= 2 && rightsEvidenceRef.trim().length >= 4 &&
    commercialRag && distillation && personaSynthesis;

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
      const { error: rpcError } = await supabase.rpc("create_authorized_knowledge_source", {
        p_expert_slug: slug,
        p_source_type: sourceType,
        p_title: title.trim(),
        p_rights_holder: rightsHolder.trim(),
        p_rights_evidence_ref: rightsEvidenceRef.trim(),
        p_rights_scope: {
          commercial_rag: commercialRag,
          distillation,
          persona_synthesis: personaSynthesis,
          model_training: false,
        },
        p_source_url: url.trim() || null,
        p_raw_text: sourceType === "manual" ? content.trim() : null,
        p_storage_path: storagePath,
        p_tags: tags.split(/[,，、]/).map((tag) => tag.trim()).filter(Boolean),
      });
      if (rpcError) throw rpcError;
      toast("素材已進入蒸餾佇列；完成後要審批先會發佈");
      onDone();
    } catch (caught) {
      if (storagePath) {
        try {
          await supabase.storage.from("expert-kb").remove([storagePath]);
        } catch {
          /* Do not hide the original ingestion/rights error. */
        }
      }
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

        <section className="space-y-3 rounded-md border border-border bg-card p-4">
          <div>
            <p className="text-sm font-medium text-text-primary">使用權利聲明</p>
            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
              只有你明確授權 AI 檢索、蒸餾同 persona 合成，素材先可以進入審批；證明可以填合約、原作者授權或公開權利頁面。
            </p>
          </div>
          <label className="block text-xs text-text-muted">
            權利持有人
            <input value={rightsHolder} onChange={(event) => setRightsHolder(event.target.value)} className={cn(PORTAL_FIELD, "mt-1.5")} placeholder="例：本人／公司名稱／授權機構" />
          </label>
          <label className="block text-xs text-text-muted">
            權利證明參考
            <input value={rightsEvidenceRef} onChange={(event) => setRightsEvidenceRef(event.target.value)} className={cn(PORTAL_FIELD, "mt-1.5")} placeholder="例：合約編號、公開授權 URL 或檔案路徑" />
          </label>
          <div className="space-y-2 text-xs text-text-secondary">
            {[
              ["commercial_rag", "允許作為 AI 檢索回答來源", commercialRag, setCommercialRag],
              ["distillation", "允許蒸餾成摘要及知識切塊", distillation, setDistillation],
              ["persona_synthesis", "允許用於授權 AI persona 合成", personaSynthesis, setPersonaSynthesis],
            ].map(([scope, label, checked, setChecked]) => (
              <label key={String(scope)} className="flex items-start gap-2">
                <input type="checkbox" checked={Boolean(checked)} onChange={(event) => (setChecked as (value: boolean) => void)(event.target.checked)} className="mt-0.5 accent-lime" />
                <span>{String(label)}</span>
              </label>
            ))}
          </div>
        </section>

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

const RIGHTS_SCOPES = [
  ["commercial_rag", "允許作為 AI 檢索回答來源"],
  ["distillation", "允許蒸餾成摘要及知識切塊"],
  ["persona_synthesis", "允許用於授權 AI persona 合成"],
] as const;

function rightsScopeEnabled(scope: Record<string, unknown>, key: string): boolean {
  return scope[key] === true || scope[key] === "true";
}

function RightsEditor({ source, onDone }: { source: SourceRow; onDone: () => void }) {
  const toast = useAdminToast();
  const [rightsHolder, setRightsHolder] = useState(source.rights_holder ?? "");
  const [rightsEvidenceRef, setRightsEvidenceRef] = useState(source.rights_evidence_ref ?? "");
  const [scope, setScope] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      RIGHTS_SCOPES.map(([key]) => [key, rightsScopeEnabled(source.rights_scope ?? {}, key)])
    )
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = rightsHolder.trim().length >= 2 && rightsEvidenceRef.trim().length >= 4 &&
    RIGHTS_SCOPES.every(([key]) => scope[key] === true);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || saving || !supabase) return;
    setSaving(true);
    setError(null);
    const { error: saveError } = await supabase.rpc("set_knowledge_source_rights", {
      p_source_id: source.id,
      p_rights_holder: rightsHolder.trim(),
      p_rights_evidence_ref: rightsEvidenceRef.trim(),
      p_rights_scope: {
        commercial_rag: scope.commercial_rag === true,
        distillation: scope.distillation === true,
        persona_synthesis: scope.persona_synthesis === true,
        model_training: false,
      },
    });
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    toast("素材使用權利已記錄");
    onDone();
  };

  const revoke = async () => {
    if (!supabase || saving || !window.confirm("撤回後，呢份素材唔會再用於檢索或 persona 合成。繼續？")) return;
    setSaving(true);
    setError(null);
    const { error: revokeError } = await supabase.rpc("revoke_knowledge_source_rights", {
      p_source_id: source.id,
      p_reason: "由專家在 Knowledge Studio 撤回",
    });
    setSaving(false);
    if (revokeError) {
      setError(revokeError.message);
      return;
    }
    toast("素材使用權利已撤回");
    onDone();
  };

  return (
    <form onSubmit={(event) => void save(event)} className="flex h-full flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">Rights record</p>
          <h2 className="mt-1 font-display text-xl text-text-primary">{source.title}</h2>
          <p className="mt-2 text-xs leading-relaxed text-text-muted">
            權利狀態：{source.rights_status === "granted" ? "已授權" : source.rights_status === "revoked" ? "已撤回" : "未確認"}。
            只有完整證明同三項用途授權，素材先可以進入檢索、蒸餾及 persona 發佈流程。
          </p>
        </div>
        <label className="block text-xs text-text-muted">
          權利持有人
          <input value={rightsHolder} onChange={(event) => setRightsHolder(event.target.value)} className={cn(PORTAL_FIELD, "mt-1.5")} placeholder="例：本人／公司名稱／授權機構" />
        </label>
        <label className="block text-xs text-text-muted">
          權利證明參考
          <input value={rightsEvidenceRef} onChange={(event) => setRightsEvidenceRef(event.target.value)} className={cn(PORTAL_FIELD, "mt-1.5")} placeholder="例：合約編號、公開授權 URL 或檔案路徑" />
        </label>
        <section className="space-y-2 rounded-md border border-border bg-card p-4">
          <p className="text-sm font-medium text-text-primary">允許用途</p>
          {RIGHTS_SCOPES.map(([key, label]) => (
            <label key={key} className="flex items-start gap-2 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={scope[key] === true}
                onChange={(event) => setScope((current) => ({ ...current, [key]: event.target.checked }))}
                className="mt-0.5 accent-lime"
              />
              <span>{label}</span>
            </label>
          ))}
          <p className="pt-1 text-[11px] leading-relaxed text-text-muted">模型訓練用途固定不開啟；本記錄只涵蓋 AIGRO 受控檢索、蒸餾及 persona 合成。</p>
        </section>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      </div>
      <div className="space-y-2 border-t border-border px-6 py-4">
        <button
          type="submit"
          disabled={!valid || saving}
          className="press inline-flex w-full items-center justify-center gap-2 rounded-md bg-lime px-4 py-2.5 text-sm font-medium text-on-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {saving ? "儲存中…" : "儲存權利記錄"}
        </button>
        {source.rights_status === "granted" && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void revoke()}
            className="press inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm text-text-secondary disabled:opacity-40"
          >
            <X className="h-4 w-4" /> 撤回授權
          </button>
        )}
      </div>
    </form>
  );
}

function PublicCitationEditor({ source, onDone }: { source: SourceRow; onDone: () => void }) {
  const toast = useAdminToast();
  const [url, setUrl] = useState(source.public_citation_url ?? "");
  const [reviewNote, setReviewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validUrl = url.trim() === "" || /^https:\/\/[^\s]+$/i.test(url.trim());
  const valid = validUrl && reviewNote.trim().length >= 5;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || saving || !valid) return;
    setSaving(true);
    setError(null);
    const { data, error: saveError } = await supabase.rpc(
      "set_knowledge_source_public_citation",
      {
        p_source_id: source.id,
        p_public_citation_url: url.trim() || null,
        p_review_note: reviewNote.trim(),
      },
    );
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    toast(data ? "公開引用連結已經人工核對" : "引用已設為私人來源，不會顯示連結");
    onDone();
  };

  return (
    <form onSubmit={(event) => void save(event)} className="flex h-full flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">Public citation review</p>
          <h2 className="mt-1 font-display text-xl text-text-primary">{source.title}</h2>
          <p className="mt-2 text-xs leading-relaxed text-text-muted">
            呢個欄位同抽取原文、私人 PDF、storage signed URL 完全分開。只會公開你確認過嘅 HTTPS 位置；系統會移除所有 query 同 fragment，頁碼、段落同時間會另外顯示。
          </p>
        </div>
        <label className="block text-xs text-text-muted">
          公開引用連結（留空即私人／不可點擊）
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className={cn(PORTAL_FIELD, "mt-1.5")}
            placeholder="https://公開來源（建議不含 ? 或 #）"
          />
        </label>
        <label className="block text-xs text-text-muted">
          人工核對記錄（最少 5 字）
          <textarea
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
            rows={4}
            className={cn(PORTAL_FIELD, "mt-1.5 resize-y")}
            placeholder="例：已核對呢個係可公開 canonical 頁面，冇登入或存取 token"
          />
        </label>
        {source.public_citation_reviewed_at && (
          <div className="rounded-md border border-border bg-card p-4 text-xs text-text-muted">
            上次核對：{new Date(source.public_citation_reviewed_at).toLocaleString("zh-HK")}
            {source.public_citation_review_note && <p className="mt-1">記錄：{source.public_citation_review_note}</p>}
          </div>
        )}
        {!validUrl && <p role="alert" className="text-xs text-destructive">只接受完整 HTTPS 公開連結。</p>}
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      </div>
      <div className="border-t border-border px-6 py-4">
        <button
          type="submit"
          disabled={!valid || saving}
          className="press inline-flex w-full items-center justify-center gap-2 rounded-md bg-lime px-4 py-2.5 text-sm font-medium text-on-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          {saving ? "儲存中…" : url.trim() ? "核對並儲存公開引用" : "確認保持私人引用"}
        </button>
      </div>
    </form>
  );
}

function RevisionPreview({ source, revision }: { source: SourceRow; revision: RevisionRow }) {
  const distilled = revision.distilled_json;
  const summary = typeof distilled?.summary === "string" ? distilled.summary : null;
  const claims = Array.isArray(distilled?.claims)
    ? distilled.claims.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    : [];
  const methods = Array.isArray(distilled?.methods) ? distilled.methods.map(String) : [];
  const boundaries = Array.isArray(distilled?.boundaries) ? distilled.boundaries.map(String) : [];
  const suggestedQuestions = Array.isArray(distilled?.suggested_questions)
    ? distilled.suggested_questions.map(String)
    : [];
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
          <div className="mt-2 space-y-4 rounded-md border border-border bg-card p-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Summary</p>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">{summary ?? "未有結構化摘要"}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Claims + evidence</p>
              {claims.length === 0 ? (
                <p className="mt-1 text-xs text-destructive">未有可核對 claim；唔應批准。</p>
              ) : claims.map((claim, index) => (
                <div key={`${revision.id}-claim-${index}`} className="mt-2 border-t border-border pt-2 first:border-t-0 first:pt-0">
                  <p className="text-xs font-medium text-text-primary">{String(claim.claim ?? "未命名 claim")}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-text-muted">Evidence：{String(claim.evidence ?? "未提供")}</p>
                  {Boolean(claim.locator) && <p className="mt-1 font-mono text-[10px] text-text-muted">Locator：{String(claim.locator)}</p>}
                </div>
              ))}
            </div>
            {[
              ["Methods", methods],
              ["Boundaries", boundaries],
              ["Suggested questions", suggestedQuestions],
            ].map(([label, items]) => (
              <div key={label as string}>
                <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{label as string}</p>
                <ul className="mt-1 space-y-1">
                  {(items as string[]).map((item, index) => <li key={`${label}-${index}`} className="text-xs leading-relaxed text-text-secondary">{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
      <section>
        <h3 className="text-sm font-medium text-text-primary">Provenance</h3>
        <dl className="mt-2 grid gap-2 rounded-md border border-border bg-card p-4 text-xs sm:grid-cols-2">
          <div><dt className="text-text-muted">來源檔案</dt><dd className="mt-1 break-all font-mono text-text-secondary">{revision.source_file_path ?? revision.storage_path ?? source.external_key ?? "—"}</dd></div>
          <div><dt className="text-text-muted">Pinned commit</dt><dd className="mt-1 break-all font-mono text-text-secondary">{revision.source_commit_sha ?? "—"}</dd></div>
          <div><dt className="text-text-muted">Content hash</dt><dd className="mt-1 break-all font-mono text-text-secondary">{revision.content_hash ?? "—"}</dd></div>
          <div><dt className="text-text-muted">Rights holder</dt><dd className="mt-1 text-text-secondary">{source.rights_holder ?? "—"}</dd></div>
        </dl>
      </section>
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
  const [rightsSource, setRightsSource] = useState<SourceRow | null>(null);
  const [citationSource, setCitationSource] = useState<SourceRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const rows = useMemo(() => data ?? [], [data]);
  const publishedCount = rows.filter((row) => row.published_revision_id && !row.archived_at).length;
  const reviewCount = rows.filter((row) => latestRevision(row)?.status === "review").length;

  const reviewRevision = async (revision: RevisionRow, decision: "approve" | "reject") => {
    if (!supabase) return;
    const notes = reviewNotes[revision.id]?.trim() ?? "";
    if (notes.length < 5) {
      toast("請先預覽原文同蒸餾內容，再寫低審批理由（最少 5 字）");
      return;
    }
    setBusyId(revision.id);
    const { error: reviewError } = await supabase.rpc("review_knowledge_revision", {
      p_revision_id: revision.id,
      p_decision: decision,
      p_notes: notes,
    });
    setBusyId(null);
    if (reviewError) {
      toast(`審批失敗：${reviewError.message}`);
      return;
    }
    setReviewNotes((current) => {
      const next = { ...current };
      delete next[revision.id];
      return next;
    });
    toast(decision === "approve" ? "Revision 已批准並發佈" : "Revision 已拒絕");
    refetch();
  };

  const openOriginal = async (source: SourceRow, revision: RevisionRow | null) => {
    let href = safeHttpsUrl(revision?.source_blob_url ?? null)
      ?? safeHttpsUrl(source.source_url);
    if (!href && revision?.storage_path && supabase) {
      const { data: signed, error: signedError } = await supabase.storage
        .from("expert-kb")
        .createSignedUrl(revision.storage_path, 300);
      if (signedError) {
        toast(`原檔未能開啟：${signedError.message}`);
        return;
      }
      href = safeHttpsUrl(signed?.signedUrl ?? null);
    }
    if (!href) {
      toast("呢個來源冇可安全開啟嘅原檔連結");
      return;
    }
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const archiveSource = async (source: SourceRow) => {
    if (!supabase) return;
    setBusyId(source.id);
    const archived = !source.archived_at;
    const { error: archiveError } = await supabase.rpc(
      "set_knowledge_source_archived",
      { p_source_id: source.id, p_archived: archived }
    );
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
                    <span className={cn(
                      "rounded-sm border px-2 py-1 text-[10px]",
                      source.rights_status === "granted" ? "border-lime bg-lime-soft text-lime-text" : "border-border text-text-muted"
                    )}>
                       權利：{source.rights_status === "granted" ? "已授權" : source.rights_status === "revoked" ? "已撤回" : "未確認"}
                     </span>
                    <span className={cn(
                      "ml-2 rounded-sm border px-2 py-1 text-[10px]",
                      source.public_citation_url && source.public_citation_reviewed_at
                        ? "border-lime bg-lime-soft text-lime-text"
                        : "border-border text-text-muted",
                    )}>
                      公開引用：{source.public_citation_url ? "已核對" : "私人"}
                    </span>
                    <div className="mt-3 space-y-1 text-[11px] text-text-muted">
                      <p className="break-all">
                        Reference：{revision?.source_file_path ?? revision?.storage_path ?? source.external_key ?? source.source_url ?? "—"}
                      </p>
                      <p>
                        Rights holder：{source.rights_holder ?? "—"}
                        {source.expires_at ? ` · 到期 ${source.expires_at.slice(0, 10)}` : ""}
                      </p>
                       {revision?.source_commit_sha && <p className="font-mono">Commit：{revision.source_commit_sha}</p>}
                      <p className="break-all">Public citation：{source.public_citation_url ?? "私人來源（不顯示連結）"}</p>
                    </div>
                    {source.knowledge_revisions.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
                          <History className="h-3.5 w-3.5" strokeWidth={1.5} /> Revision history
                        </span>
                        {[...source.knowledge_revisions]
                          .sort((a, b) => b.revision_no - a.revision_no)
                          .map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setPreview({ source, revision: item })}
                              className="press rounded-sm border border-border px-2 py-1 font-mono text-[10px] text-text-secondary"
                            >
                              v{item.revision_no} · {STATUS_LABEL[item.status]}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button type="button" onClick={() => setRightsSource(source)} className="press inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary">
                      <ShieldCheck className="h-3.5 w-3.5" /> 權利設定
                    </button>
                    <button type="button" onClick={() => setCitationSource(source)} className="press inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary">
                      <Link2 className="h-3.5 w-3.5" /> 公開引用
                    </button>
                    {(source.source_url || revision?.source_blob_url || revision?.storage_path) && (
                      <button type="button" onClick={() => void openOriginal(source, revision)} className="press inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary">
                        <ExternalLink className="h-3.5 w-3.5" /> 原檔
                      </button>
                    )}
                    {revision && (
                      <button type="button" onClick={() => setPreview({ source, revision })} className="press rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary">
                        預覽
                      </button>
                    )}
                    {revision && (revision.storage_path || safeHttpsUrl(revision.source_blob_url) || safeHttpsUrl(source.source_url)) && (
                      <button type="button" onClick={() => void openOriginal(source, revision)} className="press inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary">
                        <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} /> 原檔
                      </button>
                    )}
                    {safeHttpsUrl(source.rights_evidence_ref) && (
                      <a href={safeHttpsUrl(source.rights_evidence_ref) ?? undefined} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary">
                        <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} /> 授權證明
                      </a>
                    )}
                    {revision?.status === "review" && (
                      <div className="w-full space-y-2 rounded-md border border-border bg-card p-3">
                        <textarea
                          value={reviewNotes[revision.id] ?? ""}
                          onChange={(event) => setReviewNotes((current) => ({ ...current, [revision.id]: event.target.value }))}
                          rows={2}
                          placeholder="寫低已核對原文、蒸餾 claims 同授權嘅理由（最少 5 字）"
                          className={cn(PORTAL_FIELD, "w-full text-xs")}
                        />
                        <div className="flex justify-end gap-2">
                        <button disabled={busyId === revision.id || (reviewNotes[revision.id]?.trim().length ?? 0) < 5 || source.rights_status !== "granted"} type="button" onClick={() => void reviewRevision(revision, "approve")} className="press inline-flex items-center gap-1 rounded-md bg-lime px-3 py-1.5 text-xs font-medium text-on-accent disabled:opacity-40">
                          <Check className="h-3.5 w-3.5" /> 批准
                        </button>
                        <button disabled={busyId === revision.id || (reviewNotes[revision.id]?.trim().length ?? 0) < 5} type="button" onClick={() => void reviewRevision(revision, "reject")} className="press inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary disabled:opacity-40">
                          <X className="h-3.5 w-3.5" /> 拒絕
                        </button>
                        </div>
                      </div>
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
      <AdminSlideOver open={rightsSource !== null} onClose={() => setRightsSource(null)} title="素材權利設定">
        {rightsSource && (
          <RightsEditor
            source={rightsSource}
            onDone={() => {
              setRightsSource(null);
              refetch();
            }}
          />
        )}
      </AdminSlideOver>
      <AdminSlideOver open={citationSource !== null} onClose={() => setCitationSource(null)} title="公開引用連結">
        {citationSource && (
          <PublicCitationEditor
            source={citationSource}
            onDone={() => {
              setCitationSource(null);
              refetch();
            }}
          />
        )}
      </AdminSlideOver>
    </div>
  );
}
