import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Copy, Cpu, Sparkles, Vote, Wrench } from "lucide-react";
import Reveal from "@/components/Reveal";
import CategoryChip from "@/components/CategoryChip";

/* ================= 資料 ================= */

const INTERESTS = ["AI", "Beauty", "Technology", "Finance", "Property", "其他"];
const ROLES = ["Founder", "Marketer", "Developer", "Creator", "其他"];

const LS_KEY = "aigro-mcp-signup";

interface SignupRecord {
  email: string;
  interests: string[];
  role: string | null;
  ts: number;
}

function readSignup(): SignupRecord | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SignupRecord;
    return parsed && typeof parsed.email === "string" ? parsed : null;
  } catch {
    return null;
  }
}

/* ================= Vertical MCP 清單 ================= */

interface VerticalMcp {
  icon: typeof Cpu;
  title: string;
  status: string;
  statusKind: "open" | "planning";
  points: string[];
}

const VERTICALS: VerticalMcp[] = [
  {
    icon: Cpu,
    title: "AI 情報 MCP",
    status: "優先名單開放中",
    statusKind: "open",
    points: [
      "每日精選、hot-topics、日報 API",
      "基於而家 147+ 則情報庫,持續更新",
    ],
  },
  {
    icon: Sparkles,
    title: "Beauty 美妝情報",
    status: "規劃中 Planning",
    statusKind: "planning",
    points: ["產品發布、成分趨勢、KOL 動態"],
  },
  {
    icon: Wrench,
    title: "Technology 科技情報",
    status: "規劃中 Planning",
    statusKind: "planning",
    points: ["硬件、開發工具、企業科技"],
  },
];

/* ================= Signup flow(the star) ================= */

function SignupCard({ initialInterests = [] }: { initialInterests?: string[] }) {
  const [record, setRecord] = useState<SignupRecord | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [interests, setInterests] = useState<string[]>(initialInterests);
  const [role, setRole] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Returning users see the success state
  useEffect(() => {
    setRecord(readSignup());
  }, []);

  const toggleInterest = (label: string) =>
    setInterests((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );

  const save = (finalRole: string | null) => {
    const rec: SignupRecord = {
      email: email.trim(),
      interests,
      role: finalRole,
      ts: Date.now(),
    };
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(rec));
    } catch {
      /* localStorage 不可用時仍顯示成功態(前端原型) */
    }
    setRecord(rec);
  };

  const submitStep1 = (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError("請輸入有效嘅 email 地址。");
      return;
    }
    setEmailError("");
    setStep(2);
  };

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard 被拒時靜默失敗 */
    }
  };

  /* ---------- 成功態 ---------- */
  if (record) {
    return (
      <div className="rounded-lg border bg-surface p-8 shadow-card dark:shadow-none">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-soft"
          aria-hidden="true"
        >
          <Check className="h-6 w-6 text-ink" strokeWidth={1.5} />
        </span>
        <h3 className="mt-5 font-display text-h3 text-text-primary">
          已加入優先名單
        </h3>
        <p className="mt-2 max-w-[520px] text-body-sm text-text-secondary">
          MCP 開放時,你會係第一批收到接入文件嘅人。
        </p>
        <p className="mt-4 font-mono text-caption text-text-muted">
          {record.email}
          {record.interests.length > 0 && ` · ${record.interests.join(" / ")}`}
          {" · 優先名單持續增加中"}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={copyShare}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-ink-solid px-6 text-label text-white press hover:bg-ink-hover"
          >
            <Copy className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            {copied ? "已複製連結" : "話俾伙伴知"}
          </button>
          <p className="text-caption text-text-muted">
            複製 AIGRO 網址,send 俾你嘅 builder 伙伴。
          </p>
        </div>
      </div>
    );
  }

  /* ---------- Step 2:builder 類型(optional) ---------- */
  if (step === 2) {
    return (
      <div className="rounded-lg border bg-surface p-8 shadow-card dark:shadow-none">
        <p className="font-mono text-caption text-text-muted">STEP 2 / 2</p>
        <h3 className="mt-3 font-display text-h3 text-text-primary">
          你係邊類 builder?
        </h3>
        <p className="mt-2 text-body-sm text-text-secondary">
          可選 — 幫我哋決定邊個行業嘅 MCP 先做。
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <CategoryChip
              key={r}
              label={r}
              active={role === r}
              onClick={() => setRole((prev) => (prev === r ? null : r))}
            />
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => save(role)}
            className="inline-flex h-11 items-center rounded-md bg-ink-solid px-6 text-label text-white press hover:bg-ink-hover"
          >
            完成登記
          </button>
          <button
            type="button"
            onClick={() => save(null)}
            className="link-underline text-label text-ink"
          >
            跳過
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Step 1:email + 行業興趣 ---------- */
  return (
    <form
      onSubmit={submitStep1}
      className="rounded-lg border bg-surface p-8 shadow-card dark:shadow-none"
      noValidate
    >
      <p className="font-mono text-caption text-text-muted">STEP 1 / 2</p>
      <h3 className="mt-3 font-display text-h3 text-text-primary">
        登記 MCP 優先名單
      </h3>
      <label
        htmlFor="mcp-email"
        className="mt-5 block text-label text-text-secondary"
      >
        Email
      </label>
      <input
        id="mcp-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="mt-2 h-12 w-full rounded-md border border-border-strong bg-surface px-4 text-body text-text-primary placeholder:text-text-muted"
      />
      {emailError && (
        <p className="mt-2 text-caption text-error" role="alert">
          {emailError}
        </p>
      )}

      <p className="mt-6 text-label text-text-secondary">
        你想要邊個行業嘅 MCP?
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {INTERESTS.map((i) => (
          <CategoryChip
            key={i}
            label={i}
            active={interests.includes(i)}
            onClick={() => toggleInterest(i)}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          className="inline-flex h-12 items-center rounded-md bg-ink-solid px-8 text-label text-white press hover:bg-ink-hover"
        >
          加入優先名單
          <ArrowRight className="ml-1 h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        </button>
        <p className="text-caption text-text-muted">
          唔會 spam — MCP 開放時先通知你。
        </p>
      </div>
    </form>
  );
}

/* ================= Page ================= */

export default function Developers() {
  // 「話我哋知」chip → 預揀「其他」興趣 + 捲去 signup(key remount 帶入預選)
  const [interestPreset, setInterestPreset] = useState(0);

  // /developers#endpoints 錨點(Home ghost CTA) — Layout scroll-to-top 之後再定位
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(t);
  }, []);

  const scrollToSignup = () => {
    setInterestPreset((n) => n + 1);
    setTimeout(() => {
      document.getElementById("signup")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    }, 0);
  };

  return (
    <>
      {/* Header — 標準頁首 pattern */}
      <section className="mx-auto max-w-container px-6 pb-16 pt-24 max-md:pt-16">
        <Reveal>
          <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
            <span
              className="inline-block h-px w-6 bg-border-strong"
              aria-hidden="true"
            />
            MCP Network · For Builders
          </p>
          <h1 className="mt-3 max-w-[760px] font-display text-display text-text-primary">
            一個 MCP,做行業情報領先者
          </h1>
          <p className="mt-6 max-w-[680px] text-body-lg text-text-secondary">
            AIGRO 將各行業嘅即時情報蒸餾成 MCP server — 你嘅 AI 工具(Claude
            Code / Cursor / 任何 agent)一連接,即刻有行業雷達。AI 行業係第一步。
          </p>
        </Reveal>
      </section>

      {/* Vertical MCP list — hairline grid */}
      <section
        id="endpoints"
        className="mx-auto max-w-container scroll-mt-24 px-6 pb-24 max-md:pb-16"
      >
        {/* gap-px hairline grid — 1px gaps let bg-border show through as rules */}
        <div className="grid gap-px border-y bg-border md:grid-cols-2 lg:grid-cols-4">
          {/* AI 情報 MCP — 優先名單開放中 */}
          <Reveal className="bg-bg p-8">
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
                <span className="inline-flex items-center rounded-sm bg-ink-soft px-3 py-1.5 text-overline font-sans uppercase text-ink">
                  優先名單開放中
                </span>
              </div>
              <h2 className="mt-4 font-display text-h3 text-text-primary">
                AI 情報 MCP
              </h2>
              <ul className="mt-3 space-y-1.5 text-body-sm text-text-secondary">
                {VERTICALS[0].points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              {/* Endpoints preview — mono block */}
              <div className="mt-5 rounded-md border bg-card p-4">
                <p className="overflow-x-auto whitespace-nowrap font-mono text-caption leading-6 text-text-secondary">
                  GET /api/public/items
                  <br />
                  GET /api/public/daily
                  <br />
                  GET /api/public/hot-topics
                </p>
                <p className="mt-3 border-t border-border pt-2 text-caption text-text-muted">
                  MCP server 封裝中
                </p>
              </div>
            </div>
          </Reveal>

          {/* Beauty / Technology — 規劃中 */}
          {VERTICALS.slice(1).map((v, i) => (
            <Reveal
              key={v.title}
              delay={(i + 1) * 0.08}
              className="bg-bg p-8"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-2">
                  <v.icon className="h-4 w-4 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
                  <span className="inline-flex items-center rounded-sm border border-border-strong px-3 py-1.5 text-overline font-sans uppercase text-text-muted">
                    {v.status}
                  </span>
                </div>
                <h2 className="mt-4 font-display text-h3 text-text-primary">
                  {v.title}
                </h2>
                <ul className="mt-3 space-y-1.5 text-body-sm text-text-secondary">
                  {v.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}

          {/* 更多行業 — Club 會員投票 */}
          <Reveal delay={0.24} className="bg-bg p-8">
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-2">
                <Vote className="h-4 w-4 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
                <button
                  type="button"
                  onClick={scrollToSignup}
                  className="press inline-flex items-center rounded-sm border border-border-strong px-3 py-1.5 text-overline font-sans uppercase text-ink hover:border-ink"
                >
                  話我哋知
                </button>
              </div>
              <h2 className="mt-4 font-display text-h3 text-text-primary">
                更多行業由 Club 會員投票決定
              </h2>
              <p className="mt-3 text-body-sm text-text-secondary">
                Finance、Property,定係你身處嘅行業?登記時揀「其他」話我哋知,
                Club 會員投票決定下一個 MCP。
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Signup flow — the star */}
      <section
        id="signup"
        className="mx-auto max-w-container scroll-mt-24 px-6 pb-24 max-md:pb-16"
      >
        <Reveal>
          <div className="mx-auto max-w-[720px]">
            <SignupCard
              key={interestPreset}
              initialInterests={interestPreset > 0 ? ["其他"] : []}
            />
          </div>
        </Reveal>
      </section>

      {/* Club vision band — dark band */}
      <section className="border-t border-band-border bg-band-bg">
        <div className="mx-auto max-w-container px-6 py-20 max-md:py-16">
          <Reveal>
            <p className="flex items-center gap-3 text-overline font-sans uppercase text-band-text-muted">
              <span
                className="inline-block h-px w-6 bg-band-border-strong"
                aria-hidden="true"
              />
              The Club
            </p>
            <h2 className="mt-4 max-w-[720px] font-display text-h2 text-band-text">
              AIGRO 唔止情報 — 係香港 builders、entrepreneurs 同專業人士嘅 super
              club。
            </h2>
            <p className="mt-4 max-w-[600px] text-body-sm text-band-text-secondary">
              情報 MCP 係第一步;活動、協作、品牌 cross-over 陸續有嚟。
            </p>
            <Link
              to="/pricing"
              className="group mt-8 inline-flex items-center gap-1 text-label text-band-ink"
            >
              Club 會員制即將開放
              <ArrowRight
                className="h-4 w-4 transition-transform duration-150 nudge-x"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
