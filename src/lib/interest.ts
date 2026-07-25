/**
 * Interest / waitlist capture(F4)— 暫存 localStorage。
 *
 * NOTE:Supabase 接入時,「aigro-expert-interest」同「aigro-partner-interest」
 * 呢兩個 key 會對應 waitlist 表(kind = 'expert' / 'partner:<type>'),
 * 呢個 module 係 swap point — 到時將 appendInterest 換成 supabase insert。
 */
export const EXPERT_INTEREST_KEY = "aigro-expert-interest";
export const PARTNER_INTEREST_KEY = "aigro-partner-interest";

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
}
