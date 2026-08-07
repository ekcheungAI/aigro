import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Reveal, { REVEAL_EASE } from "@/components/Reveal";
import UpdatedChip from "@/components/UpdatedChip";
import InsightCard from "@/components/InsightCard";
import CategoryChip from "@/components/CategoryChip";
import MonogramAvatar, { PhotoAvatar } from "@/components/MonogramAvatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import LiveStats from "@/components/home/LiveStats";
import HotTopicsTicker from "@/components/home/HotTopicsTicker";
import HowToUse from "@/components/home/HowToUse";
import AskPreview from "@/components/home/AskPreview";
import { personas } from "@/data/personas";
import { INSIGHT_CATEGORIES, type InsightCategory } from "@/data/insights";
import {
  aihotDailyPicks,
  aihotFetchedAt,
  aihotInsights,
  type AihotDailyPick,
} from "@/data/aihot";
import { hkDayKey, useLiveFetchedAt, useLiveInsights } from "@/data/liveItems";
import { expertFullName, expertHasPhoto, experts } from "@/data/experts";
import useDataFreshness from "@/hooks/useDataFreshness";

/* ================= Section 1 — Cinematic Dark Hero ================= */

function Hero() {
  const [picksOpen, setPicksOpen] = useState(true);
  const reduceMotion = useReducedMotion();
  const show = reduceMotion ? false : undefined;

  /* 今日精選速覽 — Supabase live 成熟時用全站評分最高 5 條,未成熟回落 snapshot */
  const liveInsights = useLiveInsights();
  const liveFetchedAt = useLiveFetchedAt();
  const { isLive, isArchive } = useDataFreshness();
  /* 速覽 label 用數據時鐘日期(同 LiveStats 做法)— 唔會同展示嘅情報有落差 */
  const picksDate =
    hkDayKey(liveFetchedAt ?? aihotFetchedAt) ??
    hkDayKey(new Date().toISOString()) ??
    "";
  const dailyPicks = useMemo<AihotDailyPick[]>(() => {
    if (!liveInsights) return aihotDailyPicks;
    return [...liveInsights]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((i) => ({
        slug: i.slug,
        title: i.title,
        source: i.source,
        permalink: i.permalink,
        originalUrl: i.originalUrl,
        score: i.score,
      }));
  }, [liveInsights]);

  return (
    <section className="relative isolate -mt-16 overflow-hidden border-b border-band-border bg-band-bg pt-16">
      {/* Brand texture — print-masthead system, not imagery (design.md §9:
          不需要 hero 背景圖). Oversized Fraunces wordmark watermark at ~5%
          band-text bleeding off the right edge + fine hairline rules.
          Static, transform-only positioning, silent in both themes. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 select-none"
      >
        <span className="absolute right-[0.04em] top-1/2 -translate-y-1/2 whitespace-nowrap font-display text-[clamp(20rem,32vw,36rem)] leading-none tracking-[-0.03em] text-band-text/[0.05]">
          AIGRO
          {/* Brand period — the wordmark is「AIGRO.」with a lime dot; the
              watermark echoes it one step brighter than the letters */}
          <span className="-ml-[0.14em] text-band-ink/[0.10]">.</span>
        </span>
        {/* Masthead double rule, directly under the overlay nav */}
        <span className="absolute inset-x-0 top-16 h-px bg-band-border-strong/50" />
        <span className="absolute inset-x-0 top-[68px] h-px bg-band-border/60" />
        {/* Broadsheet column rule — right margin only, clear of the measure */}
        <span className="absolute inset-y-0 right-[18%] hidden w-px bg-band-border/40 lg:block" />
      </div>

      <div className="mx-auto max-w-container px-6 pb-24 pt-24 max-md:pb-16 max-md:pt-16 md:pt-32 lg:pb-32">
        <div className="max-w-[920px]">
          {/* Overline — lime hairline rule + letterspaced eyebrow */}
          <motion.p
            className="flex items-center gap-3 text-overline font-sans uppercase tracking-[0.2em] text-band-text-muted"
            initial={show ?? { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: REVEAL_EASE }}
          >
            <span className="inline-block h-px w-10 bg-band-gold" aria-hidden="true" />
            {isLive
              ? "香港視角・每 30 分鐘同步 Hong Kong, Live"
              : "香港視角・資料快照 Hong Kong Edition"}
          </motion.p>

          {/* H1 — MasterClass-scale Fraunces, slower line reveal
              (40px + opacity, 120ms stagger, 750ms — GPU transform only) */}
          <h1 className="mt-8 font-display text-[44px] leading-[1.1] tracking-[-0.01em] text-band-text md:text-display-hero">
            {[
              <>
                <span className="text-band-ink">可信賴的</span>
              </>,
              <>AI・增長・商業情報平台</>,
            ].map((line, i) => (
              <span key={i} className="block overflow-hidden pb-1">
                <motion.span
                  className="block"
                  initial={show ?? { y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    duration: 0.75,
                    delay: 0.15 + i * 0.12,
                    ease: REVEAL_EASE,
                  }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          {/* Sub + CTAs — delay 400ms */}
          <motion.div
            initial={show ?? { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: REVEAL_EASE }}
          >
            <p className="mt-8 max-w-[560px] text-body-lg text-band-text-secondary">
              每日精選全球 AI 情報，由領航專家嘅 AI 分身陪你落地 —
              香港 marketer 與 founder 嘅增長情報平台。
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link
                to="/insights"
                className="inline-flex h-12 items-center rounded-md bg-band-ink-solid px-8 text-label text-on-accent press hover:bg-band-ink-hover"
              >
                {isArchive ? "閱讀最新快照" : "閱讀今日情報"}
              </Link>
              <Link
                to="/ask"
                className="group inline-flex items-center gap-1 text-label text-band-ink"
              >
                試問 AI 編輯部
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-150 nudge-x"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </Link>
            </div>
          </motion.div>

          {/* Live intelligence layer — 真實數據統計 + 熱門話題輪轉 (delay 500ms) */}
          <motion.div
            className="mt-12"
            initial={show ?? { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: REVEAL_EASE }}
          >
            <LiveStats />
            <div className="mt-5 max-w-[640px] border-t border-band-border pt-4">
              <HotTopicsTicker />
            </div>
          </motion.div>

          {/* 今日 AI 精選速覽 — dark-band surface card, slides in last (delay 600ms) */}
          <motion.div
            className="mt-14 rounded-md border border-band-border bg-band-surface"
            initial={show ?? { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.6, ease: REVEAL_EASE }}
          >
            <button
              type="button"
              onClick={() => setPicksOpen((v) => !v)}
              aria-expanded={picksOpen}
              className="flex w-full items-center gap-2 px-6 py-4 text-left"
            >
              <span className="text-label text-band-text">
                {isArchive ? "最新 AI 快照" : "今日 AI 精選速覽"}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-band-text-muted transition-transform duration-200 ${picksOpen ? "rotate-180" : ""}`}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span className="ml-auto text-caption text-band-text-muted">
                {picksDate}・{dailyPicks.length} 條
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
                  <ol className="border-t border-band-border">
                    {dailyPicks.map((pick, i) => (
                      <li key={pick.slug}>
                        <a
                          href={pick.originalUrl ?? pick.permalink}
                          target="_blank"
                          rel="noreferrer"
                          className="group flex items-baseline gap-4 px-6 py-3 transition-colors duration-150 hover:bg-band-card"
                        >
                          <span className="font-mono text-caption text-band-ink">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="line-clamp-1 text-h4 font-sans font-medium text-band-text transition-colors duration-150 group-hover:text-band-ink">
                            {pick.title}
                          </span>
                          <span className="ml-auto shrink-0 text-caption text-band-text-muted">
                            {pick.source}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ol>
                  <p className="border-t border-band-border px-6 py-3 text-caption text-band-text-muted">
                    {isLive
                      ? "香港繁體整理 · 每 30 分鐘同步"
                      : isArchive
                        ? `香港繁體整理 · 歷史快照截至 ${picksDate}`
                        : "香港繁體整理 · 資料快照"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ================= Section 1.5 — MCP Network band ================= */

function McpNetworkBand() {
  return (
    <section className="border-y border-band-border bg-band-bg">
      <div className="mx-auto max-w-container px-6 py-20 max-md:py-16">
        <Reveal>
          <p className="flex items-center gap-3 text-overline font-sans uppercase text-band-text-muted">
            <span
              className="inline-block h-px w-6 bg-band-border-strong"
              aria-hidden="true"
            />
            MCP Network
          </p>
          <h2 className="mt-4 font-display text-h2 text-band-text">
            MCP 接入正在封裝
          </h2>
          <p className="mt-4 max-w-[600px] text-body-sm text-band-text-secondary">
            AIGRO 正將現有情報、日報同熱門主題整理成 MCP 介面。
            公開 endpoint 尚未上線；你可以先登記接入通知。
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-sm border border-band-border-strong px-3 py-1.5 text-overline font-sans uppercase text-band-text-secondary">
              AI 情報 MCP — 封裝中
            </span>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Link
              to="/developers"
              className="inline-flex h-12 items-center rounded-md bg-band-ink-solid px-8 text-label text-on-accent press hover:bg-band-ink-hover"
            >
              登記優先名單
            </Link>
            <Link
              to="/developers#endpoints"
              className="group inline-flex items-center gap-1 text-label text-band-ink"
            >
              查看接入計劃
              <ArrowRight
                className="h-4 w-4 transition-transform duration-150 nudge-x"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ================= Section 2 — Insights 情報牆 ================= */

function InsightsWall() {
  const [category, setCategory] = useState<InsightCategory | "全部">("全部");
  const wallRef = useRef<HTMLDivElement>(null);

  /* Supabase live 成熟時用 live 情報,未成熟回落 build-time snapshot */
  const liveInsights = useLiveInsights();
  const pool = liveInsights ?? aihotInsights;
  const filtered =
    category === "全部"
      ? pool
      : pool.filter((i) => i.category === category);

  const scrollWall = (dir: 1 | -1) => {
    wallRef.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  };

  return (
    <section className="mx-auto max-w-container px-6 py-24 max-md:py-16">
      {/* Header row — eyebrow with hairline rule */}
      <Reveal>
        <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
          <span className="inline-block h-px w-6 bg-border-strong" aria-hidden="true" />
          Daily Intelligence
        </p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <h2 className="font-display text-h2 text-text-primary">情報 Insights</h2>
          <Link
            to="/insights"
            className="group hidden shrink-0 items-center gap-1 text-label text-ink sm:inline-flex"
          >
            查看全部
            <ArrowRight
              className="h-4 w-4 transition-transform duration-150 nudge-x"
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
        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollWall(-1)}
            aria-label="向左捲動"
            className="flex h-10 w-10 items-center justify-center rounded-md border bg-surface text-text-secondary press hover:bg-ink-soft hover:text-ink"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => scrollWall(1)}
            aria-label="向右捲動"
            className="flex h-10 w-10 items-center justify-center rounded-md border bg-surface text-text-secondary press hover:bg-ink-soft hover:text-ink"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <UpdatedChip className="ml-auto" />
        </div>
      </div>
    </section>
  );
}

/* ================= Section 3 — Cases 精選（誠實狀態:真實案例整理中） ================= */

/**
 * v1.27:示範案例全部係虛構,已移除。
 * 呢個 section 保留框架,內容係誠實狀態 — 上架標準講清楚,
 * 有興趣嘅讀者去 /cases 登記通知(寫入 Supabase waitlist)。
 */
function CasesFeatured() {
  return (
    <section className="mx-auto max-w-container px-6 py-24 max-md:py-16">
      <Reveal>
        <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
          <span className="inline-block h-px w-6 bg-border-strong" aria-hidden="true" />
          Field-Tested in Hong Kong
        </p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <h2 className="font-display text-h2 text-text-primary">
            實戰案例 Cases
          </h2>
        </div>
      </Reveal>

      <Reveal y={20} duration={0.45}>
        <div className="mt-8 flex flex-col items-start gap-6 rounded-md border bg-surface p-10 shadow-card dark:shadow-none max-md:p-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-[520px]">
            <h3 className="font-display text-h3 text-text-primary">
              真實案例整理中
            </h3>
            <p className="mt-3 text-body-sm text-text-secondary">
              我哋只發佈有真實數據支持、客戶授權嘅香港 AI 落地案例 —
              每個案例要有量化成果、工具清單同可複製步驟。
              與其放示範數字,不如留空等真案例。
            </p>
          </div>
          <img
            src="/editorial/thumbnails/prompt-workflow.jpg"
            alt="排版台上嘅空白案例版面"
            width={320}
            height={200}
            loading="lazy"
            className="hidden aspect-[16/10] w-56 shrink-0 rounded-md object-cover opacity-40 md:block"
          />
          <Link
            to="/cases"
            className="group inline-flex h-12 shrink-0 items-center gap-2 rounded-md bg-ink-solid px-8 text-label text-on-accent press hover:bg-ink-hover"
          >
            登記上架通知
            <ArrowRight
              className="h-4 w-4 transition-transform duration-150 nudge-x"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

/* ================= Section 4 — Experts 領航專家牆 ================= */

/** 領航專家 monogram 字母(data 無此欄位,由 slug 映射) */
const EXPERT_INITIALS: Record<string, string> = {
  "jimmy-lau": "JL",
  "elvin-cheung": "EC",
};

/** 領航專家一句 persona signature(來自 Ask 分身定義,單一來源) */
const EXPERT_SIGNATURES: Record<string, string> = Object.fromEntries(
  personas
    .filter((p) => p.kind === "expert")
    .map((p) => [p.key, p.signature])
);

function ExpertsWall() {
  return (
    <section className="mx-auto max-w-container px-6 py-24 max-md:py-16">
      <Reveal>
        <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
          <span className="inline-block h-px w-6 bg-border-strong" aria-hidden="true" />
          Leading Experts
        </p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <h2 className="font-display text-h2 text-text-primary">
            領航專家 Leading Experts
          </h2>
          <Link
            to="/experts"
            className="group hidden shrink-0 items-center gap-1 text-label text-ink sm:inline-flex"
          >
            認識領航專家
            <ArrowRight
              className="h-4 w-4 transition-transform duration-150 nudge-x"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </Link>
        </div>
      </Reveal>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
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
                aria-label={expertFullName(expert)}
                className="block transition-transform duration-150 nudge-y"
              >
                {expert.verified ? (
                  <span className="relative block rounded-full border-2 border-surface">
                    {expertHasPhoto(expert) ? (
                      <PhotoAvatar
                        src={expert.image}
                        alt={expertFullName(expert)}
                        size={64}
                        verified
                      />
                    ) : (
                      <MonogramAvatar
                        initials={EXPERT_INITIALS[expert.slug] ?? "·"}
                        color={expert.brandColor ?? "#466A5E"}
                        size={64}
                        verified
                      />
                    )}
                  </span>
                ) : (
                  <img
                    src="/editorial/optimized/pending-expert.jpg"
                    alt={`${expertFullName(expert)} — 即將加盟`}
                    width={64}
                    height={64}
                    loading="lazy"
                    className="h-16 w-16 rounded-full border-2 border-surface object-cover opacity-60 shadow-[0_0_0_1px_hsl(var(--border))]"
                  />
                )}
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
                  {expertFullName(expert)}
                </span>
                <span className="block text-caption text-text-muted">
                  {expert.title}
                </span>
                {EXPERT_SIGNATURES[expert.slug] && (
                  <span className="block text-caption text-ink">
                    {EXPERT_SIGNATURES[expert.slug]}
                  </span>
                )}
              </span>
            </motion.div>
          ))}
          {/* Counter chip */}
          <span className="ml-3 inline-flex h-8 items-center rounded-md bg-card px-3 text-label text-text-secondary">
            邀請中
          </span>
          </div>

          {/* Persona signatures — 一眼睇到邊個係邊個 */}
          <Reveal delay={0.3}>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1.5">
              {experts
                .filter((e) => e.verified && EXPERT_SIGNATURES[e.slug])
                .map((e) => (
                  <p key={e.slug} className="text-caption">
                    <span className="font-medium text-text-primary">
                      {expertFullName(e)}
                    </span>
                    <span className="text-text-muted">
                      {" "}
                      — {EXPERT_SIGNATURES[e.slug]}
                    </span>
                  </p>
                ))}
            </div>
          </Reveal>
        </div>

        {/* Description */}
        <Reveal delay={0.2} className="max-w-md">
          <p className="text-body text-text-secondary">
            AIGRO 係一個 growth hacking club — Jimmy 同 Elvin
            唔係導師,係帶住成個 club 向前行嘅領航者。佢哋嘅 AI
            分身基於公開分享與授權內容蒸餾,係俾會員跟住做實驗嘅增長方法論。
          </p>
          <p className="mt-2 text-caption text-text-muted">
            Club 會員制即將開放・領航專家採邀請制
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ================= Page ================= */

export default function Home() {
  return (
    <>
      <Hero />
      <HowToUse />
      <McpNetworkBand />
      <InsightsWall />
      <CasesFeatured />
      <ExpertsWall />
      <AskPreview />
    </>
  );
}
