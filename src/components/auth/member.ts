/**
 * AIGRO 會員 — 示範模式 localStorage 持久化。
 * Supabase Auth 接入時:將 loadMember/saveMember/clearMember 換成
 * supabase.auth.getSession() / signUp / signOut,consumer(Navbar、
 * Login、Join、Account)唔使改 — 全部經呢個 module 出入。
 */

export type MemberTier = "free" | "pro" | "vip";

export interface MemberNotifications {
  /** 每日情報摘要 */
  daily: boolean;
  /** 每週精選 Newsletter */
  weekly: boolean;
  /** 產品更新 */
  product: boolean;
}

export interface AigroMember {
  name: string;
  email: string;
  interests: string[];
  /** Founder / Marketer / Developer / Creator;未揀 = null */
  role: string | null;
  tier: MemberTier;
  joinedAt: number;
  notifications: MemberNotifications;
}

export const MEMBER_KEY = "aigro-member";

export const DEFAULT_NOTIFICATIONS: MemberNotifications = {
  daily: true,
  weekly: true,
  product: false,
};

export const TIER_LABEL: Record<MemberTier, string> = {
  free: "免費會員",
  pro: "進階會員",
  vip: "VIP 會員",
};

function sanitize(raw: unknown): AigroMember | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Partial<AigroMember>;
  if (typeof m.email !== "string" || !m.email) return null;
  const tier: MemberTier =
    m.tier === "pro" || m.tier === "vip" ? m.tier : "free";
  return {
    name: typeof m.name === "string" && m.name ? m.name : m.email.split("@")[0] || "會員",
    email: m.email,
    interests: Array.isArray(m.interests)
      ? m.interests.filter((i): i is string => typeof i === "string")
      : [],
    role: typeof m.role === "string" ? m.role : null,
    tier,
    joinedAt: typeof m.joinedAt === "number" ? m.joinedAt : Date.now(),
    notifications: { ...DEFAULT_NOTIFICATIONS, ...(m.notifications ?? {}) },
  };
}

export function loadMember(): AigroMember | null {
  try {
    const raw = window.localStorage.getItem(MEMBER_KEY);
    return raw ? sanitize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveMember(member: AigroMember): void {
  try {
    window.localStorage.setItem(MEMBER_KEY, JSON.stringify(member));
  } catch {
    /* private mode — 示範模式靜默失敗 */
  }
}

export function clearMember(): void {
  try {
    window.localStorage.removeItem(MEMBER_KEY);
  } catch {
    /* noop */
  }
}

/** 頭像首字母:CJK 取第一個字,Latin 取第一個字母大寫 */
export function memberInitial(name: string): string {
  const first = name.trim().charAt(0);
  return /[a-z]/i.test(first) ? first.toUpperCase() : first || "會";
}

/** 時間敏感問候(香港時間) */
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "早晨";
  if (h < 18) return "午安";
  return "晚安";
}

export function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
