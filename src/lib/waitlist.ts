/**
 * Waitlist 統一 capture(P0)— 四個入口(Developers MCP / Newsletter /
 * Ask + About capture / expert+partner interest)全部經呢度寫 `waitlist` 表。
 *
 * Graceful:無 env / 離線 → no-op(resolve),caller 嘅 localStorage 行為不變。
 * RLS `waitlist_insert_all` 允許匿名 insert,用呢個 anon client 就夠。
 * Fire-and-forget:caller 唔需要 await(UI 成功態唔阻塞)。
 */

import { supabase, supabaseReady } from "@/lib/supabase";

export type WaitlistKind = "mcp" | "expert" | "partner" | "newsletter" | "vip";

export interface WaitlistEntry {
  email: string;
  kind: WaitlistKind;
  /** mcp:行業(ai/beauty/technology/…);其他可留空 */
  vertical?: string | null;
  /** mcp:builder 類型(Founder/Marketer/Developer/…) */
  role?: string | null;
  /** partner / expert 申請備註 */
  note?: string | null;
  /** 來源標記(預設 'web') */
  source?: string;
}

export type WaitlistSaveMode = "server" | "local";

/**
 * Insert 一條 waitlist 記錄。永遠 resolve(唔 reject),並回傳有冇成功寫入。
 * 現有 fire-and-forget caller 可以繼續忽略回傳值;需要誠實成功態嘅表單
 * 可按 false 寫入本機 fallback。
 */
export async function captureWaitlist(entry: WaitlistEntry): Promise<boolean> {
  if (!supabase || !supabaseReady) return false;
  const email = entry.email.trim();
  if (!email) return false;
  try {
    const { error } = await supabase.from("waitlist").insert({
      email,
      kind: entry.kind,
      vertical: entry.vertical ?? null,
      role: entry.role ?? null,
      note: entry.note ?? null,
      source: entry.source ?? "web",
    });
    return error === null;
  } catch {
    return false;
  }
}

/**
 * Confirm a server insert, or persist an explicit device-local fallback.
 * Returning null means neither path worked, so callers must not show success.
 */
export async function captureWaitlistWithFallback(
  entry: WaitlistEntry,
  storageKey: string,
  localEntry: object = entry
): Promise<WaitlistSaveMode | null> {
  if (await captureWaitlist(entry)) return "server";

  try {
    const raw = window.localStorage.getItem(storageKey);
    const records: unknown[] = raw ? (JSON.parse(raw) as unknown[]) : [];
    records.push({ ...localEntry, at: new Date().toISOString() });
    window.localStorage.setItem(storageKey, JSON.stringify(records));
    return "local";
  } catch {
    return null;
  }
}
