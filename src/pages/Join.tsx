import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MessagesSquare,
  Newspaper,
  Plug,
} from "lucide-react";
import Field from "@/components/auth/Field";
import Toast, { useToast } from "@/components/auth/Toast";
import {
  DEFAULT_NOTIFICATIONS,
  roleFromTier,
  saveMember,
  savePendingProfile,
  sendMagicLink,
  validEmail,
} from "@/components/auth/member";
import type { MemberTier } from "@/components/auth/member";
import { supabaseReady } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["建立帳號", "揀你嘅戰場", "揀方案"] as const;

const INTERESTS = ["AI 行銷", "增長實驗", "自動化", "內容創作", "社群營運"] as const;
const ROLES = ["Founder", "Marketer", "Developer", "Creator"] as const;

interface JoinTier {
  id: MemberTier;
  name: string;
  price: string;
  tagline: string;
}

const JOIN_TIERS: JoinTier[] = [
  { id: "free", name: "免費", price: "HK$0", tagline: "基本情報與 AI 編輯部。" },
  { id: "pro", name: "創始會員", price: "HK$168/月", tagline: "授權專家分身與會員功能。" },
  { id: "vip", name: "VIP", price: "HK$988/月", tagline: "真人導師，一對一。" },
];

const NEXT_ACTIONS = [
  {
    icon: MessagesSquare,
    title: "試問分身",
    desc: "即刻同 AI 編輯部開個對話",
    to: "/ask",
  },
  {
    icon: Newspaper,
    title: "睇最新情報",
    desc: "瀏覽目前可用嘅精選情報",
    to: "/insights/daily",
  },
  {
    icon: Plug,
    title: "登記 MCP",
    desc: "優先接入 AIGRO MCP Network",
    to: "/developers",
  },
] as const;

type Strength = { level: 0 | 1 | 2 | 3; label: string; className: string };

function passwordStrength(pw: string): Strength {
  if (!pw) return { level: 0, label: "", className: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: "弱", className: "bg-error" };
  if (score <= 3) return { level: 2, label: "中", className: "bg-warning" };
  return { level: 3, label: "強", className: "bg-success" };
}

/**
 * Join `/join` — 3 步會員註冊(club funnel,示範模式)。
 * Step 1 建立帳號(name + email + password 強度髮絲 meter)→
 * Step 2 揀你嘅戰場(興趣多選 chips + 身份單選)→
 * Step 3 揀方案(免費/創始會員/VIP,創始會員預選;VIP 審核制 toast)→
 * 成功畫面(lime check + 下一步建議)。
 * 完成時寫入 localStorage `aigro-member`;Supabase Auth 接入時
 * Step 1 換 supabase.auth.signUp,其餘作為 onboarding profile。
 */
export default function Join() {
  const reduced = useReducedMotion();
  const { toast, showToast } = useToast();
  // /pricing CTA 直達:?plan=pro(創始會員,都係預設)/ ?plan=vip(審核制申請)
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get("plan");

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [done, setDone] = useState(false);
  // magic-link 成功發送(有 env 時)— 成功畫面提示去信箱click 連結
  const [magicSent, setMagicSent] = useState(false);

  // Step 1
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  // Step 2
  const [interests, setInterests] = useState<string[]>([]);
  const [persona, setPersona] = useState<string | null>(null);
  const [interestError, setInterestError] = useState<string | null>(null);

  // Step 3 — 創始會員預選;?plan= 可帶入 /pricing 嘅選擇(vip = 審核制申請)
  const [tier, setTier] = useState<MemberTier>(() =>
    planParam === "vip" ? "vip" : planParam === "free" ? "free" : "pro"
  );

  const strength = useMemo(() => passwordStrength(password), [password]);

  const validateStep1 = () => {
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = "請輸入至少 2 個字嘅名稱";
    if (!validEmail(email)) next.email = "請輸入有效嘅 Email 地址";
    if (password.length < 8) next.password = "密碼最少 8 個字元";
    setErrors(next);
    const firstInvalid = next.name
      ? "join-name"
      : next.email
        ? "join-email"
        : next.password
          ? "join-password"
          : null;
    if (firstInvalid) {
      window.requestAnimationFrame(() => {
        document.getElementById(firstInvalid)?.focus();
      });
    }
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
    } else if (step === 2) {
      if (interests.length === 0) {
        setInterestError("最少揀一個你有興趣嘅領域");
        window.requestAnimationFrame(() => {
          document.getElementById("join-interests")?.focus();
        });
        return;
      }
      setInterestError(null);
      setStep(3);
    }
  };

  const finish = async () => {
    const member = {
      name: name.trim(),
      email: email.trim(),
      interests,
      persona,
      // 4 級制度:揀創始會員方案 → founding;免費 → free
      role: roleFromTier(tier),
      tier,
      joinedAt: Date.now(),
      notifications: { ...DEFAULT_NOTIFICATIONS },
      // 離線 / 無 env → 本地示範帳號;有 env → 行真 magic-link
      ...(supabaseReady ? {} : { demo: true as const }),
    };
    saveMember(member);
    if (supabaseReady) {
      // magic-link 空窗期:暫存 onboarding 欄位,session 建立後 upsert 入 profiles
      savePendingProfile({
        name: member.name,
        email: member.email,
        interests,
        persona,
        tier,
      });
      const res = await sendMagicLink(member.email);
      setMagicSent(res.ok);
      if (!res.ok) showToast("登入連結發送失敗 — 帳號已喺本機建立,可稍後再登入");
    }
    setDone(true);
  };

  const toggleInterest = (item: string) => {
    setInterestError(null);
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const pickTier = (id: MemberTier) => {
    setTier(id);
    if (id === "vip") {
      showToast("VIP 採審核制 — 完成註冊即提交申請,48 小時內電郵回覆");
    }
  };

  /* ---------------- 成功畫面 ---------------- */
  if (done) {
    return (
      <div className="mx-auto max-w-[720px] px-6 py-20 md:py-28">
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          className="flex flex-col items-center text-center"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-lime">
            <Check className="h-8 w-8 text-on-accent" strokeWidth={2.5} />
          </span>
          <h1 className="mt-6 font-display text-h2 text-text-primary">
            歡迎加入 AIGRO Club
          </h1>
          <p className="mt-3 max-w-md text-body-sm text-text-secondary">
            {name.trim()},你嘅帳號已經開通。而家免費開始,隨時升級 —
            以下係你可以即刻做嘅三件事:
          </p>
          {magicSent && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-lime bg-lime-soft px-4 py-2.5 text-caption text-ink">
              <Check className="h-4 w-4 shrink-0" strokeWidth={2} />
              登入連結已發送至 {email.trim()} — 去你嘅信箱click 連結,完成登入同步資料
            </p>
          )}
        </motion.div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {NEXT_ACTIONS.map((action, i) => (
            <motion.div
              key={action.to}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 + i * 0.08, ease: [0.4, 0, 0.2, 1] }}
            >
              <Link
                to={action.to}
                className="card-hover group flex h-full flex-col rounded-md border bg-surface p-5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-lime-soft">
                  <action.icon className="h-5 w-5 text-ink" strokeWidth={1.5} />
                </span>
                <span className="mt-4 text-label text-text-primary">{action.title}</span>
                <span className="mt-1 text-caption text-text-muted">{action.desc}</span>
                <span className="mt-auto pt-4">
                  <ArrowRight
                    className="nudge-x h-4 w-4 text-ink transition-transform duration-180"
                    strokeWidth={1.5}
                  />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 text-center text-caption text-text-muted">
          隨時去<Link to="/account" className="link-underline text-ink">會員專區</Link>
          管理你嘅帳號與通知設定。
        </p>
      </div>
    );
  }

  /* ---------------- 3 步表單 ---------------- */
  return (
    <div className="mx-auto max-w-[720px] px-6 py-16 md:py-24">
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* 頁首品牌 band — 會員沙龍 16:9 crop + 40% black overlay */}
        <div className="relative mb-8 h-40 overflow-hidden rounded-md">
          <img
            src="/editorial/thumbnails/hong-kong-adoption.jpg"
            alt="AIGRO 會員沙龍"
            width={720}
            height={405}
            className="h-full w-full object-cover"
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black/40" />
        </div>
        <p className="text-overline uppercase tracking-[0.12em] text-ink">Join AIGRO Club</p>
        <h1 className="mt-3 font-display text-h2 text-text-primary">加入 Club</h1>
        <p className="mt-2 text-body-sm text-text-secondary">
          三步完成註冊,即刻解鎖分身對話、情報收藏與 MCP 名單。
        </p>

        {/* 步驟指示 — 髮絲進度 + 編號 */}
        <ol className="mt-10 flex items-start gap-2" aria-label="註冊步驟">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const active = n === step;
            const complete = n < step;
            return (
              <li key={label} className="flex-1">
                <span
                  className={cn(
                    "block h-[2px] w-full rounded-full transition-colors duration-200",
                    complete || active ? "bg-lime" : "bg-border"
                  )}
                />
                <span
                  className={cn(
                    "mt-2 block text-caption",
                    active ? "text-text-primary" : "text-text-muted"
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {n}. {label}
                </span>
              </li>
            );
          })}
        </ol>

        <form onSubmit={(event) => event.preventDefault()}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: 16 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: -16 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="mt-8"
          >
            {/* ---------------- Step 1:建立帳號 ---------------- */}
            {step === 1 && (
              <div className="flex flex-col gap-5">
                <Field
                  id="join-name"
                  label="顯示名稱"
                  autoComplete="name"
                  placeholder="例:Elvin"
                  value={name}
                  error={errors.name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                  }}
                />
                <Field
                  id="join-email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  error={errors.email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                  }}
                />
                <div>
                  <Field
                    id="join-password"
                    label="密碼"
                    type="password"
                    autoComplete="new-password"
                    placeholder="最少 8 個字元"
                    value={password}
                    error={errors.password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                    }}
                  />
                  {/* 強度髮絲 meter:3 段,弱/中/強 */}
                  {password && (
                    <div className="mt-2 flex items-center gap-3" aria-live="polite">
                      <div className="flex flex-1 gap-1">
                        {[1, 2, 3].map((seg) => (
                          <span
                            key={seg}
                            className={cn(
                              "h-[2px] flex-1 rounded-full transition-colors duration-200",
                              seg <= strength.level ? strength.className : "bg-border"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-caption text-text-muted">{strength.label}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ---------------- Step 2:揀你嘅戰場 ---------------- */}
            {step === 2 && (
              <div className="flex flex-col gap-8">
                <fieldset
                  id="join-interests"
                  tabIndex={-1}
                  aria-describedby={interestError ? "join-interests-error" : undefined}
                >
                  <legend className="text-label text-text-primary">
                    你有興趣嘅領域(可揀多個)
                  </legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {INTERESTS.map((item) => {
                      const on = interests.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleInterest(item)}
                          className={cn(
                            "press inline-flex h-10 items-center rounded-full border px-4 text-label",
                            on
                              ? "border-transparent bg-lime-soft text-ink"
                              : "border-border-strong text-text-secondary hover:text-text-primary"
                          )}
                        >
                          {on && <Check className="mr-1.5 h-3.5 w-3.5" strokeWidth={2} />}
                          {item}
                        </button>
                      );
                    })}
                  </div>
                  {interestError && (
                    <p id="join-interests-error" role="alert" className="mt-2 text-caption text-error">
                      {interestError}
                    </p>
                  )}
                </fieldset>

                <fieldset>
                  <legend className="text-label text-text-primary">你嘅身份(揀一個)</legend>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {ROLES.map((r) => {
                      const on = persona === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setPersona(on ? null : r)}
                          className={cn(
                            "press flex h-12 items-center justify-center rounded-md border text-label",
                            on
                              ? "border-transparent bg-lime text-on-accent"
                              : "border-border-strong text-text-secondary hover:text-text-primary"
                          )}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
            )}

            {/* ---------------- Step 3:揀方案 ---------------- */}
            {step === 3 && (
              <div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {JOIN_TIERS.map((t) => {
                    const on = tier === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => pickTier(t.id)}
                        className={cn(
                          "card-hover relative flex flex-col rounded-md border bg-surface p-5 text-left",
                          on && "border-transparent ring-2 ring-ink"
                        )}
                      >
                        {on && (
                          <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-lime">
                            <Check className="h-3 w-3 text-on-accent" strokeWidth={3} />
                          </span>
                        )}
                        <span className="text-overline uppercase tracking-[0.12em] text-text-muted">
                          {t.name}
                        </span>
                        <span className="mt-2 font-display text-h4 text-text-primary">
                          {t.name}
                        </span>
                        <span className="mt-1 text-label text-ink">{t.price}</span>
                        <span className="mt-2 text-caption text-text-muted">{t.tagline}</span>
                      </button>
                    );
                  })}
                </div>
                {tier === "vip" && (
                  <p className="mt-4 rounded-md border border-border bg-card/60 px-4 py-3 text-caption text-text-secondary">
                    VIP 採申請制 — 正式開放前會先確認導師時段、收費同服務條款。
                  </p>
                )}
                <p className="mt-4 text-caption text-text-muted">
                  而家免費開始,隨時升級。詳細方案對照見
                  <Link to="/pricing" className="link-underline ml-1 text-ink">
                    Pricing
                  </Link>
                  。
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* 導航按鈕 */}
        <div className="mt-10 flex items-center gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
              className="press inline-flex h-12 items-center gap-2 rounded-md border border-border-strong px-5 text-label text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              上一步
            </button>
          ) : (
            <p className="text-caption text-text-muted">
              已經有帳號?
              <Link to="/login" className="link-underline ml-1 text-ink">
                登入
              </Link>
            </p>
          )}
          <button
            type="button"
            onClick={step === 3 ? finish : goNext}
            className="press ml-auto inline-flex h-12 items-center gap-2 rounded-md bg-lime px-6 text-label text-on-accent hover:bg-lime-hover"
          >
            {step === 3 ? "完成註冊" : "下一步"}
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
        </form>

        <p className="mt-6 text-caption text-text-muted">
          {supabaseReady
            ? "完成註冊後會收到登入連結 email — click 連結即同步你嘅資料"
            : "示範模式 — 未設定 Supabase env,資料只存喺瀏覽器"}
        </p>
      </motion.div>

      <Toast message={toast} />
    </div>
  );
}
