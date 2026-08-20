import { useMemo, useState } from "react";
import {
  BrainCircuit,
  Check,
  ExternalLink,
  FileCheck2,
  FlaskConical,
  MessageSquareWarning,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import AdminToggle from "@/components/admin/AdminToggle";
import { useAdminToast } from "@/components/admin/AdminToast";
import QueryState from "@/components/QueryState";
import { timeAgo, useAdminQuery } from "@/components/admin/adminData";
import {
  EMPTY_READINESS,
  isGroundedEvaluationQuestion,
  normalizeReleaseReadiness,
  safeHttpsUrl,
  type ExpertReleaseReadiness,
} from "@/lib/instructorRelease";
import { isPersonaReviewInspectable } from "@/lib/personaReview";
import { supabase } from "@/lib/supabase";

interface ExpertRow {
  id: string;
  slug: string;
  display_name: string;
  status: "draft" | "active" | "suspended";
  feature_flags: Record<string, boolean>;
  published_persona_version_id: string | null;
}

interface ReviewRow {
  id: string;
  status: string;
  created_at: string;
  revision_no: number;
  storage_path: string | null;
  source_file_path: string | null;
  source_blob_url: string | null;
  extracted_text: string | null;
  distilled_json: Record<string, unknown> | null;
  content_hash: string | null;
  provider_meta: Record<string, unknown>;
  error_message: string | null;
  knowledge_sources: {
    id: string;
    title: string;
    expert_id: string;
    source_url: string | null;
    rights_status: string;
    rights_holder: string | null;
    rights_evidence_ref: string | null;
    rights_scope: Record<string, unknown>;
    experts: { display_name: string; slug: string } | null;
  } | null;
}

interface GapRow {
  id: string;
  question: string;
  status: string;
  created_at: string;
  experts: { display_name: string } | null;
}

interface PersonaBlueprint {
  mental_models?: Array<{ name?: string; description?: string; when_to_use?: string; evidence_refs?: string[] }>;
  decision_heuristics?: Array<{ trigger?: string; rule?: string; tradeoff?: string; evidence_refs?: string[] }>;
  expression_dna?: {
    tone?: string[];
    pacing?: string;
    answer_structure?: string[];
    signature_patterns?: string[];
    avoid?: string[];
    evidence_refs?: string[];
  };
  values?: Array<{ value?: string; behaviour?: string; evidence_refs?: string[] }>;
  anti_patterns?: Array<{ pattern?: string; why?: string; evidence_refs?: string[] }>;
  tensions?: Array<{ tension?: string; side_a?: string; side_b?: string; when_each_applies?: string; evidence_refs?: string[] }>;
  honest_boundaries?: Array<{ boundary?: string; response_strategy?: string; evidence_refs?: string[] }>;
  timeline?: Array<{ period?: string; change?: string; evidence_refs?: string[] }>;
}

interface PersonaEvidenceItem {
  ref?: string;
  revision_id?: string;
  source_title?: string;
  source_type?: string;
  locator?: string;
  excerpt?: string;
}

interface PersonaFidelityReport {
  breakdown?: Record<string, number>;
  strengths?: string[];
  risks?: string[];
  evaluation?: {
    question_count?: number;
    response_count?: number;
    evaluation_set_hash?: string;
  };
}

export interface PersonaJobRow {
  id: string;
  expert_id: string;
  status: string;
  fidelity_score: number | null;
  fidelity_status: string;
  fidelity_report: PersonaFidelityReport;
  output_blueprint: PersonaBlueprint;
  evidence_manifest: {
    source_count?: number;
    evidence_count?: number;
    evidence?: PersonaEvidenceItem[];
  };
  source_revision_ids: string[];
  error_message: string | null;
  created_at: string;
  experts: { display_name: string; slug: string } | null;
}

type EvaluationCategory = "known_stance" | "edge_honesty" | "voice" | "source_transparency";

export interface EvaluationQuestionRow {
  id: string;
  expert_id: string;
  category: EvaluationCategory;
  question: string;
  expected: Record<string, unknown>;
  source_revision_ids: string[];
  active: boolean;
  created_at: string;
}

interface StudioData {
  experts: ExpertRow[];
  reviews: ReviewRow[];
  gaps: GapRow[];
  personaJobs: PersonaJobRow[];
  evaluationQuestions: EvaluationQuestionRow[];
}

interface ReferenceFileRow {
  archived_at: string | null;
  chunk_count: number;
  content_hash: string | null;
  distilled: boolean;
  embedded_chunk_count: number;
  external_key: string | null;
  human_reviewed: boolean;
  is_published: boolean;
  job_attempts: number | null;
  job_error: string | null;
  job_stage: string | null;
  job_status: string | null;
  revision_created_at: string | null;
  revision_id: string | null;
  revision_no: number | null;
  revision_status: string | null;
  rights_evidence_ref: string | null;
  rights_expires_at: string | null;
  rights_holder: string | null;
  rights_scope: Record<string, unknown>;
  rights_revoked_at: string | null;
  rights_status: string;
  rights_valid: boolean;
  public_citation_url: string | null;
  public_citation_reviewed_by: string | null;
  public_citation_reviewed_at: string | null;
  public_citation_review_note: string | null;
  public_citation_ready: boolean;
  source_blob_url: string | null;
  source_commit_sha: string | null;
  source_file_path: string | null;
  source_id: string;
  source_type: string;
  source_updated_at: string;
  source_url: string | null;
  storage_path: string | null;
  title: string;
}

interface ReferencePanelData {
  readiness: ExpertReleaseReadiness;
  files: ReferenceFileRow[];
}

/** Both tables point at each other, so PostgREST needs the source_id FK hint. */
export const STUDIO_REVIEW_SELECT =
  "id,status,created_at,revision_no,storage_path,source_file_path,source_blob_url,extracted_text,distilled_json,content_hash,provider_meta,error_message,knowledge_sources!knowledge_revisions_source_id_fkey(id,title,expert_id,source_url,rights_status,rights_holder,rights_evidence_ref,rights_scope,experts(display_name,slug))";
export const STUDIO_PERSONA_SELECT =
  "id,expert_id,status,fidelity_score,fidelity_status,fidelity_report,output_blueprint,evidence_manifest,source_revision_ids,error_message,created_at,experts(display_name,slug)";

async function fetchStudio(): Promise<StudioData> {
  if (!supabase) throw new Error("Supabase 未連接");
  const [experts, reviews, gaps, personaJobs, evaluationQuestions] = await Promise.all([
    supabase.from("experts").select("id,slug,display_name,status,feature_flags,published_persona_version_id").order("display_name"),
    supabase.from("knowledge_revisions")
      .select(STUDIO_REVIEW_SELECT)
      .eq("status", "review")
      .order("created_at", { ascending: true }),
    supabase.from("knowledge_gaps")
      .select("id,question,status,created_at,experts(display_name)")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("persona_synthesis_jobs")
      .select(STUDIO_PERSONA_SELECT)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("persona_evaluation_questions")
      .select("id,expert_id,category,question,expected,source_revision_ids,active,created_at")
      .eq("active", true)
      .order("created_at", { ascending: true }),
  ]);
  if (experts.error) throw new Error(experts.error.message);
  if (reviews.error) throw new Error(reviews.error.message);
  if (gaps.error) throw new Error(gaps.error.message);
  if (personaJobs.error) throw new Error(personaJobs.error.message);
  if (evaluationQuestions.error) throw new Error(evaluationQuestions.error.message);
  return {
    experts: (experts.data ?? []) as unknown as ExpertRow[],
    reviews: (reviews.data ?? []) as unknown as ReviewRow[],
    gaps: (gaps.data ?? []) as unknown as GapRow[],
    personaJobs: (personaJobs.data ?? []) as unknown as PersonaJobRow[],
    evaluationQuestions: (evaluationQuestions.data ?? []) as unknown as EvaluationQuestionRow[],
  };
}

async function fetchReferencePanel(expertId: string | undefined): Promise<ReferencePanelData> {
  if (!expertId) return { readiness: EMPTY_READINESS, files: [] };
  if (!supabase) throw new Error("Supabase 未連接");
  const [readinessResult, filesResult] = await Promise.all([
    supabase.rpc("get_expert_release_readiness", { p_expert_id: expertId }),
    supabase.rpc("get_expert_reference_files", { p_expert_id: expertId }),
  ]);
  if (readinessResult.error) throw new Error(readinessResult.error.message);
  if (filesResult.error) throw new Error(filesResult.error.message);
  return {
    readiness: normalizeReleaseReadiness(readinessResult.data),
    files: (filesResult.data ?? []) as ReferenceFileRow[],
  };
}

export const STUDIO_FLAGS = [
  ["cms_ingestion_enabled", "素材蒸餾"],
  ["persona_compiler_enabled", "角色蒸餾"],
  ["rag_enabled", "RAG 回答"],
  ["booking_enabled", "真人預約"],
  ["social_sync_enabled", "每日社交同步"],
] as const;

export default function AdminStudio() {
  const toast = useAdminToast();
  const { data, loading, error, refetch } = useAdminQuery(fetchStudio);
  const [busy, setBusy] = useState<string | null>(null);
  const [personaExpertId, setPersonaExpertId] = useState("");
  const [greeting, setGreeting] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [questionCategory, setQuestionCategory] = useState<EvaluationCategory>("known_stance");
  const [questionText, setQuestionText] = useState("");
  const [questionExpected, setQuestionExpected] = useState("");
  const [questionRevisionId, setQuestionRevisionId] = useState("");
  const [knowledgeReviewNotes, setKnowledgeReviewNotes] = useState<Record<string, string>>({});

  const experts = useMemo(() => data?.experts ?? [], [data]);
  const selectedExpert = experts.find((expert) => expert.id === personaExpertId) ?? experts[0];
  const {
    data: referencePanel,
    loading: referenceLoading,
    error: referenceError,
    refetch: refetchReference,
  } = useAdminQuery(
    () => fetchReferencePanel(selectedExpert?.id),
    [selectedExpert?.id]
  );
  const selectedPersonaJob = data?.personaJobs.find((job) => job.expert_id === selectedExpert?.id);
  const selectedEvaluationQuestions = data?.evaluationQuestions.filter(
    (question) => question.expert_id === selectedExpert?.id && question.active
  ) ?? [];
  const groundedEvaluationQuestions = selectedEvaluationQuestions.filter(isGroundedEvaluationQuestion);
  const personaReviewReady = isPersonaReviewInspectable(
    selectedPersonaJob,
    selectedEvaluationQuestions,
  );
  const readiness = referencePanel?.readiness ?? EMPTY_READINESS;
  const publishedReferenceRevisions = (referencePanel?.files ?? []).filter(
    (file) => file.is_published && file.rights_valid && file.revision_id
  );
  const effectiveQuestionRevisionId = publishedReferenceRevisions.some(
    (file) => file.revision_id === questionRevisionId
  )
    ? questionRevisionId
    : publishedReferenceRevisions[0]?.revision_id ?? "";
  const releaseChecks = [
    { label: "身份已驗證", passed: readiness.identity_verified },
    { label: "導師帳戶已綁定", passed: readiness.owner_assigned },
    {
      label: "有效授權來源",
      passed: readiness.published_sources >= 2,
      value: `${readiness.published_sources} / 2`,
    },
    {
      label: "已嵌入知識片段",
      passed: readiness.published_chunks > 0,
      value: String(readiness.published_chunks),
    },
    { label: "Persona 已發佈", passed: readiness.published_persona },
    {
      label: "Persona 測試題",
      passed: readiness.evaluation_questions >= 25
        && readiness.evaluation_questions === readiness.evaluation_question_total,
      value: readiness.evaluation_question_total === readiness.evaluation_questions
        ? `${readiness.evaluation_questions} / 25`
        : `${readiness.evaluation_questions} grounded / ${readiness.evaluation_question_total} total`,
    },
    { label: "Evaluation 已通過", passed: readiness.evaluation_passed },
    {
      label: "冇未完成工作",
      passed: readiness.pending_jobs === 0,
      value: String(readiness.pending_jobs),
    },
    {
      label: "冇失敗工作",
      passed: readiness.failed_jobs === 0,
      value: String(readiness.failed_jobs),
    },
  ];

  const setFlag = async (expert: ExpertRow, key: string, value: boolean) => {
    if (!supabase) return;
    setBusy(`${expert.id}:${key}`);
    const { error: updateError } = await supabase.rpc("set_expert_feature_flag", {
      p_expert_id: expert.id,
      p_key: key,
      p_enabled: value,
    });
    setBusy(null);
    if (updateError) toast(`更新失敗：${updateError.message}`);
    else { toast(`${expert.display_name} 功能旗標已更新`); refetch(); refetchReference(); }
  };

  const review = async (revisionId: string, decision: "approve" | "reject") => {
    if (!supabase) return;
    const notes = knowledgeReviewNotes[revisionId]?.trim() ?? "";
    if (notes.length < 5) {
      toast("請先檢查原檔同蒸餾內容，再寫低審批理由（最少 5 字）");
      return;
    }
    setBusy(revisionId);
    const { error: reviewError } = await supabase.rpc("review_knowledge_revision", {
      p_revision_id: revisionId,
      p_decision: decision,
      p_notes: notes,
    });
    setBusy(null);
    if (reviewError) toast(`審批失敗：${reviewError.message}`);
    else {
      setKnowledgeReviewNotes((current) => {
        const next = { ...current };
        delete next[revisionId];
        return next;
      });
      toast(decision === "approve" ? "已代導師批准並發佈" : "Revision 已拒絕");
      refetch();
      refetchReference();
    }
  };

  const queuePersona = async () => {
    if (!supabase || !selectedExpert) return;
    if (groundedEvaluationQuestions.length < 25 || groundedEvaluationQuestions.length > 50) {
      toast("角色蒸餾需要 25–50 條有評分準則及來源嘅測試問題");
      return;
    }
    setBusy("persona-queue");
    const { error: queueError } = await supabase.rpc("queue_persona_synthesis", {
      p_expert_id: selectedExpert.id,
    });
    setBusy(null);
    if (queueError) toast(`角色蒸餾未能開始：${queueError.message}`);
    else { toast(`${selectedExpert.display_name} 角色蒸餾已進入處理佇列`); refetch(); }
  };

  const reviewPersona = async (decision: "approve" | "reject") => {
    if (!supabase || !selectedPersonaJob) return;
    if (decision === "approve" && !personaReviewReady) {
      toast("Persona 審核資料未齊：要完整藍圖、evidence manifest、fidelity 報告同 25–50 條 grounded 測試題");
      return;
    }
    const notes = reviewNotes.trim();
    if (notes.length < 5) {
      toast("請先核對 persona 藍圖、evidence 同 fidelity 報告，再寫低審批理由（最少 5 字）");
      return;
    }
    setBusy("persona-review");
    const { error: reviewError } = await supabase.rpc("review_persona_synthesis", {
      p_job_id: selectedPersonaJob.id,
      p_decision: decision,
      p_notes: notes,
      p_override_fidelity: false,
    });
    setBusy(null);
    if (reviewError) toast(`角色審批失敗：${reviewError.message}`);
    else {
      setReviewNotes("");
      toast(decision === "approve" ? "角色藍圖已批准，等待發佈" : "角色藍圖已拒絕");
      refetch();
      refetchReference();
    }
  };

  const addEvaluationQuestion = async () => {
    if (
      !supabase
      || !selectedExpert
      || questionText.trim().length < 10
      || questionExpected.trim().length < 10
      || !effectiveQuestionRevisionId
      || selectedEvaluationQuestions.length >= 50
      || busy === "evaluation-question"
    ) return;
    setBusy("evaluation-question");
    const { error: questionError } = await supabase.from("persona_evaluation_questions").insert({
      expert_id: selectedExpert.id,
      category: questionCategory,
      question: questionText.trim(),
      expected: { criteria: questionExpected.trim() },
      source_revision_ids: [effectiveQuestionRevisionId],
    });
    setBusy(null);
    if (questionError) {
      toast(`測試問題未能加入：${questionError.message}`);
      return;
    }
    setQuestionText("");
    setQuestionExpected("");
    toast("Persona 測試問題已加入");
    refetch();
  };

  const deactivateEvaluationQuestion = async (id: string) => {
    if (!supabase || busy === `evaluation-question:${id}`) return;
    setBusy(`evaluation-question:${id}`);
    const { error: questionError } = await supabase
      .from("persona_evaluation_questions")
      .update({ active: false })
      .eq("id", id);
    setBusy(null);
    if (questionError) toast(`測試問題未能停用：${questionError.message}`);
    else refetch();
  };

  const publishPersona = async () => {
    if (!supabase || !selectedPersonaJob || !selectedExpert || !greeting.trim()) return;
    setBusy("persona-publish");
    const { error: personaError } = await supabase.rpc("publish_compiled_persona", {
      p_job_id: selectedPersonaJob.id,
      p_greeting: greeting.trim(),
      p_sample_dialogues: [],
    });
    setBusy(null);
    if (personaError) toast(`Persona 發佈失敗：${personaError.message}`);
    else { toast(`${selectedExpert.display_name} compiled persona 已發佈`); refetch(); refetchReference(); }
  };

  const dismissGap = async (id: string) => {
    if (!supabase) return;
    setBusy(id);
    const { error: gapError } = await supabase.rpc("resolve_knowledge_gap", {
      p_gap_id: id,
      p_status: "dismissed",
    });
    setBusy(null);
    if (gapError) toast(`更新失敗：${gapError.message}`);
    else refetch();
  };

  const openReferenceLocation = async (
    storagePath: string | null,
    ...candidateUrls: Array<string | null>
  ) => {
    let href = candidateUrls.map(safeHttpsUrl).find(Boolean) ?? null;
    if (!href && storagePath && supabase) {
      const { data: signed, error: signedError } = await supabase.storage
        .from("expert-kb")
        .createSignedUrl(storagePath, 300);
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

  const openReference = (file: ReferenceFileRow) => openReferenceLocation(
    file.storage_path,
    file.source_blob_url,
    file.source_url,
  );

  const openReviewReference = (revision: ReviewRow) => openReferenceLocation(
    revision.storage_path,
    revision.source_blob_url,
    revision.knowledge_sources?.source_url ?? null,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">Studio</p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">專家工作室</h1>
        <p className="mt-1 text-sm text-text-muted">管理導師功能 rollout、persona 版本、知識審批同知識缺口。</p>
      </div>

      <QueryState loading={loading} error={error ? `載入失敗：${error}` : null} retry={refetch}>
        {data && (
          <>
            <section className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-lime-text" strokeWidth={1.5} />
                <h2 className="font-display text-lg text-text-primary">逐位導師 rollout</h2>
              </div>
              <div className="mt-4 divide-y divide-border">
                {experts.map((expert) => (
                  <div key={expert.id} className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-[180px] flex-1">
                      <p className="text-sm font-medium text-text-primary">{expert.display_name}</p>
                      <p className="font-mono text-[10px] text-text-muted">{expert.slug} · {expert.status}</p>
                    </div>
                    {STUDIO_FLAGS.map(([key, label]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-xs text-text-secondary">{label}</span>
                        <AdminToggle
                          checked={expert.feature_flags?.[key] === true}
                          disabled={busy === `${expert.id}:${key}`}
                          label={`${expert.display_name} ${label}`}
                          onChange={(next) => void setFlag(expert, key, next)}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-2">
                  <FileCheck2 className="mt-0.5 h-4 w-4 text-lime-text" strokeWidth={1.5} />
                  <div>
                    <h2 className="font-display text-lg text-text-primary">Beta release gate 同 reference files</h2>
                    <p className="mt-1 max-w-2xl text-xs leading-relaxed text-text-muted">
                      核對授權、蒸餾、embedding、persona 同 evaluation。呢啲素材只用於 RAG 回答及 persona 優化，唔會用作基礎模型訓練。
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    aria-label="選擇要核對嘅導師"
                    value={selectedExpert?.id ?? ""}
                    onChange={(event) => setPersonaExpertId(event.target.value)}
                    className="rounded-md border border-border bg-card px-3 py-2 text-xs text-text-primary"
                  >
                    {experts.map((expert) => <option key={expert.id} value={expert.id}>{expert.display_name}</option>)}
                  </select>
                  <button
                    type="button"
                    aria-label="重新載入 release gate"
                    onClick={refetchReference}
                    className="press rounded-md border border-border p-2 text-text-secondary"
                  >
                    <RefreshCw className={`h-4 w-4 ${referenceLoading ? "opacity-40" : ""}`} strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {referenceError && (
                <div className="mt-4 rounded-md border border-destructive/40 bg-card p-3 text-xs text-destructive">
                  Release gate 載入失敗：{referenceError}
                </div>
              )}

              {!referenceError && (
                <>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-4">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{selectedExpert?.display_name ?? "未選擇導師"}</p>
                      <p className="mt-1 text-xs text-text-muted">
                        Corpus gate {readiness.ready ? "已通過" : "未通過"} · LIVE CHAT {readiness.chat_ready ? "可測試" : "保持關閉"}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${readiness.chat_ready ? "border-lime text-lime-text" : "border-border text-text-muted"}`}>
                      {readiness.chat_ready ? "chat ready" : "blocked"}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {releaseChecks.map((check) => (
                      <div key={check.label} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2.5">
                        <span className="flex items-center gap-2 text-xs text-text-secondary">
                          {check.passed
                            ? <Check className="h-3.5 w-3.5 text-lime-text" strokeWidth={1.5} />
                            : <X className="h-3.5 w-3.5 text-text-muted" strokeWidth={1.5} />}
                          {check.label}
                        </span>
                        {check.value && <span className="font-mono text-[10px] text-text-muted">{check.value}</span>}
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
                    <div>
                      <h3 className="text-sm font-medium text-text-primary">Reference files</h3>
                      <p className="mt-1 text-xs text-text-muted">原檔 provenance、授權、最新 revision、蒸餾工作同 embedding 覆蓋。</p>
                    </div>
                    <span className="font-mono text-xs text-text-muted">{referencePanel?.files.length ?? 0} files</span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {referenceLoading && <p className="text-xs text-text-muted">載入 reference files…</p>}
                    {!referenceLoading && (referencePanel?.files.length ?? 0) === 0 && (
                      <p className="rounded-md border border-border bg-card p-4 text-xs text-text-muted">未有 reference file；LIVE CHAT 會繼續 fail-closed。</p>
                    )}
                    {referencePanel?.files.map((file) => {
                      const rightsEvidenceUrl = safeHttpsUrl(file.rights_evidence_ref);
                      const hasOriginal = Boolean(file.storage_path || safeHttpsUrl(file.source_blob_url) || safeHttpsUrl(file.source_url));
                      const scopeLabels = [
                        ["RAG", file.rights_scope?.commercial_rag === true],
                        ["Distill", file.rights_scope?.distillation === true],
                        ["Persona", file.rights_scope?.persona_synthesis === true],
                      ] as const;
                      return (
                        <article key={file.source_id} className="rounded-md border border-border bg-card p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-text-primary">{file.title}</p>
                              <p className="mt-1 break-all font-mono text-[10px] text-text-muted">
                                {file.source_file_path ?? file.external_key ?? file.storage_path ?? file.source_type}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`rounded-full border px-2 py-1 text-[10px] ${file.rights_valid ? "border-lime text-lime-text" : "border-border text-text-muted"}`}>
                                rights {file.rights_status}
                              </span>
                              {scopeLabels.map(([label, granted]) => (
                                <span key={label} className={`rounded-full border px-2 py-1 text-[10px] ${granted ? "border-lime text-lime-text" : "border-border text-text-muted"}`}>
                                  {label} {granted ? "on" : "off"}
                                </span>
                              ))}
                              <span className={`rounded-full border px-2 py-1 text-[10px] ${file.distilled ? "border-lime text-lime-text" : "border-border text-text-muted"}`}>
                                {file.distilled ? "distilled" : "not distilled"}
                              </span>
                              <span className={`rounded-full border px-2 py-1 text-[10px] ${file.human_reviewed ? "border-lime text-lime-text" : "border-border text-text-muted"}`}>
                                {file.human_reviewed ? "human reviewed" : "review required"}
                              </span>
                              <span className={`rounded-full border px-2 py-1 text-[10px] ${file.public_citation_ready ? "border-lime text-lime-text" : "border-border text-text-muted"}`}>
                                {file.public_citation_ready ? "public citation reviewed" : "public citation private"}
                              </span>
                              <span className={`rounded-full border px-2 py-1 text-[10px] ${file.is_published ? "border-lime text-lime-text" : "border-border text-text-muted"}`}>
                                {file.is_published ? "published" : file.revision_status ?? "no revision"}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 grid gap-2 text-xs text-text-secondary sm:grid-cols-2 lg:grid-cols-4">
                            <p>Revision <span className="font-mono text-text-primary">{file.revision_no ?? "—"}</span></p>
                            <p>Chunks <span className="font-mono text-text-primary">{file.embedded_chunk_count} / {file.chunk_count}</span></p>
                            <p>Job <span className="font-mono text-text-primary">{file.job_status ?? "—"}{file.job_stage ? ` · ${file.job_stage}` : ""}</span></p>
                            <p>Commit <span className="font-mono text-text-primary">{file.source_commit_sha?.slice(0, 8) ?? "—"}</span></p>
                          </div>

                          {(file.job_error || file.archived_at || !file.rights_valid) && (
                            <p className="mt-3 text-xs leading-relaxed text-destructive">
                              {file.job_error ?? (file.archived_at ? "來源已封存" : "來源授權未生效或已過期")}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            {hasOriginal && (
                              <button type="button" onClick={() => void openReference(file)} className="press inline-flex items-center gap-1 text-xs text-text-secondary underline-offset-2 hover:underline">
                                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} /> 查看原檔
                              </button>
                            )}
                            {rightsEvidenceUrl ? (
                              <a href={rightsEvidenceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-text-secondary underline-offset-2 hover:underline">
                                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} /> 授權證明
                              </a>
                            ) : file.rights_evidence_ref ? (
                              <span className="text-xs text-text-muted">授權證明：{file.rights_evidence_ref}</span>
                            ) : null}
                            {file.rights_holder && <span className="text-xs text-text-muted">Rights holder：{file.rights_holder}</span>}
                            {file.public_citation_ready && safeHttpsUrl(file.public_citation_url) ? (
                              <a href={safeHttpsUrl(file.public_citation_url) ?? undefined} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-text-secondary underline-offset-2 hover:underline">
                                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} /> 公開引用頁面
                              </a>
                            ) : (
                              <span className="text-xs text-text-muted">公開引用：私人／不可點擊</span>
                            )}
                            {file.public_citation_reviewed_at && <span className="text-xs text-text-muted">Citation reviewed {timeAgo(file.public_citation_reviewed_at)}</span>}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-lg border border-border bg-surface p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-lg text-text-primary">知識審批</h2>
                  <span className="font-mono text-xs text-text-muted">{data.reviews.length} pending</span>
                </div>
                <div className="mt-4 space-y-2">
                  {data.reviews.length === 0 && <p className="text-xs text-text-muted">暫時冇等待審批嘅 revision。</p>}
                  {data.reviews.map((revision) => {
                    const distilled = revision.distilled_json;
                    const summary = typeof distilled?.summary === "string" ? distilled.summary : "未有可讀摘要";
                    const claims = Array.isArray(distilled?.claims)
                      ? distilled.claims.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
                      : [];
                    const methods = Array.isArray(distilled?.methods) ? distilled.methods.map(String) : [];
                    const boundaries = Array.isArray(distilled?.boundaries) ? distilled.boundaries.map(String) : [];
                    const suggestedQuestions = Array.isArray(distilled?.suggested_questions)
                      ? distilled.suggested_questions.map(String)
                      : [];
                    const notes = knowledgeReviewNotes[revision.id] ?? "";
                    const originalText = revision.extracted_text?.trim() ?? "";
                    const hasOpenableOriginal = Boolean(
                      revision.storage_path
                      || safeHttpsUrl(revision.source_blob_url)
                      || safeHttpsUrl(revision.knowledge_sources?.source_url ?? null)
                    );
                    const hasOriginal = originalText.length > 0 || hasOpenableOriginal;
                    const rightsScope = revision.knowledge_sources?.rights_scope ?? {};
                    const requiredScopesGranted = rightsScope.commercial_rag === true
                      && rightsScope.distillation === true
                      && rightsScope.persona_synthesis === true;
                    const structuredReviewReady = summary !== "未有可讀摘要" && claims.length > 0;
                    const evidenceUrl = safeHttpsUrl(revision.knowledge_sources?.rights_evidence_ref ?? null);
                    return (
                      <article key={revision.id} className="rounded-md border border-border bg-card p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-text-primary">{revision.knowledge_sources?.title ?? "未命名素材"}</p>
                            <p className="mt-1 text-xs text-text-muted">
                              {revision.knowledge_sources?.experts?.display_name ?? "未知導師"} · rev {revision.revision_no}
                            </p>
                          </div>
                          <span className={`rounded-full border px-2 py-1 text-[10px] ${revision.knowledge_sources?.rights_status === "granted" ? "border-lime text-lime-text" : "border-border text-text-muted"}`}>
                            rights {revision.knowledge_sources?.rights_status ?? "unknown"}
                          </span>
                        </div>

                        <div className="mt-3 rounded-sm border border-border bg-surface p-3">
                          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-muted">Distilled summary</p>
                          <p className="mt-1 text-xs leading-relaxed text-text-secondary">{summary}</p>
                          {claims.map((claim, index) => (
                            <div key={`${revision.id}-claim-${index}`} className="mt-2 border-t border-border pt-2">
                              <p className="text-xs text-text-primary">{String(claim.claim ?? "未命名 claim")}</p>
                              <p className="mt-1 text-[11px] leading-relaxed text-text-muted">Evidence：{String(claim.evidence ?? "未提供")}</p>
                              {Boolean(claim.locator) && <p className="mt-1 font-mono text-[10px] text-text-muted">Locator：{String(claim.locator)}</p>}
                            </div>
                          ))}
                          {[
                            ["Methods", methods],
                            ["Boundaries", boundaries],
                            ["Suggested questions", suggestedQuestions],
                          ].map(([label, items]) => (
                            <div key={label as string} className="mt-3 border-t border-border pt-2">
                              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-muted">{label as string}</p>
                              <ul className="mt-1 space-y-1">
                                {(items as string[]).map((item, index) => <li key={`${label}-${index}`} className="text-[11px] leading-relaxed text-text-secondary">{item}</li>)}
                              </ul>
                            </div>
                          ))}
                        </div>

                        {originalText && (
                          <details className="mt-3 rounded-sm border border-border bg-surface p-3">
                            <summary className="cursor-pointer text-xs font-medium text-text-secondary">核對抽取原文</summary>
                            <div className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-text-secondary">{originalText}</div>
                          </details>
                        )}

                        <div className="mt-3 flex flex-wrap gap-3">
                          {hasOpenableOriginal && (
                            <button type="button" onClick={() => void openReviewReference(revision)} className="press inline-flex items-center gap-1 text-xs text-text-secondary underline-offset-2 hover:underline">
                              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} /> 查看原檔
                            </button>
                          )}
                          {evidenceUrl && (
                            <a href={evidenceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-text-secondary underline-offset-2 hover:underline">
                              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} /> 核對授權證明
                            </a>
                          )}
                          {revision.content_hash && <span className="font-mono text-[10px] text-text-muted">hash {revision.content_hash.slice(0, 10)}</span>}
                          {!requiredScopesGranted && <span className="text-xs text-destructive">檢索／蒸餾／persona 授權未齊</span>}
                        </div>

                        <textarea
                          value={notes}
                          onChange={(event) => setKnowledgeReviewNotes((current) => ({ ...current, [revision.id]: event.target.value }))}
                          rows={2}
                          placeholder="寫低已核對內容、引用同授權嘅審批理由（最少 5 字）"
                          className="mt-3 w-full rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-primary"
                        />
                        <div className="mt-3 flex gap-2">
                          <button disabled={busy === revision.id || notes.trim().length < 5 || revision.knowledge_sources?.rights_status !== "granted" || !requiredScopesGranted || !hasOriginal || !structuredReviewReady} type="button" onClick={() => void review(revision.id, "approve")} className="press inline-flex items-center gap-1 rounded-md bg-lime px-3 py-1.5 text-xs font-medium text-on-accent disabled:opacity-40">
                            <Check className="h-3.5 w-3.5" /> 代批准
                          </button>
                          <button disabled={busy === revision.id || notes.trim().length < 5} type="button" onClick={() => void review(revision.id, "reject")} className="press inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary disabled:opacity-40">
                            <X className="h-3.5 w-3.5" /> 拒絕
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-lg border border-border bg-surface p-5">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-lime-text" strokeWidth={1.5} />
                  <h2 className="font-display text-lg text-text-primary">Persona Compiler</h2>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">以已批准素材合成思考模型、決策規則、表達 DNA、矛盾同誠實邊界，再經獨立 fidelity evaluation 及人工審批。</p>
                <div className="mt-4 space-y-3">
                  <select value={selectedExpert?.id ?? ""} onChange={(event) => setPersonaExpertId(event.target.value)} className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text-primary">
                    {experts.map((expert) => <option key={expert.id} value={expert.id}>{expert.display_name}</option>)}
                  </select>
                  {!selectedPersonaJob || ["published", "rejected", "failed"].includes(selectedPersonaJob.status) ? (
                    <button
                      type="button"
                      disabled={!selectedExpert || groundedEvaluationQuestions.length < 25 || groundedEvaluationQuestions.length > 50 || busy === "persona-queue"}
                      onClick={() => void queuePersona()}
                      className="press w-full rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-40"
                    >
                      由已發佈知識建立角色藍圖
                    </button>
                  ) : (
                    <div className="rounded-md border border-border bg-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-muted">{selectedPersonaJob.status}</span>
                        <span className="font-mono text-xs text-text-primary">Fidelity {selectedPersonaJob.fidelity_score ?? "—"}/100 · {selectedPersonaJob.fidelity_status}</span>
                      </div>
                      <p className="mt-2 text-xs text-text-muted">{selectedPersonaJob.source_revision_ids.length} 個 revisions · {selectedPersonaJob.evidence_manifest.evidence_count ?? 0} 個 evidence refs</p>
                      {selectedPersonaJob.error_message && <p className="mt-2 text-xs text-destructive">{selectedPersonaJob.error_message}</p>}
                    </div>
                  )}

                  <div className="rounded-md border border-border bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-text-primary">Persona evaluation set</p>
                        <p className="mt-1 text-xs leading-relaxed text-text-muted">最少 25 條由人編寫嘅測試問題，先可以通過 persona 發佈 gate。</p>
                      </div>
                      <span className={groundedEvaluationQuestions.length >= 25 && groundedEvaluationQuestions.length <= 50 ? "font-mono text-xs text-lime-text" : "font-mono text-xs text-text-muted"}>
                        {groundedEvaluationQuestions.length} grounded / 25
                      </span>
                    </div>
                    <div className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
                      {selectedEvaluationQuestions.map((question) => (
                        <div key={question.id} className="flex items-start justify-between gap-3 rounded-sm border border-border px-3 py-2">
                          <div>
                            <p className="text-xs leading-relaxed text-text-secondary">{question.question}</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
                              {isGroundedEvaluationQuestion(question)
                                ? `${String(question.expected.criteria ?? "已有評分準則")} · ${question.source_revision_ids.length} 個來源`
                                : "未有評分準則或 evidence revision，唔計入 release gate"}
                            </p>
                            {!!question.source_revision_ids.length && <p className="mt-1 break-all font-mono text-[10px] text-text-muted">{question.source_revision_ids.join(" · ")}</p>}
                          </div>
                          <button
                            type="button"
                            disabled={busy === `evaluation-question:${question.id}`}
                            onClick={() => void deactivateEvaluationQuestion(question.id)}
                            className="shrink-0 text-[11px] text-text-muted underline-offset-2 hover:underline disabled:opacity-40"
                          >
                            停用
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <select value={questionCategory} onChange={(event) => setQuestionCategory(event.target.value as EvaluationCategory)} className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-primary">
                        <option value="known_stance">已知立場</option>
                        <option value="edge_honesty">界線誠實</option>
                        <option value="voice">語氣表達</option>
                        <option value="source_transparency">來源透明</option>
                      </select>
                      <select
                        aria-label="測試問題 evidence revision"
                        value={effectiveQuestionRevisionId}
                        onChange={(event) => setQuestionRevisionId(event.target.value)}
                        className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-primary"
                      >
                        {publishedReferenceRevisions.length === 0 && <option value="">未有已發佈來源</option>}
                        {publishedReferenceRevisions.map((file) => (
                          <option key={file.revision_id} value={file.revision_id ?? ""}>{file.title} · rev {file.revision_no ?? "—"}</option>
                        ))}
                      </select>
                      <input value={questionText} onChange={(event) => setQuestionText(event.target.value)} placeholder="加入一條可驗證嘅測試問題（最少 10 字）" className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-primary" />
                      <input value={questionExpected} onChange={(event) => setQuestionExpected(event.target.value)} placeholder="預期要點／評分準則（最少 10 字）" className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-primary" />
                      <button
                        type="button"
                        disabled={questionText.trim().length < 10 || questionExpected.trim().length < 10 || !effectiveQuestionRevisionId || selectedEvaluationQuestions.length >= 50 || busy === "evaluation-question"}
                        onClick={() => void addEvaluationQuestion()}
                        className="press rounded-md border border-border px-3 py-2 text-xs text-text-secondary disabled:opacity-40 sm:col-span-2"
                      >
                        加入 evidence-linked 測試問題
                      </button>
                    </div>
                  </div>

                  {selectedPersonaJob?.status === "review" && (
                    <>
                      <div className="max-h-72 space-y-3 overflow-y-auto rounded-md border border-border bg-card p-4">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">Mental models</p>
                          {(selectedPersonaJob.output_blueprint.mental_models ?? []).map((model, index) => (
                            <div key={`${model.name}-${index}`} className="mt-2">
                              <p className="text-xs font-medium text-text-primary">{model.name}</p>
                              <p className="text-xs leading-relaxed text-text-muted">{model.description}</p>
                              <p className="mt-1 text-xs leading-relaxed text-text-secondary">使用時機：{model.when_to_use}</p>
                              {!!model.evidence_refs?.length && <p className="mt-1 font-mono text-[10px] text-text-muted">{model.evidence_refs.join(" · ")}</p>}
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">Decision heuristics</p>
                          {(selectedPersonaJob.output_blueprint.decision_heuristics ?? []).map((item, index) => (
                            <div key={`${item.trigger}-${index}`} className="mt-2">
                              <p className="text-xs font-medium text-text-primary">{item.trigger}</p>
                              <p className="text-xs leading-relaxed text-text-muted">{item.rule}</p>
                              <p className="mt-1 text-xs leading-relaxed text-text-secondary">取捨：{item.tradeoff}</p>
                              {!!item.evidence_refs?.length && <p className="mt-1 font-mono text-[10px] text-text-muted">{item.evidence_refs.join(" · ")}</p>}
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">Expression DNA</p>
                          <p className="mt-2 text-xs leading-relaxed text-text-secondary">語氣：{selectedPersonaJob.output_blueprint.expression_dna?.tone?.join("；") || "—"}</p>
                          <p className="mt-1 text-xs leading-relaxed text-text-secondary">節奏：{selectedPersonaJob.output_blueprint.expression_dna?.pacing || "—"}</p>
                          <p className="mt-1 text-xs leading-relaxed text-text-secondary">結構：{selectedPersonaJob.output_blueprint.expression_dna?.answer_structure?.join("；") || "—"}</p>
                          <p className="mt-1 text-xs leading-relaxed text-text-secondary">慣用模式：{selectedPersonaJob.output_blueprint.expression_dna?.signature_patterns?.join("；") || "—"}</p>
                          <p className="mt-1 text-xs leading-relaxed text-text-secondary">避免：{selectedPersonaJob.output_blueprint.expression_dna?.avoid?.join("；") || "—"}</p>
                          {!!selectedPersonaJob.output_blueprint.expression_dna?.evidence_refs?.length && <p className="mt-1 font-mono text-[10px] text-text-muted">{selectedPersonaJob.output_blueprint.expression_dna.evidence_refs.join(" · ")}</p>}
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">Values</p>
                          {(selectedPersonaJob.output_blueprint.values ?? []).map((item, index) => (
                            <div key={`${item.value}-${index}`} className="mt-2">
                              <p className="text-xs font-medium text-text-primary">{item.value}</p>
                              <p className="text-xs leading-relaxed text-text-secondary">{item.behaviour}</p>
                              {!!item.evidence_refs?.length && <p className="mt-1 font-mono text-[10px] text-text-muted">{item.evidence_refs.join(" · ")}</p>}
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">Anti-patterns</p>
                          {(selectedPersonaJob.output_blueprint.anti_patterns ?? []).map((item, index) => (
                            <div key={`${item.pattern}-${index}`} className="mt-2">
                              <p className="text-xs font-medium text-text-primary">{item.pattern}</p>
                              <p className="text-xs leading-relaxed text-text-secondary">{item.why}</p>
                              {!!item.evidence_refs?.length && <p className="mt-1 font-mono text-[10px] text-text-muted">{item.evidence_refs.join(" · ")}</p>}
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">Tensions</p>
                          {(selectedPersonaJob.output_blueprint.tensions ?? []).map((item, index) => (
                            <div key={`${item.tension}-${index}`} className="mt-2">
                              <p className="text-xs font-medium text-text-primary">{item.tension}</p>
                              <p className="text-xs text-text-secondary">A：{item.side_a} · B：{item.side_b}</p>
                              <p className="mt-1 text-xs text-text-secondary">適用情況：{item.when_each_applies}</p>
                              {!!item.evidence_refs?.length && <p className="mt-1 font-mono text-[10px] text-text-muted">{item.evidence_refs.join(" · ")}</p>}
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">Timeline</p>
                          {(selectedPersonaJob.output_blueprint.timeline ?? []).map((item, index) => (
                            <div key={`${item.period}-${index}`} className="mt-2">
                              <p className="text-xs font-medium text-text-primary">{item.period}</p>
                              <p className="text-xs leading-relaxed text-text-secondary">{item.change}</p>
                              {!!item.evidence_refs?.length && <p className="mt-1 font-mono text-[10px] text-text-muted">{item.evidence_refs.join(" · ")}</p>}
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">Honest boundaries</p>
                          {(selectedPersonaJob.output_blueprint.honest_boundaries ?? []).map((item, index) => (
                            <div key={`${item.boundary}-${index}`} className="mt-2">
                              <p className="text-xs text-text-secondary">{item.boundary}：{item.response_strategy}</p>
                              {!!item.evidence_refs?.length && <p className="mt-1 font-mono text-[10px] text-text-muted">{item.evidence_refs.join(" · ")}</p>}
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">Evidence manifest</p>
                          {(selectedPersonaJob.evidence_manifest.evidence ?? []).map((item, index) => (
                            <div key={`${item.ref}-${index}`} className="mt-2 rounded-sm border border-border p-2">
                              <p className="text-xs font-medium text-text-primary">{item.source_title ?? "未命名來源"}</p>
                              <p className="mt-1 font-mono text-[10px] text-text-muted">{item.ref ?? "—"} · {item.locator ?? "未提供定位"}</p>
                              <p className="mt-1 text-xs leading-relaxed text-text-secondary">{item.excerpt ?? "未提供 evidence 摘要"}</p>
                              {item.revision_id && <p className="mt-1 break-all font-mono text-[10px] text-text-muted">revision {item.revision_id}</p>}
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">Fidelity report</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {Object.entries(selectedPersonaJob.fidelity_report?.breakdown ?? {}).map(([key, value]) => (
                              <span key={key} className="rounded-sm border border-border px-2 py-1 font-mono text-[10px] text-text-secondary">{key.replaceAll("_", " ")} {value}</span>
                            ))}
                          </div>
                          {!!selectedPersonaJob.fidelity_report?.strengths?.length && (
                            <p className="mt-2 text-xs leading-relaxed text-text-secondary">優點：{selectedPersonaJob.fidelity_report.strengths.join("；")}</p>
                          )}
                          {!!selectedPersonaJob.fidelity_report?.risks?.length && (
                            <p className="mt-2 text-xs leading-relaxed text-destructive">風險：{selectedPersonaJob.fidelity_report.risks.join("；")}</p>
                          )}
                          <p className="mt-2 font-mono text-[10px] text-text-muted">
                            {selectedPersonaJob.fidelity_report?.evaluation?.question_count ?? 0} questions · {selectedPersonaJob.fidelity_report?.evaluation?.response_count ?? 0} responses
                          </p>
                          {selectedPersonaJob.fidelity_report?.evaluation?.evaluation_set_hash && (
                            <p className="mt-1 break-all font-mono text-[10px] text-text-muted">evaluation {selectedPersonaJob.fidelity_report.evaluation.evaluation_set_hash}</p>
                          )}
                        </div>
                      </div>
                      {!personaReviewReady && <p className="text-xs leading-relaxed text-destructive">審核資料未齊，暫時唔可以批准。請先補齊完整藍圖、evidence manifest、fidelity report 同所有 grounded evaluation questions。</p>}
                      <textarea value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} rows={2} placeholder="寫低已核對 persona、evidence 同 fidelity 嘅審批理由（最少 5 字）" className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text-primary" />
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" disabled={busy === "persona-review" || reviewNotes.trim().length < 5 || selectedPersonaJob.fidelity_status !== "passed" || !personaReviewReady} onClick={() => void reviewPersona("approve")} className="press rounded-md bg-lime px-3 py-2 text-sm font-medium text-on-accent disabled:opacity-40">批准藍圖</button>
                        <button type="button" disabled={busy === "persona-review" || reviewNotes.trim().length < 5} onClick={() => void reviewPersona("reject")} className="press rounded-md border border-border px-3 py-2 text-sm text-text-secondary disabled:opacity-40">拒絕</button>
                      </div>
                    </>
                  )}

                  {selectedPersonaJob?.status === "approved" && (
                    <>
                      <input value={greeting} onChange={(event) => setGreeting(event.target.value)} placeholder="授權 AI 導師開場白" className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text-primary" />
                      <button type="button" disabled={!greeting.trim() || busy === "persona-publish"} onClick={() => void publishPersona()} className="press inline-flex w-full items-center justify-center gap-2 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-40"><ShieldCheck className="h-4 w-4" strokeWidth={1.5} /> 發佈 immutable persona version</button>
                    </>
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquareWarning className="h-4 w-4 text-lime-text" strokeWidth={1.5} />
                  <h2 className="font-display text-lg text-text-primary">知識缺口</h2>
                </div>
                <span className="font-mono text-xs text-text-muted">{data.gaps.length} open</span>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {data.gaps.length === 0 && <p className="text-xs text-text-muted">暫時冇低覆蓋問題。</p>}
                {data.gaps.map((gap) => (
                  <article key={gap.id} className="rounded-md border border-border bg-card p-4">
                    <p className="text-sm leading-relaxed text-text-primary">{gap.question}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-xs text-text-muted">{gap.experts?.display_name ?? "未知導師"}</span>
                      <button disabled={busy === gap.id} type="button" onClick={() => void dismissGap(gap.id)} className="press text-xs text-text-secondary underline-offset-2 hover:underline disabled:opacity-40">略過</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </QueryState>
    </div>
  );
}
