import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Mail,
  Menu,
  MessagesSquare,
  Settings,
  Target,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminToastProvider } from "@/components/admin/AdminToast";

const NAV = [
  {
    to: "/admin",
    end: true,
    zh: "總覽",
    en: "Dashboard",
    icon: LayoutDashboard,
  },
  { to: "/admin/experts", zh: "專家管理", en: "Experts", icon: Users },
  {
    to: "/admin/studio",
    zh: "專家工作室",
    en: "Studio",
    icon: FlaskConical,
  },
  { to: "/admin/crm", zh: "CRM", en: "CRM", icon: Target },
  { to: "/admin/content", zh: "內容管理", en: "Content", icon: FileText },
  {
    to: "/admin/engagement",
    zh: "對話參與",
    en: "Engagement",
    icon: MessagesSquare,
  },
  { to: "/admin/members", zh: "會員管理", en: "Members", icon: UserRound },
  { to: "/admin/emails", zh: "郵件", en: "Emails", icon: Mail },
  { to: "/admin/settings", zh: "設定", en: "Settings", icon: Settings },
] as const;

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
    <div className="flex items-baseline gap-2 px-3">
      <span className="font-display text-[18px] font-medium uppercase tracking-[0.04em] text-[#F1EEE8]">
        AIGRO<span className="text-lime">.</span>
      </span>
      <span className="text-[11px] tracking-wide text-[#938D83]">Admin</span>
    </div>
  );
}

/**
 * Admin 後台外殼 — nested-route 模式:本組件渲染 <Outlet/>,
 * App.tsx 須以 <Route path="admin" element={<AdminLayout/>}> + 子路由接入。
 * 左側 240px near-black 側欄(lg+),mobile 收合為頂部 drawer。
 * 內容區 warm paper;不含公開站 Navbar/Footer。
 */
export default function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

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
          <div className="border-t border-[#35302A] px-6 py-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[#938D83]">
              內部後台 · v1.20
            </p>
            <p className="mt-1 text-xs text-[#938D83]">
              Mock data · Supabase 即將接入
            </p>
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
              AIGRO<span className="text-lime-text">.</span> Admin
            </span>
            <span className="hidden text-sm text-text-muted lg:block">
              AIGRO Admin — 內部管理後台
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
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-lime font-mono text-[11px] font-semibold text-on-accent">
                  E
                </span>
                <span className="text-xs text-text-primary">
                  Elvin <span className="text-text-muted">· 擁有者</span>
                </span>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminToastProvider>
  );
}
