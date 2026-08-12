import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Lenis from "lenis";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Newsletter from "@/components/Newsletter";
import MobileAppNav from "@/components/MobileAppNav";
import { cn } from "@/lib/utils";

/**
 * Shared layout — nested-route pattern (Layout renders <Outlet/>, App.tsx
 * MUST nest all routes inside `<Route element={<Layout/>}`). Never mix
 * with the children pattern.
 *
 * Owns: sticky Navbar, Newsletter band (design.md §6.9 全站共用), Footer,
 * Lenis smooth scrolling (lerp 0.1, §5.3 — disabled for reduced motion),
 * scroll-to-top on route change.
 */
export default function Layout() {
  const { pathname } = useLocation();
  const isCourseNotes = pathname.startsWith("/guides/");
  const isFocusedFlow =
    pathname.startsWith("/ask") ||
    pathname === "/login" ||
    pathname === "/join" ||
    pathname.startsWith("/account");
  const showMobileAppNav =
    pathname === "/" ||
    pathname.startsWith("/insights") ||
    pathname.startsWith("/skills");

  // Lenis smooth scroll (design.md §5.3); disabled under prefers-reduced-motion (§5.4)
  useEffect(() => {
    if (isCourseNotes) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.1 });
    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [isCourseNotes]);

  // Long-form teaching notes use conventional browser scrolling. This keeps
  // wheel, trackpad, keyboard, and anchor navigation aligned with normal sites.
  useEffect(() => {
    if (!isCourseNotes) return;
    document.documentElement.classList.add("guide-native-scroll");
    return () => document.documentElement.classList.remove("guide-native-scroll");
  }, [isCourseNotes]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div
      className={cn(
        "flex min-h-[100dvh] flex-col bg-bg text-text-primary",
        showMobileAppNav && "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0"
      )}
    >
      <a
        href="#main-content"
        className="sr-only z-[100] rounded-sm bg-lime px-4 py-3 text-sm font-semibold text-on-accent outline-none focus:fixed focus:left-4 focus:top-4 focus:not-sr-only focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        跳到主要內容
      </a>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      {!isFocusedFlow && !isCourseNotes && <Newsletter />}
      {!isFocusedFlow && <Footer />}
      {showMobileAppNav && <MobileAppNav />}
    </div>
  );
}
