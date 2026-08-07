import { useEffect, useState } from "react";
import { RefreshCw, Settings2, Workflow } from "lucide-react";
import { useAdminToast } from "@/components/admin/AdminToast";
import QueryState from "@/components/QueryState";
import { cn } from "@/lib/utils";
import { supabase, supabaseReady } from "@/lib/supabase";
import { useArgroHealth } from "@/lib/argroHealth";
import { countRows, useAdminQuery } from "@/components/admin/adminData";
import { PRODUCTION_INTEGRATIONS } from "@/components/admin/adminModules";

/** Supabase 連線測試 — head-count 一次 items,驗證 anon key + RLS 生效 */
async function pingSupabase(): Promise<{ ok: boolean; detail: string }> {
  if (!supabase) return { ok: false, detail: "未設定 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY" };
  try {
    const n = await countRows("items");
    return { ok: true, detail: `已連接 · items 表可讀(${n} 行)` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

/** 各表即時行數 — admin 權限下全表可讀 */
const TABLES = [
  { table: "items", label: "情報 items" },
  { table: "sources", label: "來源 sources" },
  { table: "profiles", label: "會員 profiles" },
  { table: "conversations", label: "對話 conversations" },
  { table: "messages", label: "訊息 messages" },
  { table: "waitlist", label: "名單 waitlist" },
  { table: "leads", label: "線索 leads" },
] as const;

async function fetchTableCounts(): Promise<{ label: string; count: number }[]> {
  const counts = await Promise.all(
    TABLES.map(async (t) => ({
      label: t.label,
      count: await countRows(t.table),
    }))
  );
  return counts;
}

export default function AdminSettings() {
  const toast = useAdminToast();
  const argro = useArgroHealth();
  const {
    data: counts,
    loading: countsLoading,
    error: countsError,
    refetch: refetchCounts,
  } = useAdminQuery(fetchTableCounts);

  const [ping, setPing] = useState<{ ok: boolean; detail: string } | null>(null);
  const [pingLoading, setPingLoading] = useState(true);

  const runPing = () => {
    setPingLoading(true);
    pingSupabase().then((r) => {
      setPing(r);
      setPingLoading(false);
    });
  };
  useEffect(() => {
    let cancelled = false;
    void pingSupabase().then((result) => {
      if (cancelled) return;
      setPing(result);
      setPingLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const llmOk = argro.data?.llm.configured ?? false;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
            Settings
          </p>
          <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
            系統設定
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            真實連線狀態同資料表概覽 — 冇任何示範 quota 數字。
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            runPing();
            argro.refresh();
            refetchCounts();
            toast("已重新檢查所有連線");
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-strong"
        >
          <RefreshCw className="h-4 w-4" />
          重新檢查
        </button>
      </div>

      {/* 連線狀態 */}
      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="font-display text-[17px] font-medium text-text-primary">
          連線狀態
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {/* Supabase */}
          <div className="rounded-md border border-border bg-card px-4 py-3.5">
            <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  pingLoading
                    ? "animate-pulse bg-border-strong"
                    : ping?.ok
                      ? "bg-lime"
                      : "bg-[#A63A30]"
                )}
              />
              Supabase
              <span className="ml-auto font-mono text-[11px] text-text-muted">
                {pingLoading ? "檢查中…" : ping?.ok ? "已連接 ✅" : "異常"}
              </span>
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
              {pingLoading
                ? "正在做 head-count 測試查詢…"
                : (ping?.detail ?? "—")}
            </p>
          </div>

          {/* argro API */}
          <div className="rounded-md border border-border bg-card px-4 py-3.5">
            <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  argro.loading && !argro.data
                    ? "animate-pulse bg-border-strong"
                    : argro.data
                      ? "bg-lime"
                      : "bg-[#A63A30]"
                )}
              />
              argro 情報管道
              <span className="ml-auto font-mono text-[11px] text-text-muted">
                {argro.loading && !argro.data
                  ? "檢查中…"
                  : argro.data
                    ? "online ✅"
                    : "離線"}
              </span>
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
              {argro.data
                ? `LLM ${llmOk ? "已連接" : "未連接"} · 今日 articles ${argro.data.articles.today} · 來源 ${argro.data.sources.filter((s) => s.is_active).length} 個啟用`
                : argro.error
                  ? `連唔到 argro-api.zeabur.app/meta/health — ${argro.error}`
                  : "檢查中…"}
            </p>
          </div>
        </div>

        <dl className="mt-4 divide-y divide-border rounded-md border border-border bg-card/50">
          <div className="flex items-center justify-between px-4 py-2.5">
            <dt className="text-xs text-text-muted">Supabase URL</dt>
            <dd className="font-mono text-xs text-text-primary">
              {supabaseReady
                ? "mxjgavuzzpcvazxdnuzg.supabase.co"
                : "未設定(env 缺失)"}
            </dd>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <dt className="text-xs text-text-muted">資料庫 schema</dt>
            <dd className="font-mono text-xs text-text-primary">
              supabase/schema.sql(v1.15+)
            </dd>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <dt className="text-xs text-text-muted">訪問層</dt>
            <dd className="font-mono text-xs text-text-primary">
              anon key + RLS(admin 以 is_admin() 放寬讀取)
            </dd>
          </div>
        </dl>
      </section>

      {/* 資料表即時行數 */}
      <section className="mt-5 rounded-lg border border-border bg-surface p-5">
        <h2 className="font-display text-[17px] font-medium text-text-primary">
          資料表概覽
        </h2>
        <p className="mt-1 text-xs text-text-muted">
          每張表嘅真實行數(即時 head-count)。
        </p>
        <QueryState
          loading={countsLoading}
          error={countsError ? `載入失敗:${countsError}` : null}
          retry={refetchCounts}
          skeletonRows={2}
        >
          {counts && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {counts.map((c) => (
                <div
                  key={c.label}
                  className="rounded-md border border-border bg-card px-4 py-3"
                >
                  <p className="font-mono text-[20px] font-medium text-text-primary">
                    {c.count.toLocaleString("en-US")}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">{c.label}</p>
                </div>
              ))}
            </div>
          )}
        </QueryState>
      </section>

      {/* 整合路線圖(誠實狀態,唔係假數據) */}
      <section className="mt-5 rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-lime-text" />
          <h2 className="font-display text-[17px] font-medium text-text-primary">
            整合進度
          </h2>
        </div>
        <ul className="mt-4 space-y-2.5 text-sm">
          {PRODUCTION_INTEGRATIONS.map((row) => {
            const live = row.status === "live";
            const statusLabel = {
              live: "Live",
              beta: "Beta",
              blocked: "Blocked",
              planned: "Planned",
            }[row.status];
            return (
            <li key={row.label} className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full border",
                  live
                    ? "border-lime bg-lime-soft text-lime-text"
                    : "border-border-strong text-transparent"
                )}
              >
                <Settings2 className="h-2.5 w-2.5" />
              </span>
              <span
                className={cn(
                  live ? "text-text-primary" : "text-text-muted"
                )}
              >
                {row.label}
              </span>
              <span className="ml-auto font-mono text-[11px] text-text-muted">
                {statusLabel}
              </span>
            </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
