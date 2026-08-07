import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Lock } from "lucide-react";
import Reveal from "@/components/Reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

type Billing = "monthly" | "yearly";

/* ---------- 方案資料（pricing.md §2 — 配額全部以數字明確標示） ---------- */

interface Tier {
  id: "free" | "pro" | "vip";
  overline: string;
  name: string;
  monthly: number;
  yearly: number;
  yearlyNote: string | null;
  tagline: string;
  features: string[];
  ctaLabel: string;
  ctaTo: string;
}

const TIERS: Tier[] = [
  {
    id: "free",
    overline: "FREE",
    name: "免費",
    monthly: 0,
    yearly: 0,
    yearlyNote: null,
    tagline: "每日情報，永遠免費。",
    features: [
      "全部情報與日報任讀",
      "AI 對話限時無限",
      "案例庫摘要版",
      "每週精選 Newsletter",
    ],
    ctaLabel: "免費開始",
    ctaTo: "/ask",
  },
  {
    id: "pro",
    overline: "FOUNDING MEMBER",
    name: "創始會員",
    monthly: 168,
    yearly: 140,
    yearlyNote: "按年付 HK$1,680",
    tagline: "俾認真嘅 marketer 同 founder。",
    features: [
      "無限分身對話",
      "案例上架後解鎖完整拆解",
      "MCP 開放時優先通知",
      "專家活動優先席",
    ],
    ctaLabel: "成為創始會員",
    ctaTo: "/join?plan=pro",
  },
  {
    id: "vip",
    overline: "VIP",
    name: "尊貴 VIP",
    monthly: 988,
    yearly: 824,
    yearlyNote: "按年付 HK$9,880",
    tagline: "真人導師，一對一。",
    features: [
      "創始會員全部功能",
      "每月 1 次真人導師 1:1（45 分鐘）",
      "語音對話",
      "新功能優先體驗",
      "專屬會員活動邀請",
    ],
    ctaLabel: "申請 VIP",
    ctaTo: "/join?plan=vip",
  },
];

/* ---------- 對照誠實表（pricing.md §3） ---------- */

type CellValue = { kind: "text"; value: string } | { kind: "check" } | { kind: "dash" };

const COMPARE_ROWS: { label: string; cells: [CellValue, CellValue, CellValue] }[] = [
  {
    label: "AI 編輯部對話",
    cells: [
      { kind: "text", value: "限時無限" },
      { kind: "text", value: "無限" },
      { kind: "text", value: "無限" },
    ],
  },
  {
    label: "專家 AI 分身",
    cells: [{ kind: "dash" }, { kind: "check" }, { kind: "check" }],
  },
  {
    label: "語音對話",
    cells: [{ kind: "dash" }, { kind: "dash" }, { kind: "check" }],
  },
  {
    label: "真人 1:1 預約",
    cells: [
      { kind: "dash" },
      { kind: "text", value: "可加購 HK$1,500/次" },
      { kind: "text", value: "每月 1 次包含" },
    ],
  },
  {
    label: "案例完整拆解",
    cells: [
      { kind: "text", value: "尚未上架" },
      { kind: "text", value: "上架後開放" },
      { kind: "text", value: "上架後開放" },
    ],
  },
];

/* ---------- FAQ（pricing.md §4） ---------- */

const FAQS = [
  {
    q: "AI 分身嘅回答可靠嗎？",
    a: "每個分身基於導師授權知識庫；命中已批准知識時會附觀點出處，資料不足時會清楚標示，並建議向真人專家核實。",
  },
  {
    q: "VIP 嘅真人預約點安排？",
    a: "每月一次 45 分鐘視像會議，於導師頁選擇時段，48 小時前可免費改期。",
  },
  {
    q: "可以隨時取消嗎？",
    a: "可以。月費計劃取消後用到期末，年費按比例退回未使用月份。",
  },
  {
    q: "企業團隊方案？",
    a: "5 人以上團隊請聯絡我們，提供團隊配額與專屬知識庫對接（MCP / API 即將開放）。",
  },
] as const;

/* ---------- Count-up 數字（design.md §5.1：800ms ease-out 整數，進入 viewport 一次） ---------- */

interface CountUpProps {
  value: number;
  /** 首次 count-up 完成後為 true — 之後切換月費/年費即時顯示 */
  skip: boolean;
  onCounted?: () => void;
}

function CountUp({ value, skip, onCounted }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(skip ? value : 0);

  useEffect(() => {
    if (!inView) return;
    if (skip || reduced) {
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 800);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out
      setDisplay(Math.round(value * eased));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        onCounted?.();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, skip, reduced, onCounted]);

  const renderedDisplay = skip || reduced ? value : display;
  return <span ref={ref}>{renderedDisplay.toLocaleString("en-HK")}</span>;
}

/* ---------- 方案卡 ---------- */

interface TierCardProps {
  tier: Tier;
  billing: Billing;
  counted: boolean;
  onCounted: () => void;
}

function TierCard({ tier, billing, counted, onCounted }: TierCardProps) {
  const price = billing === "monthly" ? tier.monthly : tier.yearly;
  const isVip = tier.id === "vip";
  const isPro = tier.id === "pro";

  const cardInner = (
    <>
      <p
        className={cn(
          "text-overline uppercase",
          isVip ? "text-gold" : isPro ? "text-ink" : "text-text-muted"
        )}
      >
        {tier.overline}
      </p>
      <h3 className="mt-2 font-display text-h3 text-text-primary">{tier.name}</h3>

      {/* 創始版本狀態 — 無虛假稀缺或未驗證人氣標籤 */}
      {isPro && (
        <p className="mt-3 inline-flex w-fit items-center rounded-full bg-lime-soft px-2.5 py-1 text-caption text-ink">
          創始版本 · 開放前可先登記
        </p>
      )}

      {/* 價格行 — 切換時 cross-fade 200ms（舊值 -8px 出，新值 +8px 入） */}
      <div className="mt-6 flex items-baseline gap-1.5">
        <span className="font-display text-h4 text-text-primary">HK$</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={billing}
            initial={{ opacity: 0, transform: "translateY(8px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0, transform: "translateY(-8px)" }}
            transition={{ duration: 0.2 }}
            className="font-display text-display text-text-primary"
          >
            <CountUp value={price} skip={counted} onCounted={onCounted} />
          </motion.span>
        </AnimatePresence>
        <span className="text-caption text-text-muted">/月</span>
      </div>
      <p className="mt-1 min-h-[21px] text-caption text-text-muted">
        {billing === "yearly" && tier.yearlyNote ? tier.yearlyNote : ""}
      </p>

      <p className="mt-3 text-body-sm text-text-secondary">{tier.tagline}</p>

      <ul className="mt-6 space-y-5">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-ink" strokeWidth={1.5} />
            <span className="text-body-sm text-text-secondary">{f}</span>
          </li>
        ))}
      </ul>

      <Link
        to={tier.ctaTo}
        className={cn(
          "group mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md text-label press",
          isVip || isPro
            ? "bg-ink-solid text-on-accent hover:bg-ink-hover"
            : "border border-border-strong text-ink hover:bg-ink-soft"
        )}
      >
        {/* VIP 標記（design.md §6.3）：墨藍實心 + 金色鎖定標籤 — 全站唯一 */}
        {isVip && <Lock className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />}
        {tier.ctaLabel}
        {(isVip || isPro) && (
          <ArrowRight
            className="h-4 w-4 transition-transform duration-150 nudge-x"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        )}
      </Link>
      {isVip && (
        <p className="mt-2 text-center text-caption text-gold">審核制・名額有限</p>
      )}
    </>
  );

  // VIP：2px 金邊框，進入 viewport 後 300ms 由 0% → 100% opacity fade（無光澤，克制）
  if (isVip) {
    return (
      <motion.div
        initial={{ borderColor: "hsl(var(--gold) / 0)" }}
        whileInView={{ borderColor: "hsl(var(--gold) / 1)" }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="rounded-md border-2 bg-surface p-8 transition-[transform] duration-180 hover-lift-sm"
      >
        {cardInner}
      </motion.div>
    );
  }

  return (
    <div
      id={isPro ? "founding-plan" : undefined}
      className={cn(
        "card-hover rounded-md bg-surface p-8",
        isPro ? "border-[1.5px] border-ink ring-2 ring-lime" : "border"
      )}
    >
      {cardInner}
    </div>
  );
}

/* ---------- 對照表儲存格 ---------- */

function CompareCell({ cell }: { cell: CellValue }) {
  if (cell.kind === "check") {
    return (
      <span className="inline-flex items-center justify-center">
        <Check className="h-4 w-4 text-ink" strokeWidth={1.5} aria-label="包含" />
      </span>
    );
  }
  if (cell.kind === "dash") {
    return <span className="text-text-muted">—</span>;
  }
  return <span className="font-mono text-text-secondary">{cell.value}</span>;
}

/* ---------- Pricing `/pricing` — 會員方案（pricing.md） ---------- */

export default function Pricing() {
  const [billing, setBilling] = useState<Billing>("monthly");
  // 價格 count-up 只播一次（§5.1）；切換月費/年費時改為 cross-fade 即時值
  const [counted, setCounted] = useState(false);
  const markCounted = useCallback(() => setCounted(true), []);

  return (
    <>
      {/* ---------- Section 1 — Page Header ---------- */}
      <section className="relative isolate overflow-hidden border-b border-band-border bg-band-bg text-center">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <img
            src="/editorial/thumbnails/market-signals.jpg"
            alt=""
            width={1586}
            height={992}
            className="h-full w-full object-cover opacity-30"
          />
          <span className="absolute inset-0 bg-band-bg/65" />
        </div>
        <div className="mx-auto max-w-container px-6 py-16 md:py-20">
        <Reveal>
          <p className="flex items-center justify-center gap-3 text-overline uppercase text-band-text-muted">
            <span className="inline-block h-px w-6 bg-band-border-strong" aria-hidden="true" />
            Pricing 方案
            <span className="inline-block h-px w-6 bg-band-border-strong" aria-hidden="true" />
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <h1 className="mt-4 font-display text-display text-band-text">
            情報免費讀；會員解鎖專家分身
          </h1>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mx-auto mt-4 max-w-xl text-body-lg text-band-text-secondary">
            基本情報與 AI 編輯部免費使用；創始會員用授權專家分身深入追問，
            新功能按實際開放狀態逐步加入。
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <div
            className="mt-8 inline-flex rounded-md border border-band-border-strong bg-band-bg p-1"
            role="group"
            aria-label="收費模式"
          >
            {(["monthly", "yearly"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={billing === mode}
                onClick={() => setBilling(mode)}
                className={cn(
                  "min-h-11 rounded-sm px-4 py-2 text-label transition-colors duration-150",
                  billing === mode
                      ? "bg-band-ink-soft text-band-ink"
                      : "text-band-text-secondary hover:text-band-ink"
                )}
              >
                {mode === "monthly" ? "月費" : "年費（慳 2 個月）"}
              </button>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.35}>
          <a
            href="#founding-plan"
            className="press mt-4 inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-label text-band-ink md:hidden"
          >
            查看創始會員 HK$168/月
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </a>
        </Reveal>
        </div>
      </section>

      {/* ---------- Section 2 — 方案卡格（金色僅 VIP 欄） ---------- */}
      <section className="mx-auto max-w-container px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
          {TIERS.map((tier, i) => (
            <Reveal key={tier.id} delay={i * 0.1}>
              <TierCard
                tier={tier}
                billing={billing}
                counted={counted}
                onCounted={markCounted}
              />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Section 3 — 對照誠實表 ---------- */}
      <section className="mx-auto max-w-[720px] px-6 pb-24">
        <Reveal>
          <h3 className="font-display text-h3 text-text-primary">逐項對照</h3>
        </Reveal>
        <Reveal delay={0.1} className="mt-6">
          <div className="overflow-hidden rounded-md border bg-surface">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-5 py-4 text-left text-label font-medium text-text-primary">
                    項目
                  </th>
                  <th className="px-3 py-4 text-center text-label font-medium text-text-primary">
                    免費
                  </th>
                  <th className="px-3 py-4 text-center text-label font-medium text-text-primary">
                    創始會員
                  </th>
                  <th className="px-3 py-4 text-center text-label font-medium text-text-primary">
                    VIP
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <motion.tr
                    key={row.label}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="border-b last:border-b-0"
                  >
                    <td className="px-5 py-4 text-left text-text-secondary">{row.label}</td>
                    {row.cells.map((cell, ci) => (
                      <td key={ci} className="px-3 py-4 text-center">
                        <CompareCell cell={cell} />
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </section>

      {/* ---------- Section 4 — FAQ ---------- */}
      <section className="mx-auto max-w-[720px] px-6 pb-24">
        <Reveal>
          <h3 className="font-display text-h3 text-text-primary">常見問題</h3>
        </Reveal>
        <Reveal delay={0.1} className="mt-4">
          <Accordion type="single" collapsible>
            {FAQS.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`} className="border-b">
                <AccordionTrigger className="py-5 text-label text-text-primary hover:text-ink hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-body-sm text-text-secondary">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </section>

      {/* ---------- Section 5 — 信任尾註 ---------- */}
      <section className="mx-auto max-w-container px-6 pb-24">
        <Reveal>
          <p className="text-center text-caption text-text-muted">
            所有價格為港元・可隨時取消・AI 回答僅供參考，不構成投資或專業建議
          </p>
        </Reveal>
      </section>
    </>
  );
}
