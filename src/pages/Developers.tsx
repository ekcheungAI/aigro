import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, Copy, Cpu } from "lucide-react";
import Reveal from "@/components/Reveal";
import CategoryChip from "@/components/CategoryChip";
import { captureWaitlist, type WaitlistSaveMode } from "@/lib/waitlist";

/* ================= 資料 ================= */

const MCP_ENDPOINT = "https://aigro.io/api/mcp";
const MCP_CONFIG = JSON.stringify(
  {
    mcpServers: {
      aigro: { url: MCP_ENDPOINT },
    },
  },
  null,
  2,
);

const INTERESTS = ["AI", "Beauty", "Technology", "Finance", "Property", "其他"];
const SECTOR_INTEREST: Record<string, string> = {
  ai: "AI",
  beauty: "Beauty",
  tech: "Technology",
  finance: "Finance",
  property: "Property",
  retail: "其他",
  more: "其他",
};
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

/* ================= Signup flow(the star) ================= */

function SignupCard({ initialInterests = [] }: { initialInterests?: string[] }) {
  const [record, setRecord] = useState<SignupRecord | null>(readSignup);
  const [savedMode, setSavedMode] = useState<WaitlistSaveMode | null>(() =>
    readSignup() ? "local" : null
  );
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [interests, setInterests] = useState<string[]>(initialInterests);
  const [role, setRole] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const toggleInterest = (label: string) =>
    setInterests((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );

  const save = async (finalRole: string | null) => {
    if (saving) return;
    const rec: SignupRecord = {
      email: email.trim(),
      interests,
      role: finalRole,
      ts: Date.now(),
    };
    setSaving(true);
    setSaveError("");
    const serverSaved = await captureWaitlist({
      email: rec.email,
      kind: "mcp",
      vertical: rec.interests.join(", ") || null,
      role: rec.role,
      source: "developers-mcp",
    });
    let mode: WaitlistSaveMode | null = serverSaved ? "server" : null;
    if (!serverSaved) {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(rec));
        mode = "local";
      } catch {
        /* Private browsing can reject localStorage. */
      }
    }
    setSaving(false);
    if (mode) {
      setSavedMode(mode);
      setRecord(rec);
    } else {
      setSaveError("暫時未能記錄，請稍後再試。");
    }
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
      <div className="rounded-md border bg-surface p-8 shadow-card dark:shadow-none">
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
          {savedMode === "server"
            ? "新 MCP 或功能開放時，你會係第一批收到接入文件嘅人。"
            : "資料已儲存在此裝置；連線後請再登記，先可以收到通知。"}
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
            className="inline-flex h-11 items-center gap-2 rounded-md bg-ink-solid px-6 text-label text-on-accent press hover:bg-ink-hover"
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
      <div className="rounded-md border bg-surface p-8 shadow-card dark:shadow-none">
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
            onClick={() => void save(role)}
            disabled={saving}
            className="inline-flex h-11 items-center rounded-md bg-ink-solid px-6 text-label text-on-accent press hover:bg-ink-hover"
          >
            {saving ? "記錄中" : "完成登記"}
          </button>
          <button
            type="button"
            onClick={() => void save(null)}
            disabled={saving}
            className="link-underline text-label text-ink"
          >
            跳過
          </button>
        </div>
        {saveError && (
          <p role="alert" className="mt-3 text-caption text-error">
            {saveError}
          </p>
        )}
      </div>
    );
  }

  /* ---------- Step 1:email + 行業興趣 ---------- */
  return (
    <form
      onSubmit={submitStep1}
      className="rounded-md border bg-surface p-8 shadow-card dark:shadow-none"
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
          className="inline-flex h-12 items-center rounded-md bg-ink-solid px-8 text-label text-on-accent press hover:bg-ink-hover"
        >
          加入優先名單
          <ArrowRight className="ml-1 h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        </button>
        <p className="text-caption text-text-muted">
          唔會 spam — 有新 MCP 或接入功能時先通知你。
        </p>
      </div>
    </form>
  );
}

function McpSetupCard() {
  const [copied, setCopied] = useState<"endpoint" | "config" | null>(null);

  const copy = async (value: string, kind: "endpoint" | "config") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="grid overflow-hidden rounded-md border bg-surface lg:grid-cols-[0.9fr_1.1fr]">
      <div className="p-8 md:p-10">
        <p className="text-overline font-sans uppercase text-text-muted">Streamable HTTP</p>
        <h2 className="mt-3 font-display text-h3 text-text-primary">即時接入</h2>
        <p className="mt-3 text-body-sm text-text-secondary">
          將 endpoint 加入任何支援遠端 MCP 嘅客戶端。公開 Beta 只提供已發佈情報嘅只讀查詢，毋須 API key。
        </p>
        <div className="mt-6 rounded-md border border-border-strong bg-card p-4">
          <code className="break-all font-mono text-caption text-text-primary">
            {MCP_ENDPOINT}
          </code>
        </div>
        <button
          type="button"
          onClick={() => void copy(MCP_ENDPOINT, "endpoint")}
          className="press mt-4 inline-flex h-11 items-center gap-2 rounded-md bg-ink-solid px-6 text-label text-on-accent hover:bg-ink-hover"
        >
          <Copy className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          {copied === "endpoint" ? "已複製 endpoint" : "複製 endpoint"}
        </button>
      </div>
      <div className="border-t bg-card p-8 lg:border-l lg:border-t-0 md:p-10">
        <p className="text-overline font-sans uppercase text-text-muted">通用 MCP 設定</p>
        <pre className="mt-4 overflow-x-auto rounded-md border border-border-strong bg-surface p-4 font-mono text-caption leading-6 text-text-primary">
          <code>{MCP_CONFIG}</code>
        </pre>
        <button
          type="button"
          onClick={() => void copy(MCP_CONFIG, "config")}
          className="press mt-4 inline-flex h-11 items-center gap-2 rounded-md border border-border-strong px-6 text-label text-ink hover:bg-ink-soft"
        >
          <Copy className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          {copied === "config" ? "已複製設定" : "複製設定"}
        </button>
      </div>
    </div>
  );
}

/* ================= Page ================= */

export default function Developers() {
  const [searchParams] = useSearchParams();
  const requestedSector = searchParams.get("sector");
  const requestedInterest = requestedSector
    ? SECTOR_INTEREST[requestedSector] ?? "其他"
    : null;
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
            將 AIGRO 情報接入你嘅 AI 工作流
          </h1>
          <p className="mt-6 max-w-[680px] text-body-lg text-text-secondary">
            首個 AI 情報 MCP 已推出公開 Beta。所有工具只回傳經品質閘門審核、附原文來源嘅香港繁體 AI 情報。
          </p>
        </Reveal>
      </section>

      {/* One honest status panel: shipped value first, roadmap second. */}
      <section
        id="endpoints"
        className="mx-auto max-w-container scroll-mt-24 px-6 pb-24 max-md:pb-16"
      >
        <Reveal>
          <div className="grid overflow-hidden rounded-md border bg-surface lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-8 md:p-10">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-ink-soft text-ink">
                  <Cpu className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span className="rounded-sm border border-border-strong px-3 py-1.5 text-overline font-sans uppercase text-text-secondary">
                  公開 Beta・只讀
                </span>
              </div>
              <h2 className="mt-6 font-display text-h2 text-text-primary">AI 情報 MCP</h2>
              <p className="mt-4 max-w-[560px] text-body text-text-secondary">
                即時讀取同網站一致嘅已發佈情報。資料會保留標題、摘要、來源、原文連結、發佈時間及分類；英文、非 AI 或資料不完整嘅項目唔會公開。
              </p>
              <a
                href="#setup"
                className="press mt-8 inline-flex h-11 items-center gap-2 rounded-md bg-ink-solid px-6 text-label text-on-accent hover:bg-ink-hover"
              >
                立即接入
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </a>
            </div>
            <div className="border-t bg-card p-8 lg:border-l lg:border-t-0 md:p-10">
              <p className="text-overline font-sans uppercase text-text-muted">可用工具</p>
              <ol className="mt-6 space-y-5">
                {[
                  ["get_latest_news", "取得最新 AI 情報"],
                  ["search_news", "搜尋已發佈情報"],
                  ["get_article_detail", "讀取單篇來源資料"],
                  ["get_daily_brief", "取得每日精選"],
                ].map(([tool, label], index) => (
                  <li key={tool} className="flex gap-4 border-t pt-4 first:border-t-0 first:pt-0">
                    <span className="font-mono text-caption text-ink">{String(index + 1).padStart(2, "0")}</span>
                    <span>
                      <code className="block font-mono text-caption text-text-primary">{tool}</code>
                      <span className="mt-1 block text-body-sm text-text-secondary">{label}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-8 text-caption text-text-muted">
                固定輸出語言：繁體中文（香港）· 結構化 JSON · 保留原文引用
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <section
        id="setup"
        className="mx-auto max-w-container scroll-mt-24 px-6 pb-24 max-md:pb-16"
      >
        <Reveal>
          <McpSetupCard />
        </Reveal>
      </section>

      {/* Signup flow — the star */}
      <section
        id="signup"
        className="mx-auto max-w-container scroll-mt-24 px-6 pb-24 max-md:pb-16"
      >
        <Reveal>
          <div className="mx-auto max-w-[720px]">
            <p className="mb-6 text-center text-body-sm text-text-secondary">
              想加入更多資料來源，或者希望我哋建立其他行業 MCP？登記需求俾我哋。
            </p>
            <SignupCard
              key={requestedInterest ?? "none"}
              initialInterests={
                requestedInterest ? [requestedInterest] : []
              }
            />
          </div>
        </Reveal>
      </section>

      {/* Club vision band — generated growth-system still life with a solid,
          theme-aware overlay and no decorative gradient. */}
      <section className="relative overflow-hidden border-t border-band-border bg-band-bg">
        <img
          src="/editorial/thumbnails/growth-loop.jpg"
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25 saturate-[0.88]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-band-bg/60"
        />
        <div className="relative mx-auto max-w-container px-6 py-20 max-md:py-16">
          <Reveal>
            <p className="flex items-center gap-3 text-overline font-sans uppercase text-band-text-muted">
              <span
                className="inline-block h-px w-6 bg-band-border-strong"
                aria-hidden="true"
              />
              The Club
            </p>
            <h2 className="mt-4 max-w-[720px] font-display text-h2 text-band-text">
              為香港 builders 整理可用情報，再連接專家同實戰方法。
            </h2>
            <p className="mt-4 max-w-[600px] text-body-sm text-band-text-secondary">
              情報 MCP 係第一步；會員與合作功能會按實際上線狀態逐步公開。
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
