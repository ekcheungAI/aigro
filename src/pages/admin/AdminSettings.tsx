import { useState } from "react";
import { RefreshCw } from "lucide-react";
import AdminToggle from "@/components/admin/AdminToggle";
import { useAdminToast } from "@/components/admin/AdminToast";
import { cn } from "@/lib/utils";
import { aihotSources, mcpVerticals } from "@/data/admin-mock";

export default function AdminSettings() {
  const toast = useAdminToast();

  const [verticals, setVerticals] = useState(mcpVerticals);
  const [unlimitedQuota, setUnlimitedQuota] = useState(true);
  const [quota, setQuota] = useState("6551");
  const [refreshing, setRefreshing] = useState(false);

  const toggleVertical = (key: string) => {
    setVerticals((list) =>
      list.map((v) => (v.key === key ? { ...v, enabled: !v.enabled } : v))
    );
    const v = verticals.find((x) => x.key === key);
    if (v) {
      toast(
        v.enabled
          ? `已關閉 ${v.label} MCP server(mock)— 優先名單 ${v.waitlist} 人不受影響`
          : `已開放 ${v.label} MCP server(mock)— 將通知 ${v.waitlist} 位優先名單會員`
      );
    }
  };

  const refreshSources = () => {
    setRefreshing(true);
    window.setTimeout(() => {
      setRefreshing(false);
      toast("AIHOT 來源已重新整理 — 新增 3 條情報進入審核佇列(mock)");
    }, 900);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
          Settings
        </p>
        <h1 className="mt-1 font-display text-[28px] font-medium text-text-primary">
          設定
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          MCP 開放、免費額度與情報來源狀態。
        </p>
      </div>

      <div className="space-y-4">
        {/* ---- MCP 開關 ---- */}
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-[17px] font-medium text-text-primary">
            MCP 開關(按行業)
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            開放後,該行業情報 MCP server 對外提供 items / daily / hot-topics 端點。
          </p>
          <ul className="mt-4 divide-y divide-border">
            {verticals.map((v) => (
              <li key={v.key} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    {v.label} 行業情報 MCP
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-text-muted">
                    mcp.aigro.hk/{v.key} · 優先名單 {v.waitlist} 人
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-sm px-2 py-0.5 font-mono text-[11px] font-medium",
                    v.enabled ? "bg-lime-soft text-lime-text" : "bg-card text-text-muted"
                  )}
                >
                  {v.enabled ? "開放中" : "未開放"}
                </span>
                <AdminToggle
                  checked={v.enabled}
                  onChange={() => toggleVertical(v.key)}
                  label={`${v.label} MCP 開關`}
                />
              </li>
            ))}
          </ul>
        </section>

        {/* ---- 免費額度 ---- */}
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-[17px] font-medium text-text-primary">
            免費額度設定
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            免費會員每日 AI 對話 tokens 額度。
          </p>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-md border border-lime/50 bg-lime-soft px-4 py-3">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  無限 · 限時開放
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  推廣期內免費會員對話不設上限
                </p>
              </div>
              <AdminToggle
                checked={unlimitedQuota}
                onChange={(v) => {
                  setUnlimitedQuota(v);
                  toast(v ? "已開啟無限額度(限時開放)" : "已恢復每日額度限制");
                }}
                label="無限額度限時開放"
              />
            </div>
            <label className="block max-w-xs">
              <span className="mb-1 block text-xs text-text-muted">
                每日額度(tokens)
              </span>
              <input
                type="number"
                value={quota}
                onChange={(e) => setQuota(e.target.value)}
                disabled={unlimitedQuota}
                className={cn(
                  "w-full rounded-md border bg-surface px-3 py-2 font-mono text-sm focus:outline-none",
                  unlimitedQuota
                    ? "cursor-not-allowed border-border text-text-muted opacity-50"
                    : "border-border-strong text-text-primary focus:border-lime"
                )}
              />
              <span className="mt-1 block text-[11px] text-text-muted">
                {unlimitedQuota
                  ? "無限開放期間暫停使用 — 關閉上方開關即可編輯。"
                  : `目前設定:${Number(quota).toLocaleString("en-US")} tokens/日`}
              </span>
            </label>
          </div>
        </section>

        {/* ---- AIHOT 來源狀態 ---- */}
        <section className="rounded-lg border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-[17px] font-medium text-text-primary">
                AIHOT 情報來源
              </h2>
              <p className="mt-1 text-xs text-text-muted">
                抓取狀態與最近更新 — 異常來源會自動暫停。
              </p>
            </div>
            <button
              type="button"
              onClick={refreshSources}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-md bg-lime px-4 py-2 text-sm font-medium text-on-accent hover:bg-lime-hover disabled:cursor-wait disabled:opacity-50"
            >
              <RefreshCw
                className={cn("h-4 w-4", refreshing && "animate-spin")}
              />
              重新整理
            </button>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {aihotSources.map((s) => (
              <li key={s.name} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    s.ok ? "bg-lime" : "bg-[#A63A30]"
                  )}
                  aria-label={s.ok ? "正常" : "異常"}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">{s.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-text-muted">
                    {s.endpoint}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs text-text-secondary">
                    {s.items} 條
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-text-muted">
                    {s.lastFetch}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-sm px-2 py-0.5 text-[11px] font-medium",
                    s.ok ? "bg-lime-soft text-lime-text" : "bg-card text-[#A63A30]"
                  )}
                >
                  {s.ok ? "正常" : "異常"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
