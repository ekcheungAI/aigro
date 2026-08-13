import { useMemo, useState } from "react";
import { BrainCircuit, Check, FlaskConical, MessageSquareWarning, ShieldCheck, Trash2, X } from "lucide-react";
import AdminToggle from "@/components/admin/AdminToggle";
import { useAdminToast } from "@/components/admin/AdminToast";
import QueryState from "@/components/QueryState";
import { useAdminQuery } from "@/components/admin/adminData";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";

interface ExpertRow {
  id: string;
  slug: string;
  display_name: string;
  status: "draft" | "active" | "suspended";
  owner_user_id: string | null;
  feature_flags: Record<string, boolean>;
  published_persona_version_id: string | null;
}

interface ReviewRow {
  id: string;
  status: string;
  created_at: string;
  knowledge_sources: {
    id: string;
    title: string;
    expert_id: string;
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
  mental_models?: Array<{ name?: string; description?: string; evidence_refs?: string[] }>;
  decision_heuristics?: Array<{ trigger?: string; rule?: string }>;
  tensions?: Array<{ tension?: string; when_each_applies?: string }>;
  honest_boundaries?: Array<{ boundary?: string; response_strategy?: string }>;
}

interface PersonaJobRow {
  id: string;
  expert_id: string;
  status: string;
  fidelity_score: number | null;
  fidelity_status: string;
  output_blueprint: PersonaBlueprint;
  evidence_manifest: { source_count?: number; evidence_count?: number };
  source_revision_ids: string[];
  error_message: string | null;
  created_at: string;
  experts: { display_name: string; slug: string } | null;
}

interface StudioData {
  experts: ExpertRow[];
  reviews: ReviewRow[];
  gaps: GapRow[];
  personaJobs: PersonaJobRow[];
}

/** Both tables point at each other, so PostgREST needs the source_id FK hint. */
export const STUDIO_REVIEW_SELECT =
  "id,status,created_at,knowledge_sources!knowledge_revisions_source_id_fkey(id,title,expert_id,experts(display_name,slug))";

async function fetchStudio(): Promise<StudioData> {
  if (!supabase) throw new Error("Supabase 未連接");
  const [experts, reviews, gaps, personaJobs] = await Promise.all([
    supabase.from("experts").select("id,slug,display_name,status,owner_user_id,feature_flags,published_persona_version_id").is("archived_at", null).order("display_name"),
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
      .select("id,expert_id,status,fidelity_score,fidelity_status,output_blueprint,evidence_manifest,source_revision_ids,error_message,created_at,experts(display_name,slug)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (experts.error) throw new Error(experts.error.message);
  if (reviews.error) throw new Error(reviews.error.message);
  if (gaps.error) throw new Error(gaps.error.message);
  if (personaJobs.error) throw new Error(personaJobs.error.message);
  return {
    experts: (experts.data ?? []) as unknown as ExpertRow[],
    reviews: (reviews.data ?? []) as unknown as ReviewRow[],
    gaps: (gaps.data ?? []) as unknown as GapRow[],
    personaJobs: (personaJobs.data ?? []) as unknown as PersonaJobRow[],
  };
}

export const STUDIO_FLAGS = [
  ["cms_ingestion_enabled", "素材蒸餾"],
  ["persona_compiler_enabled", "角色蒸餾"],
  ["rag_enabled", "RAG 回答"],
  ["booking_enabled", "真人預約"],
  ["social_sync_enabled", "每日社交同步"],
] as const;

type StudioFlagKey = typeof STUDIO_FLAGS[number][0];

interface PendingFlagChange {
  expert: ExpertRow;
  key: StudioFlagKey;
  label: string;
  value: boolean;
}

export default function AdminStudio() {
  const toast = useAdminToast();
  const { data, loading, error, refetch } = useAdminQuery(fetchStudio);
  const [busy, setBusy] = useState<string | null>(null);
  const [personaExpertId, setPersonaExpertId] = useState("");
  const [greeting, setGreeting] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [pendingFlag, setPendingFlag] = useState<PendingFlagChange | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ExpertRow | null>(null);

  const experts = useMemo(() => data?.experts ?? [], [data]);
  const selectedExpert = experts.find((expert) => expert.id === personaExpertId) ?? experts[0];
  const selectedPersonaJob = data?.personaJobs.find((job) => job.expert_id === selectedExpert?.id);

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
    else { toast(`${expert.display_name} 功能旗標已更新`); refetch(); }
  };

  const requestFlagChange = (
    expert: ExpertRow,
    key: StudioFlagKey,
    label: string,
    value: boolean
  ) => {
    if (value && ["rag_enabled", "booking_enabled", "social_sync_enabled"].includes(key)) {
      setPendingFlag({ expert, key, label, value });
      return;
    }
    void setFlag(expert, key, value);
  };

  const archiveWorkspace = async () => {
    if (!supabase || !archiveTarget) return;
    const unusedDraft = archiveTarget.status === "draft" && !archiveTarget.owner_user_id;
    setBusy(`archive:${archiveTarget.id}`);
    const { error: archiveError } = await supabase.rpc(
      unusedDraft ? "archive_unused_expert_draft" : "archive_expert_workspace",
      { p_expert_id: archiveTarget.id }
    );
    setBusy(null);
    if (archiveError) {
      toast(`${unusedDraft ? "未能刪除草稿" : "未能封存 workspace"}：${archiveError.message}`);
      return;
    }
    setArchiveTarget(null);
    toast(
      unusedDraft
        ? "未使用導師草稿已安全刪除並釋放席位"
        : "導師 workspace 已安全封存；公開功能已停用，私人資料及 audit history 已保留"
    );
    refetch();
  };

  const review = async (revisionId: string, decision: "approve" | "reject") => {
    if (!supabase) return;
    setBusy(revisionId);
    const { error: reviewError } = await supabase.rpc("review_knowledge_revision", {
      p_revision_id: revisionId,
      p_decision: decision,
      p_notes: "Admin Studio 代審",
    });
    setBusy(null);
    if (reviewError) toast(`審批失敗：${reviewError.message}`);
    else { toast(decision === "approve" ? "已代導師批准並發佈" : "Revision 已拒絕"); refetch(); }
  };

  const queuePersona = async () => {
    if (!supabase || !selectedExpert) return;
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
    setBusy("persona-review");
    const { error: reviewError } = await supabase.rpc("review_persona_synthesis", {
      p_job_id: selectedPersonaJob.id,
      p_decision: decision,
      p_notes: reviewNotes.trim(),
      p_override_fidelity: false,
    });
    setBusy(null);
    if (reviewError) toast(`角色審批失敗：${reviewError.message}`);
    else { toast(decision === "approve" ? "角色藍圖已批准，等待發佈" : "角色藍圖已拒絕"); refetch(); }
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
    else { toast(`${selectedExpert.display_name} compiled persona 已發佈`); refetch(); }
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
                          onChange={(next) => requestFlagChange(expert, key, label, next)}
                        />
                        <span className="w-4 font-mono text-[10px] text-text-muted">
                          {expert.feature_flags?.[key] === true ? "開" : "關"}
                        </span>
                      </div>
                    ))}
                    <button
                      type="button"
                      disabled={busy === `archive:${expert.id}`}
                      onClick={() => setArchiveTarget(expert)}
                      className="press inline-flex items-center gap-1 rounded-md border border-error/40 px-2.5 py-1.5 text-xs text-error transition-colors hover:border-error hover:bg-error/5 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {expert.status === "draft" && !expert.owner_user_id ? "刪除草稿" : "封存"}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-lg border border-border bg-surface p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-lg text-text-primary">知識審批</h2>
                  <span className="font-mono text-xs text-text-muted">{data.reviews.length} pending</span>
                </div>
                <div className="mt-4 space-y-2">
                  {data.reviews.length === 0 && <p className="text-xs text-text-muted">暫時冇等待審批嘅 revision。</p>}
                  {data.reviews.map((revision) => (
                    <article key={revision.id} className="rounded-md border border-border bg-card p-4">
                      <p className="text-sm font-medium text-text-primary">{revision.knowledge_sources?.title ?? "未命名素材"}</p>
                      <p className="mt-1 text-xs text-text-muted">{revision.knowledge_sources?.experts?.display_name ?? "未知導師"}</p>
                      <div className="mt-3 flex gap-2">
                        <button disabled={busy === revision.id} type="button" onClick={() => void review(revision.id, "approve")} className="press inline-flex items-center gap-1 rounded-md bg-lime px-3 py-1.5 text-xs font-medium text-on-accent disabled:opacity-40">
                          <Check className="h-3.5 w-3.5" /> 代批准
                        </button>
                        <button disabled={busy === revision.id} type="button" onClick={() => void review(revision.id, "reject")} className="press inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary disabled:opacity-40">
                          <X className="h-3.5 w-3.5" /> 拒絕
                        </button>
                      </div>
                    </article>
                  ))}
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
                    <button type="button" disabled={!selectedExpert || busy === "persona-queue"} onClick={() => void queuePersona()} className="press w-full rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-40">由已發佈知識建立角色藍圖</button>
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

                  {selectedPersonaJob?.status === "review" && (
                    <>
                      <div className="max-h-72 space-y-3 overflow-y-auto rounded-md border border-border bg-card p-4">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">Mental models</p>
                          {(selectedPersonaJob.output_blueprint.mental_models ?? []).map((model, index) => (
                            <div key={`${model.name}-${index}`} className="mt-2">
                              <p className="text-xs font-medium text-text-primary">{model.name}</p>
                              <p className="text-xs leading-relaxed text-text-muted">{model.description}</p>
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">Tensions</p>
                          {(selectedPersonaJob.output_blueprint.tensions ?? []).map((item, index) => <p key={`${item.tension}-${index}`} className="mt-1 text-xs text-text-secondary">{item.tension}：{item.when_each_applies}</p>)}
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">Honest boundaries</p>
                          {(selectedPersonaJob.output_blueprint.honest_boundaries ?? []).map((item, index) => <p key={`${item.boundary}-${index}`} className="mt-1 text-xs text-text-secondary">{item.boundary}：{item.response_strategy}</p>)}
                        </div>
                      </div>
                      <textarea value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} rows={2} placeholder="審批備註（可選）" className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text-primary" />
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" disabled={busy === "persona-review" || selectedPersonaJob.fidelity_status !== "passed"} onClick={() => void reviewPersona("approve")} className="press rounded-md bg-lime px-3 py-2 text-sm font-medium text-on-accent disabled:opacity-40">批准藍圖</button>
                        <button type="button" disabled={busy === "persona-review"} onClick={() => void reviewPersona("reject")} className="press rounded-md border border-border px-3 py-2 text-sm text-text-secondary disabled:opacity-40">拒絕</button>
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

      <AlertDialog
        open={pendingFlag !== null}
        onOpenChange={(open) => !open && setPendingFlag(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-medium text-text-primary">
              啟用 {pendingFlag?.label}？
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed text-text-secondary">
              呢個係對外功能。系統會先執行依賴檢查；未符合 release gate 就會拒絕更新，唔會靜默開啟。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="press">取消</AlertDialogCancel>
            <AlertDialogAction
              className="press bg-lime text-on-accent hover:bg-lime-hover"
              onClick={() => {
                if (!pendingFlag) return;
                void setFlag(pendingFlag.expert, pendingFlag.key, pendingFlag.value);
                setPendingFlag(null);
              }}
            >
              檢查並啟用
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open && busy !== `archive:${archiveTarget?.id ?? ""}`) setArchiveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-medium text-text-primary">
              {archiveTarget?.status === "draft" && !archiveTarget.owner_user_id
                ? "刪除未使用草稿？"
                : "封存導師 workspace？"}
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed text-text-secondary">
              {archiveTarget?.status === "draft" && !archiveTarget.owner_user_id
                ? `${archiveTarget.display_name} 未連結 owner；系統只會刪除未使用草稿並釋放席位。`
                : `${archiveTarget?.display_name ?? "呢個導師"} 嘅公開頁、AI、預約及社交同步會即時下線；私人資料同 audit history 會保留。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="press" disabled={busy?.startsWith("archive:")}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className="press bg-error text-destructive-foreground hover:bg-error/90"
              disabled={busy?.startsWith("archive:")}
              onClick={(event) => {
                event.preventDefault();
                void archiveWorkspace();
              }}
            >
              {busy?.startsWith("archive:") ? "處理中…" : "確認"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
