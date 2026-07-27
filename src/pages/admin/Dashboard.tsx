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
import QueryState from "@/components/QueryState";
import {
  countRows,
  daysAgoUtcStartIso,
  formatDate,
  last7DayBuckets,
  personaLabel,
  timeAgo,
  todayUtcStartIso,
  useAdminQuery,
  utcDayKey,
} from "@/components/admin/adminData";
import type {
  AdminConversationRow,
  AdminItemRow,
  AdminProfileRow,
} from "@/components/admin/adminData";
import { supabase } from "@/lib/supabase";
import { useArgroHealth } from "@/lib/argroHealth";
import { cn } from "@/lib/utils";

/* ---------------- 真查詢:Dashboard 全部數據一次過 ---------------- */

interface DashboardData {
  todayItems: number;
  totalMembers: number;
  todayConversations: number;
  todayMessages: number;
  pendingItems: number;
  weekly: { label: string; count: number }[];
  recentConversations: AdminConversationRow[];
  recentProfiles: AdminProfileRow[];
  recentItems: AdminItemRow[];
}

async function fetchDashboard(): Promise<DashboardData> {
  if (!supabase) throw new Error("Supabase 未連接 — 請檢查環境變數。");
  const today = todayUtcStartIso();
  const weekAgo = daysAgoUtcStartIso(6);

  const [
    todayItems,
    totalMembers,
    todayConversations,
    todayMessages,
    pendingItems,
    weekConvRes,
    recentConvRes,
    recentProfilesRes,
    recentItemsRes,
  ] = await Promise.all([
    countRows("items", (q) => q.gte("published_at", today)),
    countRows("profiles"),
    countRows("conversations", (q) => q.gte("created_at", today)),
    countRows("messages", (q) => q.gte("created_at", today)),
    countRows("items", (q) => q.eq("status", "pending")),
    supabase
      .from("conversations")
      .select("created_at")
      .gte("created_at", weekAgo),
    supabase
      .from("conversations")
      .select("id,user_id,anon_id,persona,title,created_at")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("profiles")
      .select("id,email,name,role,tier,persona,interests,expert_slug,created_at")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("items")
      .select(
        "id,title,summary,original_url,category,score,lang,status,placement,published_at,fetched_at,source_id,sources(name)"
      )
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(3),
  ]);

  for (const r of [weekConvRes, recentConvRes, recentProfilesRes, recentItemsRes]) {
    if (r.error) throw new Error(r.error.message);
  }

  // 過去 7 日對話趨勢 — 冇數據嘅日 = 0
  const buckets = last7DayBuckets();
  const counts = new Map<string, number>(buckets.map((b) => [b.key, 0]));
  for (const row of (weekConvRes.data ?? []) as { created_at: string | null }[]) {
    const key = utcDayKey(row.created_at);
    if (key && counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const weekly = buckets.map((b) => ({
    label: b.label,
    count: counts.get(b.key) ?? 0,
  }));

  return {
    todayItems,
    totalMembers,
    todayConversations,
    todayMessages,
    pendingItems,
    weekly,
    recentConversations: (recentConvRes.data ?? []) as AdminConversationRow[],
    recentProfiles: (recentProfilesRes.data ?? []) as AdminProfileRow[],
    recentItems: (recentItemsRes.data ?? []) as unknown as AdminItemRow[],
  };
}

/* ---------------- 最近活動合成 ---------------- */

type ActivityKind = "新會員" | "新對話" | "內容發佈";

interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  text: string;
  at: string;
}

const ACTIVITY_ICON: Record<ActivityKind, LucideIcon> = {
  新會員: UserPlus,
  新對話: MessagesSquare,
  內容發佈: FileText,
};

function buildActivity(d: DashboardData): ActivityEntry[] {
  const entries: ActivityEntry[] = [];
  for (const c of d.recentConversations) {
    if (!c.created_at) continue;
    entries.push({
      id: `conv-${c.id}`,
      kind: "新對話",
      text: `${c.title?.trim() || "未命名對話"} — ${personaLabel(c.persona)}`,
      at: c.created_at,
    });
  }
  for (const p of d.recentProfiles) {
    if (!p.created_at) continue;
    entries.push({
      id: `profile-${p.id}`,
      kind: "新會員",
      text: `${p.name?.trim() || p.email} 加入咗 AIGRO`,
      at: p.created_at,
    });
  }
  for (const i of d.recentItems) {
    const at = i.published_at ?? i.fetched_at;
    if (!at) continue;
    entries.push({
      id: `item-${i.id}`,
      kind: "內容發佈",
      text: i.title,
      at,
    });
  }
  return entries
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 7);
}

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
  const { data, loading, error, refetch } = useAdminQuery(fetchDashboard);

  const kpis = data
    ? [
        {
          label: "今日情報",
          value: String(data.todayItems),
          note: `${data.pendingItems} 條待審核`,
        },
        {
          label: "總會員",
          value: data.totalMembers.toLocaleString("en-US"),
          note: "profiles 表即時總數",
        },
        {
          label: "今日對話",
          value: String(data.todayConversations),
          note: "UTC 日界起計",
        },
        {
          label: "今日訊息",
          value: String(data.todayMessages),
          note: "全部分身合計",
        },
      ]
    : [];

  const weekly = data?.weekly ?? [];
  const maxChat = Math.max(...weekly.map((d) => d.count), 1);
  const weekTotal = weekly.reduce((s, d) => s + d.count, 0);
  const activity = data ? buildActivity(data) : [];

  const quickLinks = [
    {
      to: "/admin/experts",
      title: "專家管理",
      desc: "領航專家檔案、草稿與分身數據",
      icon: Users,
    },
    {
      to: "/admin/content",
      title: "內容管理",
      desc: data ? `${data.pendingItems} 條情報待審核` : "情報審核佇列",
      icon: FileText,
    },
    {
      to: "/admin/engagement",
      title: "對話參與",
      desc: data
        ? `今日 ${data.todayConversations} 段對話 · ${data.todayMessages} 則訊息`
        : "對話質量監察",
      icon: MessagesSquare,
    },
    {
      to: "/admin/members",
      title: "會員管理",
      desc: data
        ? `${data.totalMembers.toLocaleString("en-US")} 位註冊會員`
        : "會員列表與層級",
      icon: UserPlus,
    },
  ];

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
          平台即日狀態 — Supabase 即時查詢,冇任何示範數字。
        </p>
      </div>

      {/* KPI cards(4 張真查詢 + 1 張 live 管線卡) */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {(data
          ? kpis
          : [
              { label: "今日情報", value: "—", note: "" },
              { label: "總會員", value: "—", note: "" },
              { label: "今日對話", value: "—", note: "" },
              { label: "今日訊息", value: "—", note: "" },
            ]
        ).map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg border border-border bg-surface p-4 sm:p-5"
          >
            <p className="text-xs text-text-muted">{kpi.label}</p>
            <p className="mt-2 font-mono text-[30px] font-medium leading-none text-text-primary">
              {kpi.value}
            </p>
            <p className="mt-2 text-xs text-text-secondary">
              {error && !data ? "查詢失敗" : kpi.note}
            </p>
          </div>
        ))}
        <PipelineKpiCard />
      </div>

      <QueryState
        loading={loading}
        error={error ? `載入失敗:${error}` : null}
        retry={refetch}
      >
        {data && (
          <>
            <div className="mt-6 grid gap-4 lg:grid-cols-5">
              {/* 本週對話趨勢 */}
              <section className="rounded-lg border border-border bg-surface p-5 lg:col-span-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-display text-[17px] font-medium text-text-primary">
                    本週對話趨勢
                  </h2>
                  <span className="font-mono text-xs text-text-muted">
                    合計 {weekTotal}
                  </span>
                </div>
                <div className="mt-5 flex h-36 items-end gap-2 sm:gap-3">
                  {weekly.map((d) => (
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
                {weekTotal === 0 && (
                  <p className="mt-3 text-center text-xs text-text-muted">
                    過去 7 日暫未有對話 — Ask 分身對話會即時計入呢個圖。
                  </p>
                )}
              </section>

              {/* 最近活動 */}
              <section className="rounded-lg border border-border bg-surface p-5 lg:col-span-2">
                <h2 className="font-display text-[17px] font-medium text-text-primary">
                  最近活動
                </h2>
                {activity.length > 0 ? (
                  <ul className="mt-4 divide-y divide-border">
                    {activity.map((item) => {
                      const Icon = ACTIVITY_ICON[item.kind];
                      return (
                        <li
                          key={item.id}
                          className="flex gap-3 py-3 first:pt-0 last:pb-0"
                        >
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
                              {timeAgo(item.at)} · {formatDate(item.at)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-4 rounded-md border border-dashed border-border px-4 py-8 text-center text-xs text-text-muted">
                    暫未有活動 — 新會員、新對話同情報發佈會即時出現喺度。
                  </p>
                )}
              </section>
            </div>
          </>
        )}
      </QueryState>

      {/* Quick links */}
      <section className="mt-6">
        <h2 className="font-display text-[17px] font-medium text-text-primary">
          快速進入模組
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((q) => (
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
