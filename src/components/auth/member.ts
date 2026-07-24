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

/** 團隊規模選項 */
export type TeamSize = "1" | "2-10" | "11-50" | "50+";

/** 點知我哋(來源) */
export type ReferralSource =
  | "friend"
  | "youtube"
  | "threads"
  | "google"
  | "event"
  | "other";

export const TEAM_SIZE_OPTIONS: { value: TeamSize; label: string }[] = [
  { value: "1", label: "1 人" },
  { value: "2-10", label: "2–10 人" },
  { value: "11-50", label: "11–50 人" },
  { value: "50+", label: "50+ 人" },
];

export const REFERRAL_OPTIONS: { value: ReferralSource; label: string }[] = [
  { value: "friend", label: "朋友推薦" },
  { value: "youtube", label: "YouTube" },
  { value: "threads", label: "Threads" },
  { value: "google", label: "Google" },
  { value: "event", label: "活動" },
  { value: "other", label: "其他" },
];

/** 想達成嘅目標(多選 chips)— 同 interests 一樣存 label */
export const GOAL_OPTIONS: string[] = [
  "AI 導入",
  "增長實驗",
  "內容系統",
  "自動化",
  "分身開發",
  "社群營運",
];

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
  /* ---- v1.20 漸進式檔案(additive,全部 optional) ---- */
  /** 公司/團隊 */
  company?: string;
  /** 職位 */
  roleTitle?: string;
  /** 團隊規模 */
  teamSize?: TeamSize;
  /** 城市(表單預設香港) */
  city?: string;
  /** 想達成嘅目標(多選) */
  goals?: string[];
  /** 主要社交平台 handle */
  social?: string;
  /** 點知我哋 */
  referral?: ReferralSource;
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

function isTeamSize(v: unknown): v is TeamSize {
  return (
    typeof v === "string" &&
    TEAM_SIZE_OPTIONS.some((o) => o.value === v)
  );
}

function isReferralSource(v: unknown): v is ReferralSource {
  return (
    typeof v === "string" &&
    REFERRAL_OPTIONS.some((o) => o.value === v)
  );
}

/** 非空白字串 → trim;否則 undefined(sanitize passthrough) */
function cleanString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
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
    company: cleanString(m.company),
    roleTitle: cleanString(m.roleTitle),
    teamSize: isTeamSize(m.teamSize) ? m.teamSize : undefined,
    city: cleanString(m.city),
    goals: Array.isArray(m.goals)
      ? m.goals.filter((g): g is string => typeof g === "string" && !!g.trim())
      : undefined,
    social: cleanString(m.social),
    referral: isReferralSource(m.referral) ? m.referral : undefined,
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

/* ---------------- v1.20 檔案完成度 + 解鎖里程碑 ---------------- */

export function teamSizeLabel(v: TeamSize): string {
  return TEAM_SIZE_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

export function referralLabel(v: ReferralSource): string {
  return REFERRAL_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

/**
 * 檔案完成度:name + email(註冊必填)= 20%,
 * 之後每項額外資料 +10%(persona、company、roleTitle、teamSize、
 * city、goals、social、referral 共 8 項 → 上限 100%)。
 */
export function profileCompletion(m: AigroMember): number {
  let pct = 20;
  if (m.persona) pct += 10;
  if (m.company) pct += 10;
  if (m.roleTitle) pct += 10;
  if (m.teamSize) pct += 10;
  if (m.city) pct += 10;
  if (m.goals && m.goals.length > 0) pct += 10;
  if (m.social) pct += 10;
  if (m.referral) pct += 10;
  return Math.min(100, pct);
}

export interface ProfileMilestone {
  /** 解鎖門檻(完成度 %) */
  pct: number;
  title: string;
  desc: string;
}

/**
 * 創始會員加成:role 非 free(創始/領航專家/管理員)→
 * 里程碑門檻由 60/80/100% 降至 40/60/80%(創始會員專屬加速)。
 */
export function isFoundingTier(m: AigroMember): boolean {
  return m.role !== "free";
}

/** 里程碑階梯(按會員級別返回對應門檻) */
export function milestonesFor(m: AigroMember): ProfileMilestone[] {
  const founding = isFoundingTier(m);
  return [
    {
      pct: founding ? 40 : 60,
      title: "Club 活動優先邀請",
      desc: "SuperBash 活動優先席",
    },
    {
      pct: founding ? 60 : 80,
      title: "工具庫進階解鎖",
      desc: "獨家工作流模板",
    },
    {
      pct: founding ? 80 : 100,
      title: "獨家更新 + 贊助情報",
      desc: "贊助商優惠 + 閉門更新",
    },
  ];
}

/** 已解鎖嘅里程碑(按目前完成度) */
export function unlockedMilestones(m: AigroMember): ProfileMilestone[] {
  const pct = profileCompletion(m);
  return milestonesFor(m).filter((ms) => pct >= ms.pct);
}
