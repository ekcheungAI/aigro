import { useMemo, useState } from "react";
import {
  ArrowRight,
  MessagesSquare,
  Sparkles,
  StickyNote,
  Target,
} from "lucide-react";
import AdminSlideOver from "@/components/admin/AdminSlideOver";
import { useAdminToast } from "@/components/admin/AdminToast";
import QueryState from "@/components/QueryState";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  leadQuestionMeta,
  leadQuestionText,
  personaLabel,
  timeAgo,
  useAdminQuery,
} from "@/components/admin/adminData";
import type { AdminLeadRow, LeadStage } from "@/components/admin/adminData";

type StageFilter = "全部" | LeadStage;

interface AdminCrmSummary {
  lead_count: number;
  high_intent_count: number;
  week_new_count: number;
  new_count: number;
  contacted_count: number;
  following_up_count: number;
  converted_count: number;
}

interface AdminCrmData {
  preview: AdminLeadRow[];
  summary: AdminCrmSummary;
}

const STAGES: { key: LeadStage; en: string }[] = [
  { key: "新線索", en: "New" },
  { key: "已接觸", en: "Contacted" },
  { key: "跟進中", en: "Following" },
  { key: "已轉化", en: "Converted" },
];

/** 高意向訊號(導入/預約/價錢 = 高) */
const HIGH_SIGNALS = ["問公司導入", "問預約", "問價錢"];

function isHigh(score: number) {
  return score >= 70;
}

function signalChipClass(s: string) {
  if (HIGH_SIGNALS.includes(s)) return "bg-lime-soft text-lime-text border-lime/40";
  return "bg-card text-text-secondary border-border";
}

function count(value: unknown): number {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : 0;
}

function normalizeSummary(value: unknown): AdminCrmSummary {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    lead_count: count(row.lead_count),
    high_intent_count: count(row.high_intent_count),
    week_new_count: count(row.week_new_count),
    new_count: count(row.new_count),
    contacted_count: count(row.contacted_count),
    following_up_count: count(row.following_up_count),
    converted_count: count(row.converted_count),
  };
}

async function fetchLeads(): Promise<AdminCrmData> {
  if (!supabase) throw new Error("Supabase 未連接 — 請檢查環境變數。");
  const [previewResult, summaryResult] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id,user_id,anon_id,owner_is_anonymous,persona,score,signals,stage,questions,analysis,timeline,last_activity_at,created_at"
      )
      .order("last_activity_at", { ascending: false })
      .limit(500),
    supabase.rpc("get_admin_crm_summary").single(),
  ]);
  if (previewResult.error) throw new Error(previewResult.error.message);
  if (summaryResult.error) throw new Error(summaryResult.error.message);
  return {
    preview: (previewResult.data ?? []) as AdminLeadRow[],
    summary: normalizeSummary(summaryResult.data),
  };
}

/** 意向評分錶盤 — 大 mono 數字 + hairline 圓環 */
function ScoreDial({ score }: { score: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
  return (
    <span className="relative inline-block h-14 w-14 shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="1.5" className="stroke-border" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
          className={isHigh(score) ? "stroke-lime" : "stroke-border-strong"}
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center font-mono text-base font-medium",
          isHigh(score) ? "text-lime-text" : "text-text-primary"
        )}
      >
        {score}
      </span>
    </span>
  );
}

export default function AdminCRM() {
  const toast = useAdminToast();
  const { data, loading, error, refetch } = useAdminQuery(fetchLeads);
  const [stageFilter, setStageFilter] = useState<StageFilter>("全部");
  const [openId, setOpenId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  const list = useMemo(() => data?.preview ?? [], [data]);
  const active = list.find((l) => l.id === openId) ?? null;

  const filtered = useMemo(
    () => (stageFilter === "全部" ? list : list.filter((l) => l.stage === stageFilter)),
    [list, stageFilter]
  );

  const stageCount = (s: LeadStage) => ({
    新線索: data?.summary.new_count ?? 0,
    已接觸: data?.summary.contacted_count ?? 0,
    跟進中: data?.summary.following_up_count ?? 0,
    已轉化: data?.summary.converted_count ?? 0,
  })[s];

  /** 建議跟進 queue — 未接觸線索按評分排序,取 top 5 */
  const followUpQueue = useMemo(
    () =>
      list
        .filter((l) => l.stage === "新線索")
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 5),
    [list]
  );

  const leadLabel = (l: AdminLeadRow) =>
    l.owner_is_anonymous || l.anon_id
      ? `訪客 ${l.anon_id?.slice(0, 8) ?? l.id.slice(0, 8)}`
      : `會員 ${l.user_id?.slice(0, 8) ?? "—"}`;

  const moveStage = async (lead: AdminLeadRow, stage: LeadStage) => {
    if (!supabase || moving) return;
    setMoving(true);
    const { error: updateError } = await supabase.rpc("update_lead_stage", {
      p_lead_id: lead.id,
      p_stage: stage,
    });
    setMoving(false);
    if (updateError) {
      toast(`更新失敗:${updateError.message}`);
      return;
    }
    toast(`已將 ${leadLabel(lead)} 移至「${stage}」`);
    refetch();
  };

  const kpis = [
    { label: "總線索", value: data?.summary.lead_count ?? 0, lime: false },
    { label: "高意向", value: data?.summary.high_intent_count ?? 0, lime: true },
    { label: "本週新增", value: data?.summary.week_new_count ?? 0, lime: false },
    { label: "跟進中", value: stageCount("跟進中"), lime: false },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
          CRM
        </p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
          線索管理
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          leads 表即時查詢及有 audit trail 嘅階段更新已接通；新線索自動流入仍取決於 AI 導師服務。
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs text-text-muted">{k.label}</p>
            <p
              className={cn(
                "mt-1.5 font-mono text-2xl font-medium",
                k.lime ? "text-lime-text" : "text-text-primary"
              )}
            >
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
            <div className="mt-5 rounded-lg border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
              <Target className="mx-auto h-6 w-6 text-text-muted" />
              <p className="mt-3 text-sm font-medium text-text-primary">
                暫未有線索
              </p>
              <p className="mx-auto mt-1.5 max-w-[440px] text-xs leading-relaxed text-text-muted">
                leads 表而家係 0。AI 導師 provider 同匿名 Auth 啟用後，對話會喺同一個
                server transaction 內按公司導入、預約同價錢意圖評分並寫入呢度。
              </p>
            </div>
          ) : null
        }
      >
        {data && data.summary.lead_count > 0 && (
          <>
            {/* Pipeline stage tabs */}
            <div className="mt-5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setStageFilter("全部")}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                  stageFilter === "全部"
                    ? "border-lime bg-lime text-on-accent"
                    : "border-border bg-surface text-text-secondary hover:border-border-strong"
                )}
              >
                全部
                <span className="ml-1 font-mono">{data.summary.lead_count}</span>
              </button>
              {STAGES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStageFilter(s.key)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                    stageFilter === s.key
                      ? "border-lime bg-lime text-on-accent"
                      : "border-border bg-surface text-text-secondary hover:border-border-strong"
                  )}
                >
                  {s.key} {s.en}
                  <span className="ml-1 font-mono">{stageCount(s.key)}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {/* Leads table */}
              <div className="overflow-x-auto rounded-lg border border-border bg-surface lg:col-span-2">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-text-muted">
                      <th className="px-4 py-3 font-medium">Lead</th>
                      <th className="px-4 py-3 font-medium">接觸分身</th>
                      <th className="px-4 py-3 font-medium">意向評分</th>
                      <th className="px-4 py-3 font-medium">關鍵訊號</th>
                      <th className="px-4 py-3 font-medium">最近活動</th>
                      <th className="px-4 py-3 font-medium">階段</th>
                      <th className="px-4 py-3 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((l) => (
                      <tr
                        key={l.id}
                        onClick={() => setOpenId(l.id)}
                        className="cursor-pointer transition-colors hover:bg-card/60"
                      >
                        <td className="px-4 py-3">
                          <p className="whitespace-nowrap text-sm font-medium text-text-primary">
                            {leadLabel(l)}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-text-secondary">
                          {personaLabel(l.persona)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1 w-14 rounded-full bg-card">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  isHigh(l.score ?? 0) ? "bg-lime" : "bg-border-strong"
                                )}
                                style={{ width: `${Math.min(100, l.score ?? 0)}%` }}
                              />
                            </div>
                            <span
                              className={cn(
                                "font-mono text-xs font-medium",
                                isHigh(l.score ?? 0) ? "text-lime-text" : "text-text-secondary"
                              )}
                            >
                              {l.score ?? 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex max-w-[180px] flex-wrap gap-1">
                            {(l.signals ?? []).map((s) => (
                              <span
                                key={s}
                                className={cn(
                                  "inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px]",
                                  signalChipClass(s)
                                )}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-muted">
                          {timeAgo(l.last_activity_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block whitespace-nowrap rounded-md border border-border border-l-2 border-l-lime bg-card px-2 py-1 text-xs text-text-primary">
                            {l.stage}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            aria-label={`開啟 ${leadLabel(l)} 詳情`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenId(l.id);
                            }}
                            className="rounded-md border border-border p-1.5 text-text-muted transition-colors hover:border-lime hover:text-lime-text"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-text-muted">
                          此階段暫無線索。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <p className="border-t border-border px-4 py-2.5 font-mono text-[11px] text-text-muted">
                  顯示最近 {list.length} / 精確總數 {data.summary.lead_count} 個；
                  超過 500 條時請按導師 workspace 查閱，完整分頁仍屬 Beta。
                </p>
              </div>

              {/* 建議跟進 */}
              <section className="h-fit rounded-lg border border-border bg-surface p-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-lime-text" />
                  <h2 className="font-display text-[16px] font-medium text-text-primary">
                    建議跟進
                  </h2>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  未接觸嘅高分線索,按意向評分排序。
                </p>
                <div className="mt-4 space-y-3">
                  {followUpQueue.map((l) => (
                    <div
                      key={l.id}
                      className="rounded-md border border-border border-l-2 border-l-lime bg-card p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setOpenId(l.id)}
                          className="truncate text-sm font-medium text-text-primary hover:text-lime-text"
                        >
                          {leadLabel(l)}
                        </button>
                        <span
                          className={cn(
                            "font-mono text-xs font-medium",
                            isHigh(l.score ?? 0) ? "text-lime-text" : "text-text-secondary"
                          )}
                        >
                          {l.score ?? 0}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-text-muted">
                        {personaLabel(l.persona)} · {timeAgo(l.last_activity_at)}
                      </p>
                      <button
                        type="button"
                        disabled={moving}
                        onClick={() => void moveStage(l, "已接觸")}
                        className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-lime px-2.5 py-1.5 text-xs font-medium text-on-accent transition-colors hover:bg-lime-hover disabled:opacity-50"
                      >
                        移至已接觸
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {followUpQueue.length === 0 && (
                    <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-text-muted">
                      所有高分線索都已接觸,做得好。
                    </p>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </QueryState>

      {/* Lead detail slide-over */}
      <AdminSlideOver
        open={active !== null}
        onClose={() => setOpenId(null)}
        title={
          active ? (
            <span className="flex items-center gap-4">
              <ScoreDial score={active.score ?? 0} />
              <span>
                <span className="block">{leadLabel(active)}</span>
                <span className="mt-0.5 block text-xs font-normal text-text-muted">
                  {personaLabel(active.persona)} · {active.stage}
                </span>
              </span>
            </span>
          ) : (
            ""
          )
        }
      >
        {active && (
          <div className="flex h-full flex-col">
            <div className="flex-1 space-y-6 px-6 py-5">
              {/* 佢問過咩 */}
              <section>
                <div className="flex items-center gap-2">
                  <MessagesSquare className="h-4 w-4 text-lime-text" />
                  <h3 className="font-display text-[15px] font-medium text-text-primary">
                    佢問過咩
                  </h3>
                </div>
                {(active.questions ?? []).length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {(active.questions ?? []).map((q, i) => (
                      <li
                        key={i}
                        className="rounded-md border border-border bg-card px-3 py-2.5"
                      >
                        <p className="text-sm leading-relaxed text-text-primary">
                          「{leadQuestionText(q)}」
                        </p>
                        <p className="mt-1.5 font-mono text-[10px] text-text-muted">
                          {leadQuestionMeta(q).persona
                            ? personaLabel(leadQuestionMeta(q).persona)
                            : ""} {leadQuestionMeta(q).date}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 rounded-md border border-dashed border-border px-3 py-4 text-xs text-text-muted">
                    暫無問題記錄。
                  </p>
                )}
              </section>

              {/* 意向分析 */}
              <section className="rounded-lg border border-border border-l-2 border-l-lime bg-card p-4">
                <h3 className="font-display text-[15px] font-medium text-text-primary">
                  意向分析
                </h3>
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {(active.signals ?? []).map((s) => (
                    <span
                      key={s}
                      className={cn(
                        "inline-block rounded-full border px-2 py-0.5 text-[11px]",
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
                  <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-lime-text">
                    {active.analysis}
                  </p>
                )}
              </section>

              {/* 跟進時間線 */}
              <section>
                <div className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-lime-text" />
                  <h3 className="font-display text-[15px] font-medium text-text-primary">
                    跟進時間線
                  </h3>
                </div>
                {(active.timeline ?? []).length > 0 ? (
                  <ol className="mt-3 space-y-0">
                    {(active.timeline ?? []).map((t, i) => (
                      <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                        {i < (active.timeline ?? []).length - 1 && (
                          <span className="absolute left-[3.5px] top-3 h-full w-px bg-border" />
                        )}
                        <span
                          className={cn(
                            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                            i === (active.timeline ?? []).length - 1
                              ? "bg-lime"
                              : "bg-border-strong"
                          )}
                        />
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
                  <p className="mt-3 rounded-md border border-dashed border-border px-3 py-4 text-xs text-text-muted">
                    未有跟進記錄。
                  </p>
                )}
              </section>
            </div>

            {/* Stage actions(真 update query) */}
            <div className="space-y-2 border-t border-border px-6 py-4">
              <div className="grid grid-cols-3 gap-2">
                {STAGES.filter((s) => s.key !== active.stage && s.key !== "新線索").map(
                  (s) => (
                    <button
                      key={s.key}
                      type="button"
                      disabled={moving}
                      onClick={() => void moveStage(active, s.key)}
                      className={cn(
                        "rounded-md border px-2 py-2 text-xs font-medium transition-colors disabled:opacity-50",
                        s.key === "已轉化"
                          ? "border-lime bg-lime-soft text-lime-text hover:bg-lime hover:text-on-accent"
                          : "border-border text-text-secondary hover:border-border-strong"
                      )}
                    >
                      {s.key === "已轉化" ? "標記已轉化" : `移至${s.key}`}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </AdminSlideOver>
    </div>
  );
}
