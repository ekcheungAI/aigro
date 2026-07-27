import { useMemo, useState } from "react";
import { Check, Star, X } from "lucide-react";
import { useAdminToast } from "@/components/admin/AdminToast";
import QueryState from "@/components/QueryState";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  formatDate,
  timeAgo,
  useAdminQuery,
} from "@/components/admin/adminData";
import type {
  AdminItemRow,
  ItemPlacement,
  ItemStatus,
} from "@/components/admin/adminData";
import { cases } from "@/data/cases";

type ContentTab = "情報佇列" | "專家文章" | "案例管理";
const TABS: ContentTab[] = ["情報佇列", "專家文章", "案例管理"];

type StatusFilter = "全部" | ItemStatus;
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

function statusChip(status: ItemStatus) {
  if (status === "published") return "bg-lime-soft text-lime-text";
  if (status === "rejected") return "bg-card text-text-muted line-through";
  if (status === "reviewed") return "bg-card text-text-secondary";
  return "bg-card text-[#A36A0F]";
}

async function fetchItems(): Promise<AdminItemRow[]> {
  if (!supabase) throw new Error("Supabase 未連接 — 請檢查環境變數。");
  const { data, error } = await supabase
    .from("items")
    .select(
      "id,title,summary,original_url,category,score,lang,status,placement,published_at,fetched_at,source_id,sources(name)"
    )
    .order("fetched_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AdminItemRow[];
}

export default function AdminContent() {
  const toast = useAdminToast();
  const [tab, setTab] = useState<ContentTab>("情報佇列");
  const { data, loading, error, refetch } = useAdminQuery(fetchItems);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const items = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(
    () =>
      statusFilter === "全部"
        ? items
        : items.filter((i) => i.status === statusFilter),
    [items, statusFilter]
  );
  const countOf = (s: ItemStatus) => items.filter((i) => i.status === s).length;

  const updateStatus = async (item: AdminItemRow, status: ItemStatus) => {
    if (!supabase || busyId) return;
    setBusyId(item.id);
    const patch: Record<string, unknown> = { status };
    if (status === "published" && !item.published_at) {
      patch.published_at = new Date().toISOString();
    }
    const { error: updateError } = await supabase
      .from("items")
      .update(patch)
      .eq("id", item.id);
    setBusyId(null);
    if (updateError) {
      toast(`更新失敗:${updateError.message}`);
      return;
    }
    toast(`「${item.title.slice(0, 14)}…」已改為${STATUS_LABEL[status]}`);
    refetch();
  };

  const updatePlacement = async (item: AdminItemRow, placement: ItemPlacement) => {
    if (!supabase || busyId) return;
    setBusyId(item.id);
    const { error: updateError } = await supabase
      .from("items")
      .update({ placement })
      .eq("id", item.id);
    setBusyId(null);
    if (updateError) {
      toast(`更新失敗:${updateError.message}`);
      return;
    }
    const label = PLACEMENTS.find((p) => p.key === placement)?.label ?? placement;
    toast(`「${item.title.slice(0, 12)}…」顯示位置已改為${label}`);
    refetch();
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
          Content
        </p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
          內容管理
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          items 表即時審核佇列 — 狀態同顯示位置嘅修改會直接寫入 Supabase。
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === t
                ? "bg-lime text-on-accent"
                : "border border-border bg-surface text-text-secondary hover:border-border-strong"
            )}
          >
            {t}
            {t === "情報佇列" && !loading && (
              <span className="ml-1.5 font-mono text-xs">{countOf("pending")}</span>
            )}
          </button>
        ))}
      </div>

      {/* ================= 情報佇列 ================= */}
      {tab === "情報佇列" && (
        <div>
          {/* Status filter */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                  statusFilter === f.key
                    ? "border-lime bg-lime text-on-accent"
                    : "border-border bg-surface text-text-secondary hover:border-border-strong"
                )}
              >
                {f.label}
                <span className="ml-1 font-mono">
                  {f.key === "全部" ? items.length : countOf(f.key)}
                </span>
              </button>
            ))}
          </div>

          <QueryState
            loading={loading}
            error={error ? `載入失敗:${error}` : null}
            retry={refetch}
            empty={
              data && filtered.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border-strong bg-surface px-6 py-14 text-center">
                  <p className="text-sm text-text-muted">
                    {items.length === 0
                      ? "items 表暫時係空 — argro 管道同步嘅情報會即時出現喺呢度。"
                      : `「${STATUS_FILTERS.find((f) => f.key === statusFilter)?.label}」冇情報 — 切換其他狀態睇睇。`}
                  </p>
                </div>
              ) : null
            }
          >
            {data && filtered.length > 0 && (
              <ul className="space-y-2">
                {filtered.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      "rounded-lg border bg-surface p-4 transition-colors",
                      "border-border",
                      item.status === "rejected" && "opacity-60"
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-sm bg-card px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                        {item.category ?? "未分類"}
                      </span>
                      <span
                        className={cn(
                          "rounded-sm px-1.5 py-0.5 text-[11px] font-medium",
                          statusChip(item.status)
                        )}
                      >
                        {STATUS_LABEL[item.status]}
                      </span>
                      {item.placement && item.placement !== "normal" && (
                        <span className="inline-flex items-center gap-1 rounded-sm bg-lime-soft px-1.5 py-0.5 text-[11px] font-medium text-lime-text">
                          <Star className="h-3 w-3 fill-current" />
                          {PLACEMENTS.find((p) => p.key === item.placement)?.label}
                        </span>
                      )}
                      {item.score !== null && (
                        <span className="rounded-sm bg-card px-1.5 py-0.5 font-mono text-[11px] text-text-secondary">
                          評分 {item.score}
                        </span>
                      )}
                      <span className="ml-auto font-mono text-[11px] text-text-muted">
                        {item.sources?.name ?? "未知來源"} ·{" "}
                        {item.published_at
                          ? `發佈 ${formatDate(item.published_at)}`
                          : `抓取 ${timeAgo(item.fetched_at)}`}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-text-primary">
                      {item.original_url ? (
                        <a
                          href={item.original_url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-lime-text hover:underline underline-offset-2"
                        >
                          {item.title}
                        </a>
                      ) : (
                        item.title
                      )}
                    </p>
                    {item.summary && (
                      <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                        {item.summary}
                      </p>
                    )}
                    {/* 顯示位置(真 update) */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-text-muted">顯示位置</span>
                      {PLACEMENTS.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void updatePlacement(item, p.key)}
                          className={cn(
                            "rounded-sm px-2 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-50",
                            (item.placement ?? "normal") === p.key
                              ? p.key === "featured"
                                ? "bg-lime text-on-accent"
                                : "bg-lime-soft text-lime-text"
                              : "border border-border bg-surface text-text-muted hover:border-border-strong hover:text-text-secondary"
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    {item.status !== "published" && item.status !== "rejected" && (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void updateStatus(item, "published")}
                          className="inline-flex items-center gap-1 rounded-md bg-lime px-3 py-1.5 text-xs font-medium text-on-accent hover:bg-lime-hover disabled:opacity-50"
                        >
                          <Check className="h-3 w-3" />
                          發佈
                        </button>
                        {item.status === "pending" && (
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => void updateStatus(item, "reviewed")}
                            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-border-strong disabled:opacity-50"
                          >
                            標記已檢閱
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void updateStatus(item, "rejected")}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-border-strong disabled:opacity-50"
                        >
                          <X className="h-3 w-3" />
                          拒絕
                        </button>
                      </div>
                    )}
                    {item.status === "rejected" && (
                      <div className="mt-3">
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void updateStatus(item, "pending")}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-border-strong disabled:opacity-50"
                        >
                          恢復到待審核
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </div>
      )}

      {/* ================= 專家文章(後端未接 — 誠實 state) ================= */}
      {tab === "專家文章" && (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
          <p className="font-display text-[17px] font-medium text-text-primary">
            專家投稿審核 — 即將推出
          </p>
          <p className="mx-auto mt-2 max-w-[420px] text-xs leading-relaxed text-text-muted">
            專家投稿同文章後台需要 submissions 資料表先可以運作。
            而家 Portal 嘅「我的情報」只存本機草稿(已標明未發佈),
            後端就位之後,投稿會喺呢度出現待審核。
          </p>
        </div>
      )}

      {/* ================= 案例管理(read-only 真站內數據) ================= */}
      {tab === "案例管理" && (
        <div>
          <p className="mb-3 rounded-md border border-border bg-card/60 px-4 py-2.5 text-xs text-text-muted">
            案例而家係站內靜態內容(src/data/cases.ts),同公開 /cases 頁一致。
            精選排序功能需要後端先可以改 — 而家 read-only。
          </p>
          <ul className="space-y-2">
            {cases.map((c) => (
              <li
                key={c.slug}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"
              >
                <span className="rounded-sm bg-card px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                  {c.industry}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {c.title}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-text-muted">
                    /cases/{c.slug}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
