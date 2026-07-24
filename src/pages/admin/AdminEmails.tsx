import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { useAdminToast } from "@/components/admin/AdminToast";
import { cn } from "@/lib/utils";
import {
  emailContacts,
  emailEngagement,
  emailSegmentSummary,
} from "@/data/admin-mock2";
import type { EmailSegment } from "@/data/admin-mock2";

type SegmentFilter = "全部" | EmailSegment;
const SEGMENT_FILTERS: SegmentFilter[] = [
  "全部",
  "會員",
  "MCP-AI",
  "MCP-Beauty",
  "MCP-Technology",
  "Newsletter",
  "專家通知",
];

function segmentChipClass(seg: EmailSegment) {
  if (seg === "會員") return "bg-lime-soft text-lime-text";
  if (seg.startsWith("MCP")) return "bg-card text-text-secondary";
  if (seg === "專家通知") return "bg-card text-[#A36A0F]";
  return "bg-card text-text-secondary";
}

export default function AdminEmails() {
  const toast = useAdminToast();
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<SegmentFilter>("全部");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return emailContacts.filter((c) => {
      if (segment !== "全部" && !c.segments.includes(segment)) return false;
      if (q && !c.email.toLowerCase().includes(q) && !c.interest.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [query, segment]);

  const activeCount = emailContacts.filter((c) => c.status === "active").length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
            Emails
          </p>
          <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
            郵件數據中心
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            會員、MCP 名單、Newsletter 與專家通知名單嘅統一視圖。
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast("已匯出 CSV(示範模式)")}
          className="inline-flex items-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover"
        >
          <Download className="h-4 w-4" />
          匯出 CSV
        </button>
      </div>

      {/* Segment summary cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface px-4 py-3.5">
          <p className="font-mono text-[22px] font-medium text-text-primary">
            {emailSegmentSummary.members.toLocaleString()}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">會員 Members</p>
        </div>
        <div className="rounded-lg border border-border bg-surface px-4 py-3.5">
          <p className="font-mono text-[22px] font-medium text-text-primary">
            {emailSegmentSummary.mcpTotal.toLocaleString()}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">MCP 名單</p>
          <p className="mt-1 font-mono text-[11px] text-text-secondary">
            {emailSegmentSummary.mcp
              .map((m) => `${m.label} ${m.count}`)
              .join(" · ")}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface px-4 py-3.5">
          <p className="font-mono text-[22px] font-medium text-text-primary">
            {emailSegmentSummary.newsletter.toLocaleString()}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">Newsletter 訂閱</p>
        </div>
        <div className="rounded-lg border border-border bg-surface px-4 py-3.5">
          <p className="font-mono text-[22px] font-medium text-text-primary">
            {emailSegmentSummary.expertNotify}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">專家通知名單</p>
        </div>
      </div>

      {/* Engagement mini-stats */}
      <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-border bg-card px-4 py-3">
        <span className="text-xs text-text-muted">近 30 日互動</span>
        <span className="text-sm text-text-secondary">
          開信率{" "}
          <span className="font-mono font-medium text-lime-text">
            {emailEngagement.openRate}
          </span>
        </span>
        <span className="text-sm text-text-secondary">
          點擊率{" "}
          <span className="font-mono font-medium text-lime-text">
            {emailEngagement.clickRate}
          </span>
        </span>
        <span className="ml-auto font-mono text-[11px] text-text-muted">
          列表樣本 {emailContacts.length} · active {activeCount}
        </span>
      </div>

      {/* Search + segment filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋 email 或興趣…"
            className="w-full rounded-md border border-border-strong bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-lime focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {SEGMENT_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSegment(s)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                segment === s
                  ? "bg-lime text-on-accent"
                  : "border border-border bg-surface text-text-secondary hover:border-border-strong"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Unified email table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-text-muted">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">來源 Segment</th>
              <th className="px-4 py-3 font-medium">興趣</th>
              <th className="px-4 py-3 font-medium">加入日期</th>
              <th className="px-4 py-3 font-medium">狀態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((c) => (
              <tr key={c.email} className="transition-colors hover:bg-card/60">
                <td className="px-4 py-3 font-mono text-xs text-text-primary">
                  {c.email}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {c.segments.map((s) => (
                      <span
                        key={s}
                        className={cn(
                          "rounded-sm px-1.5 py-0.5 text-[11px] font-medium",
                          segmentChipClass(s)
                        )}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-text-secondary">{c.interest}</td>
                <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                  {c.joinedAt}
                </td>
                <td className="px-4 py-3">
                  {c.status === "active" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-sm bg-lime-soft px-2 py-0.5 text-xs font-medium text-lime-text">
                      <span className="h-1.5 w-1.5 rounded-full bg-lime-text" />
                      active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-sm bg-card px-2 py-0.5 text-xs font-medium text-text-muted">
                      <span className="h-1.5 w-1.5 rounded-full bg-text-muted" />
                      unsubscribed
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">
                  冇符合條件嘅記錄 — 試下更改搜尋或 segment 篩選。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
