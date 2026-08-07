import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useMember } from "@/hooks/useMember";
import { cn } from "@/lib/utils";
import { REVEAL_EASE } from "@/components/Reveal";
import { clearMember, memberInitial } from "@/components/auth/member";

export const NAV_LINKS = [
  { to: "/insights", en: "Insights", zh: "情報" },
  { to: "/skills", en: "Skills", zh: "技能庫" },
  { to: "/insights?tab=data", en: "Data", zh: "數據" },
  { to: "/experts", en: "Experts", zh: "專家" },
  { to: "/ask", en: "Ask", zh: "問答" },
] as const;

/**
 * Navbar (design.md §6.1, elevated): sticky top-0 z-50, 64px.
 * Transparent over the Home cinematic hero at page top (band colors);
 * solid surface + 1px border after 24px scroll (200ms transition).
 */
export default function Navbar() {
  const { isDark, toggleTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  // 會員態 — useMember 響應式(auth state change / 跨分頁 / demo 登入都即時更新)
  const { member } = useMember();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 h-16 border-b transition-[background-color,border-color] duration-200",
          overHero ? "border-transparent bg-transparent" : "bg-surface"
        )}
      >
        <div className="mx-auto flex h-full max-w-container items-center gap-6 px-6">
          {/* Wordmark — wordmark IS the logo (design.md §1.2); lime period
              per business-card reference (「brand name.」) */}
          <Link to="/" className="flex items-baseline gap-2" aria-label="AIGRO 首頁">
            <img
              src="/brand/a-mark.png"
              alt=""
              aria-hidden="true"
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 self-center"
            />
            <span
              className={cn(
                "font-display text-[22px] font-semibold lowercase tracking-[0.01em]",
                overHero ? "text-band-text" : "text-text-primary"
              )}
            >
              aigro
              <span
                className={cn("brand-period", overHero ? "text-band-ink" : "text-ink")}
              >
                .
              </span>
            </span>
            <span
              className={cn(
                "hidden text-caption sm:inline",
                overHero ? "text-band-text-secondary" : "text-text-muted"
              )}
            >
              香港 AI・增長情報
            </span>
          </Link>

          {/* Desktop nav — bilingual labels */}
          <nav className="mx-auto hidden items-center gap-6 md:flex" aria-label="主導航">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "text-label transition-colors duration-150",
                    overHero
                      ? "text-band-text/85 hover:text-band-text"
                      : "text-text-secondary hover:text-ink",
                    isActive &&
                      (overHero
                        ? "text-band-text underline decoration-band-text decoration-2 underline-offset-[6px]"
                        : "text-ink underline decoration-ink decoration-2 underline-offset-[6px]")
                  )
                }
              >
                {link.en} {link.zh}
              </NavLink>
            ))}
          </nav>

          {/* Right: theme toggle + subscribe */}
          <div className="ml-auto flex items-center gap-3 md:ml-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "切換至淺色模式" : "切換至深色模式"}
              className={cn(
                "press flex h-10 w-10 items-center justify-center rounded-md",
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
              /* 已登入:頭像 chip — expert → /portal,admin → /admin,其他 → /account;
                 創始會員喺名下面加「創始會員」caption */
              <Link
                to={memberChipTo}
                aria-label={
                  member.role === "expert"
                    ? `${member.name} 嘅專家平台`
                    : member.role === "admin" || member.role === "super_admin"
                      ? `${member.name} 嘅管理後台`
                      : `${member.name} 嘅會員專區`
                }
                className={cn(
                  "press hidden h-10 items-center gap-2 rounded-md border pl-1.5 pr-3 sm:inline-flex",
                  overHero
                    ? "border-band-border-strong hover:bg-band-ink-soft"
                    : "border-border-strong hover:bg-ink-soft"
                )}
              >
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-lime font-display text-[13px] font-medium text-on-accent"
                >
                  {memberInitial(member.name)}
                </span>
                <span className="flex max-w-[96px] flex-col items-start">
                  <span
                    className={cn(
                      "w-full truncate text-label leading-tight",
                      overHero ? "text-band-text" : "text-text-primary"
                    )}
                  >
                    {member.name}
                  </span>
                  {member.role === "founding" && (
                    <span className="w-full truncate text-[10px] leading-tight text-ink">
                      創始會員
                    </span>
                  )}
                </span>
              </Link>
            )}
            {member && (
              /* 登出 — 任何頁面一撳即用;clearMember 清快取 + local-scope signOut */
              <button
                type="button"
                onClick={() => clearMember()}
                aria-label="登出"
                title="登出"
                className={cn(
                  "press hidden h-10 w-10 items-center justify-center rounded-md border sm:inline-flex",
                  overHero
                    ? "border-band-border-strong text-band-text-secondary hover:bg-band-ink-soft hover:text-band-text"
                    : "border-border-strong text-text-secondary hover:bg-ink-soft hover:text-ink"
                )}
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
              </button>
            )}
            {!member && (
              /* 未登入:登入 ghost + 加入 Club lime primary */
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  to="/login"
                  className={cn(
                    "press inline-flex h-10 items-center rounded-md px-4 text-label",
                    overHero
                      ? "text-band-text-secondary hover:bg-band-ink-soft hover:text-band-text"
                      : "text-text-secondary hover:bg-ink-soft hover:text-ink"
                  )}
                >
                  登入
                </Link>
                <Link
                  to="/join"
                  className="press inline-flex h-10 items-center rounded-md bg-lime px-4 text-label text-on-accent hover:bg-lime-hover"
                >
                  加入 Club
                </Link>
              </div>
            )}
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="開啟選單"
              className={cn(
                "press flex h-10 w-10 items-center justify-center rounded-md md:hidden",
                overHero ? "text-band-text" : "text-text-primary"
              )}
            >
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen drawer (design.md §6.1: overlay bg, big serif links, 80ms stagger) */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            className="fixed inset-0 z-[60] flex flex-col bg-overlay/95 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex h-16 items-center justify-between border-b px-6">
              <span className="font-display text-[22px] font-semibold lowercase tracking-[0.01em]">
                aigro<span className="brand-period text-ink">.</span>
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="關閉選單"
                className="press flex h-10 w-10 items-center justify-center rounded-md text-text-primary"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
            <nav className="flex flex-col gap-2 px-6 py-8" aria-label="手機導航">
              {[{ to: "/", en: "Home", zh: "首頁" } as const, ...NAV_LINKS].map(
                (link, i) => (
                  <motion.div
                    key={link.to}
                    initial={{ opacity: 0, transform: "translateX(-16px)" }}
                    animate={{ opacity: 1, transform: "translateX(0px)" }}
                    transition={{ duration: 0.3, delay: i * 0.08, ease: REVEAL_EASE }}
                  >
                    <NavLink
                      to={link.to}
                      onClick={() => setDrawerOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "block py-3 font-display text-h2 text-text-primary",
                          isActive && "text-ink"
                        )
                      }
                    >
                      {link.en} {link.zh}
                    </NavLink>
                  </motion.div>
                )
              )}
              <motion.div
                initial={{ opacity: 0, transform: "translateX(-16px)" }}
                animate={{ opacity: 1, transform: "translateX(0px)" }}
                transition={{ duration: 0.3, delay: 7 * 0.08, ease: REVEAL_EASE }}
                className="flex items-center gap-3 pt-4"
              >
                {member ? (
                  <Link
                    to={memberChipTo}
                    onClick={() => setDrawerOpen(false)}
                    className="inline-flex h-11 items-center gap-2 rounded-md border border-border-strong pl-1.5 pr-4 text-label text-text-primary"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-lime font-display text-[13px] font-medium text-on-accent"
                    >
                      {memberInitial(member.name)}
                    </span>
                    {member.role === "expert"
                      ? "專家平台"
                      : member.role === "admin" || member.role === "super_admin"
                        ? "管理後台"
                        : "會員專區"}
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setDrawerOpen(false)}
                      className="inline-flex h-11 items-center rounded-md border border-border-strong px-6 text-label text-text-primary"
                    >
                      登入
                    </Link>
                    <Link
                      to="/join"
                      onClick={() => setDrawerOpen(false)}
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
