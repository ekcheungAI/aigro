import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  WifiOff,
} from "lucide-react";
import AdminSlideOver from "@/components/admin/AdminSlideOver";
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
import {
  argroStatusDot,
  argroStatusLabel,
  relativeFetchTime,
  useArgroHealth,
} from "@/lib/argroHealth";
import type { ArgroSourceStatus } from "@/lib/argroHealth";
import { supabase } from "@/lib/supabase";
import {
  formatDate,
  timeAgo,
  useAdminQuery,
} from "@/components/admin/adminData";
import type { AdminItemRow, AdminSourceRow } from "@/components/admin/adminData";

const FIELD =
  "w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-lime focus:outline-none";

export const SOURCE_CATALOGUE_NOTICE =
  "呢度嘅新增、啟用同暫停只會更新 Supabase 目錄，唔會改動 Argro runtime。";
export const SOURCE_CREATE_RESULT =
  "已加入來源目錄；尚未接入 Argro 抓取管道";

const SOURCE_TYPES: { key: AdminSourceRow["type"]; label: string }[] = [
  { key: "rss", label: "RSS" },
  { key: "api", label: "API" },
  { key: "scraper", label: "Scraper" },
];

const STATUS_FILTERS = ["全部", "active", "paused", "pending", "error"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const SOURCE_STATUS_LABEL: Record<string, string> = {
  active: "目錄啟用",
  paused: "目錄暫停",
  pending: "待接入",
  error: "異常",
};

function sourceStatusDot(status: AdminSourceRow["status"]) {
  if (status === "active") return "bg-lime";
  if (status === "error") return "bg-error";
  if (status === "pending") return "bg-warning";
  return "bg-border-strong";
}

function healthDot(source: AdminSourceRow) {
  if (!source.last_fetched_at) return "bg-border-strong";
  if (source.health === "ok") return "bg-lime";
  if (source.health === "warn") return "bg-warning";
  if (source.health === "down") return "bg-error";
  return "bg-border-strong";
}

function healthLabel(source: AdminSourceRow) {
  if (!source.last_fetched_at) return "未驗證";
  if (source.health === "ok") return "正常";
  if (source.health === "warn") return "注意";
  if (source.health === "down") return "中斷";
  return "未有數據";
}

/* ---------------- 真查詢:sources 表 ---------------- */

async function fetchSources(): Promise<AdminSourceRow[]> {
  if (!supabase) throw new Error("Supabase 未連接 — 請檢查環境變數。");
  const { data, error } = await supabase
    .from("sources")
    .select(
      "id,name,type,domain,endpoint,vertical,lang,weight,fetch_interval_minutes,status,last_fetched_at,health,created_at"
    )
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminSourceRow[];
}

/** 某來源最近嘅 items(詳情 drawer 用) */
async function fetchSourceItems(sourceId: string): Promise<AdminItemRow[]> {
  if (!supabase) throw new Error("Supabase 未連接");
  const { data, error } = await supabase
    .from("items")
    .select(
      "id,title,summary,original_url,category,score,lang,status,placement,published_at,fetched_at,source_id"
    )
    .eq("source_id", sourceId)
    .order("fetched_at", { ascending: false })
    .limit(6);
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminItemRow[];
}

/** 來源詳情 drawer 嘅最近 items(read-only 小列表) */
function SourceRecentItems({ sourceId }: { sourceId: string }) {
  const { data, loading, error } = useAdminQuery(
    () => fetchSourceItems(sourceId),
    [sourceId]
  );
  if (loading) {
    return <p className="text-xs text-text-muted">載入中…</p>;
  }
  if (error) {
    return <p className="text-xs text-error">載入失敗：{error}</p>;
  }
  if (!data || data.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-3 py-4 text-xs text-text-muted">
        呢個來源暫時未有情報入庫。
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {data.map((it) => (
        <li
          key={it.id}
          className="rounded-md border border-border bg-card px-3 py-2.5"
        >
          <p className="text-sm leading-snug text-text-primary">{it.title}</p>
          <p className="mt-1 font-mono text-[10px] text-text-muted">
            {it.category ?? "未分類"} · {it.status} · {timeAgo(it.fetched_at)}
          </p>
        </li>
      ))}
    </ul>
  );
}

const STATUS_RANK: Record<ArgroSourceStatus, number> = {
  down: 0,
  warn: 1,
  paused: 2,
  ok: 3,
};

function fmtClock(d: Date) {
  return d.toLocaleTimeString("zh-HK", { hour12: false });
}

/** live KPI 卡 — value 高度固定(字型大細不變),auto-refresh 唔會 layout shift。 */
function LiveKpi({
  label,
  value,
  sub,
  dot,
}: {
  label: string;
  value: string;
  sub: ReactNode;
  dot?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="flex items-center gap-1.5 text-xs text-text-muted">
        {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />}
        {label}
      </p>
      <p className="mt-2 font-mono text-[26px] font-medium leading-none text-text-primary">
        {value}
      </p>
      <p className="mt-2 text-[11px] text-text-secondary">{sub}</p>
    </div>
  );
}

/** 蒸餾進度 hairline bar(no gradient,純 lime on card)。 */
function EnrichmentBar({
  label,
  done,
  total,
}: {
  label: string;
  done: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className="font-mono text-[11px] text-text-muted">
          {done.toLocaleString("en-US")} / {total.toLocaleString("en-US")} ·{" "}
          {pct}%
        </span>
      </div>
      <div className="mt-1.5 h-1 w-full rounded-full bg-card">
        <div
          className="h-1 rounded-full bg-lime transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * 管線健康 Pipeline Health — argro-api /meta/health 實時數據,30s 自動更新。
 * fetch 失敗 → 離線模式卡 + 下面嘅靜態來源表繼續做 fallback;
 * 有舊數據時失敗 → amber 提示 + 繼續顯示上次成功數據。
 */
function PipelineHealthSection({ catalogSources }: { catalogSources: AdminSourceRow[] }) {
  const { data, error, loading, lastUpdated, refresh } = useArgroHealth();

  const a = data?.articles ?? null;
  const llm = data?.llm ?? null;
  const offline = data === null && error !== null;
  const stale = data !== null && error !== null;
  const backlog = a ? a.unclassified + a.untranslated_zh_tw : null;
  const healthBadge = offline
    ? { label: "Offline · 30s 重試", className: "bg-card text-error", dot: "bg-error" }
    : stale
      ? { label: "Stale · 等待重試", className: "bg-card text-warning", dot: "bg-warning" }
      : data
        ? { label: "Live · 30s 更新", className: "bg-lime-soft text-lime-text", dot: "bg-lime" }
        : { label: "Checking · 連線中", className: "bg-card text-text-muted", dot: "bg-border-strong" };

  const sortedSources = useMemo(
    () =>
      (data?.sources ?? [])
        .slice()
        .sort(
          (x, y) =>
            STATUS_RANK[x.status] - STATUS_RANK[y.status] ||
            y.items_today - x.items_today
        ),
    [data]
  );
  const countMismatch = data !== null && sortedSources.length !== catalogSources.length;

  return (
    <section className="mb-8">
      {/* header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-[17px] font-medium text-text-primary">
            管線健康 Pipeline Health
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            argro-api /meta/health 實時管線狀態 — 抓取、蒸餾、LLM 一覽。
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[11px] font-medium",
              healthBadge.className
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                healthBadge.dot
              )}
            />
            {healthBadge.label}
          </span>
          {lastUpdated && (
            <span className="font-mono text-[11px] text-text-muted">
              更新於 {fmtClock(lastUpdated)}
            </span>
          )}
          <button
            type="button"
            onClick={refresh}
            aria-label="立即更新管線健康"
            className="rounded-md border border-border p-1.5 text-text-muted transition-colors hover:border-border-strong hover:text-text-primary"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {data && (
        <div className={cn(
          "mb-3 rounded-md border px-3 py-2 text-xs",
          countMismatch
            ? "border-warning/40 bg-card text-warning"
            : "border-border bg-surface text-text-muted"
        )}>
          <span className="font-medium text-text-primary">來源口徑：</span>{" "}
          Argro runtime health 回傳 {sortedSources.length} 個；Supabase 管理目錄有 {catalogSources.length} 個。
          {countMismatch
            ? " 兩邊係獨立資料面，數量未同步；請勿將其中一個當成另一邊嘅總數。"
            : " 兩邊目前數量一致。"}
        </div>
      )}

      {/* stale 提示:有舊數據但最近一次更新失敗 */}
      {stale && lastUpdated && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-warning/40 bg-card px-3 py-2">
          <p className="text-xs text-warning">
            最近一次更新失敗 — 顯示 {fmtClock(lastUpdated)} 嘅數據,30
            秒後自動重試。
          </p>
          <button
            type="button"
            onClick={refresh}
            className="font-mono text-[11px] font-medium text-text-secondary underline-offset-2 hover:underline"
          >
            立即重試
          </button>
        </div>
      )}

      {/* KPI row(live)— loading 時顯示「—」,高度不變 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <LiveKpi
          label="今日新增 articles"
          value={a ? a.today.toLocaleString("en-US") : "—"}
          sub="argro-mcp 抓取入庫"
        />
        <LiveKpi
          label="本週新增"
          value={a ? a.week.toLocaleString("en-US") : "—"}
          sub="過去 7 日"
        />
        <LiveKpi
          label="總庫存"
          value={a ? a.total.toLocaleString("en-US") : "—"}
          sub={
            data ? `最後抓取 ${relativeFetchTime(data.last_fetch)}` : "等待連線"
          }
        />
        <LiveKpi
          label="蒸餾待辦"
          value={backlog !== null ? backlog.toLocaleString("en-US") : "—"}
          sub={
            a
              ? `未分類 ${a.unclassified} · 未翻譯 ${a.untranslated_zh_tw}`
              : "分類 + 翻譯 queue"
          }
        />
        <LiveKpi
          label="LLM 狀態"
          value={llm ? (llm.configured ? "已連接" : "未連接") : "—"}
          sub={
            llm ? (
              <span className="font-mono">DeepSeek · {llm.model}</span>
            ) : (
              "等待連線"
            )
          }
          dot={
            llm
              ? llm.configured
                ? "bg-lime"
                : "bg-error"
              : "bg-border-strong"
          }
        />
      </div>

      {offline ? (
        /* 離線模式:連唔到 argro-api — 保留上一份數據,來源管理(下面)讀 Supabase sources 表 */
        <div className="mt-3 rounded-lg border border-error/40 bg-surface p-5">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-error" strokeWidth={1.5} />
            <p className="text-sm font-medium text-text-primary">
              管線暫時連唔到 argro-api — 顯示離線模式
            </p>
          </div>
          <p className="mt-1.5 text-xs text-text-muted">
            Argro live 數據暫時不可用，每 30 秒自動重試。下面嘅來源目錄係另一套
            Supabase 資料；如果 Supabase 亦未連接，目錄操作會保持停用並顯示錯誤。
            <span className="ml-1 font-mono text-[11px]">({error})</span>
          </p>
          <button
            type="button"
            onClick={refresh}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-lime hover:text-text-primary"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            立即重試
          </button>
        </div>
      ) : (
        <>
          {/* 蒸餾進度 — DeepSeek 消化 queue 即視感 */}
          <div className="mt-3 rounded-lg border border-border bg-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-medium text-text-primary">
                蒸餾進度 Enrichment
              </h3>
              <span className="font-mono text-[11px] text-text-muted">
                DeepSeek 正在消化 queue · 每 30s 更新
              </span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <EnrichmentBar
                label="已分類"
                done={a ? a.total - a.unclassified : 0}
                total={a ? a.total : 0}
              />
              <EnrichmentBar
                label="已翻譯(繁中)"
                done={a ? a.total - a.untranslated_zh_tw : 0}
                total={a ? a.total : 0}
              />
            </div>
          </div>

          {/* 來源健康表(live) */}
          <div className="mt-3 rounded-lg border border-border bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
              <h3 className="text-sm font-medium text-text-primary">
                來源健康
                <span className="ml-2 font-mono text-[11px] font-normal text-text-muted">
                  {sortedSources.length} 個來源 · 按狀態排序
                </span>
              </h3>
              <span className="inline-flex items-center gap-1.5 rounded-sm bg-lime-soft px-2 py-0.5 font-mono text-[11px] font-medium text-lime-text">
                <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                Live · 30s 更新
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left font-mono text-[11px] uppercase tracking-wider text-text-muted">
                    <th className="px-5 py-2.5 font-medium">來源</th>
                    <th className="px-3 py-2.5 font-medium">類型</th>
                    <th className="px-3 py-2.5 font-medium">狀態</th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      今日 items
                    </th>
                    <th className="px-5 py-2.5 text-right font-medium">
                      最後抓取
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading && data === null
                    ? /* 首次載入骨架 — reserve 行高,避免 layout shift */
                      [0, 1, 2, 3, 4].map((i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-5 py-3">
                            <div className="h-3.5 w-32 rounded-sm bg-card" />
                            <div className="mt-1.5 h-2.5 w-20 rounded-sm bg-card" />
                          </td>
                          <td className="px-3 py-3">
                            <div className="h-4 w-10 rounded-sm bg-card" />
                          </td>
                          <td className="px-3 py-3">
                            <div className="h-3.5 w-14 rounded-sm bg-card" />
                          </td>
                          <td className="px-3 py-3">
                            <div className="ml-auto h-3.5 w-8 rounded-sm bg-card" />
                          </td>
                          <td className="px-5 py-3">
                            <div className="ml-auto h-3.5 w-16 rounded-sm bg-card" />
                          </td>
                        </tr>
                      ))
                    : sortedSources.length > 0 ? sortedSources.map((s) => (
                        <tr
                          key={s.id}
                          className="transition-colors hover:bg-card"
                        >
                          <td className="px-5 py-3">
                            <p className="font-medium text-text-primary">
                              {s.name}
                            </p>
                            <p className="mt-0.5 font-mono text-[11px] text-text-muted">
                              {s.lang.toUpperCase()}
                              {s.is_active ? "" : " · 已停用"}
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            <span className="rounded-sm bg-card px-2 py-0.5 font-mono text-[11px] font-medium uppercase text-text-secondary">
                              {s.type}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-full",
                                  argroStatusDot(s.status)
                                )}
                                aria-label={argroStatusLabel(s.status)}
                              />
                              <span className="text-xs text-text-secondary">
                                {argroStatusLabel(s.status)}
                              </span>
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-xs text-text-primary">
                            {s.items_today}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-[11px] text-text-muted">
                            {relativeFetchTime(s.last_fetch)}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-xs text-text-muted">
                            Argro health API 已連線，但未返回逐來源健康資料。
                          </td>
                        </tr>
                      )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}


export default function AdminSources() {
  const toast = useAdminToast();
  const { data, loading, error, refetch } = useAdminQuery(fetchSources);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("全部");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminSourceRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "rss" as AdminSourceRow["type"],
    endpoint: "",
    vertical: "AI",
    lang: "zh",
  });

  const list = useMemo(() => data ?? [], [data]);
  const active = list.find((s) => s.id === openId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((s) => {
      if (statusFilter !== "全部" && s.status !== statusFilter) return false;
      if (
        q &&
        !s.name.toLowerCase().includes(q) &&
        !(s.domain ?? "").toLowerCase().includes(q) &&
        !(s.vertical ?? "").toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [list, query, statusFilter]);

  const activeCount = list.filter((s) => s.status === "active").length;

  /** 只切換 Supabase catalogue 狀態，不控制 Argro runtime */
  const toggleSource = async (s: AdminSourceRow) => {
    if (!supabase || busyId) return;
    const next = s.status === "active" ? "paused" : "active";
    setBusyId(s.id);
    const { error: updateError } = await supabase
      .from("sources")
      .update({ status: next })
      .eq("id", s.id);
    setBusyId(null);
    if (updateError) {
      toast(`更新失敗:${updateError.message}`);
      return;
    }
    toast(`「${s.name}」目錄狀態已${next === "active" ? "啟用" : "暫停"}；Argro 抓取設定未變`);
    refetch();
  };

  /** 刪除來源 — 真 delete(只限未產出/確認操作) */
  const deleteSource = async (s: AdminSourceRow) => {
    if (!supabase || busyId) return;
    setBusyId(s.id);
    const { error: deleteError } = await supabase
      .from("sources")
      .delete()
      .eq("id", s.id);
    setBusyId(null);
    if (deleteError) {
      toast(`刪除失敗:${deleteError.message}`);
      return;
    }
    toast(`已刪除「${s.name}」`);
    setDeleteTarget(null);
    setOpenId(null);
    refetch();
  };

  /** 新增來源到 Supabase catalogue；不代表 Argro runtime 已接入 */
  const createSource = async () => {
    if (!supabase || creating) return;
    if (!form.name.trim() || !form.endpoint.trim()) {
      toast("請填寫來源名稱同 URL / endpoint");
      return;
    }
    setCreating(true);
    let domain = "";
    try {
      domain = new URL(form.endpoint.trim()).hostname;
    } catch {
      domain = "";
    }
    const { error: insertError } = await supabase.from("sources").insert({
      name: form.name.trim(),
      type: form.type,
      endpoint: form.endpoint.trim(),
      domain: domain || null,
      vertical: form.vertical.trim() || null,
      lang: form.lang,
      status: "pending",
    });
    setCreating(false);
    if (insertError) {
      toast(`新增失敗:${insertError.message}`);
      return;
    }
    toast(`已新增「${form.name.trim()}」：${SOURCE_CREATE_RESULT}`);
    setCreateOpen(false);
    setForm({ name: "", type: "rss", endpoint: "", vertical: "AI", lang: "zh" });
    refetch();
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
            Sources
          </p>
          <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
            來源與管道
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Supabase 來源目錄與接入狀態；Argro 抓取管道需要另行設定。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover"
        >
          <Plus className="h-4 w-4" />
          新增來源
        </button>
      </div>

      {/* ============ 管線健康(live,argro-api /meta/health) ============ */}
      <PipelineHealthSection catalogSources={list} />

      {/* ============ 來源管理(sources 表真數據) ============ */}
      <section className="mt-8">
        <div className="mb-4 rounded-md border border-warning/40 bg-warning/10 px-4 py-3">
          <p className="text-sm font-medium text-text-primary">來源目錄與抓取管道係兩套獨立設定</p>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            {SOURCE_CATALOGUE_NOTICE}
            請以上方「管線健康」確認真正嘅抓取狀態。
          </p>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="font-display text-[17px] font-medium text-text-primary">
            來源管理
          </h2>
          <span className="font-mono text-xs text-text-muted">
            {activeCount} / {list.length} 目錄啟用
          </span>
          <div className="relative ml-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋來源…"
              className="w-52 rounded-md border border-border-strong bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-lime focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  statusFilter === f
                    ? "border-lime bg-lime text-on-accent"
                    : "border-border bg-surface text-text-secondary hover:border-border-strong"
                )}
              >
                {f === "全部" ? "全部" : SOURCE_STATUS_LABEL[f]}
              </button>
            ))}
          </div>
        </div>

        <QueryState
          loading={loading}
          error={error ? `載入失敗:${error}` : null}
          retry={refetch}
          empty={
            data && data.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border-strong bg-surface px-6 py-14 text-center">
                <p className="text-sm text-text-muted">
                  sources 表暫時係空 — 用右上角「新增來源」登記第一個候選來源。
                </p>
              </div>
            ) : null
          }
        >
          {data && filtered.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-text-muted">
                    <th className="px-4 py-3 font-medium">來源</th>
                    <th className="px-4 py-3 font-medium">類型</th>
                    <th className="px-4 py-3 font-medium">領域</th>
                    <th className="px-4 py-3 font-medium">健康</th>
                    <th className="px-4 py-3 font-medium">上次抓取</th>
                    <th className="px-4 py-3 font-medium">狀態</th>
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => setOpenId(s.id)}
                      className="cursor-pointer transition-colors hover:bg-card/60"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary">{s.name}</p>
                        <p className="mt-0.5 max-w-[220px] truncate font-mono text-[11px] text-text-muted">
                          {s.domain ?? s.endpoint ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-sm bg-card px-1.5 py-0.5 font-mono text-[11px] uppercase text-text-secondary">
                          {s.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {s.vertical ?? "—"}
                        <span className="ml-1.5 font-mono text-[10px] text-text-muted">
                          {s.lang ?? ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                          <span
                            className={cn("h-1.5 w-1.5 rounded-full", healthDot(s))}
                          />
                          {healthLabel(s)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-muted">
                        {relativeFetchTime(s.last_fetched_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-text-primary">
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              sourceStatusDot(s.status)
                            )}
                          />
                          {SOURCE_STATUS_LABEL[s.status ?? ""] ?? s.status ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div
                          className="inline-flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={busyId === s.id}
                            onClick={() => void toggleSource(s)}
                            aria-label={s.status === "active" ? "暫停目錄來源" : "啟用目錄來源"}
                            className="rounded-md border border-border p-1.5 text-text-muted transition-colors hover:border-lime hover:text-lime-text disabled:opacity-50"
                          >
                            {s.status === "active" ? (
                              <Pause className="h-3.5 w-3.5" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === s.id}
                            onClick={() => setDeleteTarget(s)}
                            aria-label="刪除來源"
                            className="press rounded-md border border-border p-1.5 text-text-muted transition-colors hover:border-error hover:text-error disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-text-muted">
                        找不到符合嘅來源。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </QueryState>
      </section>

      {/* ============ MCP 端點(後端未接 — 誠實 state) ============ */}
      <section className="mt-8">
        <h2 className="font-display text-[17px] font-medium text-text-primary">
          MCP 輸出端點
        </h2>
        <div className="mt-3 rounded-lg border border-dashed border-border-strong bg-surface px-6 py-10 text-center">
          <p className="text-sm font-medium text-text-primary">
            MCP server 輸出 — 即將推出
          </p>
          <p className="mx-auto mt-1.5 max-w-[420px] text-xs leading-relaxed text-text-muted">
            MCP 端點同實例管理需要 mcp-server 部署同 quota 後端先可以運作。
            而家唔會顯示任何虛構嘅實例或呼叫量。
          </p>
        </div>
      </section>

      {/* ============ 來源詳情 drawer ============ */}
      <AdminSlideOver
        open={active !== null}
        onClose={() => setOpenId(null)}
        title={active?.name ?? ""}
        subtitle={
          active
            ? `${SOURCE_STATUS_LABEL[active.status ?? ""] ?? "—"} · ${active.type.toUpperCase()} · ${active.vertical ?? "未分領域"}`
            : ""
        }
      >
        {active && (
          <div className="flex-1 space-y-6 px-6 py-5">
            <dl className="divide-y divide-border rounded-lg border border-border bg-surface">
              {[
                ["Endpoint", active.endpoint ?? "—"],
                ["Domain", active.domain ?? "—"],
                ["語言", active.lang ?? "—"],
                ["權重", String(active.weight ?? 0)],
                ["抓取間隔", `${active.fetch_interval_minutes ?? 0} 分鐘`],
                ["上次抓取", active.last_fetched_at ? `${relativeFetchTime(active.last_fetched_at)}(${formatDate(active.last_fetched_at)})` : "未抓取"],
                ["建立日期", formatDate(active.created_at)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <dt className="text-xs text-text-muted">{k}</dt>
                  <dd className="max-w-[65%] truncate text-right font-mono text-xs text-text-primary">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>

            <div>
              <p className="mb-2 text-xs text-text-muted">
                最近入庫情報(items 表,source_id 過濾)
              </p>
              <SourceRecentItems sourceId={active.id} />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={busyId === active.id}
                onClick={() => void toggleSource(active)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover disabled:opacity-50"
              >
                {active.status === "active" ? (
                  <>
                    <Pause className="h-4 w-4" />
                    暫停目錄
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    啟用目錄
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={busyId === active.id}
                onClick={() => {
                  setOpenId(null);
                  setDeleteTarget(active);
                }}
                className="press inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-error hover:text-error disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                刪除
              </button>
            </div>
          </div>
        )}
      </AdminSlideOver>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-medium text-text-primary">
              刪除「{deleteTarget?.name}」？
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed text-text-secondary">
              此操作無法復原。既有情報會保留，但 source_id 會被解除；Argro runtime 入面嘅來源設定唔會自動刪除，需要另外同步。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="press">取消</AlertDialogCancel>
            <AlertDialogAction
              className="press bg-error text-destructive-foreground hover:bg-error/90"
              onClick={() => deleteTarget && void deleteSource(deleteTarget)}
            >
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============ 新增來源 drawer ============ */}
      <AdminSlideOver
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="新增來源"
        subtitle="只會加入 Supabase 來源目錄；不會自動啟動 Argro 抓取"
        width={480}
      >
        <div className="flex h-full flex-col">
          <div className="flex-1 space-y-5 px-6 py-5">
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">
                來源名稱 <span className="text-lime-text">*</span>
              </span>
              <input
                className={FIELD}
                placeholder="例:MIT Technology Review"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <div>
              <span className="mb-1 block text-xs text-text-muted">抓取類型</span>
              <div className="flex gap-1.5">
                {SOURCE_TYPES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: t.key }))}
                    className={cn(
                      "rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors",
                      form.type === t.key
                        ? "bg-lime text-on-accent"
                        : "border border-border bg-surface text-text-secondary hover:border-border-strong"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">
                URL / Endpoint <span className="text-lime-text">*</span>
              </span>
              <input
                className={cn(FIELD, "font-mono")}
                placeholder="https://example.com/feed.xml"
                value={form.endpoint}
                onChange={(e) => setForm((f) => ({ ...f, endpoint: e.target.value }))}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs text-text-muted">領域</span>
                <input
                  className={FIELD}
                  placeholder="AI"
                  value={form.vertical}
                  onChange={(e) => setForm((f) => ({ ...f, vertical: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-text-muted">語言</span>
                <input
                  className={cn(FIELD, "font-mono")}
                  placeholder="zh / en / ja"
                  value={form.lang}
                  onChange={(e) => setForm((f) => ({ ...f, lang: e.target.value }))}
                />
              </label>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-md border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-strong"
            >
              取消
            </button>
            <button
              type="button"
              disabled={creating}
              onClick={() => void createSource()}
              className="inline-flex items-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              新增來源
            </button>
          </div>
        </div>
      </AdminSlideOver>
    </div>
  );
}
