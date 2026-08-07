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

export type AdminModuleStatus = "live" | "beta";

export interface AdminModule {
  to: string;
  end?: boolean;
  zh: string;
  en: string;
  icon: LucideIcon;
  status: AdminModuleStatus;
  betaReason: string;
  reviewedAt: string;
}

const REVIEWED_AT = "2026-08-08";

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
    status: "live",
    betaReason: "",
    reviewedAt: REVIEWED_AT,
  },
  {
    to: "/admin/experts",
    zh: "專家管理",
    en: "Experts",
    icon: Users,
    status: "beta",
    betaReason: "建立及編輯導師仍只儲存在瀏覽器，未寫入 experts 後端。",
    reviewedAt: REVIEWED_AT,
  },
  {
    to: "/admin/studio",
    zh: "專家工作室",
    en: "Studio",
    icon: FlaskConical,
    status: "beta",
    betaReason: "CMS RPC 已存在，但 production worker functions 與排程 secrets 尚未接通。",
    reviewedAt: REVIEWED_AT,
  },
  {
    to: "/admin/crm",
    zh: "CRM",
    en: "CRM",
    icon: Target,
    status: "live",
    betaReason: "",
    reviewedAt: REVIEWED_AT,
  },
  {
    to: "/admin/content",
    zh: "內容管理",
    en: "Content",
    icon: FileText,
    status: "live",
    betaReason: "",
    reviewedAt: REVIEWED_AT,
  },
  {
    to: "/admin/sources",
    zh: "來源",
    en: "Sources",
    icon: Radio,
    status: "beta",
    betaReason: "來源 CRUD 已接通；MCP 輸出端點仍未接後端。",
    reviewedAt: REVIEWED_AT,
  },
  {
    to: "/admin/skills",
    zh: "技能",
    en: "Skills",
    icon: Puzzle,
    status: "beta",
    betaReason: "目前只讀取程式內靜態目錄，尚無 skills 資料表及管理操作。",
    reviewedAt: REVIEWED_AT,
  },
  {
    to: "/admin/engagement",
    zh: "對話參與",
    en: "Engagement",
    icon: MessagesSquare,
    status: "live",
    betaReason: "",
    reviewedAt: REVIEWED_AT,
  },
  {
    to: "/admin/members",
    zh: "會員管理",
    en: "Members",
    icon: UserRound,
    status: "live",
    betaReason: "",
    reviewedAt: REVIEWED_AT,
  },
  {
    to: "/admin/emails",
    zh: "郵件",
    en: "Emails",
    icon: Mail,
    status: "beta",
    betaReason: "名單查詢及 CSV 匯出已接通；寄送、模板及投遞狀態尚未接入。",
    reviewedAt: REVIEWED_AT,
  },
  {
    to: "/admin/settings",
    zh: "設定",
    en: "Settings",
    icon: Settings,
    status: "beta",
    betaReason: "目前是連線診斷與路線圖，尚未提供可寫入的系統設定。",
    reviewedAt: REVIEWED_AT,
  },
] as const;

export function adminModuleForPath(pathname: string): AdminModule {
  return [...ADMIN_MODULES]
    .sort((a, b) => b.to.length - a.to.length)
    .find((module) =>
      module.end
        ? pathname === module.to
        : pathname === module.to || pathname.startsWith(`${module.to}/`)
    ) ?? ADMIN_MODULES[0];
}
