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

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import {
  toAihotInsight,
  type AihotDaily,
  type AihotDailyEntry,
  type AihotHotTopic,
  type AihotInsight,
  type AihotRawItem,
} from "./aihot";
import type { InsightCategory } from "./insights";

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
    tags: row.tags ?? [],
  };
}

function isPublishableRow(row: ItemRow): boolean {
  return Boolean(
    row.title.trim() &&
      row.summary?.trim() &&
      row.original_url?.trim() &&
      row.sources?.name?.trim() &&
      row.published_at
  );
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
      const validRows = rows.filter(isPublishableRow);
      if (validRows.length < MIN_LIVE_ITEMS) {
        state = { items: null, fetchedAt: null, error: null }; // 未成熟,保持 snapshot
        return;
      }
      const items = validRows.map(toRawItem);
      state = {
        items,
        fetchedAt: validRows[0]?.published_at ?? null,
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
  useEffect(() => {
    startLiveItems();
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).items;
}

/** live 數據時間(未成熟 → null,consumer 回落 aihotFetchedAt) */
export function useLiveFetchedAt(): string | null {
  useEffect(() => {
    startLiveItems();
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).fetchedAt;
}

/* ============ 衍生 selector(v1.27 公開頁面 live hydration) ============ */

/**
 * live items → AihotInsight[](未成熟 → null,consumer 回落 aihotInsights)。
 * 用法:`const insights = useLiveInsights() ?? aihotInsights;`
 */
export function useLiveInsights(): AihotInsight[] | null {
  const raw = useLiveItems();
  return useMemo(() => (raw ? raw.map(toAihotInsight) : null), [raw]);
}

export interface LiveFeedFilter {
  mode: "selected" | "all";
  category?: InsightCategory | null;
  query?: string;
  enabled?: boolean;
}

export interface LiveFeedState {
  items: AihotInsight[] | null;
  loading: boolean;
  error: string | null;
}

const LIVE_PAGE_SIZE = 500;
const LIVE_MAX_PAGES = 20;

function escapePostgrestLike(value: string): string {
  return value.replace(/[\\%_(),]/g, (character) => `\\${character}`);
}

/**
 * Filtered feed loader. The default site chrome still uses the cheap latest
 * 200-item snapshot, while search/category/all-feed requests are paginated at
 * Supabase so historical rows are not silently excluded from the UI.
 */
export function useLiveFilteredInsights(filter: LiveFeedFilter): LiveFeedState {
  const enabled = filter.enabled !== false;
  const queryText = filter.query?.trim() ?? "";
  const key = JSON.stringify({
    enabled,
    mode: filter.mode,
    category: filter.category ?? null,
    query: queryText.toLowerCase(),
  });
  const [state, setState] = useState<LiveFeedState>({
    items: null,
    loading: enabled,
    error: null,
  });

  useEffect(() => {
    if (!enabled) {
      setState({ items: null, loading: false, error: null });
      return;
    }
    if (!supabaseReady || !supabase) {
      setState({ items: null, loading: false, error: "Supabase 未連接" });
      return;
    }

    let cancelled = false;
    setState({ items: null, loading: true, error: null });

    void (async () => {
      try {
        const rows: ItemRow[] = [];
        for (let page = 0; page < LIVE_MAX_PAGES; page += 1) {
          let request = supabase
            .from("items")
            .select(
              "id,title,summary,original_url,category,tags,score,lang,placement,published_at,sources(name)",
              { count: "exact" }
            )
            .eq("status", "published")
            .order("published_at", { ascending: false });
          if (filter.mode === "selected") {
            request = request.in("placement", ["featured", "daily"]);
          }
          if (filter.category) request = request.eq("category", filter.category);
          if (queryText) {
            const escaped = escapePostgrestLike(queryText.toLowerCase());
            request = request.or(`title.ilike.%${escaped}%,summary.ilike.%${escaped}%`);
          }
          const start = page * LIVE_PAGE_SIZE;
          const { data, error, count } = await request.range(
            start,
            start + LIVE_PAGE_SIZE - 1
          );
          if (error) throw new Error(error.message);
          const pageRows = (data ?? []) as unknown as ItemRow[];
          rows.push(...pageRows.filter(isPublishableRow));
          if (
            pageRows.length < LIVE_PAGE_SIZE ||
            (typeof count === "number" && rows.length >= count)
          ) {
            break;
          }
        }
        if (cancelled) return;
        setState({ items: rows.map(toRawItem).map(toAihotInsight), loading: false, error: null });
      } catch (error) {
        if (cancelled) return;
        setState({
          items: null,
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, filter.category, filter.mode, key, queryText]);

  return state;
}

/**
 * 由真實情報合成日報 — 邏輯同 scripts/fetch-argro.mjs 嘅 fallback 一致:
 * placement daily/featured(selected)優先,按分數取 top 9,再按 category 分組。
 * selected 不足 5 條時以全庫高分補(仍然係真數據,唔作數)。
 */
export function synthesizeDailyFromInsights(
  insights: AihotInsight[]
): AihotDaily {
  const byScore = [...insights].sort((a, b) => b.score - a.score);
  const selected = byScore.filter((i) => i.selected).slice(0, 9);
  const top = (selected.length >= 5 ? selected : byScore.slice(0, 9)).map(
    (i): AihotDailyEntry => ({
      slug: i.slug,
      category: i.category,
      sectionLabel: i.category,
      title: i.title,
      summary: i.summary,
      source: i.source,
      permalink: i.originalUrl ?? i.permalink,
      canonical: i.canonical,
      score: i.score,
    })
  );

  const sectionOrder: AihotInsight["category"][] = [];
  const counts = new Map<string, number>();
  for (const entry of top) {
    if (!counts.has(entry.category)) sectionOrder.push(entry.category);
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
  }

  const latest = insights[0]?.publishedAt ?? "";
  return {
    date: latest ? latest.slice(0, 10) : null,
    canonical: "",
    lead: top[0] ?? null,
    items: top.slice(1),
    sections: sectionOrder.map((category) => ({
      label: category,
      category,
      count: counts.get(category) ?? 0,
    })),
    itemCount: top.length,
  };
}

/** 熱門話題關鍵詞群組 — 同 scripts/fetch-argro.mjs TOPIC_GROUPS 一致 */
const LIVE_TOPIC_GROUPS: [string, RegExp][] = [
  ["OpenAI", /openai|gpt|chatgpt/i],
  ["Anthropic / Claude", /anthropic|claude/i],
  ["Google / Gemini", /google|gemini|deepmind/i],
  ["開源模型", /open.?source|llama|qwen|deepseek|mistral|開源/i],
  ["AI Agent", /agent|agentic|代理|智能體/i],
  ["AI 基建與算力", /gpu|nvidia|data center|算力|基建|chip/i],
];

/**
 * 由真實情報聚合熱門話題 — 同 fetch-argro.mjs 一致:關鍵詞群組 ≥2 條先成立,
 * 按覆蓋數降序取 5 個。
 */
export function aggregateHotTopicsFromInsights(
  insights: AihotInsight[]
): AihotHotTopic[] {
  return LIVE_TOPIC_GROUPS.map(
    ([name, re]) =>
      [
        name,
        insights.filter((i) => re.test(`${i.title} ${i.summary}`)),
      ] as const
  )
    .filter(([, arr]) => new Set(arr.map((i) => i.source).filter(Boolean)).size >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5)
    .map(([name, arr]) => {
      const sourceNames = [...new Set(arr.map((i) => i.source).filter(Boolean))];
      return {
        id: name,
        title: name,
        permalink: arr[0]?.originalUrl ?? arr[0]?.permalink ?? "",
        source: arr[0]?.source ?? "",
        sourceCount: sourceNames.length,
        sourceNames: sourceNames.slice(0, 4),
        latestAt: arr[0]?.publishedAt ?? null,
        related: arr.slice(0, 3),
      };
    });
}

/** live 日報(未成熟 → null,consumer 回落 aihotDaily) */
export function useLiveDaily(): AihotDaily | null {
  const insights = useLiveInsights();
  return useMemo(
    () => (insights ? synthesizeDailyFromInsights(insights) : null),
    [insights]
  );
}

/* ============ 香港日期工具 + 往期日報 / 每週回顧合成 ============ */

const HK_YMD = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Hong_Kong",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** ISO 時間 → 香港日期 key(YYYY-MM-DD);無效日期 → null */
export function hkDayKey(iso: string): string | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : HK_YMD.format(d);
}

/** YYYY-MM-DD(視作 UTC 曆日)加 n 日 */
function shiftDayKey(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** key 所在週嘅星期一(週一至週日為一週) */
function mondayOfWeek(key: string): string {
  const weekday = new Date(`${key}T00:00:00Z`).getUTCDay(); // 0=日 … 6=六
  return shiftDayKey(key, -((weekday + 6) % 7));
}

/**
 * 由真實情報合成指定香港日期嘅往期日報 — 同 groupByDay 邏輯一致:
 * 按 hkDayKey 篩出當日情報,再用 synthesizeDailyFromInsights 揀 top 9。
 * 當日冇數據 → null(consumer 應 disable 該日期,唔好假導航)。
 */
export function synthesizeDailyForDate(
  insights: AihotInsight[],
  dateKey: string
): AihotDaily | null {
  const dayItems = insights.filter((i) => hkDayKey(i.publishedAt) === dateKey);
  if (dayItems.length === 0) return null;
  const daily = synthesizeDailyFromInsights(dayItems);
  return { ...daily, date: dateKey };
}

export interface AihotWeekly {
  /** 週一(香港日期 YYYY-MM-DD) */
  weekStart: string;
  /** 週日(香港日期 YYYY-MM-DD) */
  weekEnd: string;
  lead: AihotDailyEntry | null;
  items: AihotDailyEntry[];
  sections: AihotDaily["sections"];
  itemCount: number;
}

/**
 * 由真實情報合成每週回顧 — 唔經 argro API(避免前端暴露 key),
 * 同 daily 合成邏輯一致:以數據時鐘(最新情報日期)所在週為範圍,
 * 週一至週日按分數取 top 12,再按 category 分組。
 */
export function synthesizeWeeklyFromInsights(
  insights: AihotInsight[]
): AihotWeekly | null {
  if (insights.length === 0) return null;
  /* 數據時鐘 — 同 LiveStats 做法:以最新情報日期為基準,
     唔會因為數據日期同訪客「今日」有落差而顯示空週 */
  const latestKey = insights.reduce<string | null>(
    (max, i) => {
      const k = hkDayKey(i.publishedAt);
      return k && (!max || k > max) ? k : max;
    },
    null
  );
  if (!latestKey) return null;
  const weekStart = mondayOfWeek(latestKey);
  const weekEnd = shiftDayKey(weekStart, 6);

  const inWeek = insights.filter((i) => {
    const k = hkDayKey(i.publishedAt);
    return k !== null && k >= weekStart && k <= weekEnd;
  });
  if (inWeek.length === 0) return null;

  const top = [...inWeek].sort((a, b) => b.score - a.score).slice(0, 12);
  const entries = top.map(
    (i): AihotDailyEntry => ({
      slug: i.slug,
      category: i.category,
      sectionLabel: i.category,
      title: i.title,
      summary: i.summary,
      source: i.source,
      permalink: i.originalUrl ?? i.permalink,
      canonical: i.canonical,
      score: i.score,
    })
  );

  const sectionOrder: AihotInsight["category"][] = [];
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (!counts.has(entry.category)) sectionOrder.push(entry.category);
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
  }

  return {
    weekStart,
    weekEnd,
    lead: entries[0] ?? null,
    items: entries.slice(1),
    sections: sectionOrder.map((category) => ({
      label: category,
      category,
      count: counts.get(category) ?? 0,
    })),
    itemCount: inWeek.length,
  };
}

/** live 熱門話題(未成熟 → null,consumer 回落 aihotHotTopics) */
export function useLiveHotTopics(): AihotHotTopic[] | null {
  const insights = useLiveInsights();
  return useMemo(
    () => (insights ? aggregateHotTopicsFromInsights(insights) : null),
    [insights]
  );
}
