/**
 * AIGRO 會員 — Supabase Auth(magic link)+ localStorage 快取。
 *
 * 雙層設計(P0 接入,graceful fallback):
 * - 有 env + 已登入 → `profiles` 表係 source of truth,localStorage 係
 *   同步快取(令 sync `loadMember()` 嘅舊 consumer 零改動繼續用得)。
 * - 無 env / 離線 / demo 帳號 → 純 localStorage 示範模式,全部照行。
 *
 * `initAuth()` 訂閱 `onAuthStateChange`,登入後 fetch/upsert `profiles`
 * 並 broadcast 俾 `useMember()` 訂閱者(Navbar / Account 重render)。
 */

import { supabase, supabaseReady } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export type MemberTier = "free" | "pro" | "vip";

/** 用戶顯示級別：免費 / 創始會員 / 領航專家 / 管理員 / 最高管理員 */
export type MemberRole = "free" | "founding" | "expert" | "admin" | "super_admin";
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
  /**
   * 示範/訪客帳號標記 — demo 帳號(Login/Access/Portal gate 一 click 登入)
   * 只存本機,唔會寫入 Supabase;真 magic-link 會員無呢個 flag。
   */
  demo?: boolean;
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
  super_admin: "最高管理員",
};

/** 級別排序(權限由低至高) */
export const TIER_ORDER: MemberRole[] = ["free", "founding", "expert", "admin", "super_admin"];

export const TIER_LABEL: Record<MemberTier, string> = {
  free: "免費會員",
  pro: "創始會員",
  vip: "VIP 會員",
};

/**
 * `super_admin` is the platform owner role. It inherits every product
 * entitlement without mutating the separate billing tier.
 */
export function hasFullPlatformAccess(member: Pick<AigroMember, "role">): boolean {
  return member.role === "super_admin";
}

export function hasHumanBookingAccess(
  member: Pick<AigroMember, "role" | "tier">
): boolean {
  return hasFullPlatformAccess(member) || member.tier === "vip";
}

const MEMBER_ROLES: MemberRole[] = ["free", "founding", "expert", "admin", "super_admin"];

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
      m.portalRole === "super_admin" ||
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
    demo: m.demo === true ? true : undefined,
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
  notifyMember();
  // 已登入(非 demo)時同步去 profiles 表;fire-and-forget,離線靜默
  void syncProfileToSupabase(member);
}

export function clearMember(): void {
  try {
    window.localStorage.removeItem(MEMBER_KEY);
  } catch {
    /* noop */
  }
  notifyMember();
  // 真 session 都一齊登出 — scope:'local' 保證本機 session 即時清除,
  // 即使網絡/伺服器唔順都唔會下次 load 又自動登入返(之前 signOut() 預設
  // 要伺服器回應先清,失敗時 session 留底 → 用戶「登出唔到」)。
  if (supabase) {
    supabase.auth.signOut({ scope: "local" }).catch(() => {
      /* 離線靜默 */
    });
  }
}

/* ================= Supabase Auth(P0)=================
 * magic-link 登入 + profiles 表同步 + auth state listener。
 * 全部 grace­ful:無 env / 離線 → 純 localStorage 示範模式。
 */

/** profiles 表 row 形狀(冇 generated types,手寫對應) */
interface ProfileRow {
  id: string;
  email: string;
  name: string | null;
  role: MemberRole | null;
  tier: MemberTier | null;
  persona: string | null;
  interests: string[] | null;
  goals: string[] | null;
  company: string | null;
  role_title: string | null;
  team_size: string | null;
  city: string | null;
  social: string | null;
  referral: string | null;
  notifications: Partial<MemberNotifications> | null;
  expert_slug: string | null;
  created_at: string | null;
  account_access?: {
    app_role: "member" | "expert" | "admin" | "super_admin";
    tier: MemberTier;
    experts?: { slug: string } | null;
  } | Array<{
    app_role: "member" | "expert" | "admin" | "super_admin";
    tier: MemberTier;
    experts?: { slug: string } | null;
  }> | null;
}

/* ---------------- 事件廣播(Navbar / Account 重render) ---------------- */

type MemberListener = (member: AigroMember | null) => void;
const memberListeners = new Set<MemberListener>();

/** 訂閱會員態變化;回傳 unsubscribe。useMember() 用呢個。 */
export function subscribeMember(listener: MemberListener): () => void {
  memberListeners.add(listener);
  return () => {
    memberListeners.delete(listener);
  };
}

function notifyMember(): void {
  const m = loadMember();
  memberListeners.forEach((l) => {
    try {
      l(m);
    } catch {
      /* listener error 唔影響其他 */
    }
  });
}

/* ---------------- 當前 auth user(畀 sessions.ts 記對話用) ---------------- */

let currentUserId: string | null = null;

/** 已登入 Supabase user id;未登入 / 示範模式 = null。initAuth() 維護。 */
export function getAuthUserId(): string | null {
  return currentUserId;
}

/* ---------------- pending profile(magic-link 空窗期嘅 onboarding 欄位) ---------------- */

const PENDING_PROFILE_KEY = "aigro-pending-profile";

/**
 * Join 完成後暫存 onboarding 欄位(name/interests/goals/persona/tier)。
 * magic-link 要clickemail 先有 session,呢啲欄位等 `initAuth` 喺
 * SIGNED_IN 時先 upsert 入 profiles。
 */
export function savePendingProfile(fields: Partial<AigroMember>): void {
  try {
    window.localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(fields));
  } catch {
    /* noop */
  }
}

function readPendingProfile(): Partial<AigroMember> | null {
  try {
    const raw = window.localStorage.getItem(PENDING_PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Partial<AigroMember>) : null;
  } catch {
    return null;
  }
}

function clearPendingProfile(): void {
  try {
    window.localStorage.removeItem(PENDING_PROFILE_KEY);
  } catch {
    /* noop */
  }
}

/* ---------------- member ↔ profiles 映射 ---------------- */

function memberToProfile(member: AigroMember, userId: string): Record<string, unknown> {
  return {
    id: userId,
    email: member.email,
    name: member.name,
    persona: member.persona,
    interests: member.interests,
    goals: member.goals ?? [],
    company: member.company ?? null,
    role_title: member.roleTitle ?? null,
    team_size: member.teamSize ?? null,
    city: member.city ?? "香港",
    social: member.social ?? null,
    referral: member.referral ?? null,
    notifications: member.notifications,
  };
}

function profileToMember(row: ProfileRow): AigroMember {
  const access = Array.isArray(row.account_access)
    ? row.account_access[0]
    : row.account_access;
  const tier = access?.tier ?? "free";
  const role: MemberRole = access?.app_role === "super_admin"
    ? "super_admin"
    : access?.app_role === "admin"
    ? "admin"
    : access?.app_role === "expert"
    ? "expert"
    : tier === "free"
    ? "free"
    : "founding";
  const clean = sanitize({
    name: row.name ?? undefined,
    email: row.email,
    interests: row.interests ?? [],
    persona: row.persona ?? undefined,
    role,
    tier,
    joinedAt: row.created_at ? Date.parse(row.created_at) : Date.now(),
    notifications: row.notifications ?? undefined,
    company: row.company ?? undefined,
    roleTitle: row.role_title ?? undefined,
    teamSize: row.team_size ?? undefined,
    city: row.city ?? undefined,
    goals: row.goals ?? undefined,
    social: row.social ?? undefined,
    referral: row.referral ?? undefined,
  });
  // sanitize 保證非 null(email 必填);雙重保險
  return (
    clean ?? {
      name: row.email.split("@")[0] || "會員",
      email: row.email,
      interests: [],
      persona: null,
      role: "free",
      tier: "free",
      joinedAt: Date.now(),
      notifications: { ...DEFAULT_NOTIFICATIONS },
    }
  );
}

/** 寫入 localStorage 快取 + 廣播(唔觸發 supabase 同步,避免循環) */
function writeMemberCache(member: AigroMember): void {
  try {
    window.localStorage.setItem(MEMBER_KEY, JSON.stringify(member));
  } catch {
    /* noop */
  }
  notifyMember();
}

/**
 * 將 member upsert 去 profiles(只限已登入 + 非 demo + email 夾 session)。
 * saveMember 自動 call;demo / 訪客 / 離線 → skip。
 */
async function syncProfileToSupabase(member: AigroMember): Promise<void> {
  if (!supabase || !supabaseReady || member.demo) return;
  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user || !user.email || user.email !== member.email) return;
    await supabase
      .from("profiles")
      .upsert(memberToProfile(member, user.id), { onConflict: "id" });
  } catch {
    /* 離線靜默 — local 快取仍然有效 */
  }
}

/** 登入後 fetch(或建立)profiles row → 寫入 local 快取 + 廣播 */
async function hydrateProfile(user: User): Promise<void> {
  if (!supabase) return;
  if (user.is_anonymous) return;
  try {
    const { data: row } = await supabase
      .from("profiles")
      .select("*,account_access(app_role,tier,experts(slug))")
      .eq("id", user.id)
      .maybeSingle();
    const pending = readPendingProfile();
    const email = user.email ?? pending?.email ?? "";

    if (!row) {
      // 第一次登入:用 pending(Join onboarding)或 email 預設建立 profile
      const seed = sanitize({
        interests: [],
        persona: null,
        joinedAt: Date.now(),
        notifications: { ...DEFAULT_NOTIFICATIONS },
        ...pending,
        email,
        role: "free",
        tier: "free",
      });
      if (!seed) return;
      await supabase
        .from("profiles")
        .upsert(memberToProfile(seed, user.id), { onConflict: "id" });
      clearPendingProfile();
      writeMemberCache(seed);
      return;
    }

    // 已有 profile:食埋 pending(如有)再更新,然後快取
    let member = profileToMember(row as ProfileRow);
    if (pending) {
      member = sanitize({
        ...member,
        ...pending,
        email: member.email,
        role: member.role,
        tier: member.tier,
      }) ?? member;
      await supabase
        .from("profiles")
        .upsert(memberToProfile(member, user.id), { onConflict: "id" });
      clearPendingProfile();
    }
    writeMemberCache(member);
  } catch {
    /* 離線靜默 */
  }
}

let authInitialized = false;

/**
 * 啟動 Supabase auth listener(app 入口 call 一次,idempotent)。
 * - hydrate 現有 session
 * - SIGNED_IN → fetch/upsert profiles → 快取 + 廣播
 * - SIGNED_OUT → 清快取 + 廣播
 * 無 env → no-op(示範模式)。
 */
export function initAuth(): void {
  if (!supabase || !supabaseReady || authInitialized) return;
  authInitialized = true;

  void supabase.auth
    .getSession()
    .then(({ data }) => {
      const user = data.session?.user ?? null;
      currentUserId = user?.id ?? null;
      if (user) void hydrateProfile(user);
    })
    .finally(() => {
      // 即使係訪客(無 session)都廣播一次,俾 useMember 結束 loading
      notifyMember();
    });

  supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user ?? null;
    currentUserId = user?.id ?? null;
    if (event === "SIGNED_IN" && user) {
      void hydrateProfile(user);
    } else if (event === "SIGNED_OUT") {
      try {
        window.localStorage.removeItem(MEMBER_KEY);
      } catch {
        /* noop */
      }
      notifyMember();
    }
  });
}

/**
 * 發送 magic-link 登入 email。回傳 ok / error(離線或無 env → ok:false)。
 * 成功後用戶要clickemail 連結先建立 session(之後 initAuth 接手)。
 */
export async function sendMagicLink(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase || !supabaseReady) return { ok: false, error: "offline" };
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user.is_anonymous) {
      const { error: upgradeError } = await supabase.auth.updateUser(
        { email: email.trim() },
        { emailRedirectTo: window.location.origin }
      );
      if (upgradeError) return { ok: false, error: upgradeError.message };
      return { ok: true };
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
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
