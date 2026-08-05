import { useMemo, useState } from "react";
import { Download, Inbox, Search } from "lucide-react";
import { useAdminToast } from "@/components/admin/AdminToast";
import QueryState from "@/components/QueryState";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { formatDate, useAdminQuery } from "@/components/admin/adminData";
import type { AdminWaitlistRow } from "@/components/admin/adminData";

const KIND_LABELS: Record<string, string> = {
  newsletter: "Newsletter",
  mcp: "MCP 名單",
  expert: "專家申請",
  partner: "合作夥伴",
  vip: "VIP",
};

const KIND_ORDER = ["newsletter", "mcp", "expert", "partner", "vip"];

type KindFilter = "全部" | string;

function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind;
}

function kindChipClass(kind: string) {
  if (kind === "newsletter") return "bg-lime-soft text-lime-text";
  if (kind === "mcp") return "bg-card text-text-secondary";
  if (kind === "expert" || kind === "partner") return "bg-card text-[#A36A0F]";
  return "bg-card text-text-secondary";
}

async function fetchWaitlist(): Promise<AdminWaitlistRow[]> {
  if (!supabase) throw new Error("Supabase 未連接 — 請檢查環境變數。");
  const { data, error } = await supabase
    .from("waitlist")
    .select("id,email,kind,vertical,role,note,source,created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminWaitlistRow[];
}

export default function AdminEmails() {
  const toast = useAdminToast();
  const { data, loading, error, refetch } = useAdminQuery(fetchWaitlist);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("全部");

  const list = useMemo(() => data ?? [], [data]);

  const kindCounts = KIND_ORDER.map((k) => ({
    kind: k,
    count: list.filter((w) => w.kind === k).length,
  }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((w) => {
      if (kind !== "全部" && w.kind !== kind) return false;
      if (
        q &&
        !w.email.toLowerCase().includes(q) &&
        !(w.vertical ?? "").toLowerCase().includes(q) &&
        !(w.note ?? "").toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [list, query, kind]);

  /** 真 CSV 匯出 — 匯出而家載入咗嘅真實 rows */
  const exportCsv = () => {
    const rows = [
      ["email", "kind", "vertical", "role", "note", "source", "created_at"],
      ...filtered.map((w) => [
        w.email,
        w.kind,
        w.vertical ?? "",
        w.role ?? "",
        (w.note ?? "").replace(/[\r\n]+/g, " "),
        w.source ?? "",
        w.created_at ?? "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aigro-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`已匯出 ${filtered.length} 筆真實記錄`);
  };

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
            waitlist 表即時查詢 — Newsletter / MCP / 專家 / 合作 / VIP 名單統一視圖。
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          匯出 CSV
        </button>
      </div>

      <QueryState
        loading={loading}
        error={error ? `載入失敗:${error}` : null}
        retry={refetch}
        empty={
          data && data.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
              <Inbox className="mx-auto h-6 w-6 text-text-muted" />
              <p className="mt-3 text-sm font-medium text-text-primary">
                名單暫時係空
              </p>
              <p className="mx-auto mt-1.5 max-w-[400px] text-xs leading-relaxed text-text-muted">
                waitlist 表而家係 0 — 網站四個入口(Newsletter、MCP 優先名單、
                專家申請、合作查詢)嘅登記會即時出現喺呢度。
              </p>
            </div>
          ) : null
        }
      >
        {data && data.length > 0 && (
          <>
            {/* Kind summary cards */}
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
              {kindCounts.map((k) => (
                <div
                  key={k.kind}
                  className="rounded-lg border border-border bg-surface px-4 py-3.5"
                >
                  <p className="font-mono text-[22px] font-medium text-text-primary">
                    {k.count.toLocaleString("en-US")}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">{kindLabel(k.kind)}</p>
                </div>
              ))}
            </div>

            {/* Search + kind filters */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜尋 email、行業或備註…"
                  className="w-full rounded-md border border-border-strong bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-lime focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {["全部", ...KIND_ORDER].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      kind === k
                        ? "bg-lime text-on-accent"
                        : "border border-border bg-surface text-text-secondary hover:border-border-strong"
                    )}
                  >
                    {k === "全部" ? "全部" : kindLabel(k)}
                  </button>
                ))}
              </div>
              <span className="ml-auto font-mono text-xs text-text-muted">
                {filtered.length} / {list.length} 筆
              </span>
            </div>

            {/* Unified email table */}
            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-text-muted">
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">名單</th>
                    <th className="px-4 py-3 font-medium">行業 / 身份</th>
                    <th className="px-4 py-3 font-medium">備註</th>
                    <th className="px-4 py-3 font-medium">加入日期</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((w) => (
                    <tr key={w.id} className="transition-colors hover:bg-card/60">
                      <td className="px-4 py-3 font-mono text-xs text-text-primary">
                        {w.email}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-sm px-1.5 py-0.5 text-[11px] font-medium",
                            kindChipClass(w.kind)
                          )}
                        >
                          {kindLabel(w.kind)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {[w.vertical, w.role].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-xs text-text-secondary">
                        {w.note ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                        {formatDate(w.created_at)}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">
                        冇符合條件嘅記錄 — 試下更改搜尋或名單篩選。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
}
