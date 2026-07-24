/**
 * AIGRO 會員 — 示範模式 localStorage 持久化。
 * Supabase Auth 接入時:將 loadMember/saveMember/clearMember 換成
 * supabase.auth.getSession() / signUp / signOut,consumer(Navbar、
 * Login、Join、Account)唔使改 — 全部經呢個 module 出入。
 */

export type MemberTier = "free" | "pro" | "vip";

/** 4 級用戶制度:免費 / 創始會員 / 領航專家 / 管理員 */
export type MemberRole = "free" | "founding" | "expert" | "admin";
/** 入口角色 alias(專家平台 gate /portal 用)— 與 MemberRole 同型 */
export type MemberPortalRole = MemberRole;

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
  persona: string | null;
  /** 帳號級別(權限)— 預設 free */
  role: MemberRole;
  /** 入口角色(專家平台 gate)— 預設由 role 衍生 */
  portalRole?: MemberPortalRole;
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

export const ROLE_LABELS: Record<MemberRole, string> = {
  free: "免費會員",
  founding: "創始會員",
  expert: "領航專家",
  admin: "管理員",
};

/** 級別排序(權限由低至高) */
export const TIER_ORDER: MemberRole[] = ["free", "founding", "expert", "admin"];

export const TIER_LABEL: Record<MemberTier, string> = {
  free: "免費會員",
  pro: "創始會員",
  vip: "VIP 會員",
};

const MEMBER_ROLES: MemberRole[] = ["free", "founding", "expert", "admin"];

function isMemberRole(v: unknown): v is MemberRole {
  return typeof v === "string" && (MEMBER_ROLES as string[]).includes(v);
}

/** 由收費方案推斷預設級別(舊紀錄遷移用):pro/vip → founding */
export function roleFromTier(tier: MemberTier): MemberRole {
  return tier === "free" ? "free" : "founding";
}

function sanitize(raw: unknown): AigroMember | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Partial<AigroMember> & { role?: unknown };
  if (typeof m.email !== "string" || !m.email) return null;
  const tier: MemberTier =
    m.tier === "pro" || m.tier === "vip" ? m.tier : "free";
  // 舊紀錄遷移:v1.16 前 `role` 係身份字串(Founder/Marketer…),
  // 而家 `role` 係帳號級別,身份搬去 `persona`。
  const legacyPersona =
    typeof m.role === "string" && !isMemberRole(m.role) ? m.role : null;
  return {
    name: typeof m.name === "string" && m.name ? m.name : m.email.split("@")[0] || "會員",
    email: m.email,
    interests: Array.isArray(m.interests)
      ? m.interests.filter((i): i is string => typeof i === "string")
      : [],
    persona:
      typeof m.persona === "string" && m.persona ? m.persona : legacyPersona,
    role: isMemberRole(m.role) ? m.role : roleFromTier(tier),
    portalRole:
      m.portalRole === "founding" ||
      m.portalRole === "expert" ||
      m.portalRole === "admin" ||
      m.portalRole === "free"
        ? m.portalRole
        : isMemberRole(m.role)
          ? m.role
          : roleFromTier(tier),
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
