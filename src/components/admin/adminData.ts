/**
 * adminData — Admin 後台 + Expert Portal 共用嘅真 Supabase 查詢基礎。
 *
 * 零容忍假數據:所有數字嚟自即時查詢;查詢失敗 → error state(QueryState),
 * 冇數據 → 0 / empty state,絕唔回落任何 hardcode 數字。
 *
 * RLS 前提:已登入 admin(public.is_admin())可以讀
 * profiles / waitlist / conversations / messages / leads / items / sources 全部。
 * 未登入或權限不足時查詢會报错,由 QueryState 誠實顯示。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

/* ---------------- async query hook ---------------- */

export interface AsyncQuery<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 簡單 async 查詢 hook — useEffect + useState,冇新 dependency。
 * deps 改變或 refetch() 時重行;unmount 後唔 set state。
 */
export function useAdminQuery<T>(
  fn: () => Promise<T>,
  deps: readonly unknown[] = []
): AsyncQuery<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fnRef.current().then(
      (result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      },
      (e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, refetch };
}

/** head-count 查詢 — 冇 rows 返 0;supabase 未 ready 时报错(由 caller error state 處理) */
interface CountResult {
  count: number | null;
  error: { message: string } | null;
}

interface CountQuery extends PromiseLike<CountResult> {
  eq(column: string, value: unknown): CountQuery;
  gte(column: string, value: unknown): CountQuery;
}

export async function countRows(
  table: string,
  apply?: (query: CountQuery) => CountQuery
): Promise<number> {
  if (!supabase) throw new Error("Supabase 未連接");
  let q = supabase.from(table)
    .select("id", { count: "exact", head: true }) as unknown as CountQuery;
  if (apply) q = apply(q);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/* ---------------- DB row 型別(手寫對應 supabase/schema.sql) ---------------- */

export type ItemStatus = "pending" | "reviewed" | "published" | "rejected";
export type ItemPlacement = "normal" | "daily" | "featured";

export interface AdminItemRow {
  id: string;
  title: string;
  summary: string | null;
  original_url: string | null;
  category: string | null;
  score: number | null;
  lang: string | null;
  status: ItemStatus;
  placement: ItemPlacement | null;
  published_at: string | null;
  fetched_at: string | null;
  source_id: string | null;
  sources?: { name: string } | null;
}

export interface AdminProfileRow {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  tier: string | null;
  persona: string | null;
  interests: string[] | null;
  expert_slug: string | null;
  created_at: string | null;
}

export interface AdminWaitlistRow {
  id: string;
  email: string;
  kind: string;
  vertical: string | null;
  role: string | null;
  note: string | null;
  source: string | null;
  created_at: string | null;
}

export interface AdminConversationRow {
  id: string;
  user_id: string | null;
  anon_id: string | null;
  persona: string;
  title: string | null;
  created_at: string | null;
}

export interface AdminMessageRow {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  source: string | null;
  answer_basis: "knowledge" | "general" | null;
  coverage: "high" | "medium" | "none" | null;
  created_at: string | null;
}

export type LeadStage = "新線索" | "已接觸" | "跟進中" | "已轉化";

export interface StructuredLeadQuestion {
  text?: string;
  persona?: string;
  date?: string;
}

/** Legacy/client lead snapshots stored strings; server rows can be structured. */
export type LeadQuestion = string | StructuredLeadQuestion;

export function leadQuestionText(question: LeadQuestion): string {
  return typeof question === "string" ? question : (question.text ?? "");
}

export function leadQuestionMeta(question: LeadQuestion): {
  date: string;
  persona: string;
} {
  return typeof question === "string"
    ? { date: "", persona: "" }
    : { date: question.date ?? "", persona: question.persona ?? "" };
}

export interface LeadTimelineEntry {
  date?: string;
  label?: string;
}

export interface AdminLeadRow {
  id: string;
  expert_id?: string | null;
  user_id: string | null;
  anon_id: string | null;
  owner_is_anonymous?: boolean;
  persona: string;
  score: number | null;
  signals: string[] | null;
  stage: LeadStage;
  questions: LeadQuestion[] | null;
  analysis: string | null;
  timeline: LeadTimelineEntry[] | null;
  next_follow_up_at?: string | null;
  contact_consented_at?: string | null;
  last_activity_at: string | null;
  created_at: string | null;
}

export interface AdminSourceRow {
  id: string;
  name: string;
  type: "rss" | "api" | "scraper";
  domain: string | null;
  endpoint: string | null;
  vertical: string | null;
  lang: string | null;
  weight: number | null;
  fetch_interval_minutes: number | null;
  status: "active" | "paused" | "pending" | "error" | null;
  last_fetched_at: string | null;
  health: "ok" | "warn" | "down" | null;
  created_at: string | null;
}

/* ---------------- 時間 helpers ---------------- */

/** 今日 00:00 UTC ISO — 「今日新增」統一用 UTC 日界 */
export function todayUtcStartIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/** n 日前 00:00 UTC ISO */
export function daysAgoUtcStartIso(n: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

/** 相對時間(中文):剛剛 / N 分鐘前 / N 小時前 / N 日前 */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 60_000) return "剛剛";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分鐘前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小時前`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 日前`;
  return formatDate(iso);
}

/** YYYY-MM-DD(本地) */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const d = new Date(t);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** 過去 7 日(舊 → 新)嘅日界 bucket:label(週幾)+ UTC 日字串 */
export function last7DayBuckets(): { key: string; label: string }[] {
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const out: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    out.push({
      key: d.toISOString().slice(0, 10),
      label: weekdays[d.getUTCDay()],
    });
  }
  return out;
}

/** 將 ISO 時間落入 UTC 日 bucket key(YYYY-MM-DD) */
export function utcDayKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
}

/* ---------------- persona 顯示名(presentational,唔係數據) ---------------- */

export const PERSONA_LABELS: Record<string, string> = {
  platform: "平台分身",
  "jimmy-lau": "Jimmy Lau 分身",
  "elvin-cheung": "Elvin 分身",
};

export function personaLabel(persona: string | null | undefined): string {
  if (!persona) return "平台分身";
  return PERSONA_LABELS[persona] ?? `${persona} 分身`;
}
