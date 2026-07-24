import { Link } from "react-router-dom";
import { ArrowRight, Bot, MessageSquareText, NotebookPen } from "lucide-react";
import { usePortalExpert } from "@/components/portal/PortalLayout";
import { HairlineBars } from "@/components/portal/portal-ui";
import { greeting } from "@/components/auth/member";
import { cn } from "@/lib/utils";
import {
  PORTAL_INSIGHT_QUOTA,
  portalInsights,
  portalRecentConversations,
  portalStats,
} from "@/data/portal-mock";

/**
 * PortalHome `/portal` — 專家總覽。
 * 問候 + 4 格統計(Plex Mono + 7 日 hairline bars)+ 分身狀態卡 +
 * 最近對話 5 條 + 情報 quota 卡。
 */
export default function PortalHome() {
  const { slug, expert, studio } = usePortalExpert();
  const stats = portalStats[slug] ?? portalStats["jimmy-lau"];
  const convos = portalRecentConversations[slug] ?? [];
  const insights = portalInsights[slug] ?? [];
  const published = insights.filter((i) => i.status === "已發佈").length;
  const firstName = expert.nameEn.split(" ")[0] ?? expert.nameEn;
  const liveVersion =
    studio.promptVersions.find((v) => v.status === "已上線") ??
    studio.promptVersions[0];

  const cards = [
    { label: "累計對話", value: stats.totalChats.toLocaleString() },
    { label: "本週對話", value: stats.weekChats.toLocaleString() },
    { label: "平均信心", value: stats.avgConfidence.toFixed(2) },
    { label: "知識庫片段", value: stats.kbChunks.toLocaleString() },
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
          你嘅 AI 分身過去一週處理咗 {stats.weekChats} 段對話 — 以下係最新狀態。
        </p>
      </div>

      {/* ---- Stats row ---- */}
      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-surface px-5 py-4">
            <p className="text-xs text-text-muted">{c.label}</p>
            <p className="mt-1.5 font-mono text-[28px] font-semibold leading-none text-text-primary">
              {c.value}
            </p>
          </div>
        ))}
      </div>

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
                  {stats.weeklyTrend[stats.weeklyTrend.length - 1]?.count ?? 0}
                </span>{" "}
                段
              </p>
            </div>
            <div className="px-5 py-5">
              <HairlineBars
                values={stats.weeklyTrend.map((d) => d.count)}
                labels={stats.weeklyTrend.map((d) => d.label)}
                height={64}
              />
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
            <ul className="divide-y divide-border">
              {convos.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-card/50"
                >
                  <MessageSquareText className="h-4 w-4 shrink-0 text-text-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text-primary">
                      {c.firstQuestion}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-text-muted">
                      訪客 {c.anonId} · {c.date}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-sm px-2 py-0.5 font-mono text-xs",
                      c.confidence >= 0.8
                        ? "bg-lime-soft text-lime-text"
                        : c.confidence >= 0.6
                          ? "bg-card text-text-secondary"
                          : "bg-card text-[#A36A0F]"
                    )}
                  >
                    {c.confidence.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
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
                    {liveVersion?.version ?? "Prompt v1.0"}
                  </p>
                </div>
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-sm bg-lime-soft px-2 py-0.5 text-xs font-medium text-lime-text">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                  已上線
                </span>
              </div>
              <div className="divide-y divide-border rounded-md border border-border">
                <div className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                  <span className="text-text-muted">最後蒸餾</span>
                  <span className="font-mono text-text-primary">
                    {studio.lastDistilled}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                  <span className="text-text-muted">知識庫片段</span>
                  <span className="font-mono text-text-primary">
                    {studio.kbChunks.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                  <span className="text-text-muted">覆蓋主題</span>
                  <span className="font-mono text-text-primary">
                    {studio.topics.length} 個
                  </span>
                </div>
              </div>
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
                    {published}
                  </span>
                  <span className="font-mono text-sm text-text-muted">
                    /{PORTAL_INSIGHT_QUOTA}
                  </span>{" "}
                  條情報
                </p>
                <NotebookPen className="h-4 w-4 text-text-muted" />
              </div>
              {/* hairline quota bar */}
              <div className="flex gap-1">
                {Array.from({ length: PORTAL_INSIGHT_QUOTA }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full",
                      i < published ? "bg-lime" : "bg-border"
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-text-muted">
                每週最多 {PORTAL_INSIGHT_QUOTA} 條 — 保持質量密度,重質唔重量。
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
    </div>
  );
}
