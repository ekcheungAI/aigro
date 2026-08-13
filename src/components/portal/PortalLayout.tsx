import { createContext, useContext, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  CalendarDays,
  FlaskConical,
  LayoutDashboard,
  Link2,
  Lock,
  Menu,
  Newspaper,
  Share2,
  ShieldCheck,
  Target,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminToastProvider } from "@/components/admin/AdminToast";
import MonogramAvatar from "@/components/MonogramAvatar";
import type { AigroMember } from "@/components/auth/member";
import { useMember } from "@/hooks/useMember";
import ProtectedAreaLoading from "@/components/auth/ProtectedAreaLoading";
import { supabase } from "@/lib/supabase";
import { experts } from "@/data/experts";
import type { Expert } from "@/data/experts";
import { useAdminQuery } from "@/components/admin/adminData";

/* ---------------- Portal expert context ---------------- */

export interface PortalExpertCtx {
  member: AigroMember;
  /** 受保護 account_access 所屬 workspace。 */
  expertId: string;
  slug: string;
  /** DB-backed portal identity；靜態資料只補充已核實導師嘅 editorial sections。 */
  expert: Expert | null;
}

const PortalExpertContext = createContext<PortalExpertCtx | null>(null);

/** 任何 portal 頁面取用「我」嘅專家身份(gate 通過後必有值) */
export function usePortalExpert(): PortalExpertCtx {
  const ctx = useContext(PortalExpertContext);
  if (!ctx) throw new Error("usePortalExpert must be used within PortalLayout");
  return ctx;
}

/* ---------------- Nav ---------------- */

const NAV = [
  { to: "/portal", end: true, zh: "總覽", en: "Overview", icon: LayoutDashboard },
  { to: "/portal/kb", zh: "分身知識庫", en: "Knowledge", icon: FlaskConical },
  { to: "/portal/bookings", zh: "真人預約", en: "Bookings", icon: CalendarDays },
  { to: "/portal/insights", zh: "我的情報", en: "Insights", icon: Newspaper },
  { to: "/portal/profile", zh: "檔案設定", en: "Profile", icon: UserRound },
  { to: "/portal/socials", zh: "社交連結", en: "Socials", icon: Share2 },
  { to: "/portal/leads", zh: "我的線索", en: "Leads", icon: Target },
] as const;

const EXPERT_INITIALS: Record<string, string> = {
  "jimmy-lau": "JL",
  "elvin-cheung": "EC",
};

function initialsFor(slug: string): string {
  if (EXPERT_INITIALS[slug]) return EXPERT_INITIALS[slug];
  const parts = slug.split("-").filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "EX";
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={"end" in item && item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
              isActive
                ? "bg-lime text-on-accent"
                : "text-[#B8C4D0] hover:bg-[#0E2547] hover:text-[#EAF0F6]"
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-on-accent" : "text-[#8593A5]"
                )}
              />
              <span className="font-medium">{item.zh}</span>
              <span
                className={cn(
                  "ml-auto font-mono text-[10px] uppercase tracking-wider",
                  isActive ? "text-on-accent/70" : "text-[#8593A5]"
                )}
              >
                {item.en}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function Wordmark() {
  return (
    <div className="px-3">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-[18px] font-medium uppercase tracking-[0.04em] text-[#EAF0F6]">
          AIGRO<span className="text-lime">.</span>
        </span>
        <span className="text-[11px] tracking-wide text-[#8593A5]">
          專家平台
        </span>
      </div>
      <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-[#8593A5]">
        領航專家後台 · Live data
      </p>
    </div>
  );
}

/* ---------------- 專家登入 gate ---------------- */

function PortalGate() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lime-soft">
          <Lock className="h-5 w-5 text-lime-text" />
        </span>
        <h1 className="mt-5 font-display text-[24px] font-medium text-text-primary">
          需要領航專家帳號登入
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          專家平台而家直接讀 Supabase 真實數據 — 只有領航專家帳號
          （受保護 account_access = expert / admin）先可以管理授權 AI 分身。
        </p>
        <Link
          to="/login"
          className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-lime px-4 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover"
        >
          <ShieldCheck className="h-4 w-4" />
          去登入
        </Link>
        <p className="mt-4 text-xs text-text-muted">
          一般會員請返回{" "}
          <Link
            to="/"
            className="text-lime-text underline-offset-2 hover:underline"
          >
            網站首頁
          </Link>
        </p>
      </div>
    </main>
  );
}

/** 已登入 expert 但 account_access 未連結 workspace — 誠實提示。 */
function UnlinkedNotice({ email }: { email: string }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lime-soft">
          <Link2 className="h-5 w-5 text-lime-text" />
        </span>
        <h1 className="mt-5 font-display text-[24px] font-medium text-text-primary">
          帳號未連結專家身份
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {email} 嘅 account_access 仲未連結導師 workspace — 平台團隊完成 owner assignment 之後，
          分身數據就會喺呢度出現。請聯絡平台處理。
        </p>
        <p className="mt-4 text-xs text-text-muted">
          <Link
            to="/"
            className="text-lime-text underline-offset-2 hover:underline"
          >
            返回網站
          </Link>
        </p>
      </div>
    </main>
  );
}

/* ---------------- Layout ---------------- */

/**
 * Expert users receive only their linked identity. A super-admin can operate
 * every expert workspace and chooses the active identity in the portal header.
 */
interface PortalWorkspaceRow {
  id: string;
  slug: string;
  display_name: string;
  name_en: string | null;
  name_zh: string | null;
  title: string | null;
  bio: string | null;
  brand_color: string | null;
  specialties: string[] | null;
  quote: string | null;
  credential: string | null;
  verified: boolean;
  status: string;
}

async function fetchPortalWorkspaces(): Promise<PortalWorkspaceRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("experts")
    .select("id,slug,display_name,name_en,name_zh,title,bio,brand_color,specialties,quote,credential,verified,status")
    .neq("slug", "platform")
    .order("display_name");
  if (error) throw new Error(error.message);
  return (data ?? []) as PortalWorkspaceRow[];
}

function portalExpert(row: PortalWorkspaceRow): Expert {
  const editorial = experts.find((entry) => entry.slug === row.slug);
  return {
    ...(editorial ?? {}),
    slug: row.slug,
    nameEn: row.name_en || editorial?.nameEn || row.display_name,
    nameZh: row.name_zh ?? editorial?.nameZh ?? "",
    title: row.title || editorial?.title || "AIGRO 領航導師",
    image: editorial?.image ?? "",
    verified: row.verified && row.status === "active",
    specialties: row.specialties?.length
      ? row.specialties
      : editorial?.specialties ?? [],
    bio: row.bio ?? editorial?.bio,
    brandColor: row.brand_color ?? editorial?.brandColor,
    quote: row.quote ?? editorial?.quote,
    credential: row.credential ?? editorial?.credential,
  };
}

/**
 * 專家平台外殼 — nested-route 模式:本組件渲染 <Outlet/>,
 * App.tsx 須以 <Route path="portal" element={<PortalLayout/>}> + 子路由接入。
 * 結構對齊 AdminLayout:左側 240px near-black 側欄(lg+),
 * mobile 收合為頂部 drawer;頂欄放「返回網站」+ 專家 chip。
 * Gate:未登入 / 唔係 expert → 只顯示登入提示(冇示範帳號,冇假身份)。
 */
export default function PortalLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState("");
  const { member, loading: memberLoading } = useMember();
  const authorized =
    member !== null && (
      member.role === "expert" ||
      member.role === "admin" ||
      member.role === "super_admin"
    );

  const {
    data: portalWorkspaces,
    loading: slugLoading,
    error: slugError,
  } = useAdminQuery(
    fetchPortalWorkspaces,
    [authorized, member?.role]
  );
  const portalSlugs = portalWorkspaces?.map((workspace) => workspace.slug) ?? [];
  const slug = selectedSlug && portalSlugs.includes(selectedSlug)
    ? selectedSlug
    : portalSlugs[0] ?? null;

  if (memberLoading) {
    return (
      <AdminToastProvider>
        <ProtectedAreaLoading />
      </AdminToastProvider>
    );
  }

  if (!authorized) {
    return (
      <AdminToastProvider>
        <div className="min-h-[100dvh] bg-bg text-text-primary">
          <PortalGate />
        </div>
      </AdminToastProvider>
    );
  }

  if (slugLoading) {
    return (
      <AdminToastProvider>
        <ProtectedAreaLoading label="正在載入專家身份…" />
      </AdminToastProvider>
    );
  }

  if (slugError || !slug) {
    return (
      <AdminToastProvider>
        <div className="min-h-[100dvh] bg-bg text-text-primary">
          <UnlinkedNotice email={member.email} />
        </div>
      </AdminToastProvider>
    );
  }

  const workspace = portalWorkspaces?.find((entry) => entry.slug === slug) ?? null;
  const expert = workspace ? portalExpert(workspace) : null;
  if (!workspace) {
    return (
      <AdminToastProvider>
        <div className="min-h-[100dvh] bg-bg text-text-primary">
          <UnlinkedNotice email={member.email} />
        </div>
      </AdminToastProvider>
    );
  }
  const ctx: PortalExpertCtx = { member, expertId: workspace.id, slug, expert };
  const chipInitials = initialsFor(slug);
  const chipName = expert?.nameEn.split(" ")[0] ?? slug;
  const chipColor = expert?.brandColor ?? "#466A5E";

  return (
    <AdminToastProvider>
      <div className="min-h-[100dvh] bg-bg text-text-primary">
        {/* ---- Desktop sidebar ---- */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-[#1C3355] bg-[#02122C] lg:flex">
          <div className="border-b border-[#1C3355] py-5">
            <Wordmark />
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            <SidebarNav />
          </div>
          <div className="border-t border-[#1C3355] px-3 py-4">
            <div className="rounded-md border border-[#1C3355] bg-[#0E2547] px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-xs text-[#B8C4D0]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
                分身狀態
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#8593A5]">
                {expert?.promptVersion
                  ? `${expert.promptVersion} · ${slug}`
                  : `slug:${slug}`}
              </p>
            </div>
          </div>
        </aside>

        {/* ---- Mobile drawer ---- */}
        <AnimatePresence>
          {drawerOpen && (
            <>
              <motion.div
                key="nav-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setDrawerOpen(false)}
                className="fixed inset-0 z-[90] bg-[#02122C]/50 lg:hidden"
              />
              <motion.aside
                key="nav-drawer"
                initial={{ y: "-100%" }}
                animate={{ y: 0 }}
                exit={{ y: "-100%" }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="fixed inset-x-0 top-0 z-[95] border-b border-[#1C3355] bg-[#02122C] pb-4 lg:hidden"
              >
                <div className="flex items-center justify-between border-b border-[#1C3355] px-3 py-4">
                  <Wordmark />
                  <button
                    type="button"
                    aria-label="關閉選單"
                    onClick={() => setDrawerOpen(false)}
                    className="rounded-md p-2 text-[#B8C4D0] hover:bg-[#0E2547]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="pt-3">
                  <SidebarNav onNavigate={() => setDrawerOpen(false)} />
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ---- Main column ---- */}
        <div className="flex min-h-[100dvh] flex-col lg:pl-60">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
            <button
              type="button"
              aria-label="開啟選單"
              onClick={() => setDrawerOpen(true)}
              className="rounded-md border border-border p-1.5 text-text-secondary hover:border-border-strong lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="font-display text-[15px] font-medium uppercase tracking-[0.04em] text-text-primary lg:hidden">
              AIGRO<span className="text-lime-text">.</span> 專家平台
            </span>
            <span className="hidden text-sm text-text-muted lg:block">
              AIGRO Expert Portal — 領航專家後台
            </span>
            <div className="ml-auto flex items-center gap-3">
              {(member.role === "admin" || member.role === "super_admin") &&
                portalSlugs.length > 1 && (
                <label className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
                    管理分身
                  </span>
                  <select
                    aria-label="選擇要管理的專家分身"
                    value={slug}
                    onChange={(event) => setSelectedSlug(event.target.value)}
                    className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-text-primary focus:border-lime focus:outline-none"
                  >
                    {(portalWorkspaces ?? []).map((option) => (
                      <option key={option.slug} value={option.slug}>
                        {option.display_name || option.slug}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <Link
                to="/"
                className="hidden items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary sm:inline-flex"
              >
                返回網站
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <div className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3">
                <MonogramAvatar
                  initials={chipInitials}
                  color={chipColor}
                  size={24}
                  verified={expert?.verified ?? false}
                />
                <span className="text-xs text-text-primary">
                  {chipName}{" "}
                  <span className="text-text-muted">· 領航專家</span>
                </span>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <PortalExpertContext.Provider value={ctx}>
              <Outlet />
            </PortalExpertContext.Provider>
          </main>
        </div>
      </div>
    </AdminToastProvider>
  );
}
