import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Inbox, Search } from "lucide-react";
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
const KIND_ORDER = ["newsletter", "mcp", "expert", "partner", "vip"] as const;
const PAGE_SIZE = 50;
type KindFilter = "全部" | string;

interface WaitlistPage {
  rows: AdminWaitlistRow[];
  total: number;
  counts: Record<string, number>;
}

function kindLabel(kind: string) {
  return KIND_LABELS[kind] ?? kind;
}

function kindChipClass(kind: string) {
  if (kind === "newsletter") return "bg-lime-soft text-lime-text";
  if (kind === "expert" || kind === "partner") return "bg-card text-warning";
  return "bg-card text-text-secondary";
}

function applyWaitlistFilters<T extends {
  eq(column: string, value: string): T;
  or(filters: string): T;
}>(request: T, kind: KindFilter, search: string): T {
  let next = request;
  if (kind !== "全部") next = next.eq("kind", kind);
  const safeSearch = search.trim().replace(/[,%()]/g, "");
  if (safeSearch) {
    next = next.or(`email.ilike.%${safeSearch}%,vertical.ilike.%${safeSearch}%,note.ilike.%${safeSearch}%`);
  }
  return next;
}

async function countKind(kind?: string): Promise<number> {
  if (!supabase) throw new Error("Supabase 未連接");
  let request = supabase.from("waitlist").select("id", { count: "exact", head: true });
  if (kind) request = request.eq("kind", kind);
  const { count, error } = await request;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchWaitlistPage(page: number, kind: KindFilter, search: string): Promise<WaitlistPage> {
  if (!supabase) throw new Error("Supabase 未連接 — 請檢查環境變數。");
  const from = (page - 1) * PAGE_SIZE;
  let request = supabase
    .from("waitlist")
    .select("id,email,kind,vertical,role,note,source,created_at", { count: "exact" })
    .order("created_at", { ascending: false });
  request = applyWaitlistFilters(request, kind, search);
  const [pageResult, ...kindCounts] = await Promise.all([
    request.range(from, from + PAGE_SIZE - 1),
    ...KIND_ORDER.map((key) => countKind(key)),
  ]);
  if (pageResult.error) throw new Error(pageResult.error.message);
  return {
    rows: (pageResult.data ?? []) as AdminWaitlistRow[],
    total: pageResult.count ?? 0,
    counts: Object.fromEntries(KIND_ORDER.map((key, index) => [key, kindCounts[index]])),
  };
}

async function fetchAllFilteredWaitlist(kind: KindFilter, search: string): Promise<AdminWaitlistRow[]> {
  if (!supabase) throw new Error("Supabase 未連接");
  const rows: AdminWaitlistRow[] = [];
  for (let from = 0; ; from += 1000) {
    let request = supabase
      .from("waitlist")
      .select("id,email,kind,vertical,role,note,source,created_at")
      .order("created_at", { ascending: false });
    request = applyWaitlistFilters(request, kind, search);
    const { data, error } = await request.range(from, from + 999);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as AdminWaitlistRow[];
    rows.push(...batch);
    if (batch.length < 1000) return rows;
  }
}

function csvCell(value: unknown): string {
  let normalized = String(value ?? "").replace(/[\r\n]+/g, " ");
  if (/^[=+\-@]/.test(normalized)) normalized = `'${normalized}`;
  return `"${normalized.replace(/"/g, '""')}"`;
}

export default function AdminEmails() {
  const toast = useAdminToast();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<KindFilter>("全部");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const { data, loading, error, refetch } = useAdminQuery(
    () => fetchWaitlistPage(page, kind, search),
    [page, kind, search]
  );
  const rows = useMemo(() => data?.rows ?? [], [data]);
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const exportRows = await fetchAllFilteredWaitlist(kind, search);
      const csvRows = [
        ["email", "kind", "vertical", "role", "note", "source", "created_at"],
        ...exportRows.map((row) => [row.email, row.kind, row.vertical, row.role, row.note, row.source, row.created_at]),
      ];
      const csv = csvRows.map((row) => row.map(csvCell).join(",")).join("\n");
      const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `aigro-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast(`已匯出目前篩選嘅 ${exportRows.length} 筆記錄`);
    } catch (exportError) {
      toast(`匯出失敗：${exportError instanceof Error ? exportError.message : String(exportError)}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">Emails</p>
          <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">郵件名單</h1>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">Waitlist 只讀視圖；發送、unsubscribe、consent history 同投遞狀態未接入。</p>
        </div>
        <button
          type="button"
          onClick={() => void exportCsv()}
          disabled={exporting || (data?.total ?? 0) === 0}
          className="press inline-flex h-10 items-center gap-1.5 rounded-md bg-lime px-4 text-sm font-medium text-on-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          {exporting ? "匯出中…" : "匯出目前篩選 CSV"}
        </button>
      </header>

      <QueryState
        loading={loading}
        error={error ? `載入失敗：${error}` : null}
        retry={refetch}
        empty={data && data.total === 0 && kind === "全部" && !search ? (
          <div className="rounded-lg border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
            <Inbox className="mx-auto h-6 w-6 text-text-muted" strokeWidth={1.5} />
            <p className="mt-3 text-sm font-medium text-text-primary">名單暫時係空</p>
          </div>
        ) : null}
      >
        {data && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
              {KIND_ORDER.map((key) => (
                <div key={key} className="rounded-lg border border-border bg-surface px-4 py-3.5">
                  <p className="font-mono text-[22px] font-medium text-text-primary">{(data.counts[key] ?? 0).toLocaleString("en-US")}</p>
                  <p className="mt-0.5 text-xs text-text-muted">{kindLabel(key)}</p>
                </div>
              ))}
            </div>

            <div className="mb-4 space-y-3 rounded-lg border border-border bg-surface p-3 sm:p-4">
              <form className="flex gap-2" onSubmit={(event) => {
                event.preventDefault();
                setSearch(searchInput.trim());
                setPage(1);
              }}>
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">搜尋名單</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" strokeWidth={1.5} />
                  <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="搜尋 email、行業或備註…" className="h-10 w-full rounded-md border border-border-strong bg-bg pl-9 pr-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-lime focus:ring-1 focus:ring-lime" />
                </label>
                <button type="submit" className="press h-10 rounded-md border border-border-strong px-4 text-sm text-text-primary">搜尋</button>
              </form>
              <div className="flex flex-wrap items-center gap-1.5">
                {["全部", ...KIND_ORDER].map((key) => (
                  <button key={key} type="button" onClick={() => { setKind(key); setPage(1); }} className={cn("press rounded-md px-3 py-1.5 text-xs font-medium", kind === key ? "bg-lime text-on-accent" : "border border-border bg-bg text-text-secondary")}>
                    {key === "全部" ? "全部" : kindLabel(key)}
                  </button>
                ))}
                <span className="ml-auto font-mono text-xs text-text-muted">{data.total.toLocaleString("en-US")} 筆</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border bg-surface" aria-label="名單表格，可橫向捲動">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead><tr className="border-b border-border text-xs text-text-muted"><th className="px-4 py-3 font-medium">Email</th><th className="px-4 py-3 font-medium">名單</th><th className="px-4 py-3 font-medium">行業 / 身份</th><th className="px-4 py-3 font-medium">備註</th><th className="px-4 py-3 font-medium">來源</th><th className="px-4 py-3 font-medium">加入日期</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-card/60">
                      <td className="px-4 py-3 font-mono text-xs text-text-primary">{row.email}</td>
                      <td className="px-4 py-3"><span className={cn("rounded-sm px-1.5 py-0.5 text-[11px] font-medium", kindChipClass(row.kind))}>{kindLabel(row.kind)}</span></td>
                      <td className="px-4 py-3 text-xs text-text-secondary">{[row.vertical, row.role].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-xs text-text-secondary">{row.note ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-text-muted">{row.source ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary">{formatDate(row.created_at)}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-text-muted">冇符合目前篩選嘅記錄。</td></tr>}
                </tbody>
              </table>
            </div>

            {data.total > PAGE_SIZE && (
              <nav className="mt-4 flex items-center justify-between rounded-lg border border-border bg-surface p-3" aria-label="名單分頁">
                <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="press inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs text-text-secondary disabled:opacity-35"><ChevronLeft className="h-4 w-4" />上一頁</button>
                <span className="font-mono text-xs text-text-muted">第 {page} / {pageCount} 頁</span>
                <button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)} className="press inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs text-text-secondary disabled:opacity-35">下一頁<ChevronRight className="h-4 w-4" /></button>
              </nav>
            )}
          </>
        )}
      </QueryState>
    </div>
  );
}
