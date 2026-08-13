/**
 * AIGRO Supabase client — 單一 anon client(全站共用)。
 *
 * Graceful degradation:環境變數缺失時 `supabase` = null,
 * 全站自動回落 localStorage 示範模式(auth / waitlist / 對話記錄全部照行)。
 * 只有 anon(publishable)key 會入 client bundle;service key 永遠唔會出現喺度。
 *
 * 接入狀態見 docs/INTEGRATION.md。
 */

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** env 是否齊全(決定行真 Supabase 定 localStorage 示範模式) */
export const supabaseReady: boolean = Boolean(URL && ANON_KEY);

/**
 * 全站共用 anon client;env 缺失時為 null。
 * 用之前一律 check `supabaseReady` 或 `if (supabase)`。
 */
export const supabase: SupabaseClient | null = supabaseReady
  ? createClient(URL as string, ANON_KEY as string, {
      auth: {
        // auth session 存 localStorage,跨 refresh 保留
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

let anonymousSignIn: Promise<string | null> | null = null;

/**
 * Ensure every visitor has a Supabase JWT. Anonymous Auth creates a real
 * auth.users row, so RLS can use auth.uid() instead of a spoofable browser id.
 */
export async function ensureAuthenticatedUser(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.id) return data.session.user.id;
  if (anonymousSignIn) return anonymousSignIn;
  anonymousSignIn = supabase.auth
    .signInAnonymously()
    .then(({ data: signedIn, error }) => {
      if (error) throw error;
      return signedIn.user?.id ?? null;
    })
    .finally(() => {
      anonymousSignIn = null;
    });
  return anonymousSignIn;
}

/* ---------------- 匿名訪客 id(未登入對話歸屬) ---------------- */

const ANON_KEY_STORAGE = "aigro-anon-id";

/**
 * 未登入訪客嘅持久隨機 id — 對話(conversations.anon_id)歸屬用,
 * 登入後可以按呢個 id claim 返之前嘅訪客對話。localStorage 持久。
 */
export function getAnonId(): string {
  try {
    const existing = window.localStorage.getItem(ANON_KEY_STORAGE);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(ANON_KEY_STORAGE, id);
    return id;
  } catch {
    // private mode — 退回 in-memory 隨機 id(唔持久,但唔會 throw)
    return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
