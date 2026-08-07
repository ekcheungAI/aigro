import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Check,
  Loader2,
  Mail,
  MessagesSquare,
  NotebookText,
  Plug,
} from "lucide-react";
import Field from "@/components/auth/Field";
import Toast, { useToast } from "@/components/auth/Toast";
import { sendMagicLink, validEmail } from "@/components/auth/member";
import { supabase, supabaseReady } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const BENEFITS = [
  { icon: MessagesSquare, title: "無限分身對話", desc: "領航專家 AI 分身，隨時問隨時答" },
  { icon: NotebookText, title: "完整案例拆解", desc: "數據、方法、可複製步驟全部公開" },
  { icon: Plug, title: "MCP 優先接入", desc: "AIGRO MCP Network 名單優先開放" },
] as const;

type SubmitState = "idle" | "loading" | "success";

/**
 * Login `/login` — 會員登入(真 Supabase Auth)。
 * 置中 split card(max-w-4xl):左 = 品牌板(near-black + lime 條紋,
 * 「會員專區」serif H2 + 3 個會員價值);右 = 表單。
 * 密碼登入行 signInWithPassword;magic link 行 signInWithOtp。
 * 無 env(示範模式)→ 密碼 form disabled + 誠實提示,唔會假裝成功。
 */
export default function Login() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { toast, showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [state, setState] = useState<SubmitState>("idle");
  // magic-link 真發送狀態
  const [linkSending, setLinkSending] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  // 忘記密碼發送狀態
  const [resetSending, setResetSending] = useState(false);

  const validate = () => {
    const next: typeof errors = {};
    if (!validEmail(email)) next.email = "請輸入有效嘅 Email 地址";
    if (!password) next.password = "請輸入密碼";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  /** 真密碼登入(Supabase signInWithPassword);成功後 initAuth listener 接手 hydrate profile */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabaseReady || !supabase) return;
    if (state !== "idle" || !validate()) return;
    setState("loading");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setState("idle");
        setErrors((prev) => ({ ...prev, password: "Email 或密碼唔啱，請再試" }));
        return;
      }
      setState("success");
      showToast("登入成功");
      window.setTimeout(() => navigate("/account"), 700);
    } catch {
      setState("idle");
      showToast("登入失敗，請稍後再試");
    }
  };

  /** 忘記密碼 — 真 resetPasswordForEmail(只喺 supabaseReady 時顯示) */
  const handleResetPassword = async () => {
    if (!supabase || resetSending) return;
    if (!validEmail(email)) {
      setErrors((prev) => ({ ...prev, email: "先輸入 Email,先可以寄重設連結" }));
      return;
    }
    setErrors({});
    setResetSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      showToast(
        error
          ? `發送失敗:${error.message}`
          : `重設密碼連結已發送至 ${email.trim()}`
      );
    } catch {
      showToast("發送失敗，請稍後再試");
    }
    setResetSending(false);
  };

  const handleMagicLink = async () => {
    if (!validEmail(email)) {
      setErrors((prev) => ({ ...prev, email: "先輸入 Email,先可以寄登入連結" }));
      return;
    }
    setErrors({});
    if (!supabaseReady) {
      // 誠實提示:無 env 發唔到,唔假裝成功
      showToast("示範模式未連接 Supabase — magic link 暫時發唔到");
      return;
    }
    setLinkSending(true);
    const res = await sendMagicLink(email);
    setLinkSending(false);
    if (res.ok) {
      setLinkSent(true);
      showToast("連結已發送，去你嘅信箱 click 連結登入");
    } else {
      showToast(`發送失敗:${res.error ?? "請稍後再試"}`);
    }
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
          {/* 會員沙龍品牌圖 — cover + 40% black overlay 保文字對比 */}
          <img
            src="/editorial/thumbnails/hong-kong-adoption.jpg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-band-bg/75" />
          <div className="relative">
            <p className="text-overline uppercase tracking-[0.12em] text-band-ink">
              AIGRO Club
            </p>
            <h2 className="mt-3 font-display text-h2 text-band-text">會員專區</h2>
            <p className="mt-3 text-body-sm text-band-text-secondary">
              加入香港 AI × Growth 圈，情報、分身、案例一次解鎖。
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
                disabled={!supabaseReady}
                error={errors.password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password)
                    setErrors((prev) => ({ ...prev, password: undefined }));
                }}
              />
              {supabaseReady ? (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={resetSending}
                  className="press mt-2 inline-flex items-center gap-1 text-caption text-text-muted underline decoration-text-muted/60 underline-offset-4 hover:text-ink disabled:opacity-60"
                >
                  {resetSending && (
                    <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
                  )}
                  忘記密碼?
                </button>
              ) : (
                <p className="mt-2 text-caption text-text-muted">
                  示範模式未連接 Supabase — 密碼登入暫時唔用得
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!supabaseReady || state !== "idle"}
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
              disabled={linkSending}
              className={cn(
                "press inline-flex h-12 items-center justify-center gap-2 rounded-md border text-label disabled:opacity-80",
                linkSent
                  ? "border-transparent bg-lime-soft text-ink"
                  : "border-border-strong text-text-primary hover:border-ink hover:text-ink"
              )}
            >
              {linkSending ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              ) : linkSent ? (
                <Check className="h-4 w-4" strokeWidth={2} />
              ) : (
                <Mail className="h-4 w-4" strokeWidth={1.5} />
              )}
              {linkSending
                ? "發送中…"
                : linkSent
                  ? "連結已發送，去你嘅信箱"
                  : "用 Email 連結登入"}
            </button>
          </form>

          <p className="mt-8 border-t pt-6 text-body-sm text-text-secondary">
            未有帳號?
            <Link to="/join" className="link-underline ml-1 text-ink">
              立即加入
            </Link>
          </p>
          <p className="mt-3 text-caption text-text-muted">
            {supabaseReady
              ? "用 Email 連結登入 — 無需記密碼"
              : "示範模式 — 未設定 Supabase env,登入功能暫時未開放"}
          </p>
        </div>
      </motion.div>

      <Toast message={toast} />
    </div>
  );
}
