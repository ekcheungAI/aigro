import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Loader2,
  Mail,
  MessagesSquare,
  Network,
  Rocket,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Field from "@/components/auth/Field";
import {
  DEFAULT_NOTIFICATIONS,
  saveMember,
  savePendingProfile,
  resendSignupConfirmation,
  sendPasswordReset,
  signInWithGoogle,
  signUpWithPassword,
  validEmail,
} from "@/components/auth/member";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase, supabaseReady } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type AuthMode = "join" | "login";
type SubmitState = "idle" | "loading" | "sent" | "success";
type SentKind = "confirmation" | "reset" | null;

interface FoundingBenefit {
  title: string;
  description: string;
  icon: LucideIcon;
}

const FOUNDING_MEMBER_BENEFITS: FoundingBenefit[] = [
  {
    title: "創始會員身份",
    description: "專屬標記、限定禮遇及早鳥福利",
    icon: BadgeCheck,
  },
  {
    title: "首批 Beta 體驗",
    description: "優先試用 Ask 與 Experts",
    icon: Rocket,
  },
  {
    title: "免費 MCP 使用權",
    description: "優先連接 AIGRO MCP Network",
    icon: Network,
  },
  {
    title: "導師 Live Chat",
    description: "與導師直接交流及即時答疑",
    icon: MessagesSquare,
  },
];

function safeNext(value: string | null, fallback: string): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

/**
 * Shared sign-up/login modal. `?auth=join|login` opens it over the current route,
 * so gated content never loses context and both auth paths share one experience.
 */
export default function AuthModal() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const authParam = searchParams.get("auth");
  const open = authParam === "join" || authParam === "login";
  const mode: AuthMode = authParam === "login" ? "login" : "join";
  const nextPath = safeNext(searchParams.get("next"), location.pathname);
  const betaFeature = nextPath.startsWith("/ask")
    ? "Ask AI 問答"
    : nextPath.startsWith("/experts")
      ? "Experts 專家平台"
      : null;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sentKind, setSentKind] = useState<SentKind>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  const modalTitle = useMemo(
    () => (mode === "join" ? "免費建立創始會員帳號" : "登入 AIGRO"),
    [mode]
  );
  useEffect(() => {
    if (resendSeconds === 0) return;
    const timer = window.setInterval(
      () => setResendSeconds((seconds) => Math.max(0, seconds - 1)),
      1000
    );
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const close = () => {
    setState("idle");
    setGoogleLoading(false);
    setSentKind(null);
    setMessage(null);
    setErrors({});
    const next = new URLSearchParams(searchParams);
    next.delete("auth");
    next.delete("next");
    setSearchParams(next, { replace: true });
  };

  const switchMode = (nextMode: AuthMode) => {
    setState("idle");
    setGoogleLoading(false);
    setSentKind(null);
    setMessage(null);
    setErrors({});
    const next = new URLSearchParams(searchParams);
    next.set("auth", nextMode);
    if (!next.has("next")) next.set("next", nextPath);
    setSearchParams(next, { replace: true });
  };

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (name.trim().length < 2) nextErrors.name = "請輸入至少 2 個字嘅名稱";
    if (!validEmail(email)) nextErrors.email = "請輸入有效嘅 Email 地址";
    if (password.length < 8) nextErrors.password = "密碼最少 8 個字元";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setState("loading");
    const member = {
      name: name.trim(),
      email: email.trim(),
      interests: [],
      persona: null,
      role: "founding" as const,
      tier: "free" as const,
      foundingMember: true,
      joinedAt: 0,
      notifications: { ...DEFAULT_NOTIFICATIONS },
      ...(supabaseReady ? {} : { demo: true as const }),
    };
    if (supabaseReady) {
      const result = await signUpWithPassword(member.email, password, nextPath);
      if (!result.ok) {
        setState("idle");
        setMessage(`暫時未能建立帳號：${result.error ?? "請稍後再試"}`);
        return;
      }
      savePendingProfile(member);
      setState("sent");
      setSentKind("confirmation");
      setResendSeconds(60);
      setMessage(`確認電郵已發送至 ${member.email}`);
      return;
    }

    saveMember(member);
    setState("success");
    window.setTimeout(close, 450);
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!validEmail(email)) nextErrors.email = "請輸入有效嘅 Email 地址";
    if (!password) nextErrors.password = "請輸入密碼";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !supabase) return;

    setState("loading");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setState("idle");
      if (error.code === "email_not_confirmed") {
        setMessage("請先確認 Email，再登入。");
      } else {
        setErrors((current) => ({ ...current, password: "Email 或密碼唔啱，請再試" }));
      }
      return;
    }
    setState("success");
    window.setTimeout(() => {
      close();
      if (location.pathname !== nextPath) navigate(nextPath);
    }, 450);
  };

  const handleForgotPassword = async () => {
    if (!validEmail(email)) {
      setErrors((current) => ({ ...current, email: "先輸入有效 Email" }));
      return;
    }
    if (!supabaseReady) {
      setMessage("示範模式未連接會員系統，Email 登入暫時未開放。");
      return;
    }
    setErrors({});
    setState("loading");
    const result = await sendPasswordReset(email);
    if (!result.ok) {
      setState("idle");
      setMessage("暫時未能發送重設電郵，請稍後再試。");
      return;
    }
    setState("sent");
    setSentKind("reset");
    setMessage(`如果帳號有效，重設密碼電郵會發送至 ${email.trim()}`);
  };

  const handleGoogle = async () => {
    if (!supabaseReady || state === "loading" || googleLoading) return;
    setErrors({});
    setMessage(null);
    setGoogleLoading(true);
    const result = await signInWithGoogle(nextPath);
    if (!result.ok) {
      setGoogleLoading(false);
      setMessage(
        result.error === "offline"
          ? "Google 登入暫時未開放，請改用 Email。"
          : "暫時未能連接 Google，請稍後再試。"
      );
    }
  };

  const handleResendConfirmation = async () => {
    if (resendSeconds > 0 || state === "loading") return;
    setState("loading");
    const result = await resendSignupConfirmation(email, nextPath);
    setState("sent");
    if (!result.ok) {
      setMessage("暫時未能重新發送，請稍後再試。");
      return;
    }
    setResendSeconds(60);
    setMessage(`確認電郵已重新發送至 ${email.trim()}`);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && close()}>
      <DialogContent
        aria-describedby="auth-modal-description"
        className="data-[state=closed]:!animate-none data-[state=open]:!animate-none max-h-[min(94dvh,760px)] w-[calc(100%-24px)] !max-w-[1040px] gap-0 overflow-y-auto border-border bg-surface p-0 shadow-card dark:shadow-none [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:flex [&_[data-slot=dialog-close]]:h-9 [&_[data-slot=dialog-close]]:w-9 [&_[data-slot=dialog-close]]:items-center [&_[data-slot=dialog-close]]:justify-center [&_[data-slot=dialog-close]]:rounded-md [&_[data-slot=dialog-close]]:border [&_[data-slot=dialog-close]]:border-border [&_[data-slot=dialog-close]]:bg-surface sm:[&_[data-slot=dialog-close]]:right-5 sm:[&_[data-slot=dialog-close]]:top-5"
      >
        <div className="grid lg:grid-cols-[380px_1fr]">
          <aside className="flex flex-col border-b border-logo-paper/10 bg-logo-navy p-5 text-logo-paper sm:p-7 lg:min-h-[690px] lg:border-b-0 lg:border-r lg:p-9">
            <div>
              <img
                src="/brand/aigro-wordmark-white-transparent.png"
                alt="AIGRO"
                width={1267}
                height={636}
                className="h-8 w-auto"
              />
              <h2 className="mt-8 font-sans text-h3 font-semibold leading-snug text-logo-paper lg:mt-10">
                成為 AIGRO 創始會員
              </h2>
              <p className="mt-2 text-body-sm leading-relaxed text-logo-paper/70">
                早期註冊期間免費加入，鎖定首批 Beta 資格。
              </p>
            </div>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:mt-9 lg:grid-cols-1 lg:gap-5" aria-label="創始會員權益">
              {FOUNDING_MEMBER_BENEFITS.map((benefit) => (
                <li key={benefit.title} className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-lime/35 bg-lime-soft/10 text-lime">
                    <benefit.icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <strong className="block text-label text-logo-paper">{benefit.title}</strong>
                    <span className="mt-0.5 block text-caption leading-relaxed text-logo-paper/65">
                      {benefit.description}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-caption leading-relaxed text-logo-paper/50 lg:mt-auto lg:pt-7">
              創始會員禮遇適用於早期體驗期間完成註冊嘅帳號，相關功能將按推出進度逐步開放。
            </p>
          </aside>

          <div className="p-5 sm:p-7 lg:p-9 lg:pr-12">
            <div className="grid grid-cols-2 rounded-md bg-card p-1" role="tablist" aria-label="會員登入選項">
              {(["join", "login"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={mode === item}
                  onClick={() => switchMode(item)}
                  className={cn(
                    "press min-h-11 rounded-sm px-4 text-label transition-colors duration-150",
                    mode === item
                      ? "border border-border bg-surface text-text-primary"
                      : "text-text-muted hover:text-text-primary"
                  )}
                >
                  {item === "join" ? "免費加入" : "登入"}
                </button>
              ))}
            </div>

            <DialogTitle className="mt-5 font-sans text-h3 font-semibold text-text-primary lg:mt-6">
              {modalTitle}
            </DialogTitle>
            <DialogDescription id="auth-modal-description" className="mt-2 text-body-sm text-text-secondary">
              {mode === "join"
                ? "使用 Google 或 Email 免費加入，立即取得創始會員身份。"
                : "使用 Google，或者輸入 Email 和密碼登入會員專區。"}
            </DialogDescription>
            {mode === "join" && betaFeature && (
              <p className="mt-2 text-caption font-medium leading-relaxed text-ink">
                你亦會列入 {betaFeature} 首批 Beta 開放名單，優先收到測試邀請。
              </p>
            )}

            {state === "sent" ? (
              <div className="rounded-md border border-ink bg-lime-soft p-5" role="status">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lime text-on-accent">
                  <Mail className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-h4 text-text-primary">
                  {sentKind === "confirmation" ? "去信箱確認帳號" : "去信箱重設密碼"}
                </h3>
                <p className="mt-2 text-body-sm text-text-secondary">{message}</p>
                {sentKind === "confirmation" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={resendSeconds > 0}
                      className="press inline-flex h-10 items-center rounded-md border border-border-strong px-4 text-label text-text-primary disabled:opacity-50"
                    >
                      {resendSeconds > 0 ? `${resendSeconds} 秒後可重發` : "重新發送確認電郵"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setState("idle");
                        setSentKind(null);
                      }}
                      className="press inline-flex h-10 items-center rounded-md px-4 text-label text-ink"
                    >
                      更改 Email
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={!supabaseReady || state === "loading" || googleLoading}
                  className="press relative mt-5 inline-flex h-12 w-full items-center justify-center rounded-md border border-[hsl(var(--google-button-border))] bg-[hsl(var(--google-button-bg))] px-12 text-label text-[hsl(var(--google-button-text))] transition-colors duration-150 hover:bg-[hsl(var(--google-button-hover))] disabled:opacity-50 lg:mt-6"
                >
                  {googleLoading ? (
                    <Loader2 className="absolute left-4 h-4 w-4 animate-spin motion-reduce:animate-none" strokeWidth={1.5} aria-hidden="true" />
                  ) : (
                    <img
                      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                      alt=""
                      width={18}
                      height={18}
                      className="absolute left-4 h-[18px] w-[18px]"
                    />
                  )}
                  {mode === "join" ? "使用 Google 註冊" : "使用 Google 登入"}
                </button>

                <div className="my-4 flex items-center gap-3 text-caption text-text-muted" aria-hidden="true">
                  <span className="h-px flex-1 bg-border" />
                  <span>或者使用 Email</span>
                  <span className="h-px flex-1 bg-border" />
                </div>

                <form onSubmit={mode === "join" ? handleJoin : handleLogin} className="grid gap-3.5" noValidate>
                  {mode === "join" && (
                    <Field
                      id="auth-name"
                      label="顯示名稱"
                      autoComplete="name"
                      placeholder="你的名稱"
                      value={name}
                      error={errors.name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  )}
                  <Field
                    id="auth-email"
                    label="Email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    error={errors.email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  <Field
                    id="auth-password"
                    label="密碼"
                    type="password"
                    autoComplete={mode === "join" ? "new-password" : "current-password"}
                    placeholder="••••••••"
                    hint={mode === "join" ? "最少 8 個字元" : undefined}
                    value={password}
                    disabled={mode === "login" && !supabaseReady}
                    error={errors.password}
                    onChange={(event) => setPassword(event.target.value)}
                  />

                  {message && <p className="text-caption text-text-muted" role="status">{message}</p>}

                  <button
                    type="submit"
                    disabled={state === "loading" || googleLoading || (mode === "login" && !supabaseReady)}
                    className="press mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-lime px-5 text-label text-on-accent hover:bg-lime-hover disabled:opacity-60"
                  >
                    {state === "loading" ? (
                      <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" strokeWidth={1.5} aria-hidden="true" />
                    ) : null}
                    {state === "loading" ? "處理中…" : mode === "join" ? "免費加入並成為創始會員" : "登入"}
                    {state !== "loading" && <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />}
                  </button>

                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={state === "loading"}
                      className="press justify-self-start text-caption text-ink underline decoration-ink/35 underline-offset-4 hover:decoration-ink disabled:opacity-60"
                    >
                      忘記密碼？
                    </button>
                  )}
                </form>
              </div>
            )}

            <p className="mt-5 border-t border-border pt-4 text-caption leading-relaxed text-text-muted">
              繼續即代表你同意 AIGRO 以會員服務所需方式處理帳戶資料。
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
