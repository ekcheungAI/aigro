/**
 * useMember — 響應式會員態 hook(P0 Supabase 接入)。
 *
 * 舊 consumer 直接 sync `loadMember()` 仍然 work;需要跟 auth 狀態重render
 * 嘅(Navbar 頭像、Account)用呢個。內部 subscribeMember + 跨分頁 storage
 * listener,並確保 initAuth() 已啟動。
 *
 * 回傳:
 * - member:當前會員(未登入 = null)
 * - loading:初始 session 檢查緊(只喺有 env 時先會 true;示範模式恆 false)
 * - refresh:手動重讀(例如登出後即刻刷新)
 */

import { useCallback, useEffect, useState } from "react";
import {
  initAuth,
  loadMember,
  MEMBER_KEY,
  subscribeMember,
} from "@/components/auth/member";
import type { AigroMember } from "@/components/auth/member";
import { supabaseReady } from "@/lib/supabase";

export interface UseMemberResult {
  member: AigroMember | null;
  loading: boolean;
  refresh: () => void;
}

export function useMember(): UseMemberResult {
  const [member, setMember] = useState<AigroMember | null>(() => loadMember());
  // 有 env 時等初始 session 檢查完成先算 ready;示範模式即刻 ready
  const [loading, setLoading] = useState<boolean>(supabaseReady);

  useEffect(() => {
    initAuth();
    const unsubscribe = subscribeMember((m) => {
      setMember(m);
      setLoading(false);
    });
    // 跨分頁同步(另一個 tab 登入/登出)
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === MEMBER_KEY) setMember(loadMember());
    };
    window.addEventListener("storage", onStorage);
    // 安全網:若 2.5s 內未收到廣播(例如網絡慢),都結束 loading 用 local 快取
    const fallback = window.setTimeout(() => setLoading(false), 2500);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", onStorage);
      window.clearTimeout(fallback);
    };
  }, []);

  const refresh = useCallback(() => {
    setMember(loadMember());
  }, []);

  return { member, loading, refresh };
}

export default useMember;
