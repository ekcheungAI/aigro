import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  FileText,
  MessagesSquare,
  UserPlus,
  Users,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  contentQueue,
  conversations,
  dashboardKpis,
  expertPosts,
  mcpVerticals,
  recentActivity,
  weeklyChats,
} from "@/data/admin-mock";
import type { ActivityItem } from "@/data/admin-mock";
import { pendingExperts, verifiedExperts } from "@/data/experts";
import { useArgroHealth } from "@/lib/argroHealth";
import { cn } from "@/lib/utils";

interface Kpi {
  label: string;
  value: string;
  note: string;
}

/* ---- 衍生數字(同其他 admin 頁同一來源,改 mock 即全站一致) ---- */
const pendingInsights = contentQueue.filter(
  (q) => q.status === "待審核"
).length;
const avgConfidence =
  conversations.reduce((s, c) => s + c.confidenceAvg, 0) /
  conversations.length;
const flaggedCount = conversations.filter((c) => c.flagged).length;
const draftPosts = expertPosts.filter((p) => p.status === "草稿").length;
const aiWaitlist =
  mcpVerticals.find((v) => v.key === "ai")?.waitlist ?? 0;

const KPIS: Kpi[] = [
  {
    label: "今日情報",
    value: String(dashboardKpis.todayInsights),
    note: `${pendingInsights} 條待審核`,
  },
  {
    label: "總會員",
    value: dashboardKpis.totalMembers.toLocaleString("en-US"),
    note: "本月 +86",
  },
  {
    label: "今日對話",
    value: String(dashboardKpis.todayChats),
    note: `平均信心 ${avgConfidence.toFixed(2)}`,
  },
  {
    label: "待審核內容",
    value: String(dashboardKpis.pendingContent),
    note: "情報佇列",
  },
];

const ACTIVITY_ICON: Record<ActivityItem["kind"], LucideIcon> = {
  新會員: UserPlus,
  新對話: MessagesSquare,
  內容發佈: FileText,
};

const QUICK_LINKS = [
  {
    to: "/admin/experts",
    title: "專家管理",
    desc: `${verifiedExperts.map((e) => e.nameEn.split(" ")[0]).join(" · ")} 已認證,${pendingExperts.length} 席草稿`,
    icon: Users,
  },
  {
    to: "/admin/content",
    title: "內容管理",
    desc: `${pendingInsights} 條情報待審核 · ${draftPosts} 篇專家草稿`,
    icon: FileText,
  },
  {
    to: "/admin/engagement",
    title: "對話參與",
    desc: `${flaggedCount} 段對話已標記待跟進`,
    icon: MessagesSquare,
  },
  {
    to: "/admin/members",
    title: "會員管理",
    desc: `MCP 優先名單 AI ${aiWaitlist} 人`,
    icon: UserPlus,
  },
];

const maxChat = Math.max(...weeklyChats.map((d) => d.count));

/** 管線 Pipeline 快速卡 — live argro-api /meta/health,click 入 /admin/sources。 */
function PipelineKpiCard() {
  const { data, error, loading } = useArgroHealth();
  const offline = data === null && error !== null;
  const llmOk = data?.llm.configured ?? false;

  return (
    <Link
      to="/admin/sources"
      className="group col-span-2 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-lime sm:p-5 xl:col-span-1"
    >
      <p className="flex items-center justify-between text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <Workflow className="h-3.5 w-3.5 text-lime-text" />
          管線 Pipeline
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 font-mono text-[10px]",
            offline ? "text-[#A63A30]" : "text-lime-text"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              offline ? "bg-[#A63A30]" : "bg-lime"
            )}
          />
          Live
        </span>
      </p>
      <p className="mt-2 font-mono text-[30px] font-medium leading-none text-text-primary">
        {data ? data.articles.today.toLocaleString("en-US") : "—"}
      </p>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            offline
              ? "bg-[#A63A30]"
              : data
                ? llmOk
                  ? "bg-lime"
                  : "bg-[#A63A30]"
                : "bg-border-strong"
          )}
        />
        {offline
          ? "連唔到 argro-api — 離線"
          : loading && !data
            ? "連線中…"
            : `LLM ${llmOk ? "已連接" : "未連接"} · 今日新增 articles`}
      </p>
    </Link>
  );
}

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
          Dashboard
        </p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
          總覽
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          平台即日狀態 — 情報、會員、對話與審核一覽。
        </p>
      </div>

      {/* KPI cards(4 張靜態 + 1 張 live 管線卡) */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {KPIS.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg border border-border bg-surface p-4 sm:p-5"
          >
            <p className="text-xs text-text-muted">{kpi.label}</p>
            <p className="mt-2 font-mono text-[30px] font-medium leading-none text-text-primary">
              {kpi.value}
            </p>
            <p className="mt-2 text-xs text-text-secondary">{kpi.note}</p>
          </div>
        ))}
        <PipelineKpiCard />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        {/* 本週對話趨勢 */}
        <section className="rounded-lg border border-border bg-surface p-5 lg:col-span-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-[17px] font-medium text-text-primary">
              本週對話趨勢
            </h2>
            <span className="font-mono text-xs text-text-muted">
              合計 {weeklyChats.reduce((s, d) => s + d.count, 0)}
            </span>
          </div>
          <div className="mt-5 flex h-36 items-end gap-2 sm:gap-3">
            {weeklyChats.map((d) => (
              <div
                key={d.label}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <span className="font-mono text-[10px] text-text-muted">
                  {d.count}
                </span>
                <div className="flex h-24 w-full items-end rounded-sm bg-card">
                  <div
                    className="w-full rounded-sm bg-lime"
                    style={{ height: `${(d.count / maxChat) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-text-muted">{d.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 最近活動 */}
        <section className="rounded-lg border border-border bg-surface p-5 lg:col-span-2">
          <h2 className="font-display text-[17px] font-medium text-text-primary">
            最近活動
          </h2>
          <ul className="mt-4 divide-y divide-border">
            {recentActivity.map((item) => {
              const Icon = ACTIVITY_ICON[item.kind];
              return (
                <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                    <Icon className="h-3.5 w-3.5 text-lime-text" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] leading-snug text-text-secondary">
                      <span className="mr-1.5 inline-block rounded-sm bg-lime-soft px-1.5 py-px font-mono text-[10px] text-lime-text">
                        {item.kind}
                      </span>
                      {item.text}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-text-muted">
                      {item.time}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Quick links */}
      <section className="mt-6">
        <h2 className="font-display text-[17px] font-medium text-text-primary">
          快速進入模組
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_LINKS.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="group rounded-lg border border-border bg-surface p-4 transition-colors hover:border-lime"
            >
              <div className="flex items-center justify-between">
                <q.icon className="h-4 w-4 text-lime-text" />
                <ArrowUpRight className="h-4 w-4 text-text-muted transition-colors group-hover:text-lime-text" />
              </div>
              <p className="mt-3 text-sm font-medium text-text-primary">
                {q.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-text-muted">
                {q.desc}
              </p>
              <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-lime-text">
                前往
                <ArrowRight className="h-3 w-3" />
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
