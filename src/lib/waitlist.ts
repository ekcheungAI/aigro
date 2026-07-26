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

/**
 * Insert 一條 waitlist 記錄。成功/失敗都 resolve(唔 reject),
 * 失敗(離線 / 無 env / RLS)靜默 — caller 嘅成功態唔受影響。
 */
export async function captureWaitlist(entry: WaitlistEntry): Promise<void> {
  if (!supabase || !supabaseReady) return;
  const email = entry.email.trim();
  if (!email) return;
  try {
    await supabase.from("waitlist").insert({
      email,
      kind: entry.kind,
      vertical: entry.vertical ?? null,
      role: entry.role ?? null,
      note: entry.note ?? null,
      source: entry.source ?? "web",
    });
  } catch {
    /* 離線靜默 — localStorage fallback 已經記低 */
  }
}
