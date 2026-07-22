import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Reveal, { REVEAL_EASE } from "@/components/Reveal";
import { todayInfo } from "@/lib/daily";
import InsightCard from "@/components/InsightCard";
import CaseCard from "@/components/CaseCard";
import CategoryChip from "@/components/CategoryChip";
import VerifiedBadge from "@/components/VerifiedBadge";
import {
  INSIGHT_CATEGORIES,
  dailyPicks,
  insights,
  type InsightCategory,
} from "@/data/insights";
import { featuredCases } from "@/data/cases";
import { experts } from "@/data/experts";

/* ================= Section 1 — Hero ================= */

function Hero() {
  const [picksOpen, setPicksOpen] = useState(true);

  return (
    <section className="mx-auto max-w-container px-6 pb-20 pt-[120px] max-md:pt-16">
      <div className="max-w-[880px]">
        {/* Overline — fade-in first (300ms) */}
        <motion.p
          className="flex items-center gap-3 text-overline font-sans uppercase text-ink"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: REVEAL_EASE }}
        >
          <span className="inline-block h-[1.5px] w-6 bg-ink" aria-hidden="true" />
          香港視角・每日更新 Hong Kong, Daily
        </motion.p>

        {/* H1 — line-level reveal, 32px + opacity, 100ms stagger, 600ms */}
        <h1 className="mt-6 font-display text-display-xl text-text-primary max-md:text-display">
          {[
            <>
              <span className="text-ink">可信賴的</span> AI・增長・
            </>,
            <>商業情報平台</>,
          ].map((line, i) => (
            <span key={i} className="block overflow-hidden">
              <motion.span
                className="block"
                initial={{ y: 32, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration: 0.6,
                  delay: 0.1 + i * 0.1,
                  ease: REVEAL_EASE,
                }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h1>

        {/* Sub + CTAs — delay 300ms */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3, ease: REVEAL_EASE }}
        >
          <p className="mt-6 max-w-[560px] text-body-lg text-text-secondary">
            每一篇內容經過編輯審核，每一位導師經過認證。為香港 marketer 與
            founder，過濾全球 AI 噪音。
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Link
              to="/insights"
              className="inline-flex h-11 items-center rounded-md bg-ink-solid px-6 text-label text-white transition-colors duration-120 hover:bg-ink-hover active:scale-[0.98]"
            >
              閱讀今日情報
            </Link>
            <Link
              to="/ask"
              className="group inline-flex items-center gap-1 text-label text-ink"
            >
              試問 AI 編輯部
              <ArrowRight
                className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </Link>
          </div>
        </motion.div>

        {/* 今日 AI 精選速覽 — slides in last (delay 500ms) */}
        <motion.div
          className="mt-12 rounded-md border bg-surface shadow-card dark:shadow-none"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: REVEAL_EASE }}
        >
          <button
            type="button"
            onClick={() => setPicksOpen((v) => !v)}
            aria-expanded={picksOpen}
            className="flex w-full items-center gap-2 px-6 py-4 text-left"
          >
            <span className="text-label text-text-primary">今日 AI 精選速覽</span>
            <ChevronDown
              className={`h-4 w-4 text-text-muted transition-transform duration-200 ${picksOpen ? "rotate-180" : ""}`}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span className="ml-auto text-caption text-text-muted">
              {todayInfo().date}・5 條
            </span>
          </button>
          <AnimatePresence initial={false}>
            {picksOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <ol className="border-t">
                  {dailyPicks.map((pick, i) => (
                    <li key={pick.slug}>
                      <Link
                        to={`/insights/${pick.slug}`}
                        className="group flex items-baseline gap-4 px-6 py-3 transition-colors duration-150 hover:bg-card"
                      >
                        <span className="font-mono text-caption text-ink">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="line-clamp-1 text-h4 font-sans font-medium text-text-primary transition-colors duration-150 group-hover:text-ink">
                          {pick.title}
                        </span>
                        <span className="ml-auto shrink-0 text-caption text-text-muted">
                          {pick.source}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

/* ================= Section 2 — Insights 情報牆 ================= */

function InsightsWall() {
  const [category, setCategory] = useState<InsightCategory | "全部">("全部");
  const wallRef = useRef<HTMLDivElement>(null);

  const filtered =
    category === "全部"
      ? insights
      : insights.filter((i) => i.category === category);

  const scrollWall = (dir: 1 | -1) => {
    wallRef.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  };

  return (
    <section className="mx-auto max-w-container px-6 py-24 max-md:py-16">
      {/* Header row */}
      <Reveal>
        <p className="text-overline font-sans uppercase text-text-muted">
          Daily Intelligence
        </p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <h2 className="font-display text-h2 text-text-primary">情報 Insights</h2>
          <Link
            to="/insights"
            className="group hidden shrink-0 items-center gap-1 text-label text-ink sm:inline-flex"
          >
            查看全部
            <ArrowRight
              className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </Link>
        </div>
      </Reveal>

      {/* Category chips — stagger 60ms */}
      <div className="mt-6 flex flex-wrap gap-2">
        {(["全部", ...INSIGHT_CATEGORIES] as const).map((c, i) => (
          <Reveal key={c} delay={i * 0.06} y={12} duration={0.3}>
            <CategoryChip
              label={c}
              active={category === c}
              onClick={() => setCategory(c)}
            />
          </Reveal>
        ))}
      </div>

      {/* Horizontal scroll-snap card wall — 340px fixed cards */}
      <div className="relative mt-8">
        <div
          ref={wallRef}
          className="flex gap-6 overflow-x-auto pb-2 [scroll-snap-type:x_mandatory] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {filtered.map((insight, i) => (
            <Reveal
              key={insight.slug}
              delay={Math.min(i, 2) * 0.08}
              className="w-[340px] shrink-0 [scroll-snap-align:start]"
            >
              <InsightCard insight={insight} />
            </Reveal>
          ))}
        </div>
        {/* Arrow controls */}
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => scrollWall(-1)}
            aria-label="向左捲動"
            className="flex h-10 w-10 items-center justify-center rounded-md border bg-surface text-text-secondary transition-colors duration-150 hover:bg-ink-soft hover:text-ink"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => scrollWall(1)}
            aria-label="向右捲動"
            className="flex h-10 w-10 items-center justify-center rounded-md border bg-surface text-text-secondary transition-colors duration-150 hover:bg-ink-soft hover:text-ink"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ================= Section 3 — Cases 精選 ================= */

function CasesFeatured() {
  return (
    <section className="mx-auto max-w-container px-6 py-24 max-md:py-16">
      <Reveal>
        <p className="text-overline font-sans uppercase text-text-muted">
          Field-Tested in Hong Kong
        </p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <h2 className="font-display text-h2 text-text-primary">
            實戰案例 Cases
          </h2>
          <Link
            to="/cases"
            className="group hidden shrink-0 items-center gap-1 text-label text-ink sm:inline-flex"
          >
            全部案例
            <ArrowRight
              className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </Link>
        </div>
      </Reveal>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {featuredCases.map((c, i) => (
          <Reveal key={c.slug} delay={i * 0.1}>
            <CaseCard caseStudy={c} />
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.15}>
        <p className="mt-6 text-caption text-text-muted">
          來源：AIGRO 學員成果・Build in Public 社群・經當事人授權刊登
        </p>
      </Reveal>
    </section>
  );
}

/* ================= Section 4 — Experts 導師頭像牆 ================= */

function ExpertsWall() {
  return (
    <section className="mx-auto max-w-container px-6 py-24 max-md:py-16">
      <Reveal>
        <p className="text-overline font-sans uppercase text-text-muted">
          Verified Experts
        </p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <h2 className="font-display text-h2 text-text-primary">
            認證導師 Experts
          </h2>
          <Link
            to="/experts"
            className="group hidden shrink-0 items-center gap-1 text-label text-ink sm:inline-flex"
          >
            認識所有導師
            <ArrowRight
              className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </Link>
        </div>
      </Reveal>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        {/* Overlapping avatar row */}
        <div className="flex items-center">
          {experts.map((expert, i) => (
            <motion.div
              key={expert.slug}
              className="group relative -ml-2 first:ml-0"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35, delay: i * 0.1, ease: REVEAL_EASE }}
            >
              <Link
                to={expert.verified ? `/experts/${expert.slug}` : "/experts"}
                aria-label={`${expert.nameEn} ${expert.nameZh}`}
                className="block transition-transform duration-150 group-hover:-translate-y-0.5"
              >
                <span
                  className={`relative block h-16 w-16 overflow-hidden rounded-full border-2 border-surface ${
                    expert.verified
                      ? "shadow-[0_0_0_1.5px_hsl(var(--gold))]"
                      : "opacity-60 shadow-[0_0_0_1px_hsl(var(--border))]"
                  }`}
                >
                  <img
                    src={expert.image}
                    alt={`${expert.nameEn} ${expert.nameZh}`}
                    width={64}
                    height={64}
                    loading="lazy"
                    className="h-full w-full object-cover grayscale transition-[filter] duration-250 group-hover:grayscale-0"
                  />
                </span>
                {expert.verified && (
                  <VerifiedBadge
                    size={24}
                    ambient
                    sheenDelaySec={i * 0.2}
                    className="absolute -bottom-0.5 -right-0.5 border-2 border-surface"
                  />
                )}
              </Link>
              {/* Tooltip */}
              <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-3 w-max -translate-x-1/2 rounded-md border bg-surface px-3 py-2 opacity-0 shadow-card transition-opacity duration-150 group-hover:opacity-100 dark:shadow-none">
                <span className="block text-label text-text-primary">
                  {expert.nameEn} {expert.nameZh}
                </span>
                <span className="block text-caption text-text-muted">
                  {expert.title}
                </span>
              </span>
            </motion.div>
          ))}
          {/* Counter chip */}
          <span className="ml-3 inline-flex h-8 items-center rounded-md bg-card px-3 text-label text-text-secondary">
            +3
          </span>
        </div>

        {/* Description */}
        <Reveal delay={0.2} className="max-w-md">
          <p className="text-body text-text-secondary">
            每一位 AIGRO 導師均經實績查證與面談認證。他們的 AI
            分身基於原創訪談與公開著作蒸餾，並獲本人書面授權。
          </p>
          <p className="mt-2 text-caption text-text-muted">
            首批導師邀請中・敬請期待
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ================= Section 5 — Ask CTA Band ================= */

function AskCta() {
  return (
    <section className="border-y bg-surface">
      <Reveal className="mx-auto max-w-container px-6 py-20 text-center">
        <p className="text-overline font-sans uppercase text-text-muted">
          Ask 問答
        </p>
        <h3 className="mt-3 font-display text-h3 text-text-primary">
          有咩 AI 問題？問我哋嘅 AI 編輯部。
        </h3>
        <p className="mx-auto mt-3 max-w-[520px] text-body-sm text-text-secondary">
          基於全站情報與案例庫回答，每個論點附來源引用 — 無引用，不下結論。
        </p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.15, ease: REVEAL_EASE }}
        >
          <Link
            to="/ask"
            className="mt-8 inline-flex h-12 items-center rounded-md bg-ink-solid px-8 text-label text-white transition-colors duration-120 hover:bg-ink-hover active:scale-[0.98]"
          >
            開始對話
            <ArrowRight className="ml-1 h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </Link>
        </motion.div>
        <p className="mt-4 text-caption text-text-muted">
          免費會員每日 5 次・無需信用卡
        </p>
      </Reveal>
    </section>
  );
}

/* ================= Page ================= */

export default function Home() {
  return (
    <>
      <Hero />
      <InsightsWall />
      <CasesFeatured />
      <ExpertsWall />
      <AskCta />
    </>
  );
}
