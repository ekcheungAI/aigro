import { useEffect, useRef, useState } from "react";
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
import ProtectedAreaLoading from "@/components/auth/ProtectedAreaLoading";
import { supabaseReady } from "@/lib/supabase";
import {
  ADMIN_MODULES,
  ADMIN_MODULE_GROUP_LABELS,
  ADMIN_MODULE_STATUS_LABELS,
  adminModuleForPath,
} from "@/components/admin/adminModules";
import type { AdminModuleGroup, AdminModuleStatus } from "@/components/admin/adminModules";

const GROUP_ORDER: readonly AdminModuleGroup[] = [
  "overview",
  "operations",
  "intelligence",
  "system",
];

function StatusBadge({
  status,
  active = false,
  darkSurface = false,
}: {
  status: AdminModuleStatus;
  active?: boolean;
  darkSurface?: boolean;
}) {
  if (status === "live") return null;
  return (
    <span
      className={cn(
        "rounded-sm border px-1.5 py-0.5 font-mono text-[8px] font-medium uppercase leading-none tracking-[0.08em]",
        status === "beta" && "border-lime/40 text-lime",
        status === "readonly" && (darkSurface
          ? "border-logo-paper/20 text-logo-paper/50"
          : "border-border-strong text-text-muted"),
        status === "blocked" && "border-warning/45 text-warning",
        status === "planned" && (darkSurface
          ? "border-logo-paper/15 text-logo-paper/40"
          : "border-border text-text-muted"),
        active && !darkSurface && status === "readonly" && "border-text-muted/35 text-text-muted",
        active && !darkSurface && status === "planned" && "border-text-muted/30 text-text-muted"
      )}
    >
      {ADMIN_MODULE_STATUS_LABELS[status]}
    </span>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin 模組" className="space-y-5 px-4">
      {GROUP_ORDER.map((group) => {
        const items = ADMIN_MODULES.filter((item) => item.group === group);
        return (
          <section key={group} aria-labelledby={`admin-nav-${group}`}>
            <p
              id={`admin-nav-${group}`}
              className="mb-1.5 px-3 font-mono text-[9px] uppercase tracking-[0.14em] text-logo-paper/30"
            >
              {ADMIN_MODULE_GROUP_LABELS[group]}
            </p>
            <div className="space-y-1">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "press group relative grid min-h-12 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-logo-paper/[0.07] text-logo-paper"
                        : "text-logo-paper/70 hover:bg-logo-paper/[0.04] hover:text-logo-paper"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={cn(
                          "h-[18px] w-[18px] justify-self-center",
                          isActive ? "text-lime" : "text-logo-paper/45"
                        )}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium leading-5">{item.zh}</span>
                        <span className="block truncate font-mono text-[9px] uppercase leading-3 tracking-[0.08em] text-logo-paper/35">
                          {item.en}
                        </span>
                      </span>
                      <StatusBadge status={item.status} active={isActive} darkSurface />
                      {isActive && (
                        <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-lime" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </section>
        );
      })}
    </nav>
  );
}

function Wordmark() {
  return (
    <div className="flex min-w-0 items-center gap-3 px-4">
      <img
        src="/brand/aigro-wordmark-white-transparent.png"
        alt="AIGRO"
        width={1267}
        height={636}
        className="h-8 w-auto shrink-0"
      />
      <span aria-hidden="true" className="h-5 w-px bg-logo-paper/15" />
      <span className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-logo-paper/55">
        Admin
      </span>
    </div>
  );
}

/** 未登入 / 非 admin — 誠實 gate,唔顯示任何後台數據 */
function AdminGate() {
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
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);
  const drawerPanelRef = useRef<HTMLElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const { member, loading } = useMember();
  const currentModule = adminModuleForPath(location.pathname);
  const isAdmin = member !== null &&
    (member.role === "admin" || member.role === "super_admin");

  useEffect(() => {
    if (!drawerOpen) return;
    const panel = drawerPanelRef.current;
    const drawerTrigger = drawerTriggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerCloseRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setDrawerOpen(false);
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      drawerTrigger?.focus();
    };
  }, [drawerOpen]);

  if (loading) {
    return (
      <AdminToastProvider>
        <ProtectedAreaLoading />
      </AdminToastProvider>
    );
  }

  if (!isAdmin) {
    return (
      <AdminToastProvider>
        <AdminGate />
      </AdminToastProvider>
    );
  }

  return (
    <AdminToastProvider>
      <div className="min-h-[100dvh] bg-bg text-text-primary">
        {/* ---- Desktop sidebar ---- */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-logo-paper/10 bg-logo-navy lg:flex">
          <div className="flex h-20 items-center border-b border-logo-paper/10">
            <Wordmark />
          </div>
          <div className="flex-1 overflow-y-auto py-5">
            <SidebarNav />
          </div>
          <div className="border-t border-logo-paper/10 px-6 py-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-logo-paper/40">
              內部後台 · System
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-xs text-logo-paper/55">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  supabaseReady ? "bg-lime" : "bg-error"
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
                className="fixed inset-0 z-[90] bg-logo-navy/60 lg:hidden"
                aria-hidden="true"
              />
              <motion.aside
                ref={drawerPanelRef}
                key="nav-drawer"
                initial={{ transform: "translateY(-100%)" }}
                animate={{ transform: "translateY(0)" }}
                exit={{ transform: "translateY(-100%)" }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="fixed inset-x-0 top-0 z-[95] max-h-[100dvh] overflow-y-auto border-b border-logo-paper/10 bg-logo-navy pb-5 lg:hidden"
                role="dialog"
                aria-modal="true"
                aria-label="Admin 導覽選單"
              >
                <div className="flex h-20 items-center justify-between border-b border-logo-paper/10 pr-4">
                  <Wordmark />
                  <button
                    ref={drawerCloseRef}
                    type="button"
                    aria-label="關閉選單"
                    onClick={() => setDrawerOpen(false)}
                    className="press rounded-md p-2 text-logo-paper/70 outline-none hover:bg-logo-paper/[0.06] hover:text-logo-paper focus-visible:ring-2 focus-visible:ring-lime"
                  >
                    <X className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                </div>
                <div className="pt-5">
                  <SidebarNav onNavigate={() => setDrawerOpen(false)} />
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ---- Main column ---- */}
        <div className="flex min-h-[100dvh] flex-col lg:pl-64">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
            <button
              ref={drawerTriggerRef}
              type="button"
              aria-label="開啟選單"
              onClick={() => setDrawerOpen(true)}
              className="press rounded-md border border-border p-1.5 text-text-secondary outline-none hover:border-border-strong focus-visible:ring-2 focus-visible:ring-lime lg:hidden"
            >
              <Menu className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <img
              src="/brand/aigro-wordmark-navy-transparent.png"
              alt="AIGRO Admin"
              width={1267}
              height={636}
              className="h-5 w-auto max-w-[104px] object-contain object-left dark:hidden lg:hidden"
            />
            <img
              src="/brand/aigro-wordmark-white-transparent.png"
              alt=""
              width={1267}
              height={636}
              className="hidden h-5 w-auto max-w-[104px] object-contain object-left dark:block lg:!hidden"
            />
            <span className="hidden items-center gap-2 text-sm text-text-muted lg:flex">
              Master Admin · {currentModule.zh} / {currentModule.en}
              <StatusBadge status={currentModule.status} />
            </span>
            <div className="ml-auto flex items-center gap-3">
              <Link
                to="/"
                className="hidden items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary sm:inline-flex"
              >
                返回網站
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <div className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2 sm:pr-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-lime font-mono text-[11px] font-semibold text-on-accent">
                  {memberInitial(member.name)}
                </span>
                <span className="max-w-[8rem] truncate text-xs text-text-primary sm:max-w-none">
                  {member.name}
                  <span className="hidden text-text-muted sm:inline"> · {memberRoleLabel(member)}</span>
                </span>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {currentModule.status !== "live" && currentModule.betaReason && (
              <div className="mx-auto mb-5 flex max-w-6xl items-start gap-3 rounded-md border border-lime/35 bg-lime-soft px-4 py-3">
                <StatusBadge status={currentModule.status} />
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
