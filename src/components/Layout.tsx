import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Lenis from "lenis";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Newsletter from "@/components/Newsletter";

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

  // Lenis smooth scroll (design.md §5.3); disabled under prefers-reduced-motion (§5.4)
  useEffect(() => {
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
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg text-text-primary">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Newsletter />
      <Footer />
    </div>
  );
}
