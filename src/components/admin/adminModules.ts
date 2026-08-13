import {
  FileText,
  FlaskConical,
  LayoutDashboard,
  Mail,
  MessagesSquare,
  Puzzle,
  Radio,
  Settings,
  Target,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminModuleStatus = "live" | "beta" | "readonly" | "blocked" | "planned";
export type AdminModuleGroup = "overview" | "operations" | "intelligence" | "system";

export interface AdminModule {
  to: string;
  end?: boolean;
  zh: string;
  en: string;
  icon: LucideIcon;
  group: AdminModuleGroup;
  status: AdminModuleStatus;
  betaReason: string;
  reviewedAt: string;
}

export type ProductionIntegrationStatus = "live" | "beta" | "blocked" | "planned";

export interface ProductionIntegration {
  key: string;
  label: string;
  status: ProductionIntegrationStatus;
}

const REVIEWED_AT = "2026-08-14";

/**
 * Verified production integration registry shown in Admin Settings.
 * Keep a capability blocked until its provider credentials, runtime path and
 * end-to-end smoke test have all passed; schema or deployed code alone is beta.
 */
export const PRODUCTION_INTEGRATIONS: readonly ProductionIntegration[] = [
  { key: "intelligence", label: "情報管道(argro → items / sources)", status: "live" },
  { key: "member_login", label: "會員密碼登入 + profiles", status: "live" },
  { key: "email_auth", label: "Email signup／magic-link 投遞驗收", status: "beta" },
  { key: "admin", label: "Master Admin + Expert Portal 真查詢", status: "live" },
  { key: "edge_functions", label: "六個 Supabase Edge Functions", status: "beta" },
  { key: "anonymous_chat", label: "訪客匿名 JWT 對話", status: "blocked" },
  { key: "instructor_model", label: "AI 導師串流回答 + 對話原子保存", status: "blocked" },
  { key: "distillation", label: "知識庫蒸餾(Storage + worker + providers)", status: "blocked" },
  { key: "persona_compiler", label: "角色蒸餾 Persona Compiler", status: "blocked" },
  { key: "social_sync", label: "TikTok／Instagram 公開資料每日同步", status: "blocked" },
  { key: "youtube_social", label: "YouTube 官方 OAuth／Data API", status: "planned" },
  { key: "booking", label: "真人預約 + Resend 通知", status: "blocked" },
  { key: "lead_scoring", label: "Leads 自動評分(leads 表寫入管道)", status: "beta" },
  { key: "submissions", label: "專家投稿後端(submissions)", status: "planned" },
  { key: "mcp", label: "MCP server 輸出端點", status: "planned" },
] as const;

/**
 * Production capability registry for the master admin control plane.
 *
 * `live` means every control shown by that module is backed by production data.
 * `beta` means at least one visible capability is read-only, local-only, missing
 * a provider/worker, or explicitly described as coming soon.
 */
export const ADMIN_MODULES: readonly AdminModule[] = [
  {
    to: "/admin",
    end: true,
    zh: "總覽",
    en: "Dashboard",
    icon: LayoutDashboard,
    group: "overview",
    status: "live",
    betaReason: "",
    reviewedAt: REVIEWED_AT,
  },
  {
    to: "/admin/experts",
    zh: "專家管理",
    en: "Experts",
    icon: Users,
    group: "operations",
    status: "beta",
    betaReason: "動態公開目錄、20 席上限、owner assignment 同 release gate 已接通；邀請電郵、provider secrets 同首輪 25 題評估仍未完成。",
    reviewedAt: REVIEWED_AT,
  },
  {
    to: "/admin/studio",
    zh: "專家工作室",
    en: "Studio",
    icon: FlaskConical,
    group: "operations",
    status: "blocked",
    betaReason: "CMS、蒸餾、Persona Compiler 同六個 Edge Functions 已部署；provider secrets、匿名 Auth、Vault 排程同首個發佈版本仍未接通。",
    reviewedAt: REVIEWED_AT,
  },
  {
    to: "/admin/crm",
    zh: "CRM",
    en: "CRM",
    icon: Target,
    group: "operations",
    status: "beta",
    betaReason: "按 immutable expert_id 隔離、導師階段／備註／跟進日期及 audit 已接通；contact consent 同模型流入仍待完整驗收。",
    reviewedAt: REVIEWED_AT,
  },
  {
    to: "/admin/content",
    zh: "內容管理",
    en: "Content",
    icon: FileText,
    group: "intelligence",
    status: "live",
    betaReason: "",
    reviewedAt: REVIEWED_AT,
  },
  {
    to: "/admin/sources",
    zh: "來源",
    en: "Sources",
    icon: Radio,
    group: "intelligence",
    status: "beta",
    betaReason: "來源 CRUD 已接通；MCP 輸出端點仍未接後端。",
    reviewedAt: REVIEWED_AT,
  },
  {
    to: "/admin/skills",
    zh: "技能",
    en: "Skills",
    icon: Puzzle,
    group: "intelligence",
    status: "readonly",
    betaReason: "目前只讀取程式內靜態目錄，尚無 skills 資料表及管理操作。",
    reviewedAt: REVIEWED_AT,
  },
  {
    to: "/admin/engagement",
    zh: "對話參與",
    en: "Engagement",
    icon: MessagesSquare,
    group: "operations",
    status: "live",
    betaReason: "",
    reviewedAt: REVIEWED_AT,
  },
  {
    to: "/admin/members",
    zh: "會員管理",
    en: "Members",
    icon: UserRound,
    group: "operations",
    status: "beta",
    betaReason: "會員級別、方案同原子 owner assignment 已接通；Auth 帳戶暫停／刪除仍需受保護 server lifecycle，未喺瀏覽器直接開放。",
    reviewedAt: REVIEWED_AT,
  },
  {
    to: "/admin/emails",
    zh: "郵件",
    en: "Emails",
    icon: Mail,
    group: "operations",
    status: "readonly",
    betaReason: "名單查詢及 CSV 匯出已接通；寄送、模板及投遞狀態尚未接入。",
    reviewedAt: REVIEWED_AT,
  },
  {
    to: "/admin/settings",
    zh: "系統狀態",
    en: "System",
    icon: Settings,
    group: "system",
    status: "live",
    betaReason: "",
    reviewedAt: REVIEWED_AT,
  },
] as const;

export const ADMIN_MODULE_GROUP_LABELS: Readonly<Record<AdminModuleGroup, string>> = {
  overview: "概覽",
  operations: "營運",
  intelligence: "情報系統",
  system: "系統",
};

export const ADMIN_MODULE_STATUS_LABELS: Readonly<Record<AdminModuleStatus, string>> = {
  live: "Live",
  beta: "Beta",
  readonly: "Read-only",
  blocked: "Blocked",
  planned: "Planned",
};

export function adminModuleForPath(pathname: string): AdminModule {
  return [...ADMIN_MODULES]
    .sort((a, b) => b.to.length - a.to.length)
    .find((module) =>
      module.end
        ? pathname === module.to
        : pathname === module.to || pathname.startsWith(`${module.to}/`)
    ) ?? ADMIN_MODULES[0];
}
