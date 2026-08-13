import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Newsletter from "@/components/Newsletter";
import MobileAppNav from "@/components/MobileAppNav";
import AuthModal from "@/components/auth/AuthModal";
import { cn } from "@/lib/utils";

/**
 * Shared layout — nested-route pattern (Layout renders <Outlet/>, App.tsx
 * MUST nest all routes inside `<Route element={<Layout/>}`). Never mix
 * with the children pattern.
 *
 * Owns: sticky Navbar, Newsletter band (design.md §6.9 全站共用), Footer,
 * native browser scrolling, and scroll-to-top on route change.
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
      <AuthModal />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      {!isFocusedFlow && !isCourseNotes && <Newsletter />}
      {!isFocusedFlow && <Footer />}
      {showMobileAppNav && <MobileAppNav />}
    </div>
  );
}
