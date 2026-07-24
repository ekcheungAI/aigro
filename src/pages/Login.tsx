import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Loader2,
  Mail,
  MessagesSquare,
  NotebookText,
  Plug,
} from "lucide-react";
import Field from "@/components/auth/Field";
import Toast, { useToast } from "@/components/auth/Toast";
import {
  DEFAULT_NOTIFICATIONS,
  loadMember,
  ROLE_LABELS,
  saveMember,
  validEmail,
} from "@/components/auth/member";
import type { MemberRole, MemberTier } from "@/components/auth/member";
import { cn } from "@/lib/utils";

const BENEFITS = [
  { icon: MessagesSquare, title: "無限分身對話", desc: "領航專家 AI 分身,隨時問隨時答" },
  { icon: NotebookText, title: "完整案例拆解", desc: "數據、方法、可複製步驟全部公開" },
  { icon: Plug, title: "MCP 優先接入", desc: "AIGRO MCP Network 名單優先開放" },
] as const;

type SubmitState = "idle" | "loading" | "success";

/** 示範帳號 — 一 click 體驗 4 級制度入面嘅 3 個角色 */
const DEMO_ACCOUNTS: {
  email: string;
  name: string;
  role: MemberRole;
  tier: MemberTier;
}[] = [
  { email: "elvin@ekcheung.com", name: "Elvin", role: "expert", tier: "pro" },
  { email: "admin@aigro.hk", name: "Admin", role: "admin", tier: "vip" },
  { email: "member@demo.hk", name: "Demo 會員", role: "founding", tier: "pro" },
];

/**
 * Login `/login` — 會員登入(示範模式)。
 * 置中 split card(max-w-4xl):左 = 品牌板(near-black + lime 條紋,
 * 「會員專區」serif H2 + 3 個會員價值);右 = 表單。
 * Supabase Auth 接入時:handleSubmit 換 signInWithPassword,
 * magic link 換 signInWithOtp,其餘 UI 不變。
 */
export default function Login() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { toast, showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [state, setState] = useState<SubmitState>("idle");
  const [demoOpen, setDemoOpen] = useState(false);

  const validate = () => {
    const next: typeof errors = {};
    if (!validEmail(email)) next.email = "請輸入有效嘅 Email 地址";
    if (!password) next.password = "請輸入密碼";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (state !== "idle" || !validate()) return;
    setState("loading");
    // 示範模式:模擬網絡往返 → 成功 → toast → 跳轉
    window.setTimeout(() => {
      setState("success");
      const existing = loadMember();
      saveMember(
        existing && existing.email === email.trim()
          ? existing
          : {
              name: email.trim().split("@")[0] || "會員",
              email: email.trim(),
              interests: [],
              persona: null,
              role: "free",
              tier: "free",
              joinedAt: Date.now(),
              notifications: { ...DEFAULT_NOTIFICATIONS },
            }
      );
      showToast("登入成功(示範模式)");
      window.setTimeout(() => navigate("/account"), 700);
    }, 900);
  };

  /** 示範帳號:填好欄位 + 即時以對應角色登入 */
  const demoLogin = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    if (state !== "idle") return;
    setEmail(account.email);
    setPassword("demo-login");
    setErrors({});
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
    showToast(
      account.role === "expert" || account.role === "admin"
        ? `已登入(${ROLE_LABELS[account.role]})— 可前往 /portal 或 /admin`
        : `已登入(${ROLE_LABELS[account.role]})`
    );
    window.setTimeout(() => navigate("/account"), 700);
  };

  const handleMagicLink = () => {
    if (!validEmail(email)) {
      setErrors((prev) => ({ ...prev, email: "先輸入 Email,先可以寄登入連結" }));
      return;
    }
    setErrors({});
    showToast(`登入連結已發送至 ${email.trim()}(示範模式)`);
  };

  return (
    <div className="mx-auto flex max-w-container items-center justify-center px-6 py-16 md:py-24">
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="grid w-full max-w-4xl overflow-hidden rounded-md border bg-surface md:grid-cols-2"
      >
        {/* ---- 左:品牌板(永遠深色 band,同 hero/footer 同族) ---- */}
        <div className="relative flex flex-col justify-between gap-10 overflow-hidden bg-band-bg p-8 text-band-text md:p-10">
          <div className="relative">
            <p className="text-overline uppercase tracking-[0.12em] text-band-ink">
              AIGRO Club
            </p>
            <h2 className="mt-3 font-display text-h2 text-band-text">會員專區</h2>
            <p className="mt-3 text-body-sm text-band-text-secondary">
              加入香港 AI × Growth 圈,情報、分身、案例一次解鎖。
            </p>
          </div>
          <ul className="relative flex flex-col gap-5">
            {BENEFITS.map((b) => (
              <li key={b.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-band-ink-soft">
                  <b.icon className="h-4 w-4 text-band-ink" strokeWidth={1.5} />
                </span>
                <span>
                  <span className="block text-label text-band-text">{b.title}</span>
                  <span className="mt-0.5 block text-caption text-band-text-muted">
                    {b.desc}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ---- 右:登入表單 ---- */}
        <div className="p-8 md:p-10">
          <h1 className="font-display text-h3 text-text-primary">登入</h1>
          <p className="mt-2 text-body-sm text-text-secondary">
            歡迎返嚟。用 Email 登入你嘅 AIGRO 帳號。
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
            <Field
              id="login-email"
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              error={errors.email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
            />
            <div>
              <Field
                id="login-password"
                label="密碼"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                error={errors.password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password)
                    setErrors((prev) => ({ ...prev, password: undefined }));
                }}
              />
              <button
                type="button"
                onClick={() => showToast("重設密碼連結已發送(示範模式)")}
                className="press mt-2 text-caption text-text-muted underline decoration-text-muted/60 underline-offset-4 hover:text-ink"
              >
                忘記密碼?
              </button>
            </div>

            <button
              type="submit"
              disabled={state !== "idle"}
              className={cn(
                "press inline-flex h-12 items-center justify-center gap-2 rounded-md text-label",
                state === "success"
                  ? "bg-lime-soft text-ink"
                  : "bg-lime text-on-accent hover:bg-lime-hover disabled:opacity-80"
              )}
            >
              {state === "loading" && (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              )}
              {state === "success" && <Check className="h-4 w-4" strokeWidth={2} />}
              {state === "loading" ? "登入中…" : state === "success" ? "登入成功" : "登入"}
            </button>

            <button
              type="button"
              onClick={handleMagicLink}
              className="press inline-flex h-12 items-center justify-center gap-2 rounded-md border border-border-strong text-label text-text-primary hover:border-ink hover:text-ink"
            >
              <Mail className="h-4 w-4" strokeWidth={1.5} />
              用 Email 連結登入
            </button>
          </form>

          {/* ---- 示範帳號:低調 expander,一 click 角色登入 ---- */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setDemoOpen((v) => !v)}
              aria-expanded={demoOpen}
              className="press inline-flex items-center gap-1 text-caption text-text-muted hover:text-ink"
            >
              示範帳號
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-150",
                  demoOpen && "rotate-180"
                )}
                strokeWidth={1.5}
              />
            </button>
            <AnimatePresence initial={false}>
              {demoOpen && (
                <motion.div
                  key="demo-accounts"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 flex flex-col gap-2">
                    {DEMO_ACCOUNTS.map((a) => (
                      <button
                        key={a.email}
                        type="button"
                        onClick={() => demoLogin(a)}
                        className="press flex items-center justify-between gap-3 rounded-md border border-border-strong px-3 py-2 text-left transition-colors duration-150 hover:border-ink"
                      >
                        <span className="truncate font-mono text-caption text-text-secondary">
                          {a.email}
                        </span>
                        <span className="shrink-0 text-caption text-ink">
                          {ROLE_LABELS[a.role]}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="mt-8 border-t pt-6 text-body-sm text-text-secondary">
            未有帳號?
            <Link to="/join" className="link-underline ml-1 text-ink">
              立即加入
            </Link>
          </p>
          <p className="mt-3 text-caption text-text-muted">
            示範模式 — Supabase Auth 即將接入
          </p>
        </div>
      </motion.div>

      <Toast message={toast} />
    </div>
  );
}
