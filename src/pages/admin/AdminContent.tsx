import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Search, Star, X } from "lucide-react";
import { useAdminToast } from "@/components/admin/AdminToast";
import QueryState from "@/components/QueryState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { formatDate, timeAgo, useAdminQuery } from "@/components/admin/adminData";
import type { AdminItemRow, ItemPlacement, ItemStatus } from "@/components/admin/adminData";

type ContentTab = "情報佇列" | "專家文章" | "案例管理";
type StatusFilter = "全部" | ItemStatus;

const TABS: ContentTab[] = ["情報佇列", "專家文章", "案例管理"];
const PAGE_SIZE = 25;
const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "pending", label: "待審核" },
  { key: "reviewed", label: "已檢閱" },
  { key: "published", label: "已發佈" },
  { key: "rejected", label: "已拒絕" },
  { key: "全部", label: "全部" },
];
const STATUS_LABEL: Record<ItemStatus, string> = {
  pending: "待審核",
  reviewed: "已檢閱",
  published: "已發佈",
  rejected: "已拒絕",
};
const PLACEMENTS: { key: ItemPlacement; label: string }[] = [
  { key: "featured", label: "首頁" },
  { key: "daily", label: "日報" },
  { key: "normal", label: "普通" },
];

type ContentItemRow = AdminItemRow & {
  expert_slug: string | null;
  local_commentary: string | null;
};

interface ContentCounts {
  all: number;
  pending: number;
  reviewed: number;
  published: number;
  rejected: number;
  expert: number;
}

interface ContentPageData {
  items: ContentItemRow[];
  filteredTotal: number;
  counts: ContentCounts;
}

interface ContentQuery {
  page: number;
  status: StatusFilter;
  expertOnly: boolean;
  search: string;
}

async function countItems(status?: ItemStatus, expertOnly = false): Promise<number> {
  if (!supabase) throw new Error("Supabase 未連接");
  let request = supabase.from("items").select("id", { count: "exact", head: true });
  if (status) request = request.eq("status", status);
  if (expertOnly) request = request.not("expert_slug", "is", null);
  const { count, error } = await request;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchContentPage(input: ContentQuery): Promise<ContentPageData> {
  if (!supabase) throw new Error("Supabase 未連接 — 請檢查環境變數。");
  const from = (input.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  let request = supabase
    .from("items")
    .select(
      "id,title,summary,local_commentary,original_url,category,score,lang,status,placement,published_at,fetched_at,source_id,expert_slug,sources(name)",
      { count: "exact" }
    )
    .order("fetched_at", { ascending: false });
  if (input.status !== "全部") request = request.eq("status", input.status);
  if (input.expertOnly) request = request.not("expert_slug", "is", null);
  if (input.search.trim()) {
    const safeSearch = input.search.trim().replace(/[%_]/g, "");
    if (safeSearch) request = request.ilike("title", `%${safeSearch}%`);
  }

  const [pageResult, all, pending, reviewed, published, rejected, expert] = await Promise.all([
    request.range(from, to),
    countItems(),
    countItems("pending"),
    countItems("reviewed"),
    countItems("published"),
    countItems("rejected"),
    countItems(undefined, true),
  ]);
  if (pageResult.error) throw new Error(pageResult.error.message);
  return {
    items: (pageResult.data ?? []) as unknown as ContentItemRow[],
    filteredTotal: pageResult.count ?? 0,
    counts: { all, pending, reviewed, published, rejected, expert },
  };
}

function statusChip(status: ItemStatus) {
  if (status === "published") return "bg-lime-soft text-lime-text";
  if (status === "rejected") return "bg-card text-text-muted line-through";
  if (status === "reviewed") return "bg-card text-text-secondary";
  return "bg-card text-warning";
}

export default function AdminContent() {
  const toast = useAdminToast();
  const [tab, setTab] = useState<ContentTab>("情報佇列");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [expertOnly, setExpertOnly] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<{
    item: ContentItemRow;
    status: ItemStatus;
  } | null>(null);

  const effectiveExpertOnly = tab === "專家文章" || expertOnly;
  const query = useMemo<ContentQuery>(
    () => ({ page, status: statusFilter, expertOnly: effectiveExpertOnly, search }),
    [page, statusFilter, effectiveExpertOnly, search]
  );
  const { data, loading, error, refetch } = useAdminQuery(
    () => fetchContentPage(query),
    [query.page, query.status, query.expertOnly, query.search]
  );
  const items = data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((data?.filteredTotal ?? 0) / PAGE_SIZE));

  const chooseTab = (next: ContentTab) => {
    setTab(next);
    setPage(1);
    setExpertOnly(false);
    setStatusFilter(next === "專家文章" ? "全部" : "pending");
  };

  const chooseStatus = (status: StatusFilter) => {
    setStatusFilter(status);
    setPage(1);
  };

  const updateStatus = async (item: ContentItemRow, status: ItemStatus) => {
    if (!supabase || busyId) return;
    setBusyId(item.id);
    const patch: Record<string, unknown> = { status };
    if (status === "published" && !item.published_at) patch.published_at = new Date().toISOString();
    const { error: updateError } = await supabase.from("items").update(patch).eq("id", item.id);
    setBusyId(null);
    if (updateError) {
      toast(`更新失敗：${updateError.message}`);
      return;
    }
    toast(`「${item.title.slice(0, 14)}…」已改為${STATUS_LABEL[status]}`);
    refetch();
  };

  const updatePlacement = async (item: ContentItemRow, placement: ItemPlacement) => {
    if (!supabase || busyId) return;
    setBusyId(item.id);
    const { error: updateError } = await supabase.from("items").update({ placement }).eq("id", item.id);
    setBusyId(null);
    if (updateError) {
      toast(`更新失敗：${updateError.message}`);
      return;
    }
    toast(`「${item.title.slice(0, 12)}…」顯示位置已更新`);
    refetch();
  };

  const countFor = (filter: StatusFilter) => {
    if (!data) return "…";
    return filter === "全部" ? data.counts.all : data.counts[filter];
  };

  const listLabel = tab === "專家文章" ? "專家文章" : "情報";

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">Content</p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">內容管理</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-muted">
          Server-side 搜尋、真實總數及每頁 {PAGE_SIZE} 筆；狀態同顯示位置會直接寫入 Supabase。
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-1" role="tablist" aria-label="內容類型">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            onClick={() => chooseTab(item)}
            className={cn(
              "press rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === item
                ? "bg-lime text-on-accent"
                : "border border-border bg-surface text-text-secondary hover:border-border-strong"
            )}
          >
            {item}
            {item === "情報佇列" && data && <span className="ml-1.5 font-mono text-xs">{data.counts.pending}</span>}
            {item === "專家文章" && data && <span className="ml-1.5 font-mono text-xs">{data.counts.expert}</span>}
          </button>
        ))}
      </div>

      {tab !== "案例管理" ? (
        <section role="tabpanel">
          <div className="mb-4 space-y-3 rounded-lg border border-border bg-surface p-3 sm:p-4">
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => chooseStatus(filter.key)}
                  className={cn(
                    "press rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                    statusFilter === filter.key
                      ? "border-lime bg-lime text-on-accent"
                      : "border-border bg-bg text-text-secondary hover:border-border-strong"
                  )}
                >
                  {filter.label} <span className="ml-1 font-mono">{countFor(filter.key)}</span>
                </button>
              ))}
              {tab === "情報佇列" && (
                <button
                  type="button"
                  onClick={() => {
                    setExpertOnly((value) => !value);
                    setPage(1);
                  }}
                  className={cn(
                    "press rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                    expertOnly
                      ? "border-lime bg-lime text-on-accent"
                      : "border-dashed border-border-strong bg-bg text-text-secondary"
                  )}
                >
                  專家投稿 <span className="ml-1 font-mono">{data?.counts.expert ?? "…"}</span>
                </button>
              )}
            </div>
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                setSearch(searchInput.trim());
                setPage(1);
              }}
            >
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">搜尋標題</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" strokeWidth={1.5} />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="搜尋標題…"
                  className="h-10 w-full rounded-md border border-border-strong bg-bg pl-9 pr-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-lime focus:ring-1 focus:ring-lime"
                />
              </label>
              <button type="submit" className="press h-10 rounded-md border border-border-strong px-4 text-sm text-text-primary hover:border-lime">
                搜尋
              </button>
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setPage(1);
                  }}
                  className="press h-10 rounded-md px-3 text-sm text-text-muted hover:text-text-primary"
                >
                  清除
                </button>
              )}
            </form>
          </div>

          <QueryState
            loading={loading}
            error={error ? `載入失敗：${error}` : null}
            retry={refetch}
            skeletonRows={5}
            empty={
              data && data.filteredTotal === 0 ? (
                <div className="rounded-lg border border-dashed border-border-strong bg-surface px-6 py-14 text-center">
                  <p className="text-sm text-text-muted">冇符合目前條件嘅{listLabel}。</p>
                </div>
              ) : null
            }
          >
            {data && items.length > 0 && (
              <>
                <div className="mb-3 flex items-center justify-between gap-3 text-xs text-text-muted">
                  <span>共 {data.filteredTotal.toLocaleString("en-US")} 筆</span>
                  <span className="font-mono">第 {page} / {pageCount} 頁</span>
                </div>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item.id} className={cn("rounded-lg border border-border bg-surface p-4", item.status === "rejected" && "opacity-65")}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-sm bg-card px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">{item.category ?? "未分類"}</span>
                        {item.expert_slug && <span className="rounded-sm bg-lime-soft px-1.5 py-0.5 font-mono text-[10px] text-lime-text">專家 · {item.expert_slug}</span>}
                        <span className={cn("rounded-sm px-1.5 py-0.5 text-[11px] font-medium", statusChip(item.status))}>{STATUS_LABEL[item.status]}</span>
                        {item.placement && item.placement !== "normal" && (
                          <span className="inline-flex items-center gap-1 rounded-sm bg-lime-soft px-1.5 py-0.5 text-[11px] text-lime-text">
                            <Star className="h-3 w-3 fill-current" strokeWidth={1.5} aria-hidden="true" />
                            {PLACEMENTS.find((placement) => placement.key === item.placement)?.label}
                          </span>
                        )}
                        <span className="ml-auto font-mono text-[10px] text-text-muted">
                          {item.sources?.name ?? item.expert_slug ?? "未知來源"} · {item.published_at ? `發佈 ${formatDate(item.published_at)}` : `抓取 ${timeAgo(item.fetched_at)}`}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium leading-snug text-text-primary">
                        {item.original_url ? <a href={item.original_url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:text-lime-text hover:underline">{item.title}</a> : item.title}
                      </p>
                      {item.summary && <p className="mt-1 max-h-[4.5rem] overflow-hidden text-xs leading-6 text-text-secondary">{item.summary}</p>}
                      {tab === "專家文章" && item.local_commentary && <p className="mt-2 max-h-24 overflow-hidden whitespace-pre-line border-l-2 border-lime pl-3 text-xs leading-relaxed text-text-muted">{item.local_commentary}</p>}

                      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
                        <span className="mr-1 text-[11px] text-text-muted">顯示位置</span>
                        {PLACEMENTS.map((placement) => (
                          <button
                            key={placement.key}
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => void updatePlacement(item, placement.key)}
                            className={cn(
                              "press rounded-sm px-2 py-1 text-[11px] disabled:opacity-40",
                              (item.placement ?? "normal") === placement.key
                                ? "bg-lime-soft text-lime-text"
                                : "border border-border text-text-muted hover:border-border-strong"
                            )}
                          >
                            {placement.label}
                          </button>
                        ))}
                        <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
                        {item.status === "pending" && (
                          <button type="button" disabled={busyId === item.id} onClick={() => void updateStatus(item, "reviewed")} className="press rounded-md border border-border px-3 py-1 text-xs text-text-secondary disabled:opacity-40">已檢閱</button>
                        )}
                        {item.status !== "published" && (
                          <button type="button" disabled={busyId === item.id} onClick={() => setPendingStatus({ item, status: "published" })} className="press inline-flex items-center gap-1 rounded-md bg-lime px-3 py-1 text-xs font-medium text-on-accent disabled:opacity-40">
                            <Check className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" /> 發佈
                          </button>
                        )}
                        {item.status !== "rejected" ? (
                          <button type="button" disabled={busyId === item.id} onClick={() => setPendingStatus({ item, status: "rejected" })} className="press inline-flex items-center gap-1 rounded-md border border-border px-3 py-1 text-xs text-text-secondary disabled:opacity-40">
                            <X className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" /> 拒絕
                          </button>
                        ) : (
                          <button type="button" disabled={busyId === item.id} onClick={() => void updateStatus(item, "pending")} className="press rounded-md border border-border px-3 py-1 text-xs text-text-secondary disabled:opacity-40">恢復待審核</button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                <nav className="mt-5 flex items-center justify-between rounded-lg border border-border bg-surface p-3" aria-label="內容分頁">
                  <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="press inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs text-text-secondary disabled:opacity-35">
                    <ChevronLeft className="h-4 w-4" strokeWidth={1.5} /> 上一頁
                  </button>
                  <span className="font-mono text-xs text-text-muted">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.filteredTotal)} / {data.filteredTotal}</span>
                  <button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="press inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs text-text-secondary disabled:opacity-35">
                    下一頁 <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </nav>
              </>
            )}
          </QueryState>
        </section>
      ) : (
        <section role="tabpanel" className="rounded-lg border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
          <p className="font-display text-[17px] font-medium text-text-primary">案例管理 · Planned</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-text-muted">案例目前由程式碼資料層管理。建立 cases 資料表、媒體上傳同審批流程之前，呢度維持只讀計劃狀態。</p>
        </section>
      )}

      <AlertDialog open={pendingStatus !== null} onOpenChange={(open) => !open && setPendingStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-medium text-text-primary">
              {pendingStatus?.status === "published" ? "確認發佈情報？" : "確認拒絕情報？"}
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed text-text-secondary">
              {pendingStatus?.status === "published"
                ? "發佈後內容會按顯示位置出現喺公開頁面。請先確認標題、摘要、來源同連結。"
                : "內容會移出待審核佇列；之後仍可恢復到待審核。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="press">取消</AlertDialogCancel>
            <AlertDialogAction
              className={cn("press", pendingStatus?.status === "published" ? "bg-lime text-on-accent hover:bg-lime-hover" : "bg-error text-destructive-foreground hover:bg-error/90")}
              onClick={() => {
                if (pendingStatus) void updateStatus(pendingStatus.item, pendingStatus.status);
                setPendingStatus(null);
              }}
            >
              確認{pendingStatus?.status === "published" ? "發佈" : "拒絕"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
