import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, LogOut, MessageSquare } from "lucide-react";
import Toast, { useToast } from "@/components/auth/Toast";
import {
  clearMember,
  greeting,
  loadMember,
  memberInitial,
  saveMember,
  TIER_LABEL,
} from "@/components/auth/member";
import type { AigroMember } from "@/components/auth/member";
import { loadSessionStore } from "@/components/ask/sessions";
import { getPersona } from "@/data/personas";
import { cn } from "@/lib/utils";

const MCP_KEY = "aigro-mcp-signup";

interface SessionRow {
  key: string;
  personaName: string;
  id: string;
  title: string;
  updatedAt: number;
  to: string;
}

/** 跨分身合併 sessions,按 updatedAt 倒序 */
function collectSessions(): SessionRow[] {
  const store = loadSessionStore();
  const rows: SessionRow[] = [];
  for (const [key, list] of Object.entries(store.sessions)) {
    const persona = getPersona(key === "platform" ? null : key);
    for (const s of list) {
      rows.push({
        key,
        personaName: persona.shortName,
        id: s.id,
        title: s.title,
        updatedAt: s.updatedAt,
        to: key === "platform" ? "/ask" : `/ask?expert=${key}`,
      });
    }
  }
  return rows.sort((a, b) => b.updatedAt - a.updatedAt);
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleDateString("zh-HK", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Account `/account` — 會員專區(示範模式)。
 * 問候 + 方案卡(升級 CTA → /pricing)+ 用量統計 + 我的對話
 * (讀 aigro-ask-sessions-v1)+ 設定(email 通知 toggles + 登出)。
 * 未登入 → 引導去 /login /join。
 */
export default function Account() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { toast, showToast } = useToast();
  const [member, setMember] = useState<AigroMember | null>(loadMember);
  const sessions = useMemo(collectSessions, []);
  const mcpSignedUp = useMemo(() => {
    try {
      return window.localStorage.getItem(MCP_KEY) !== null;
    } catch {
      return false;
    }
  }, []);

  /* ---------------- 未登入態 ---------------- */
  if (!member) {
    return (
      <div className="mx-auto flex max-w-[720px] flex-col items-center px-6 py-24 text-center md:py-32">
        <h1 className="font-display text-h2 text-text-primary">會員專區</h1>
        <p className="mt-3 max-w-md text-body-sm text-text-secondary">
          你未登入。登入或加入 Club,先可以管理你嘅對話、收藏與通知設定。
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Link
            to="/login"
            className="press inline-flex h-12 items-center rounded-md border border-border-strong px-6 text-label text-text-primary hover:border-ink hover:text-ink"
          >
            登入
          </Link>
          <Link
            to="/join"
            className="press inline-flex h-12 items-center rounded-md bg-lime px-6 text-label text-on-accent hover:bg-lime-hover"
          >
            加入 Club
          </Link>
        </div>
      </div>
    );
  }

  const toggleNotification = (key: keyof AigroMember["notifications"]) => {
    const next: AigroMember = {
      ...member,
      notifications: { ...member.notifications, [key]: !member.notifications[key] },
    };
    saveMember(next);
    setMember(next);
  };

  const logout = () => {
    clearMember();
    showToast("已登出(示範模式)");
    window.setTimeout(() => navigate("/"), 700);
  };

  const stats = [
    { label: "對話數", value: String(sessions.length) },
    { label: "收藏情報", value: "0", note: "即將開放" },
    mcpSignedUp
      ? { label: "MCP 名單狀態", value: "已登記 AI 情報 ✓" }
      : { label: "MCP 名單狀態", value: "未登記", note: "去 /developers 登記" },
  ];

  const NOTIFICATION_ROWS: { key: keyof AigroMember["notifications"]; label: string; desc: string }[] = [
    { key: "daily", label: "每日情報摘要", desc: "每日 5 條精選,朝早 8 點送上" },
    { key: "weekly", label: "每週精選 Newsletter", desc: "編輯部一週深度回顧" },
    { key: "product", label: "產品更新", desc: "新功能與 MCP Network 動向" },
  ];

  return (
    <div className="mx-auto max-w-container px-6 py-16 md:py-20">
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* ---- 問候 ---- */}
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-lime-soft font-display text-[22px] font-medium text-ink"
          >
            {memberInitial(member.name)}
          </span>
          <div>
            <h1 className="font-display text-h2 text-text-primary">
              {member.name},{greeting()}
            </h1>
            <p className="mt-1 text-body-sm text-text-muted">{member.email}</p>
          </div>
        </div>

        {/* ---- 方案卡 ---- */}
        <section className="mt-10 flex flex-col gap-4 rounded-md border bg-surface p-6 sm:flex-row sm:items-center md:p-8">
          <div className="flex-1">
            <p className="text-overline uppercase tracking-[0.12em] text-text-muted">
              目前方案
            </p>
            <p className="mt-2 font-display text-h3 text-text-primary">
              {TIER_LABEL[member.tier]}
            </p>
            <p className="mt-1 text-body-sm text-text-secondary">
              {member.tier === "free" &&
                "每日情報任讀;升級進階解鎖無限分身對話與完整案例拆解。"}
              {member.tier === "pro" &&
                "無限 AI 編輯部對話、專家分身通行、案例庫完整拆解。"}
              {member.tier === "vip" && "真人導師一對一,新功能優先體驗。"}
            </p>
          </div>
          {member.tier !== "vip" && (
            <Link
              to="/pricing"
              className="press inline-flex h-12 shrink-0 items-center gap-2 self-start rounded-md bg-lime px-6 text-label text-on-accent hover:bg-lime-hover sm:self-center"
            >
              {member.tier === "free" ? "升級方案" : "睇 VIP"}
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          )}
        </section>

        {/* ---- 用量統計 ---- */}
        <section className="mt-6 grid grid-cols-1 overflow-hidden rounded-md border bg-surface sm:grid-cols-3">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={cn("p-6", i > 0 && "border-t sm:border-l sm:border-t-0")}
            >
              <p className="text-caption text-text-muted">{s.label}</p>
              <p className="mt-2 font-display text-h3 text-text-primary">{s.value}</p>
              {"note" in s && s.note && (
                <p className="mt-1 text-caption text-text-muted">{s.note}</p>
              )}
            </div>
          ))}
        </section>

        {/* ---- 我的對話 ---- */}
        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-h3 text-text-primary">我的對話</h2>
            <Link to="/ask" className="link-underline text-label text-ink">
              開新對話
            </Link>
          </div>
          {sessions.length === 0 ? (
            <div className="mt-6 rounded-md border bg-surface p-8 text-center">
              <p className="text-body-sm text-text-secondary">
                仲未有對話。去 Ask 問下 AI 編輯部,對話會自動存喺呢度。
              </p>
              <Link
                to="/ask"
                className="press mt-5 inline-flex h-11 items-center gap-2 rounded-md bg-lime px-5 text-label text-on-accent hover:bg-lime-hover"
              >
                <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
                開始第一個對話
              </Link>
            </div>
          ) : (
            <ul className="mt-6 overflow-hidden rounded-md border bg-surface">
              {sessions.slice(0, 5).map((s, i) => (
                <li key={s.id} className={cn(i > 0 && "border-t")}>
                  <Link
                    to={s.to}
                    className="group flex items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-card"
                  >
                    <span className="flex-1 truncate text-body-sm text-text-primary">
                      {s.title}
                    </span>
                    <span className="shrink-0 text-caption text-text-muted">
                      {s.personaName} · {formatTime(s.updatedAt)}
                    </span>
                    <ArrowRight
                      className="nudge-x h-4 w-4 shrink-0 text-text-muted transition-transform duration-180 group-hover:text-ink"
                      strokeWidth={1.5}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---- 設定 ---- */}
        <section className="mt-12">
          <h2 className="font-display text-h3 text-text-primary">設定</h2>
          <div className="mt-6 overflow-hidden rounded-md border bg-surface">
            {NOTIFICATION_ROWS.map((row, i) => {
              const on = member.notifications[row.key];
              return (
                <div
                  key={row.key}
                  className={cn("flex items-center gap-4 px-5 py-4", i > 0 && "border-t")}
                >
                  <div className="flex-1">
                    <p className="text-label text-text-primary">{row.label}</p>
                    <p className="mt-0.5 text-caption text-text-muted">{row.desc}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={row.label}
                    onClick={() => toggleNotification(row.key)}
                    className={cn(
                      "press relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150",
                      on ? "bg-lime" : "bg-border-strong"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-surface transition-[left] duration-150",
                        on ? "left-[22px]" : "left-0.5"
                      )}
                    />
                  </button>
                </div>
              );
            })}
            <div className="flex items-center justify-between gap-4 border-t px-5 py-4">
              <div>
                <p className="text-label text-text-primary">登出</p>
                <p className="mt-0.5 text-caption text-text-muted">
                  清除此裝置嘅會員資料(示範模式)
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="press inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-border-strong px-4 text-label text-error hover:border-error"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                登出
              </button>
            </div>
          </div>
          <p className="mt-6 flex items-center gap-2 text-caption text-text-muted">
            <Check className="h-3.5 w-3.5 text-ink" strokeWidth={2} />
            資料只存喺你嘅瀏覽器 — Supabase Auth 即將接入
          </p>
        </section>
      </motion.div>

      <Toast message={toast} />
    </div>
  );
}
