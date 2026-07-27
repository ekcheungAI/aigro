/**
 * liveItems.ts — Supabase `items` 嘅 runtime live 數據層。
 *
 * 設計:
 * - 頁面初render 用 build-time snapshot(aihot.ts)— 即時、離線安全。
 * - app 啟動後 background fetch Supabase published items(argro→Supabase sync
 *   每 30 分鐘由 GitHub Actions 寫入,見 scripts/sync-argro-to-supabase.mjs)。
 * - 數據成熟(≥ MIN_LIVE_ITEMS)就以 live 取代 snapshot;唔成熟/失敗就靜默
 *   保持 snapshot — 用戶永遠唔會見到空頁。
 * - 用 useSyncExternalStore 通知 consumer 重render。
 *
 * RLS:anon 只能讀 status='published'(items_public_read),呢個 fetch 天然安全。
 */

import { useSyncExternalStore } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import type { AihotRawItem } from "./aihot";

/** 少過呢個數就當 live 數據未成熟(sync 未行過/管道異常),繼續用 snapshot */
const MIN_LIVE_ITEMS = 5;

interface ItemRow {
  id: string;
  title: string;
  summary: string | null;
  original_url: string | null;
  category: string | null;
  tags: string[] | null;
  score: number | null;
  lang: string | null;
  placement: "normal" | "daily" | "featured" | null;
  published_at: string | null;
  sources?: { name: string } | null;
}

function toRawItem(row: ItemRow): AihotRawItem {
  return {
    id: row.id,
    title: row.title,
    title_en: null,
    url: row.original_url,
    permalink: row.original_url ?? "",
    source: row.sources?.name ?? "",
    publishedAt: row.published_at ?? "",
    summary: row.summary ?? "",
    category: row.category ?? "行業動態",
    score: row.score ?? 0,
    selected: row.placement === "featured" || row.placement === "daily",
    attribution: null,
  };
}

export interface LiveItemsState {
  /** null = 未載入完成(用 snapshot);>= MIN = live 數據成熟 */
  items: AihotRawItem[] | null;
  /** live 數據時間(最新 item 的 published_at) */
  fetchedAt: string | null;
  /** 最後一次 fetch 失敗原因(除錯用;UI 唔顯示) */
  error: string | null;
}

let state: LiveItemsState = { items: null, fetchedAt: null, error: null };
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getSnapshot(): LiveItemsState {
  return state;
}

let started = false;

/** 背景拉取 — 幂等,重複 call 唔會重複 fetch */
export function startLiveItems(): void {
  if (started) return;
  started = true;
  if (!supabaseReady || !supabase) return;

  void (async () => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select(
          "id,title,summary,original_url,category,tags,score,lang,placement,published_at,sources(name)"
        )
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(200);

      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as ItemRow[];
      if (rows.length < MIN_LIVE_ITEMS) {
        state = { items: null, fetchedAt: null, error: null }; // 未成熟,保持 snapshot
        return;
      }
      const items = rows.map(toRawItem);
      state = {
        items,
        fetchedAt: rows[0]?.published_at ?? null,
        error: null,
      };
      emit();
    } catch (e) {
      state = { ...state, error: e instanceof Error ? e.message : String(e) };
    }
  })();
}

/**
 * React hook — live items(成熟時)否則 null。
 * consumer 用法:`const live = useLiveItems(); const insights = live ?? aihotInsights;`
 */
export function useLiveItems(): AihotRawItem[] | null {
  startLiveItems();
  return useSyncExternalStore(subscribe, getSnapshot).items;
}

/** live 數據時間(未成熟 → null,consumer 回落 aihotFetchedAt) */
export function useLiveFetchedAt(): string | null {
  startLiveItems();
  return useSyncExternalStore(subscribe, getSnapshot).fetchedAt;
}
