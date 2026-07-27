import { useMemo, useState } from "react";
import { MessagesSquare } from "lucide-react";
import AdminSlideOver from "@/components/admin/AdminSlideOver";
import QueryState from "@/components/QueryState";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  daysAgoUtcStartIso,
  formatDate,
  last7DayBuckets,
  personaLabel,
  timeAgo,
  useAdminQuery,
  utcDayKey,
} from "@/components/admin/adminData";
import type {
  AdminConversationRow,
  AdminMessageRow,
} from "@/components/admin/adminData";

interface EngagementData {
  conversations: AdminConversationRow[];
  messages: AdminMessageRow[];
}

async function fetchEngagement(): Promise<EngagementData> {
  if (!supabase) throw new Error("Supabase 未連接 — 請檢查環境變數。");
  const [convRes, msgRes] = await Promise.all([
    supabase
      .from("conversations")
      .select("id,user_id,anon_id,persona,title,created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("messages")
      .select("id,conversation_id,role,content,source,confidence,created_at")
      .order("created_at", { ascending: true })
      .limit(2000),
  ]);
  if (convRes.error) throw new Error(convRes.error.message);
  if (msgRes.error) throw new Error(msgRes.error.message);
  return {
    conversations: (convRes.data ?? []) as AdminConversationRow[],
    messages: (msgRes.data ?? []) as AdminMessageRow[],
  };
}

function confidenceColor(c: number | null) {
  if (c === null) return "text-text-muted";
  if (c < 0.6) return "text-[#A36A0F]";
  if (c < 0.8) return "text-text-secondary";
  return "text-lime-text";
}

export default function AdminEngagement() {
  const { data, loading, error, refetch } = useAdminQuery(fetchEngagement);
  const [personaFilter, setPersonaFilter] = useState<string>("全部");
  const [openId, setOpenId] = useState<string | null>(null);

  const conversations = useMemo(() => data?.conversations ?? [], [data]);
  const messages = useMemo(() => data?.messages ?? [], [data]);

  const msgByConv = useMemo(() => {
    const map = new Map<string, AdminMessageRow[]>();
    for (const m of messages) {
      const arr = map.get(m.conversation_id) ?? [];
      arr.push(m);
      map.set(m.conversation_id, arr);
    }
    return map;
  }, [messages]);

  const active = conversations.find((c) => c.id === openId) ?? null;
  const activeMessages = active ? (msgByConv.get(active.id) ?? []) : [];

  /** 每段對話嘅平均信心(只計 assistant 有 confidence 嘅訊息) */
  const avgConfidenceOf = (convId: string): number | null => {
    const vals = (msgByConv.get(convId) ?? [])
      .map((m) => m.confidence)
      .filter((c): c is number => typeof c === "number");
    if (vals.length === 0) return null;
    return vals.reduce((s, c) => s + c, 0) / vals.length;
  };

  const personas = useMemo(() => {
    const set = new Set<string>();
    for (const c of conversations) set.add(c.persona || "platform");
    return [...set];
  }, [conversations]);

  const filtered = useMemo(
    () =>
      personaFilter === "全部"
        ? conversations
        : conversations.filter((c) => (c.persona || "platform") === personaFilter),
    [conversations, personaFilter]
  );

  /* persona 分佈 */
  const personaCounts = personas.map((p) => ({
    persona: p,
    count: conversations.filter((c) => (c.persona || "platform") === p).length,
  }));
  const maxPersona = Math.max(...personaCounts.map((p) => p.count), 1);

  /* 過去 7 日訊息趨勢(冇數據嘅日 = 0) */
  const weekly = useMemo(() => {
    const buckets = last7DayBuckets();
    const counts = new Map<string, number>(buckets.map((b) => [b.key, 0]));
    for (const m of messages) {
      const key = utcDayKey(m.created_at);
      if (key && counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return buckets.map((b) => ({ label: b.label, count: counts.get(b.key) ?? 0 }));
  }, [messages]);
  const maxDay = Math.max(...weekly.map((d) => d.count), 1);

  const todayConvos = conversations.filter(
    (c) => c.created_at && c.created_at >= daysAgoUtcStartIso(0)
  ).length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
          Engagement
        </p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
          對話參與
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          conversations / messages 表即時統計 — 訪客同 AI 分身嘅對話質量監察。
        </p>
      </div>

      <QueryState
        loading={loading}
        error={error ? `載入失敗:${error}` : null}
        retry={refetch}
        empty={
          data && data.conversations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
              <MessagesSquare className="mx-auto h-6 w-6 text-text-muted" />
              <p className="mt-3 text-sm font-medium text-text-primary">
                暫未有對話
              </p>
              <p className="mx-auto mt-1.5 max-w-[380px] text-xs leading-relaxed text-text-muted">
                conversations 表而家係 0 — 訪客喺 Ask 頁同分身傾偈之後,對話會即時出現喺呢度。
              </p>
            </div>
          ) : null
        }
      >
        {data && data.conversations.length > 0 && (
          <>
            {/* Top stats */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-xs text-text-muted">總對話</p>
                <p className="mt-1.5 font-mono text-2xl font-medium text-text-primary">
                  {conversations.length}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-xs text-text-muted">總訊息</p>
                <p className="mt-1.5 font-mono text-2xl font-medium text-text-primary">
                  {messages.length}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-xs text-text-muted">今日對話</p>
                <p className="mt-1.5 font-mono text-2xl font-medium text-lime-text">
                  {todayConvos}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-xs text-text-muted">活躍分身</p>
                <p className="mt-1.5 font-mono text-2xl font-medium text-text-primary">
                  {personas.length}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {/* persona 分佈 */}
              <section className="rounded-lg border border-border bg-surface p-5">
                <h2 className="font-display text-[16px] font-medium text-text-primary">
                  按分身分佈
                </h2>
                <div className="mt-4 space-y-3">
                  {personaCounts.map((p) => (
                    <div key={p.persona} className="flex items-center gap-3">
                      <span className="w-32 truncate text-xs text-text-secondary">
                        {personaLabel(p.persona)}
                      </span>
                      <div className="h-4 flex-1 rounded-sm bg-card">
                        <div
                          className="h-full rounded-sm bg-lime"
                          style={{ width: `${(p.count / maxPersona) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono text-xs text-text-primary">
                        {p.count}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* 按日趨勢 */}
              <section className="rounded-lg border border-border bg-surface p-5">
                <h2 className="font-display text-[16px] font-medium text-text-primary">
                  近 7 日訊息趨勢
                </h2>
                <div className="mt-5 flex h-28 items-end gap-2 sm:gap-3">
                  {weekly.map((d) => (
                    <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
                      <span className="font-mono text-[10px] text-text-muted">
                        {d.count}
                      </span>
                      <div className="flex h-16 w-full items-end rounded-sm bg-card">
                        <div
                          className="w-full rounded-sm bg-lime"
                          style={{ height: `${(d.count / maxDay) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-muted">{d.label}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Persona filter */}
            <div className="mt-5 flex flex-wrap gap-1.5">
              {["全部", ...personas].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPersonaFilter(p)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                    personaFilter === p
                      ? "border-lime bg-lime text-on-accent"
                      : "border-border bg-surface text-text-secondary hover:border-border-strong"
                  )}
                >
                  {p === "全部" ? "全部" : personaLabel(p)}
                </button>
              ))}
            </div>

            {/* Conversation table */}
            <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-text-muted">
                    <th className="px-4 py-3 font-medium">訪客</th>
                    <th className="px-4 py-3 font-medium">分身</th>
                    <th className="px-4 py-3 font-medium">標題</th>
                    <th className="px-4 py-3 font-medium">開始時間</th>
                    <th className="px-4 py-3 text-right font-medium">訊息數</th>
                    <th className="px-4 py-3 text-right font-medium">平均信心</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((c) => {
                    const conf = avgConfidenceOf(c.id);
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setOpenId(c.id)}
                        className="cursor-pointer transition-colors hover:bg-card/60"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                          {c.anon_id
                            ? `訪客 ${c.anon_id.slice(0, 8)}`
                            : `會員 ${c.user_id?.slice(0, 8) ?? "—"}`}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-text-primary">
                          {personaLabel(c.persona)}
                        </td>
                        <td className="max-w-[280px] truncate px-4 py-3 text-text-secondary">
                          {c.title?.trim() || "未命名對話"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-muted">
                          {timeAgo(c.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-text-secondary">
                          {(msgByConv.get(c.id) ?? []).length}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right font-mono text-xs font-medium",
                            confidenceColor(conf)
                          )}
                        >
                          {conf === null ? "—" : conf.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-text-muted">
                        此分身暫無對話。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </QueryState>

      {/* Detail slide-over — 真訊息 thread */}
      <AdminSlideOver
        open={active !== null}
        onClose={() => setOpenId(null)}
        title={active ? active.title?.trim() || "未命名對話" : ""}
        subtitle={
          active
            ? `${personaLabel(active.persona)} · ${formatDate(active.created_at)} · ${activeMessages.length} 則訊息`
            : ""
        }
      >
        {active && (
          <div className="flex-1 space-y-3 px-6 py-5">
            {activeMessages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "border border-border bg-card text-text-primary"
                      : "bg-lime-soft text-text-primary"
                  )}
                >
                  <p>{m.content}</p>
                  <p className="mt-1.5 text-right font-mono text-[10px] text-text-muted">
                    {m.role === "user" ? "訪客" : personaLabel(active.persona)}
                    {m.confidence !== null && ` · 信心 ${m.confidence.toFixed(2)}`} ·{" "}
                    {timeAgo(m.created_at)}
                  </p>
                </div>
              </div>
            ))}
            {activeMessages.length === 0 && (
              <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-text-muted">
                呢段對話暫無訊息記錄。
              </p>
            )}
          </div>
        )}
      </AdminSlideOver>
    </div>
  );
}
