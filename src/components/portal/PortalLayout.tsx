import { createContext, useContext, useMemo, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  BadgeCheck,
  FlaskConical,
  LayoutDashboard,
  Lock,
  Menu,
  Newspaper,
  Share2,
  Target,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminToastProvider } from "@/components/admin/AdminToast";
import MonogramAvatar from "@/components/MonogramAvatar";
import {
  DEFAULT_NOTIFICATIONS,
  loadMember,
  saveMember,
} from "@/components/auth/member";
import type { AigroMember } from "@/components/auth/member";
import { experts } from "@/data/experts";
import type { Expert } from "@/data/experts";
import { studioExperts } from "@/data/admin-mock";
import type { StudioExpert } from "@/data/admin-mock";
import { expertSlugForEmail } from "@/data/portal-mock";

/* ---------------- Portal expert context ---------------- */

export interface PortalExpertCtx {
  member: AigroMember;
  /** experts.ts slug,如 "jimmy-lau" */
  slug: string;
  /** 公開檔案(experts.ts) */
  expert: Expert;
  /** 工作室檔(admin-mock studioExperts) */
  studio: StudioExpert;
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
  { to: "/portal/insights", zh: "我的情報", en: "Insights", icon: Newspaper },
  { to: "/portal/profile", zh: "檔案設定", en: "Profile", icon: UserRound },
  { to: "/portal/socials", zh: "社交連結", en: "Socials", icon: Share2 },
  { to: "/portal/leads", zh: "我的線索", en: "Leads", icon: Target },
] as const;

const EXPERT_INITIALS: Record<string, string> = {
  "jimmy-lau": "JL",
  "elvin-cheung": "EC",
};

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
                : "text-[#C6C1B8] hover:bg-[#1C1C19] hover:text-[#F1EEE8]"
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-on-accent" : "text-[#938D83]"
                )}
              />
              <span className="font-medium">{item.zh}</span>
              <span
                className={cn(
                  "ml-auto font-mono text-[10px] uppercase tracking-wider",
                  isActive ? "text-on-accent/70" : "text-[#938D83]"
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
        <span className="font-display text-[18px] font-medium uppercase tracking-[0.04em] text-[#F1EEE8]">
          AIGRO<span className="text-lime">.</span>
        </span>
        <span className="text-[11px] tracking-wide text-[#938D83]">
          專家平台
        </span>
      </div>
      <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-[#938D83]">
        領航專家後台 · v1.18
      </p>
    </div>
  );
}

/* ---------------- 專家登入 gate ---------------- */

function PortalGate() {
  const demoLogin = (email: string) => {
    const existing = loadMember();
    saveMember({
      name: email.startsWith("elvin") ? "Elvin Cheung" : "Jimmy Lau 劉泰麟",
      email,
      interests: existing?.interests ?? ["AI", "Technology"],
      persona: existing?.persona ?? null,
      role: "expert",
      portalRole: "expert",
      tier: existing?.tier ?? "vip",
      joinedAt: existing?.joinedAt ?? Date.now(),
      notifications: existing?.notifications ?? DEFAULT_NOTIFICATIONS,
    });
    window.location.reload();
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lime-soft">
          <Lock className="h-5 w-5 text-lime-text" />
        </span>
        <h1 className="mt-5 font-display text-[24px] font-medium text-text-primary">
          呢個區域只限領航專家
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          專家平台係領航專家管理自己 AI 分身嘅地方 — 知識蒸餾、情報發佈、
          檔案同線索,全部以本人身份登入。
        </p>
        <p className="mt-4 rounded-md border border-border bg-card/60 px-4 py-3 font-mono text-xs leading-relaxed text-text-muted">
          示範模式:用 jimmy@dotai.hk 登入
          <br />
          (或 elvin@ekcheung.com 切換 Elvin 視角)
        </p>
        <button
          type="button"
          onClick={() => demoLogin("jimmy@dotai.hk")}
          className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-lime px-4 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover"
        >
          <BadgeCheck className="h-4 w-4" />
          以領航專家身份登入(示範)
        </button>
        <p className="mt-4 text-xs text-text-muted">
          一般會員請返回{" "}
          <Link
            to="/login"
            className="text-lime-text underline-offset-2 hover:underline"
          >
            會員登入
          </Link>
        </p>
      </div>
    </div>
  );
}

/* ---------------- Layout ---------------- */

/**
 * 專家平台外殼 — nested-route 模式:本組件渲染 <Outlet/>,
 * App.tsx 須以 <Route path="portal" element={<PortalLayout/>}> + 子路由接入。
 * 結構對齊 AdminLayout:左側 240px near-black 側欄(lg+),
 * mobile 收合為頂部 drawer;頂欄放「返回網站」+ 專家 chip。
 * 內容區 warm paper;gate 未過時只顯示專家登入 prompt(唔顯示側欄)。
 */
export default function PortalLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const member = loadMember();
  const authorized =
    member !== null &&
    (member.portalRole === "expert" || member.portalRole === "admin");

  const ctx = useMemo<PortalExpertCtx | null>(() => {
    if (!authorized || !member) return null;
    const slug = expertSlugForEmail(member.email);
    const expert = experts.find((e) => e.slug === slug) ?? experts[0];
    const studio =
      studioExperts.find((e) => e.slug === slug) ?? studioExperts[0];
    return { member, slug: expert.slug, expert, studio };
  }, [authorized, member]);

  if (!ctx) {
    return (
      <AdminToastProvider>
        <div className="min-h-[100dvh] bg-bg text-text-primary">
          <PortalGate />
        </div>
      </AdminToastProvider>
    );
  }

  const chipInitials = EXPERT_INITIALS[ctx.slug] ?? ctx.expert.nameEn.slice(0, 1);

  return (
    <AdminToastProvider>
      <div className="min-h-[100dvh] bg-bg text-text-primary">
        {/* ---- Desktop sidebar ---- */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-[#35302A] bg-[#0D0D0C] lg:flex">
          <div className="border-b border-[#35302A] py-5">
            <Wordmark />
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            <SidebarNav />
          </div>
          <div className="border-t border-[#35302A] px-3 py-4">
            <div className="rounded-md border border-[#35302A] bg-[#161614] px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-xs text-[#C6C1B8]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
                分身狀態
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#938D83]">
                Prompt v1.0 已上線
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
                className="fixed inset-0 z-[90] bg-[#0D0D0C]/50 lg:hidden"
              />
              <motion.aside
                key="nav-drawer"
                initial={{ y: "-100%" }}
                animate={{ y: 0 }}
                exit={{ y: "-100%" }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="fixed inset-x-0 top-0 z-[95] border-b border-[#35302A] bg-[#0D0D0C] pb-4 lg:hidden"
              >
                <div className="flex items-center justify-between border-b border-[#35302A] px-3 py-4">
                  <Wordmark />
                  <button
                    type="button"
                    aria-label="關閉選單"
                    onClick={() => setDrawerOpen(false)}
                    className="rounded-md p-2 text-[#C6C1B8] hover:bg-[#1C1C19]"
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
                  color={ctx.expert.brandColor ?? "#466A5E"}
                  size={24}
                  verified
                />
                <span className="text-xs text-text-primary">
                  {ctx.expert.nameEn.split(" ")[0]}{" "}
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
