import { useMemo, useState } from "react";
import { MessageSquareText, Sparkles, Target } from "lucide-react";
import AdminSlideOver from "@/components/admin/AdminSlideOver";
import { usePortalExpert } from "@/components/portal/PortalLayout";
import QueryState from "@/components/QueryState";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { personaLabel, timeAgo, useAdminQuery } from "@/components/admin/adminData";
import type { AdminLeadRow } from "@/components/admin/adminData";

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

/** 本人分身嘅線索:leads where persona = 我嘅 slug */
async function fetchMyLeads(slug: string): Promise<AdminLeadRow[]> {
  if (!supabase) throw new Error("Supabase 未連接");
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id,user_id,anon_id,persona,score,signals,stage,questions,analysis,timeline,last_activity_at,created_at"
    )
    .eq("persona", slug)
    .order("score", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminLeadRow[];
}

/**
 * PortalLeads `/portal/leads` — 我的線索(scoped CRM,真數據)。
 * 只顯示同「我」嘅分身傾過偈嘅線索(leads.persona = expert slug)。
 * read-only:發信、轉化同跟進由平台團隊負責。
 */
export default function PortalLeads() {
  const { slug, expert } = usePortalExpert();
  const { data, loading, error, refetch } = useAdminQuery(
    () => fetchMyLeads(slug),
    [slug]
  );
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useMemo(() => data ?? [], [data]);
  const active = list.find((l) => l.id === openId) ?? null;
  const firstName = expert?.nameEn.split(" ")[0] ?? slug;

  const kpis = {
    total: list.length,
    high: list.filter((l) => isHigh(l.score ?? 0)).length,
    following: list.filter((l) => l.stage === "跟進中").length,
    converted: list.filter((l) => l.stage === "已轉化").length,
  };

  const leadLabel = (l: AdminLeadRow) =>
    l.anon_id ? `訪客 ${l.anon_id.slice(0, 8)}` : `會員 ${l.user_id?.slice(0, 8) ?? "—"}`;

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
          同 {firstName} 嘅分身傾過偈嘅訪客同會員 — leads 表即時查詢;
          發信、轉化同跟進由平台團隊負責。
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
          data && data.length === 0 ? (
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
        {data && data.length > 0 && (
          <section className="rounded-lg border border-border bg-surface">
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
                      onClick={() => setOpenId(l.id)}
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

      {/* Detail slide-over(read-only,全部真欄位) */}
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
                        「{q.text ?? ""}」
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-text-muted">
                        {q.date ?? ""} {q.persona ? `· ${personaLabel(q.persona)}` : ""}
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

            <p className="rounded-md border border-border bg-card/50 px-4 py-3 text-[11px] leading-relaxed text-text-muted">
              線索嘅發信、跟進同轉化由平台團隊負責 — 有新進展會更新時間線。
            </p>
          </div>
        )}
      </AdminSlideOver>
    </div>
  );
}
