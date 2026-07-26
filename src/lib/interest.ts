/**
 * Interest / waitlist capture(F4)— localStorage 備份 + Supabase `waitlist` 表。
 *
 * 「aigro-expert-interest」→ kind='expert';「aigro-partner-interest」→ kind='partner'。
 * 雙寫:localStorage 留底(離線 / 無 env fallback),Supabase 做真實收集。
 * Supabase 寫入 fire-and-forget + 靜默失敗,UI 成功態唔受影響。
 */

import { captureWaitlist } from "@/lib/waitlist";
import type { WaitlistKind } from "@/lib/waitlist";

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

/** 追加一條 interest 記錄(連 ISO 時間戳);寫入失敗(private mode 等)靜默。 */
export function appendInterest(
  key: string,
  entry: Record<string, unknown>
): void {
  try {
    const raw = localStorage.getItem(key);
    const list: unknown[] = raw ? (JSON.parse(raw) as unknown[]) : [];
    list.push({ ...entry, at: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* localStorage 不可用 — 靜默,唔阻塞 UI 成功態 */
  }

  // Supabase waitlist 真實收集(無 env / 離線 → 靜默)
  const kind = kindForKey(key);
  const email = typeof entry.email === "string" ? entry.email.trim() : "";
  if (kind && email) {
    void captureWaitlist({
      email,
      kind,
      note: noteFor(entry),
      source: `${kind}-interest`,
    });
  }
}
