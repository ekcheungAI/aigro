import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useMember } from "@/hooks/useMember";
import { cn } from "@/lib/utils";
import { REVEAL_EASE } from "@/components/Reveal";
import {
  clearMember,
  ROLE_LABELS,
} from "@/components/auth/member";
import MemberAvatar from "@/components/auth/MemberAvatar";
import useModalDialog from "@/hooks/useModalDialog";

const NAV_LINKS = [
  { to: "/insights", en: "Insights", zh: "情報" },
  { to: "/skills", en: "Skills", zh: "技能" },
  { to: "/experts", en: "Experts", zh: "專家", comingSoon: true },
  { to: "/ask", en: "Ask", zh: "問答", comingSoon: true },
] as const;

function ComingSoonTag({
  overHero = false,
  mobile = false,
}: {
  overHero?: boolean;
  mobile?: boolean;
}) {
  if (!mobile) {
    return (
      <span
        data-ui="coming-soon-tag"
        data-layout="desktop-flag"
        className={cn(
          "ml-1 inline-flex h-[22px] shrink-0 items-stretch overflow-hidden whitespace-nowrap rounded-[3px] border font-mono text-[9px] font-semibold uppercase leading-none tracking-[0.14em]",
          overHero
            ? "border-band-ink/35 bg-band-surface text-band-ink"
            : "border-ink/35 bg-surface text-ink"
        )}
      >
        <span
          data-ui="coming-soon-edge"
          aria-hidden="true"
          className="w-[3px] shrink-0 bg-lime"
        />
        <span className="flex items-center px-2">Coming Soon</span>
      </span>
    );
  }

  return (
    <span
      data-ui="coming-soon-tag"
      data-layout="mobile-label"
      className={cn(
        "ml-1 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase leading-none tracking-[0.12em]",
        "border-ink/25 bg-ink-soft text-ink"
      )}
    >
      <span
        data-ui="coming-soon-hairline"
        aria-hidden="true"
        className="h-px w-2.5 bg-current opacity-70"
      />
      Coming Soon
    </span>
  );
}

/**
 * Navbar (design.md §6.1, elevated): sticky top-0 z-50, 64px.
 * Transparent over the Home cinematic hero at page top (band colors);
 * solid surface + 1px border after 24px scroll (200ms transition).
 */
export default function Navbar() {
  const { isDark, toggleTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const authSearch = (mode: "join" | "login") =>
    `?auth=${mode}&next=${encodeURIComponent(pathname)}`;
  // 會員態 — useMember 響應式(auth state change / 跨分頁 / demo 登入都即時更新)
  const { member } = useMember();
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const { dialogRef, triggerRef } = useModalDialog(drawerOpen, closeDrawer);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // Transparent-over-hero only on Home, only at the very top
  const overHero = pathname === "/" && !scrolled;

  // 4 級制度:expert chip → 專家平台;admin chip → 管理後台;其他 → 會員專區
  const memberChipTo = member
    ? member.role === "expert"
      ? "/portal"
      : member.role === "admin" || member.role === "super_admin"
        ? "/admin"
        : "/account"
    : "/account";
  const memberAreaLabel = member
    ? member.role === "expert"
      ? "專家平台"
      : member.role === "admin" || member.role === "super_admin"
        ? "管理後台"
        : "會員專區"
    : "會員專區";

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 h-16 border-b transition-[background-color,border-color] duration-200",
          overHero ? "border-transparent bg-transparent" : "bg-surface"
        )}
      >
        <div className="mx-auto flex h-full max-w-container items-center gap-3 px-6 2xl:gap-6">
          <Link to="/" className="flex min-h-11 shrink-0 items-center gap-2" aria-label="AIGRO 首頁">
            <img
              src="/brand/aigro-wordmark-navy-transparent.png"
              alt="AIGRO"
              width={1267}
              height={636}
              className="h-8 w-auto dark:hidden"
            />
            <img
              src="/brand/aigro-wordmark-white-transparent.png"
              alt="AIGRO"
              width={1267}
              height={636}
              className="hidden h-8 w-auto dark:block"
            />
          </Link>

          {/* Desktop nav — bilingual labels */}
          <nav className="mx-auto hidden h-full min-w-0 items-center gap-1 lg:flex" aria-label="主導航">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => cn(
                  "relative inline-flex h-full min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap px-3 font-sans text-label transition-colors duration-150 xl:px-4",
                  overHero
                    ? "text-band-text-secondary hover:text-band-text"
                    : "text-text-secondary hover:text-text-primary",
                  isActive && (overHero ? "text-band-text" : "text-text-primary")
                )}
              >
                {({ isActive }) => (
                  <>
                    <span>{link.en}</span>
                    <span
                      data-ui="nav-secondary-label"
                      className={cn(
                        "hidden text-caption xl:inline",
                        isActive
                          ? overHero ? "text-band-ink" : "text-ink"
                          : overHero ? "text-band-text-muted" : "text-text-muted"
                      )}
                    >
                      {link.zh}
                    </span>
                    {"comingSoon" in link && link.comingSoon && (
                      <ComingSoonTag overHero={overHero} />
                    )}
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute inset-x-2.5 bottom-0 h-0.5 2xl:inset-x-4",
                          overHero ? "bg-band-ink" : "bg-ink"
                        )}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right: theme toggle + subscribe */}
          <div className="ml-auto flex shrink-0 items-center gap-3 lg:ml-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "切換至淺色模式" : "切換至深色模式"}
              className={cn(
                "press flex h-11 w-11 items-center justify-center rounded-md",
                overHero
                  ? "text-band-text-secondary hover:bg-band-ink-soft hover:text-band-text"
                  : "text-text-secondary hover:bg-ink-soft hover:text-ink"
              )}
            >
              {isDark ? (
                <Sun className="h-5 w-5 transition-transform duration-200" strokeWidth={1.5} />
              ) : (
                <Moon className="h-5 w-5 transition-transform duration-200" strokeWidth={1.5} />
              )}
            </button>
            {member && (
              <div ref={accountMenuRef} className="relative hidden shrink-0 sm:block">
                <button
                  type="button"
                  onClick={() => setAccountOpen((open) => !open)}
                  aria-label={`${member.name} 帳戶選單`}
                  aria-haspopup="true"
                  aria-expanded={accountOpen}
                  aria-controls="account-navigation"
                  className={cn(
                    "press inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-md border pl-1.5 pr-2.5 font-sans",
                    overHero
                      ? "border-band-border-strong hover:bg-band-ink-soft"
                      : "border-border-strong bg-surface hover:bg-ink-soft"
                  )}
                >
                  <MemberAvatar member={member} size={32} />
                  <span className={cn(
                    "hidden text-label 2xl:inline",
                    overHero ? "text-band-text" : "text-text-primary"
                  )}>
                    {memberAreaLabel}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-150",
                      accountOpen && "rotate-180",
                      overHero ? "text-band-text-muted" : "text-text-muted"
                    )}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </button>

                {accountOpen && (
                  <nav
                    id="account-navigation"
                    aria-label="帳戶導覽"
                    className="absolute right-0 top-full z-20 mt-2 w-64 rounded-md border bg-surface p-2 shadow-card dark:shadow-none"
                  >
                    <div className="flex items-center gap-3 border-b px-3 pb-3 pt-2">
                      <MemberAvatar member={member} size={40} />
                      <div className="min-w-0">
                        <p className="truncate text-label text-text-primary">{member.name}</p>
                        <p className="mt-1 text-caption text-text-muted">{ROLE_LABELS[member.role]}</p>
                      </div>
                    </div>
                    <Link
                      to={memberChipTo}
                      onClick={() => setAccountOpen(false)}
                      className="press mt-1 flex min-h-11 items-center gap-3 rounded-md px-3 text-label text-text-secondary hover:bg-ink-soft hover:text-text-primary"
                    >
                      <LayoutDashboard className="h-4 w-4 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
                      {memberAreaLabel}
                    </Link>
                    {memberChipTo !== "/account" && (
                      <Link
                        to="/account"
                        onClick={() => setAccountOpen(false)}
                        className="press flex min-h-11 items-center gap-3 rounded-md px-3 text-label text-text-secondary hover:bg-ink-soft hover:text-text-primary"
                      >
                        <UserRound className="h-4 w-4 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
                        帳戶設定
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        clearMember();
                      }}
                      className="press flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-label text-text-secondary hover:bg-card hover:text-text-primary"
                    >
                      <LogOut className="h-4 w-4 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
                      登出
                    </button>
                  </nav>
                )}
              </div>
            )}
            {!member && (
              /* 未登入:登入 ghost + 加入 Club lime primary */
              <div className="hidden shrink-0 items-center gap-2 whitespace-nowrap sm:flex">
                <Link
                  to={authSearch("login")}
                  className={cn(
                    "press inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-md px-4 text-label",
                    overHero
                      ? "text-band-text-secondary hover:bg-band-ink-soft hover:text-band-text"
                      : "text-text-secondary hover:bg-ink-soft hover:text-ink"
                  )}
                >
                  登入
                </Link>
                <Link
                  to={authSearch("join")}
                  className="press inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-md bg-lime px-4 text-label text-on-accent hover:bg-lime-hover"
                >
                  加入 Club
                </Link>
              </div>
            )}
            {/* Mobile hamburger */}
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="開啟選單"
              aria-expanded={drawerOpen}
              aria-controls="mobile-main-menu"
              className={cn(
                "press flex h-11 w-11 items-center justify-center rounded-md lg:hidden",
                overHero ? "text-band-text" : "text-text-primary"
              )}
            >
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen drawer (design.md §6.1: solid overlay, big serif links, 80ms stagger) */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            ref={dialogRef}
            id="mobile-main-menu"
            role="dialog"
            aria-modal="true"
            aria-label="主選單"
            tabIndex={-1}
            className="fixed inset-0 z-[60] flex flex-col overscroll-contain bg-overlay lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex h-16 items-center justify-between border-b px-6">
              <img
                src="/brand/aigro-wordmark-navy-transparent.png"
                alt="AIGRO"
                width={1267}
                height={636}
                className="h-8 w-auto dark:hidden"
              />
              <img
                src="/brand/aigro-wordmark-white-transparent.png"
                alt="AIGRO"
                width={1267}
                height={636}
                className="hidden h-8 w-auto dark:block"
              />
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="關閉選單"
                data-dialog-initial-focus
                className="press flex h-11 w-11 items-center justify-center rounded-md text-text-primary"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
            <nav className="flex flex-col gap-2 px-6 py-8" aria-label="手機導航">
              {NAV_LINKS.map((link, i) => (
                  <motion.div
                    key={link.to}
                    initial={{ opacity: 0, transform: "translateX(-16px)" }}
                    animate={{ opacity: 1, transform: "translateX(0px)" }}
                    transition={{ duration: 0.3, delay: i * 0.08, ease: REVEAL_EASE }}
                  >
                    <NavLink
                      to={link.to}
                      onClick={closeDrawer}
                      className={({ isActive }) => cn(
                        "flex min-h-14 items-center gap-3 py-3 font-display text-h2",
                        isActive ? "text-ink" : "text-text-primary"
                      )}
                    >
                      <span>{link.en} {link.zh}</span>
                      {"comingSoon" in link && link.comingSoon && (
                        <ComingSoonTag mobile />
                      )}
                    </NavLink>
                  </motion.div>
                )
              )}
              <motion.div
                initial={{ opacity: 0, transform: "translateX(-16px)" }}
                animate={{ opacity: 1, transform: "translateX(0px)" }}
                transition={{ duration: 0.3, delay: NAV_LINKS.length * 0.08, ease: REVEAL_EASE }}
                className="flex items-center gap-3 pt-4"
              >
                {member ? (
                  <Link
                    to={memberChipTo}
                    onClick={closeDrawer}
                    className="inline-flex h-11 items-center gap-2 rounded-md border border-border-strong pl-1.5 pr-4 text-label text-text-primary"
                  >
                    <MemberAvatar member={member} size={28} />
                    {member.role === "expert"
                      ? "專家平台"
                      : member.role === "admin" || member.role === "super_admin"
                        ? "管理後台"
                        : "會員專區"}
                  </Link>
                ) : (
                  <>
                    <Link
                      to={authSearch("login")}
                      onClick={closeDrawer}
                      className="inline-flex h-11 items-center rounded-md border border-border-strong px-6 text-label text-text-primary"
                    >
                      登入
                    </Link>
                    <Link
                      to={authSearch("join")}
                      onClick={closeDrawer}
                      className="inline-flex h-11 items-center rounded-md bg-lime px-6 text-label text-on-accent"
                    >
                      加入 Club
                    </Link>
                  </>
                )}
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
