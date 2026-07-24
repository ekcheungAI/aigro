import { createContext, useContext, useMemo } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { ArrowUpRight, BadgeCheck, FlaskConical, Lock } from "lucide-react";
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
  { to: "/portal", end: true, zh: "總覽", en: "Overview" },
  { to: "/portal/kb", zh: "分身知識庫", en: "Knowledge" },
  { to: "/portal/insights", zh: "我的情報", en: "Insights" },
  { to: "/portal/profile", zh: "檔案設定", en: "Profile" },
  { to: "/portal/socials", zh: "社交連結", en: "Socials" },
  { to: "/portal/leads", zh: "我的線索", en: "Leads" },
] as const;

const EXPERT_INITIALS: Record<string, string> = {
  "jimmy-lau": "JL",
  "elvin-cheung": "EC",
};

/* ---------------- 專家登入 gate ---------------- */

function PortalGate() {
  const demoLogin = (email: string) => {
    const existing = loadMember();
    saveMember({
      name: email.startsWith("elvin") ? "Elvin Cheung" : "Jimmy Lau 劉泰麟",
      email,
      interests: existing?.interests ?? ["AI", "Technology"],
      role: existing?.role ?? null,
      portalRole: "expert",
      tier: existing?.tier ?? "vip",
      joinedAt: existing?.joinedAt ?? Date.now(),
      notifications: existing?.notifications ?? DEFAULT_NOTIFICATIONS,
    });
    window.location.reload();
  };

  return (
    <div className="flex min-h-[calc(100dvh-57px)] items-center justify-center px-4 py-16">
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
 * 頂欄「AIGRO 專家平台」+ 專家 chip + 返回網站;下面係橫向 tab row
 * (唔係側欄)。warm paper 淺色主題;gate 未過時只顯示專家登入 prompt。
 */
export default function PortalLayout() {
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

  const chipInitials = ctx
    ? (EXPERT_INITIALS[ctx.slug] ?? ctx.expert.nameEn.slice(0, 1))
    : "·";

  return (
    <AdminToastProvider>
      <div className="min-h-[100dvh] bg-bg text-text-primary">
        {/* ---- Top bar ---- */}
        <header className="sticky top-0 z-40 border-b border-border bg-surface">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <Link to="/portal" className="flex items-baseline gap-2">
              <span className="font-display text-[16px] font-medium uppercase tracking-[0.04em] text-text-primary">
                AIGRO<span className="text-lime-text">.</span>
              </span>
              <span className="text-[12px] tracking-wide text-text-muted">
                專家平台
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-3">
              <Link
                to="/"
                className="hidden items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary sm:inline-flex"
              >
                返回網站
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              {ctx && (
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
              )}
            </div>
          </div>

          {/* ---- Tab row(橫向 mini-nav,唔係 sidebar) ---- */}
          {authorized && (
            <nav className="flex gap-1 overflow-x-auto border-t border-border px-4 sm:px-6">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={"end" in item && item.end}
                  className={({ isActive }) =>
                    cn(
                      "relative shrink-0 px-3.5 py-2.5 text-sm transition-colors",
                      isActive
                        ? "font-medium text-text-primary"
                        : "text-text-muted hover:text-text-secondary"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {item.zh}
                      <span
                        className={cn(
                          "ml-1.5 hidden font-mono text-[10px] uppercase tracking-wider sm:inline",
                          isActive ? "text-lime-text" : "text-text-muted/70"
                        )}
                      >
                        {item.en}
                      </span>
                      <span
                        className={cn(
                          "absolute inset-x-3 bottom-0 h-0.5 bg-lime transition-opacity",
                          isActive ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          )}
        </header>

        {/* ---- Content ---- */}
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {ctx ? (
            <PortalExpertContext.Provider value={ctx}>
              <Outlet />
            </PortalExpertContext.Provider>
          ) : (
            <PortalGate />
          )}
        </main>

        {/* ---- Footer caption ---- */}
        {authorized && (
          <footer className="border-t border-border px-4 py-4 sm:px-6">
            <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-text-muted">
              <FlaskConical className="h-3 w-3" />
              專家平台 · v1.17 · Mock data — Supabase 即將接入
            </p>
          </footer>
        )}
      </div>
    </AdminToastProvider>
  );
}
