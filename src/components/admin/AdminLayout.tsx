import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Lock,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminToastProvider } from "@/components/admin/AdminToast";
import { useMember } from "@/hooks/useMember";
import { memberInitial, memberRoleLabel } from "@/components/auth/member";
import { supabaseReady } from "@/lib/supabase";
import {
  ADMIN_MODULES,
  adminModuleForPath,
} from "@/components/admin/adminModules";

function BetaBadge({ active = false }: { active?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full border px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.1em]",
        active
          ? "border-on-accent/30 text-on-accent"
          : "border-lime/40 text-lime"
      )}
    >
      Beta
    </span>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {ADMIN_MODULES.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
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
              <span className="ml-auto flex items-center gap-1.5">
                {item.status === "beta" && <BetaBadge active={isActive} />}
                <span
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-wider",
                    isActive ? "text-on-accent/70" : "text-[#8593A5]"
                  )}
                >
                  {item.en}
                </span>
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
      <span className="font-display text-[18px] font-medium uppercase tracking-[0.04em] text-[#EAF0F6]">
        AIGRO<span className="text-lime">.</span>
      </span>
      <span className="text-[11px] tracking-wide text-[#8593A5]">Admin</span>
    </div>
  );
}

/** 未登入 / 非 admin — 誠實 gate,唔顯示任何後台數據 */
function AdminGate({ loading }: { loading: boolean }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-bg px-4 py-16">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lime-soft">
          <Lock className="h-5 w-5 text-lime-text" />
        </span>
        <h1 className="mt-5 font-display text-[24px] font-medium text-text-primary">
          需要 admin 帳號登入
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Admin 後台直接讀 Supabase 真實數據 — 只有管理員或最高管理員帳號
          先可以睇到。請用獲授權帳號登入。
        </p>
        {loading && (
          <p className="mt-4 font-mono text-xs text-text-muted">
            正在檢查登入狀態…
          </p>
        )}
        <Link
          to="/login"
          className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-lime px-4 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-lime-hover"
        >
          <ShieldCheck className="h-4 w-4" />
          去登入
        </Link>
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

/**
 * Admin 後台外殼 — nested-route 模式:本組件渲染 <Outlet/>,
 * App.tsx 須以 <Route path="admin" element={<AdminLayout/>}> + 子路由接入。
 * 左側 240px near-black 側欄(lg+),mobile 收合為頂部 drawer。
 * 內容區 warm paper;不含公開站 Navbar/Footer。
 * Gate:未登入或 role 唔係 admin/super_admin → 只顯示登入提示,唔 render 數據頁。
 */
export default function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const { member, loading } = useMember();
  const currentModule = adminModuleForPath(location.pathname);
  const isAdmin = member !== null &&
    (member.role === "admin" || member.role === "super_admin");

  if (loading || !isAdmin) {
    return (
      <AdminToastProvider>
        <AdminGate loading={loading} />
      </AdminToastProvider>
    );
  }

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
          <div className="border-t border-[#1C3355] px-6 py-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[#8593A5]">
              內部後台 · Module status
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-[#8593A5]">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  supabaseReady ? "bg-lime" : "bg-[#A63A30]"
                )}
              />
              {supabaseReady ? "Supabase client 已設定" : "Supabase 未設定"}
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
              AIGRO<span className="text-lime-text">.</span> Admin
            </span>
            <span className="hidden items-center gap-2 text-sm text-text-muted lg:flex">
              Master Admin · {currentModule.zh} / {currentModule.en}
              {currentModule.status === "beta" && <BetaBadge />}
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
                  {memberInitial(member.name)}
                </span>
                <span className="text-xs text-text-primary">
                  {member.name}{" "}
                  <span className="text-text-muted">· {memberRoleLabel(member)}</span>
                </span>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {currentModule.status === "beta" && (
              <div className="mx-auto mb-5 flex max-w-6xl items-start gap-3 rounded-md border border-lime/35 bg-lime-soft px-4 py-3">
                <BetaBadge />
                <p className="text-xs leading-relaxed text-text-secondary">
                  <span className="font-medium text-text-primary">
                    {currentModule.zh}
                  </span>
                  ：{currentModule.betaReason}
                </p>
              </div>
            )}
            <Outlet />
          </main>
        </div>
      </div>
    </AdminToastProvider>
  );
}
