/**
 * Interest / waitlist capture(F4)— localStorage 備份 + Supabase `waitlist` 表。
 *
 * 「aigro-expert-interest」→ kind='expert';「aigro-partner-interest」→ kind='partner'。
 * 雙寫:localStorage 留底(離線 / 無 env fallback),Supabase 做真實收集。
 * Caller 必須 await 回傳模式，先可以顯示誠實成功態。
 */

import { captureWaitlistWithFallback } from "@/lib/waitlist";
import type { WaitlistKind, WaitlistSaveMode } from "@/lib/waitlist";

export const EXPERT_INTEREST_KEY = "aigro-expert-interest";
export const PARTNER_INTEREST_KEY = "aigro-partner-interest";

/** key → waitlist kind(其他 key = 唔上 Supabase) */
function kindForKey(key: string): WaitlistKind | null {
  if (key === EXPERT_INTEREST_KEY) return "expert";
  if (key === PARTNER_INTEREST_KEY) return "partner";
  return null;
}

/** 由 entry 組一條人讀備註(partner type / name / field / url / note) */
function noteFor(entry: Record<string, unknown>): string | null {
  const parts: string[] = [];
  if (typeof entry.kind === "string" && entry.kind) parts.push(`type:${entry.kind}`);
  if (typeof entry.name === "string" && entry.name) parts.push(`name:${entry.name}`);
  if (typeof entry.field === "string" && entry.field) parts.push(`field:${entry.field}`);
  if (typeof entry.url === "string" && entry.url) parts.push(`url:${entry.url}`);
  if (typeof entry.note === "string" && entry.note) parts.push(entry.note);
  return parts.length > 0 ? parts.join(" | ") : null;
}

export type InterestSaveMode = WaitlistSaveMode;

/** 追加一條 interest 記錄，並回報真正成功嘅 persistence path。 */
export async function appendInterest(
  key: string,
  entry: Record<string, unknown>
): Promise<InterestSaveMode | null> {
  const kind = kindForKey(key);
  const email = typeof entry.email === "string" ? entry.email.trim() : "";
  if (kind && email) {
    return captureWaitlistWithFallback(
      {
        email,
        kind,
        note: noteFor(entry),
        source: `${kind}-interest`,
      },
      key,
      entry
    );
  }

  try {
    const raw = window.localStorage.getItem(key);
    const records: unknown[] = raw ? (JSON.parse(raw) as unknown[]) : [];
    records.push({ ...entry, at: new Date().toISOString() });
    window.localStorage.setItem(key, JSON.stringify(records));
    return "local";
  } catch {
    return null;
  }
}
