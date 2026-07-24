import { useMemo, useState } from "react";
import { Search, ShieldBan, UserCog } from "lucide-react";
import AdminSlideOver from "@/components/admin/AdminSlideOver";
import { useAdminToast } from "@/components/admin/AdminToast";
import { cn } from "@/lib/utils";
import { dashboardKpis, members, mcpVerticals } from "@/data/admin-mock";
import type { Member, MemberTier } from "@/data/admin-mock";

type TierFilter = "全部" | MemberTier;
const TIER_FILTERS: TierFilter[] = ["全部", "免費", "進階", "VIP"];
const TIER_ORDER: MemberTier[] = ["免費", "進階", "VIP"];

function tierChip(tier: MemberTier) {
  if (tier === "VIP") return "bg-lime text-on-accent";
  if (tier === "進階") return "bg-lime-soft text-lime-text";
  return "bg-card text-text-secondary";
}

export default function AdminMembers() {
  const toast = useAdminToast();
  const [list, setList] = useState<Member[]>(members);
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<TierFilter>("全部");
  const [openId, setOpenId] = useState<string | null>(null);

  const active = list.find((m) => m.id === openId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((m) => {
      if (tierFilter !== "全部" && m.tier !== tierFilter) return false;
      if (q && !m.name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [list, query, tierFilter]);

  const tierCounts = TIER_ORDER.map((t) => ({
    tier: t,
    count: list.filter((m) => m.tier === t).length,
  }));
  const maxTier = Math.max(...tierCounts.map((t) => t.count), 1);
  const maxWaitlist = Math.max(...mcpVerticals.map((v) => v.waitlist));

  const cycleTier = (m: Member) => {
    const next = TIER_ORDER[(TIER_ORDER.indexOf(m.tier) + 1) % TIER_ORDER.length];
    setList((l) => l.map((x) => (x.id === m.id ? { ...x, tier: next } : x)));
    toast(`已將 ${m.name} 層級調整為 ${next}(mock)`);
  };

  const toggleStatus = (m: Member) => {
    const next = m.status === "活躍" ? "停用" : "活躍";
    setList((l) => l.map((x) => (x.id === m.id ? { ...x, status: next } : x)));
    toast(next === "停用" ? `已停用 ${m.name}(mock)` : `已恢復 ${m.name}(mock)`);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
          Members
        </p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
          會員管理
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          會員層級、活動紀錄與 MCP 優先名單。
        </p>
      </div>

      {/* Top: tier distribution + MCP waitlist */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-[16px] font-medium text-text-primary">
            層級分佈
          </h2>
          <div className="mt-4 space-y-3">
            {tierCounts.map((t) => (
              <div key={t.tier} className="flex items-center gap-3">
                <span className="w-10 text-xs text-text-secondary">{t.tier}</span>
                <div className="h-4 flex-1 rounded-sm bg-card">
                  <div
                    className="h-full rounded-sm bg-lime"
                    style={{ width: `${(t.count / maxTier) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right font-mono text-xs text-text-primary">
                  {t.count}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[11px] text-text-muted">
            顯示樣本 {list.length} 人 · 全站{" "}
            {dashboardKpis.totalMembers.toLocaleString("en-US")} 人(mock)
          </p>
        </section>

        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-[16px] font-medium text-text-primary">
            MCP 優先名單(按行業)
          </h2>
          <div className="mt-4 space-y-3">
            {mcpVerticals.map((v) => (
              <div key={v.key} className="flex items-center gap-3">
                <span className="w-20 text-xs text-text-secondary">{v.label}</span>
                <div className="h-4 flex-1 rounded-sm bg-card">
                  <div
                    className={cn(
                      "h-full rounded-sm",
                      v.enabled ? "bg-lime" : "bg-border-strong"
                    )}
                    style={{ width: `${(v.waitlist / maxWaitlist) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-right font-mono text-xs text-text-primary">
                  {v.waitlist}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-text-muted">
            灰條 = MCP 未開放之行業(見設定頁)
          </p>
        </section>
      </div>

      {/* Search + tier filter */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋姓名或電郵…"
            className="w-64 rounded-md border border-border-strong bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-lime focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {TIER_FILTERS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTierFilter(t)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                tierFilter === t
                  ? "border-lime bg-lime text-on-accent"
                  : "border-border bg-surface text-text-secondary hover:border-border-strong"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="ml-auto font-mono text-xs text-text-muted">
          {filtered.length} / {list.length} 位
        </span>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-text-muted">
              <th className="px-4 py-3 font-medium">會員</th>
              <th className="px-4 py-3 font-medium">層級</th>
              <th className="px-4 py-3 font-medium">加入日期</th>
              <th className="px-4 py-3 text-right font-medium">對話數</th>
              <th className="px-4 py-3 font-medium">狀態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((m) => (
              <tr
                key={m.id}
                onClick={() => setOpenId(m.id)}
                className="cursor-pointer transition-colors hover:bg-card/60"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-text-primary">{m.name}</p>
                  <p className="mt-0.5 text-xs text-text-muted">{m.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-sm px-2 py-0.5 text-xs font-medium",
                      tierChip(m.tier)
                    )}
                  >
                    {m.tier}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                  {m.joinedAt}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-text-secondary">
                  {m.chatCount}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      m.status === "活躍" ? "text-lime-text" : "text-[#A63A30]"
                    )}
                  >
                    {m.status}
                  </span>
                  <p className="mt-0.5 text-[11px] text-text-muted">
                    最後活躍:{m.lastActive}
                  </p>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-text-muted">
                  找不到符合嘅會員。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Member detail slide-over */}
      <AdminSlideOver
        open={active !== null}
        onClose={() => setOpenId(null)}
        title={active?.name ?? ""}
        subtitle={
          active
            ? `${active.email} · ${active.tier}會員 · 加入於 ${active.joinedAt}`
            : ""
        }
      >
        {active && (
          <div className="flex h-full flex-col">
            <div className="flex-1 space-y-6 px-6 py-5">
              {/* Summary chips */}
              <div className="flex flex-wrap gap-2">
                <span
                  className={cn(
                    "rounded-sm px-2 py-1 text-xs font-medium",
                    tierChip(active.tier)
                  )}
                >
                  {active.tier}
                </span>
                <span className="rounded-sm bg-card px-2 py-1 font-mono text-xs text-text-secondary">
                  {active.chatCount} 段對話
                </span>
                <span
                  className={cn(
                    "rounded-sm px-2 py-1 text-xs font-medium",
                    active.status === "活躍"
                      ? "bg-lime-soft text-lime-text"
                      : "bg-card text-[#A63A30]"
                  )}
                >
                  {active.status}
                </span>
              </div>

              {/* MCP interests */}
              <div>
                <p className="mb-2 text-xs text-text-muted">MCP 優先名單興趣</p>
                {active.mcpInterests.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {active.mcpInterests.map((v) => (
                      <span
                        key={v}
                        className="rounded-sm border border-lime/40 bg-lime-soft px-2 py-1 font-mono text-xs text-lime-text"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">未加入任何優先名單。</p>
                )}
              </div>

              {/* Timeline */}
              <div>
                <p className="mb-3 text-xs text-text-muted">活動紀錄</p>
                <ol className="relative space-y-4 border-l border-border pl-5">
                  {active.timeline.map((ev, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[26px] top-1 h-2 w-2 rounded-full bg-lime" />
                      <p className="text-sm text-text-primary">{ev.label}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-text-muted">
                        {ev.date}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() => cycleTier(active)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-lime px-3 py-2 text-sm font-medium text-on-accent hover:bg-lime-hover"
              >
                <UserCog className="h-4 w-4" />
                調整層級
              </button>
              <button
                type="button"
                onClick={() => toggleStatus(active)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors",
                  active.status === "活躍"
                    ? "border-[#A63A30]/40 text-[#A63A30] hover:bg-[#A63A30]/5"
                    : "border-border text-text-secondary hover:border-border-strong"
                )}
              >
                <ShieldBan className="h-4 w-4" />
                {active.status === "活躍" ? "停用" : "恢復"}
              </button>
            </div>
          </div>
        )}
      </AdminSlideOver>
    </div>
  );
}
