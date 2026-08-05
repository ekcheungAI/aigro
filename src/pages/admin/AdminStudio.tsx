import { useMemo, useState } from "react";
import { Check, FlaskConical, MessageSquareWarning, ShieldCheck, X } from "lucide-react";
import AdminToggle from "@/components/admin/AdminToggle";
import { useAdminToast } from "@/components/admin/AdminToast";
import QueryState from "@/components/QueryState";
import { useAdminQuery } from "@/components/admin/adminData";
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

interface StudioData {
  experts: ExpertRow[];
  reviews: ReviewRow[];
  gaps: GapRow[];
}

async function fetchStudio(): Promise<StudioData> {
  if (!supabase) throw new Error("Supabase 未連接");
  const [experts, reviews, gaps] = await Promise.all([
    supabase.from("experts").select("id,slug,display_name,status,feature_flags,published_persona_version_id").order("display_name"),
    supabase.from("knowledge_revisions")
      .select("id,status,created_at,knowledge_sources(id,title,expert_id,experts(display_name,slug))")
      .eq("status", "review")
      .order("created_at", { ascending: true }),
    supabase.from("knowledge_gaps")
      .select("id,question,status,created_at,experts(display_name)")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (experts.error) throw new Error(experts.error.message);
  if (reviews.error) throw new Error(reviews.error.message);
  if (gaps.error) throw new Error(gaps.error.message);
  return {
    experts: (experts.data ?? []) as unknown as ExpertRow[],
    reviews: (reviews.data ?? []) as unknown as ReviewRow[],
    gaps: (gaps.data ?? []) as unknown as GapRow[],
  };
}

const FLAGS = [
  ["cms_ingestion_enabled", "素材蒸餾"],
  ["rag_enabled", "RAG 回答"],
  ["booking_enabled", "真人預約"],
] as const;

export default function AdminStudio() {
  const toast = useAdminToast();
  const { data, loading, error, refetch } = useAdminQuery(fetchStudio);
  const [busy, setBusy] = useState<string | null>(null);
  const [personaExpertId, setPersonaExpertId] = useState("");
  const [greeting, setGreeting] = useState("");
  const [voice, setVoice] = useState("直接、有條理、誠實講限制；使用繁體中文香港書面粵語。");
  const [boundaries, setBoundaries] = useState("唔好編造個人經歷\n資料不足要清楚講明\n唔提供私人資料");

  const experts = useMemo(() => data?.experts ?? [], [data]);
  const selectedExpert = experts.find((expert) => expert.id === personaExpertId) ?? experts[0];

  const setFlag = async (expert: ExpertRow, key: string, value: boolean) => {
    if (!supabase) return;
    setBusy(`${expert.id}:${key}`);
    const { error: updateError } = await supabase.from("experts").update({
      feature_flags: { ...expert.feature_flags, [key]: value },
    }).eq("id", expert.id);
    setBusy(null);
    if (updateError) toast(`更新失敗：${updateError.message}`);
    else { toast(`${expert.display_name} 功能旗標已更新`); refetch(); }
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

  const publishPersona = async () => {
    if (!supabase || !selectedExpert || !greeting.trim()) return;
    setBusy("persona");
    const { error: personaError } = await supabase.rpc("publish_persona_version", {
      p_expert_id: selectedExpert.id,
      p_greeting: greeting.trim(),
      p_voice_rules: { instructions: voice.trim() },
      p_boundaries: boundaries.split("\n").map((line) => line.trim()).filter(Boolean),
      p_sample_dialogues: [],
    });
    setBusy(null);
    if (personaError) toast(`Persona 發佈失敗：${personaError.message}`);
    else { toast(`${selectedExpert.display_name} 新 persona version 已發佈`); refetch(); }
  };

  const dismissGap = async (id: string) => {
    if (!supabase) return;
    setBusy(id);
    const { error: gapError } = await supabase.from("knowledge_gaps")
      .update({ status: "dismissed", resolved_at: new Date().toISOString() })
      .eq("id", id);
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
                    {FLAGS.map(([key, label]) => (
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
                  <ShieldCheck className="h-4 w-4 text-lime-text" strokeWidth={1.5} />
                  <h2 className="font-display text-lg text-text-primary">發佈 Persona Version</h2>
                </div>
                <div className="mt-4 space-y-3">
                  <select value={selectedExpert?.id ?? ""} onChange={(event) => setPersonaExpertId(event.target.value)} className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text-primary">
                    {experts.map((expert) => <option key={expert.id} value={expert.id}>{expert.display_name}</option>)}
                  </select>
                  <input value={greeting} onChange={(event) => setGreeting(event.target.value)} placeholder="導師開場白" className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text-primary" />
                  <textarea value={voice} onChange={(event) => setVoice(event.target.value)} rows={3} className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text-primary" aria-label="語氣規則" />
                  <textarea value={boundaries} onChange={(event) => setBoundaries(event.target.value)} rows={3} className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text-primary" aria-label="每行一條界線" />
                  <button type="button" disabled={!greeting.trim() || busy === "persona"} onClick={() => void publishPersona()} className="press w-full rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-40">發佈新版本</button>
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
