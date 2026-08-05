import { Link } from "react-router-dom";
import { ArrowRight, Bot, MessageSquareText, NotebookPen } from "lucide-react";
import { usePortalExpert } from "@/components/portal/PortalLayout";
import { HairlineBars, WEEKLY_INSIGHT_QUOTA } from "@/components/portal/portal-ui";
import { greeting } from "@/components/auth/member";
import QueryState from "@/components/QueryState";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  daysAgoUtcStartIso,
  last7DayBuckets,
  timeAgo,
  useAdminQuery,
  utcDayKey,
} from "@/components/admin/adminData";
import type {
  AdminConversationRow,
  AdminMessageRow,
} from "@/components/admin/adminData";

interface PortalHomeData {
  convos: AdminConversationRow[];
  msgs: AdminMessageRow[];
}

/** 專家自己嘅真數據:conversations where persona = 我嘅 slug,加埋對應 messages */
async function fetchPortalHome(slug: string): Promise<PortalHomeData> {
  if (!supabase) throw new Error("Supabase 未連接");
  const convRes = await supabase
    .from("conversations")
    .select("id,user_id,anon_id,persona,title,created_at")
    .eq("persona", slug)
    .order("created_at", { ascending: false })
    .limit(500);
  if (convRes.error) throw new Error(convRes.error.message);
  const convos = (convRes.data ?? []) as AdminConversationRow[];

  let msgs: AdminMessageRow[] = [];
  const ids = convos.map((c) => c.id);
  if (ids.length > 0) {
    const msgRes = await supabase
      .from("messages")
      .select("id,conversation_id,role,content,source,answer_basis,coverage,created_at")
      .in("conversation_id", ids)
      .limit(2000);
    if (msgRes.error) throw new Error(msgRes.error.message);
    msgs = (msgRes.data ?? []) as AdminMessageRow[];
  }
  return { convos, msgs };
}

/**
 * PortalHome `/portal` — 專家總覽。
 * 問候 + 4 格真統計 + 7 日趨勢 + 最近對話 + 分身狀態 + 情報 quota。
 * 全部嚟自 conversations / messages 即時查詢;未有數據 → 0 + empty state。
 */
export default function PortalHome() {
  const { slug, expert } = usePortalExpert();
  const { data, loading, error, refetch } = useAdminQuery(
    () => fetchPortalHome(slug),
    [slug]
  );

  const firstName = expert?.nameEn.split(" ")[0] ?? slug;

  const convos = data?.convos ?? [];
  const msgs = data?.msgs ?? [];
  const weekConvos = convos.filter(
    (c) => c.created_at && c.created_at >= daysAgoUtcStartIso(6)
  );
  const answered = msgs.filter((m) => m.role === "assistant" && m.answer_basis);
  const groundedRate = answered.length
    ? Math.round((answered.filter((m) => m.answer_basis === "knowledge").length / answered.length) * 100)
    : null;

  /* 7 日趨勢(冇數據嘅日 = 0) */
  const buckets = last7DayBuckets();
  const dayCounts = new Map<string, number>(buckets.map((b) => [b.key, 0]));
  for (const c of convos) {
    const key = utcDayKey(c.created_at);
    if (key && dayCounts.has(key)) {
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    }
  }

  /* 每段對話最新 retrieval coverage(最近對話列表用) */
  const coverageByConv = new Map<string, AdminMessageRow["coverage"]>();
  {
    for (const m of msgs) {
      if (m.role === "assistant" && m.coverage) coverageByConv.set(m.conversation_id, m.coverage);
    }
  }

  const cards = [
    { label: "累計對話", value: loading ? "…" : convos.length.toLocaleString() },
    { label: "本週對話", value: loading ? "…" : weekConvos.length.toLocaleString() },
    { label: "累計訊息", value: loading ? "…" : msgs.length.toLocaleString() },
    {
      label: "知識回覆比例",
      value: loading ? "…" : groundedRate === null ? "—" : `${groundedRate}%`,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ---- Greeting ---- */}
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
          Expert Portal
        </p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
          {firstName},{greeting()}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {loading
            ? "正在載入你嘅分身數據…"
            : convos.length > 0
              ? `你嘅 AI 分身過去一週處理咗 ${weekConvos.length} 段對話 — 以下係最新狀態。`
              : "你嘅 AI 分身暫時未有對話 — 有訪客傾偈之後,數據會即時出現喺呢度。"}
        </p>
      </div>

      {/* ---- Stats row ---- */}
      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-surface px-5 py-4">
            <p className="text-xs text-text-muted">{c.label}</p>
            <p className="mt-1.5 font-mono text-[28px] font-semibold leading-none text-text-primary">
              {error && !data ? "—" : c.value}
            </p>
          </div>
        ))}
      </div>

      <QueryState
        loading={loading}
        error={error ? `載入失敗:${error}` : null}
        retry={refetch}
      >
        {data && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* ---- 左欄:7 日趨勢 + 最近對話 ---- */}
            <div className="space-y-6 lg:col-span-2">
              {/* 7 日對話趨勢 */}
              <section className="rounded-lg border border-border bg-surface">
                <div className="flex items-end justify-between border-b border-border px-5 py-4">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
                      01 · Trend
                    </p>
                    <h2 className="mt-1 font-display text-[20px] font-medium text-text-primary">
                      7 日對話趨勢
                    </h2>
                  </div>
                  <p className="font-mono text-xs text-text-muted">
                    今日{" "}
                    <span className="text-lime-text">
                      {dayCounts.get(buckets[buckets.length - 1]?.key ?? "") ?? 0}
                    </span>{" "}
                    段
                  </p>
                </div>
                <div className="px-5 py-5">
                  <HairlineBars
                    values={buckets.map((b) => dayCounts.get(b.key) ?? 0)}
                    labels={buckets.map((b) => b.label)}
                    height={64}
                  />
                  {convos.length === 0 && (
                    <p className="mt-3 text-center text-xs text-text-muted">
                      未有對話數據 — 全部日子顯示真實嘅 0。
                    </p>
                  )}
                </div>
              </section>

              {/* 最近對話 */}
              <section className="rounded-lg border border-border bg-surface">
                <div className="flex items-end justify-between border-b border-border px-5 py-4">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
                      02 · Conversations
                    </p>
                    <h2 className="mt-1 font-display text-[20px] font-medium text-text-primary">
                      最近對話
                    </h2>
                  </div>
                  <Link
                    to="/portal/leads"
                    className="inline-flex items-center gap-1 text-xs text-lime-text underline-offset-2 hover:underline"
                  >
                    睇線索分析
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                {convos.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {convos.slice(0, 5).map((c) => {
                      const coverage = coverageByConv.get(c.id) ?? null;
                      return (
                        <li
                          key={c.id}
                          className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-card/50"
                        >
                          <MessageSquareText className="h-4 w-4 shrink-0 text-text-muted" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-text-primary">
                              {c.title?.trim() || "未命名對話"}
                            </p>
                            <p className="mt-0.5 font-mono text-[11px] text-text-muted">
                              {c.anon_id
                                ? `訪客 ${c.anon_id.slice(0, 8)}`
                                : "會員"}{" "}
                              · {timeAgo(c.created_at)}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-sm px-2 py-0.5 font-mono text-xs",
                              coverage === null
                                ? "bg-card text-text-muted"
                                : coverage === "high"
                                  ? "bg-lime-soft text-lime-text"
                                  : coverage === "medium"
                                    ? "bg-card text-text-secondary"
                                    : "bg-card text-destructive"
                            )}
                          >
                            {coverage === "high"
                              ? "高覆蓋"
                              : coverage === "medium"
                                ? "部分覆蓋"
                                : coverage === "none"
                                  ? "需補知識"
                                  : "—"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="px-5 py-10 text-center text-xs text-text-muted">
                    暫未有對話 — Ask 頁嘅分身對話會即時列入呢度。
                  </p>
                )}
              </section>
            </div>

            {/* ---- 右欄:分身狀態 + 情報 quota ---- */}
            <div className="space-y-6">
              {/* 分身狀態卡 */}
              <section className="rounded-lg border border-border bg-surface">
                <div className="border-b border-border px-5 py-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
                    Persona
                  </p>
                  <h2 className="mt-1 font-display text-[20px] font-medium text-text-primary">
                    分身狀態
                  </h2>
                </div>
                <div className="space-y-4 px-5 py-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-lime-soft">
                      <Bot className="h-5 w-5 text-lime-text" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {firstName} 嘅 AI 分身
                      </p>
                      <p className="font-mono text-[11px] text-text-muted">
                        {expert?.promptVersion ?? `slug:${slug}`}
                      </p>
                    </div>
                    <span className="ml-auto inline-flex items-center gap-1.5 rounded-sm bg-lime-soft px-2 py-0.5 text-xs font-medium text-lime-text">
                      <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                      {expert?.verified ? "已上線" : "待命"}
                    </span>
                  </div>
                  <p className="rounded-md border border-dashed border-border px-3.5 py-3 text-xs leading-relaxed text-text-muted">
                    知識庫已接通蒸餾、切塊、審批同版本發佈。只有已批准版本會提供畀 AI
                    分身檢索，低覆蓋問題會自動加入知識缺口。
                  </p>
                  <Link
                    to="/portal/kb"
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover"
                  >
                    前往知識庫
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </section>

              {/* 情報 quota 卡 */}
              <section className="rounded-lg border border-border bg-surface">
                <div className="border-b border-border px-5 py-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
                    Insights
                  </p>
                  <h2 className="mt-1 font-display text-[20px] font-medium text-text-primary">
                    本週情報配額
                  </h2>
                </div>
                <div className="space-y-3 px-5 py-5">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm text-text-secondary">
                      已發佈{" "}
                      <span className="font-mono text-[22px] font-semibold text-text-primary">
                        0
                      </span>
                      <span className="font-mono text-sm text-text-muted">
                        /{WEEKLY_INSIGHT_QUOTA}
                      </span>{" "}
                      條情報
                    </p>
                    <NotebookPen className="h-4 w-4 text-text-muted" />
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: WEEKLY_INSIGHT_QUOTA }).map((_, i) => (
                      <span key={i} className="h-1 flex-1 rounded-full bg-border" />
                    ))}
                  </div>
                  <p className="text-xs text-text-muted">
                    投稿後端即將推出 — 而家「我的情報」寫嘅內容只係本機草稿
                    (未發佈),所以已發佈數係真實嘅 0。
                  </p>
                  <Link
                    to="/portal/insights"
                    className="inline-flex items-center gap-1 text-xs font-medium text-lime-text underline-offset-2 hover:underline"
                  >
                    管理我的情報
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </section>
            </div>
          </div>
        )}
      </QueryState>
    </div>
  );
}
