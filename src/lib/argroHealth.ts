/**
 * AIGRO 管線健康 live feed — argro-mcp `/meta/health`。
 *
 * Admin「管線健康」同 Dashboard 快速卡共用呢個 hook:
 * 30s setInterval 自動更新 + unmount cleanup,fetch 失敗保留上一份數據
 * 並帶 error state,UI 可以落離線 fallback,唔會閃爍 / layout shift。
 *
 * 資料來源:GET https://argro-api.zeabur.app/meta/health(CORS 已開)。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const ENDPOINT = "/api/argro-health";

/** 自動更新間隔(30 秒) */
export const ARGRO_HEALTH_REFRESH_MS = 30_000;

/* ---------------- 型別(對應 /meta/health response) ---------------- */

export interface ArgroHealthLlm {
  configured: boolean;
  base_url: string;
  model: string;
}

export interface ArgroHealthArticles {
  total: number;
  today: number;
  week: number;
  unclassified: number;
  untranslated_zh_tw: number;
}

export type ArgroSourceStatus = "ok" | "warn" | "down" | "paused";

export interface ArgroHealthSource {
  id: string;
  name: string;
  type: string;
  lang: string;
  is_active: boolean;
  status: ArgroSourceStatus;
  last_fetch: string | null;
  items_today: number;
}

export interface ArgroHealth {
  status: string;
  now: string;
  llm: ArgroHealthLlm;
  articles: ArgroHealthArticles;
  last_fetch: string | null;
  sources: ArgroHealthSource[];
}

/* ---------------- fetcher ---------------- */

/** 單次抓取;throw Error(HTTP 非 2xx / 網絡失敗 / JSON 唔啱)。 */
export async function fetchArgroHealth(signal?: AbortSignal): Promise<ArgroHealth> {
  if (!supabase) throw new Error("Supabase 未連接");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("需要管理員登入");
  const res = await fetch(ENDPOINT, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as ArgroHealth;
  if (!json || typeof json !== "object" || !json.articles || !json.llm) {
    throw new Error("unexpected payload");
  }
  return json;
}

/* ---------------- hook(30s auto-refresh + cleanup) ---------------- */

export interface UseArgroHealthResult {
  /** 最新一份健康數據;從未成功過就係 null。 */
  data: ArgroHealth | null;
  /** 最近一次失敗訊息;成功後會清走。 */
  error: string | null;
  /** 第一次 fetch 未完成(用嚟顯示骨架,reserve 高度避免 layout shift)。 */
  loading: boolean;
  /** 上一份成功數據嘅落地時間。 */
  lastUpdated: Date | null;
  /** 手動即時重試(同 interval 共用,唔會疊 call)。 */
  refresh: () => void;
}

export function useArgroHealth(
  refreshMs: number = ARGRO_HEALTH_REFRESH_MS
): UseArgroHealthResult {
  const [data, setData] = useState<ArgroHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const inFlight = useRef(false);

  const tick = useCallback(async () => {
    if (inFlight.current) return; // 上一次未返就 skip,避免重疊
    inFlight.current = true;
    try {
      const next = await fetchArgroHealth();
      setData(next);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      // 保留舊 data(離線模式),只記低 error
      setError(e instanceof Error ? e.message : "fetch failed");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void tick();
    const id = window.setInterval(() => void tick(), refreshMs);
    return () => window.clearInterval(id); // unmount cleanup
  }, [tick, refreshMs]);

  const refresh = useCallback(() => void tick(), [tick]);

  return { data, error, loading, lastUpdated, refresh };
}

/* ---------------- 顯示輔助 ---------------- */

/** ISO timestamp → 粵語相對時間(「剛剛 / N 分鐘前 / N 小時前 / 今日 HH:MM」)。 */
export function relativeFetchTime(iso: string | null | undefined): string {
  if (!iso) return "未抓取";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "未抓取";
  const diffMin = Math.floor((Date.now() - t) / 60_000);
  if (diffMin < 1) return "剛剛";
  if (diffMin < 60) return `${diffMin} 分鐘前`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} 小時前`;
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 來源狀態 → 狀態點顏色(ok lime / warn amber / down error / paused muted)。 */
export function argroStatusDot(status: ArgroSourceStatus): string {
  if (status === "ok") return "bg-lime";
  if (status === "warn") return "bg-[#A36A0F]";
  if (status === "down") return "bg-[#A63A30]";
  return "bg-border-strong";
}

/** 來源狀態 → 中文 label。 */
export function argroStatusLabel(status: ArgroSourceStatus): string {
  if (status === "ok") return "正常";
  if (status === "warn") return "注意";
  if (status === "down") return "中斷";
  return "暫停";
}
