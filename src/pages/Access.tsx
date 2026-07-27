import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Compass,
  Database,
  Eye,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Toast, { useToast } from "@/components/auth/Toast";
import {
  DEFAULT_NOTIFICATIONS,
  loadMember,
  ROLE_LABELS,
  saveMember,
} from "@/components/auth/member";
import type { MemberRole, MemberTier } from "@/components/auth/member";
import { cn } from "@/lib/utils";

interface DemoAccount {
  email: string;
  name: string;
  role: MemberRole;
  tier: MemberTier;
  home: string;
  label: string;
}

interface AccessCard {
  id: string;
  icon: LucideIcon;
  title: string;
  caption: string;
  perks: string[];
  tag?: string;
  accounts: DemoAccount[];
  /** 訪客卡:唔使登入,直接去呢個頁 */
  guestLink?: { to: string; label: string };
}

/** 5 級入口 — 示範帳號一 click 登入(role 值同 Login 示範帳號一致) */
const ACCESS_CARDS: AccessCard[] = [
  {
    id: "guest",
    icon: Eye,
    title: "訪客",
    caption: "唔使登入,即刻體驗",
    perks: ["無限 AI 分身對話", "情報閱讀 + 香港視角解讀", "案例庫公開拆解"],
    guestLink: { to: "/ask", label: "進入 Ask 問答" },
    accounts: [],
  },
  {
    id: "free",
    icon: UserRound,
    title: "免費會員 Free",
    caption: "member@demo.hk",
    perks: ["訪客全部權限", "對話紀錄跨裝置同步", "收藏情報同案例", "每日情報摘要通知"],
    accounts: [
      {
        email: "member@demo.hk",
        name: "Demo 會員",
        role: "free",
        tier: "free",
        home: "/account",
        label: "以免費會員登入",
      },
    ],
  },
  {
    id: "founding",
    icon: Sparkles,
    title: "創始會員 Founding",
    caption: "founding@demo.hk",
    tag: "首批 100 席",
    perks: ["免費會員全部權限", "完整案例數據拆解", "MCP 優先接入名單", "創始價永久鎖定"],
    accounts: [
      {
        email: "founding@demo.hk",
        name: "Founding Demo",
        role: "founding",
        tier: "pro",
        home: "/pricing",
        label: "以創始會員登入",
      },
    ],
  },
  {
    id: "expert",
    icon: Compass,
    title: "領航專家 Expert",
    caption: "jimmy@dotai.hk / elvin@ekcheung.com",
    perks: ["專家平台 /portal 全功能", "知識庫蒸餾管理", "情報投稿(max 3 規則)", "分身對話數據 + CRM leads"],
    accounts: [
      {
        email: "jimmy@dotai.hk",
        name: "Jimmy Lau",
        role: "expert",
        tier: "pro",
        home: "/portal",
        label: "Jimmy Lau 登入",
      },
      {
        email: "elvin@ekcheung.com",
        name: "Elvin Cheung",
        role: "expert",
        tier: "pro",
        home: "/portal",
        label: "Elvin Cheung 登入",
      },
    ],
  },
  {
    id: "admin",
    icon: ShieldCheck,
    title: "管理員 Admin",
    caption: "admin@aigro.hk",
    perks: ["管理後台 /admin 全功能", "內容審核 + 發佈佇列", "會員 / 專家 360 管理", "Studio 蒸餾 + CRM + Emails"],
    accounts: [
      {
        email: "admin@aigro.hk",
        name: "Admin",
        role: "admin",
        tier: "vip",
        home: "/admin",
        label: "以管理員登入",
      },
    ],
  },
];

/**
 * Access `/access` — AIGRO 全級別入口(demo console)。
 * 深色 band 小 hero + 5 張級別卡,每卡一 click 示範登入
 * (經 member.ts 寫 localStorage,同 Login 示範帳號同一路徑)。
 * Supabase Auth 接入後呢頁可退役或保留作內部 demo。
 */
export default function Access() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { toast, showToast } = useToast();

  /** 一 click 示範登入:保留同 email 既有紀錄,否則建新 member record */
  const quickLogin = (account: DemoAccount) => {
    const existing = loadMember();
    saveMember(
      existing && existing.email === account.email
        ? { ...existing, role: account.role, tier: account.tier }
        : {
            name: account.name,
            email: account.email,
            interests: [],
            persona: null,
            role: account.role,
            tier: account.tier,
            joinedAt: Date.now(),
            notifications: { ...DEFAULT_NOTIFICATIONS },
          }
    );
    showToast(`已登入(${ROLE_LABELS[account.role]})— 前往 ${account.home}(示範模式)`);
    window.setTimeout(() => navigate(account.home), 700);
  };

  return (
    <div>
      {/* ---- 小 hero:深色 band,同 Login 品牌板/footer 同族 ---- */}
      <section className="bg-band-bg text-band-text">
        <div className="mx-auto max-w-container px-6 py-16 md:py-20">
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            <p className="text-overline uppercase tracking-[0.12em] text-band-ink">
              AIGRO Demo Console
            </p>
            <h1 className="mt-3 font-display text-display">全級別入口</h1>
            <p className="mt-3 max-w-[560px] text-body-sm text-band-text-secondary">
              一頁睇晒 AIGRO 5 個存取級別。揀張卡、一 click 登入,
              即刻體驗該級別嘅完整權限。
            </p>
          </motion.div>
        </div>
      </section>

      {/* ---- 級別卡 ---- */}
      <section className="mx-auto max-w-container px-6 py-12 md:py-16">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {ACCESS_CARDS.map((card, i) => (
            <motion.article
              key={card.id}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
              whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.4,
                delay: reduced ? 0 : i * 0.06,
                ease: [0.4, 0, 0.2, 1],
              }}
              className="flex flex-col rounded-md border bg-surface p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-band-bg">
                  <card.icon className="h-5 w-5 text-band-ink" strokeWidth={1.5} />
                </span>
                {card.tag && (
                  <span className="rounded-full bg-lime-soft px-2.5 py-1 text-caption font-medium text-ink">
                    {card.tag}
                  </span>
                )}
              </div>

              <h2 className="mt-4 font-display text-h3 text-text-primary">
                {card.title}
              </h2>
              <p className="mt-1 truncate font-mono text-caption text-text-muted">
                {card.caption}
              </p>

              <ul className="mt-4 flex flex-col gap-2">
                {card.perks.map((perk) => (
                  <li
                    key={perk}
                    className="flex items-start gap-2 text-body-sm text-text-secondary"
                  >
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-ink"
                      strokeWidth={2}
                    />
                    {perk}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-6">
                {card.guestLink && (
                  <button
                    type="button"
                    onClick={() => navigate(card.guestLink!.to)}
                    className="press inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-lime text-label text-on-accent hover:bg-lime-hover"
                  >
                    {card.guestLink.label}
                    <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                )}
                {card.accounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => quickLogin(account)}
                    className={cn(
                      "press inline-flex h-11 w-full items-center justify-center gap-2 rounded-md text-label",
                      "bg-lime text-on-accent hover:bg-lime-hover",
                      card.accounts.length > 1 && "mt-2 first:mt-0"
                    )}
                  >
                    {account.label}
                    <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                ))}
                <p className="mt-3 text-center text-caption text-text-muted">
                  示範模式 — 一 click 切換角色
                </p>
              </div>
            </motion.article>
          ))}
        </div>

        {/* ---- localStorage 說明 ---- */}
        <div className="mt-10 flex items-start gap-3 rounded-md border border-border-strong p-5">
          <Database className="mt-0.5 h-5 w-5 shrink-0 text-ink" strokeWidth={1.5} />
          <div>
            <p className="text-label text-text-primary">
              資料存喺瀏覽器 localStorage
            </p>
            <p className="mt-1 text-body-sm text-text-secondary">
              所有登入、對話紀錄、收藏暫存喺你部機 —
              接 Supabase 之後就會變真帳號,無縫遷移。
              接入計劃見 <span className="font-mono text-caption">docs/INTEGRATION.md</span>。
            </p>
          </div>
        </div>
      </section>

      <Toast message={toast} />
    </div>
  );
}
