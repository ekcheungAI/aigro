import { useMemo, useState } from "react";
import { CalendarClock, MessageSquareText, Save, Sparkles, Target } from "lucide-react";
import AdminSlideOver from "@/components/admin/AdminSlideOver";
import { useAdminToast } from "@/components/admin/AdminToast";
import { usePortalExpert } from "@/components/portal/PortalLayout";
import QueryState from "@/components/QueryState";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  leadQuestionMeta,
  leadQuestionText,
  formatDate,
  personaLabel,
  timeAgo,
  useAdminQuery,
} from "@/components/admin/adminData";
import type { AdminLeadRow } from "@/components/admin/adminData";
import type { LeadStage } from "@/components/admin/adminData";

const STAGES: LeadStage[] = ["新線索", "已接觸", "跟進中", "已轉化"];

interface LeadNoteRow {
  id: string;
  body: string;
  created_at: string;
}

interface ExpertCrmSummary {
  conversation_count: number;
  lead_count: number;
  high_intent_count: number;
  following_up_count: number;
  converted_count: number;
}

interface ExpertCrmData {
  preview: AdminLeadRow[];
  summary: ExpertCrmSummary;
}

/** 高意向訊號(導入/預約/價錢 = 高) */
const HIGH_SIGNALS = ["問公司導入", "問預約", "問價錢"];

function isHigh(score: number) {
  return score >= 70;
}

function signalChipClass(s: string) {
  if (HIGH_SIGNALS.includes(s)) return "bg-lime-soft text-lime-text";
  return "bg-card text-text-secondary";
}

function stageChipClass(stage: string) {
  if (stage === "已轉化") return "bg-lime-soft text-lime-text";
  if (stage === "跟進中") return "bg-card text-[#A36A0F]";
  return "bg-card text-text-secondary";
}

function normalizeCount(value: unknown): number {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function normalizeCrmSummary(value: unknown): ExpertCrmSummary {
  const row = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  return {
    conversation_count: normalizeCount(row.conversation_count),
    lead_count: normalizeCount(row.lead_count),
    high_intent_count: normalizeCount(row.high_intent_count),
    following_up_count: normalizeCount(row.following_up_count),
    converted_count: normalizeCount(row.converted_count),
  };
}

/** 用 server-owned expert_id 查本人 CRM：RPC 提供精確總數，列表只預覽最高分 200 條。 */
async function fetchMyCrm(expertId: string): Promise<ExpertCrmData> {
  if (!supabase) throw new Error("Supabase 未連接");
  const [previewResult, summaryResult] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id,expert_id,user_id,anon_id,owner_is_anonymous,persona,score,signals,stage,questions,analysis,timeline,next_follow_up_at,contact_consented_at,contact_email,last_activity_at,created_at"
      )
      .eq("expert_id", expertId)
      .order("score", { ascending: false })
      .limit(200),
    supabase
      .rpc("get_expert_crm_summary", { p_expert_id: expertId })
      .single(),
  ]);
  if (previewResult.error) throw new Error(previewResult.error.message);
  if (summaryResult.error) throw new Error(summaryResult.error.message);
  return {
    preview: (previewResult.data ?? []) as AdminLeadRow[],
    summary: normalizeCrmSummary(summaryResult.data),
  };
}

async function fetchLeadNotes(leadId: string | null): Promise<LeadNoteRow[]> {
  if (!leadId) return [];
  if (!supabase) throw new Error("Supabase 未連接");
  const { data, error } = await supabase
    .from("lead_notes")
    .select("id,body,created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as LeadNoteRow[];
}

function toLocalDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

/**
 * PortalLeads `/portal/leads` — 我的線索(scoped CRM,真數據)。
 * 只顯示 server 綁定到「我」嘅 expert_id 線索，並提供 scoped follow-up workflow。
 */
export default function PortalLeads() {
  const { slug, expert, expertId } = usePortalExpert();
  const toast = useAdminToast();
  const { data, loading, error, refetch } = useAdminQuery(
    () => fetchMyCrm(expertId),
    [expertId]
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [stageDraft, setStageDraft] = useState<LeadStage>("新線索");
  const [noteDraft, setNoteDraft] = useState("");
  const [followUpDraft, setFollowUpDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const {
    data: notes,
    loading: notesLoading,
    error: notesError,
    refetch: refetchNotes,
  } = useAdminQuery(() => fetchLeadNotes(openId), [openId]);

  const list = useMemo(() => data?.preview ?? [], [data]);
  const active = list.find((l) => l.id === openId) ?? null;
  const firstName = expert?.nameEn.split(" ")[0] ?? slug;

  const openLead = (lead: AdminLeadRow) => {
    setOpenId(lead.id);
    setStageDraft(lead.stage);
    setNoteDraft("");
    setFollowUpDraft(toLocalDateTime(lead.next_follow_up_at));
  };

  const saveFollowUp = async () => {
    if (!supabase || !active || saving) return;
    setSaving(true);
    const nextFollowUp = followUpDraft
      ? new Date(followUpDraft).toISOString()
      : null;
    const { error: updateError } = await supabase.rpc("update_expert_lead", {
      p_lead_id: active.id,
      p_stage: stageDraft,
      p_note: noteDraft.trim() || null,
      p_next_follow_up_at: nextFollowUp,
    });
    setSaving(false);
    if (updateError) {
      toast(`儲存失敗：${updateError.message}`);
      return;
    }
    setNoteDraft("");
    refetch();
    refetchNotes();
    toast("CRM 階段、備註同跟進日期已安全儲存");
  };

  const kpis = {
    total: data?.summary.lead_count ?? 0,
    high: data?.summary.high_intent_count ?? 0,
    following: data?.summary.following_up_count ?? 0,
    converted: data?.summary.converted_count ?? 0,
  };

  const leadLabel = (l: AdminLeadRow) =>
    l.contact_consented_at && l.contact_email
      ? l.contact_email
      : l.owner_is_anonymous || l.anon_id
      ? `訪客 ${l.anon_id?.slice(0, 8) ?? l.id.slice(0, 8)}`
      : `會員 ${l.user_id?.slice(0, 8) ?? "—"}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
          My Leads
        </p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
          我的線索
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          同 {firstName} 嘅分身傾過偈嘅訪客同會員 — 只按你嘅 expert_id
          查詢；你可以管理階段、私人備註同下一次跟進。
        </p>
      </div>

      {/* KPI row */}
      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        {[
          { label: "分身線索", value: kpis.total },
          { label: "高意向(70+)", value: kpis.high },
          { label: "跟進中", value: kpis.following },
          { label: "已轉化", value: kpis.converted },
        ].map((k) => (
          <div key={k.label} className="bg-surface px-5 py-4">
            <p className="text-xs text-text-muted">{k.label}</p>
            <p className="mt-1.5 font-mono text-[26px] font-semibold leading-none text-text-primary">
              {loading ? "…" : k.value}
            </p>
          </div>
        ))}
      </div>

      <QueryState
        loading={loading}
        error={error ? `載入失敗:${error}` : null}
        retry={refetch}
        empty={
          data && data.summary.lead_count === 0 ? (
            <div className="rounded-lg border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
              <Target className="mx-auto h-6 w-6 text-text-muted" />
              <p className="mt-3 text-sm font-medium text-text-primary">
                暫時未有線索
              </p>
              <p className="mx-auto mt-1.5 max-w-[400px] text-xs leading-relaxed text-text-muted">
                你嘅分身暫時未有高意圖對話。當訪客同你嘅分身問到公司導入、
                AI 導師服務啟用後，預約或價錢呢類高意圖問題會由 server 自動評分並記入 leads 表,
                即刻喺呢度出現。
              </p>
            </div>
          ) : null
        }
      >
        {data && data.preview.length > 0 && (
          <section className="rounded-lg border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <p className="text-xs font-medium text-text-primary">
                最高分線索預覽（最多 200 條）
              </p>
              <p className="font-mono text-[11px] text-text-muted">
                顯示 {list.length} / {data.summary.lead_count}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-text-muted">
                    <th className="px-4 py-3 font-medium">線索</th>
                    <th className="px-4 py-3 font-medium">評分</th>
                    <th className="px-4 py-3 font-medium">訊號</th>
                    <th className="px-4 py-3 font-medium">最近活動</th>
                    <th className="px-4 py-3 text-right font-medium">階段</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((l) => (
                    <tr
                      key={l.id}
                      onClick={() => openLead(l)}
                      className="cursor-pointer transition-colors hover:bg-card/60"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary">
                          {leadLabel(l)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "font-mono text-sm font-semibold",
                            isHigh(l.score ?? 0) ? "text-lime-text" : "text-text-primary"
                          )}
                        >
                          {l.score ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(l.signals ?? []).map((s) => (
                            <span
                              key={s}
                              className={cn(
                                "rounded-sm px-1.5 py-0.5 text-[11px]",
                                signalChipClass(s)
                              )}
                            >
                              {s}
                            </span>
                          ))}
                          {(l.signals ?? []).length === 0 && (
                            <span className="text-xs text-text-muted">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                        {timeAgo(l.last_activity_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            "rounded-sm px-2 py-0.5 text-xs font-medium",
                            stageChipClass(l.stage)
                          )}
                        >
                          {l.stage}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </QueryState>

      {/* Detail slide-over — 讀取真數據，寫入由 membership-checked RPC 處理。 */}
      <AdminSlideOver
        open={active !== null}
        onClose={() => setOpenId(null)}
        title={active ? leadLabel(active) : undefined}
        subtitle={
          active
            ? `${personaLabel(active.persona)} · 評分 ${active.score ?? 0} · ${active.stage}`
            : undefined
        }
        width={520}
      >
        {active && (
          <div className="space-y-6 px-6 py-5">
            {/* 問題列表 */}
            <div>
              <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
                <MessageSquareText className="h-3.5 w-3.5" />
                問過嘅問題({(active.questions ?? []).length})
              </p>
              {(active.questions ?? []).length > 0 ? (
                <ul className="mt-2.5 space-y-2">
                  {(active.questions ?? []).map((q, i) => (
                    <li
                      key={i}
                      className="rounded-md border border-border bg-card/50 px-3.5 py-2.5"
                    >
                      <p className="text-sm leading-relaxed text-text-primary">
                        「{leadQuestionText(q)}」
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-text-muted">
                        {leadQuestionMeta(q).date} {leadQuestionMeta(q).persona
                          ? `· ${personaLabel(leadQuestionMeta(q).persona)}`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2.5 rounded-md border border-dashed border-border px-3.5 py-4 text-xs text-text-muted">
                  暫無問題記錄。
                </p>
              )}
            </div>

            {/* 意向分析 */}
            <div>
              <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
                <Sparkles className="h-3.5 w-3.5" />
                意向分析
              </p>
              <div className="mt-2.5 rounded-md border border-border bg-surface px-4 py-3.5">
                <div className="flex flex-wrap gap-1">
                  {(active.signals ?? []).map((s) => (
                    <span
                      key={s}
                      className={cn(
                        "rounded-sm px-1.5 py-0.5 text-[11px]",
                        signalChipClass(s)
                      )}
                    >
                      {s}
                    </span>
                  ))}
                  {(active.signals ?? []).length === 0 && (
                    <span className="text-xs text-text-muted">未有訊號標記</span>
                  )}
                </div>
                {active.analysis && (
                  <p className="mt-3 border-t border-border pt-2.5 text-xs font-medium leading-relaxed text-lime-text">
                    {active.analysis}
                  </p>
                )}
              </div>
            </div>

            {/* 跟進時間線 */}
            <div>
              <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
                <Target className="h-3.5 w-3.5" />
                跟進時間線
              </p>
              {(active.timeline ?? []).length > 0 ? (
                <ol className="mt-2.5 space-y-0">
                  {(active.timeline ?? []).map((t, i) => (
                    <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                      {i < (active.timeline ?? []).length - 1 && (
                        <span className="absolute left-[3px] top-3 h-full w-px bg-border" />
                      )}
                      <span className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full bg-border-strong" />
                      <div>
                        <p className="text-xs leading-relaxed text-text-primary">
                          {t.label ?? ""}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-text-muted">
                          {t.date ?? ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2.5 rounded-md border border-dashed border-border px-3.5 py-4 text-xs text-text-muted">
                  未有跟進記錄。
                </p>
              )}
            </div>

            <div className="space-y-3 rounded-md border border-border bg-card/50 px-4 py-4">
              <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
                <CalendarClock className="h-3.5 w-3.5" />
                CRM 跟進
              </p>
              <label className="block">
                <span className="mb-1 block text-xs text-text-muted">階段</span>
                <select
                  value={stageDraft}
                  onChange={(event) => setStageDraft(event.target.value as LeadStage)}
                  className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary focus:border-lime focus:outline-none"
                >
                  {STAGES.map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-text-muted">下一次跟進</span>
                <input
                  type="datetime-local"
                  value={followUpDraft}
                  onChange={(event) => setFollowUpDraft(event.target.value)}
                  className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 font-mono text-sm text-text-primary focus:border-lime focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-text-muted">內部備註（只限所屬導師及管理員）</span>
                <textarea
                  value={noteDraft}
                  maxLength={2000}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="記低下一步、需求或跟進結果…"
                  className="min-h-24 w-full resize-y rounded-md border border-border-strong bg-surface px-3 py-2 text-sm leading-relaxed text-text-primary placeholder:text-text-muted focus:border-lime focus:outline-none"
                />
              </label>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveFollowUp()}
                className="press inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-lime px-4 py-2.5 text-sm font-medium text-on-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "儲存中…" : "儲存跟進"}
              </button>
            </div>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
                內部備註
              </p>
              {notesLoading ? (
                <p className="mt-2 text-xs text-text-muted">載入備註中…</p>
              ) : notesError ? (
                <p className="mt-2 text-xs text-error">備註載入失敗：{notesError}</p>
              ) : notes && notes.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {notes.map((note) => (
                    <li key={note.id} className="rounded-md border border-border bg-surface px-3.5 py-3">
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-text-primary">{note.body}</p>
                      <p className="mt-1 font-mono text-[10px] text-text-muted">{formatDate(note.created_at)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 rounded-md border border-dashed border-border px-3.5 py-4 text-xs text-text-muted">
                  未有內部備註。
                </p>
              )}
            </div>

            <p className="rounded-md border border-border bg-card/50 px-4 py-3 text-[11px] leading-relaxed text-text-muted">
              聯絡資料只會喺用戶明確同意後提供；目前記錄未同意時，只顯示匿名／會員識別碼。
            </p>
          </div>
        )}
      </AdminSlideOver>
    </div>
  );
}
