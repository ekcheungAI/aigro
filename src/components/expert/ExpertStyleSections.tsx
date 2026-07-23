import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import Reveal, { REVEAL_EASE } from "@/components/Reveal";
import type { Expert } from "@/data/experts";

/**
 * ExpertStyleSections — perskill-grade 深度檔案區塊(僅 verified 專家渲染)。
 * 領航風格雷達 → 核心特質 → 工作風格 → 決策原則,
 * 置於成就佐證之後、授權透明度之前。
 * 視覺語法:hairline 分隔、Plex Mono 數據、ink 細bar,無陰影無漸層。
 */

function SectionHeader({
  title,
  caption,
}: {
  title: string;
  caption?: string;
}) {
  return (
    <Reveal>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-display text-h3 text-text-primary">{title}</h2>
        {caption && <p className="text-caption text-text-muted">{caption}</p>}
      </div>
    </Reveal>
  );
}

/* ================= B. 領航風格雷達(600ms fill,once,reduced-motion → full) ================= */

function StyleRadar({ expert }: { expert: Expert }) {
  const radar = expert.radar ?? [];
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduceMotion = useReducedMotion();

  return (
    <section className="mx-auto max-w-[720px] px-6 pt-24 max-md:pt-16">
      <SectionHeader
        title="領航風格雷達 Working Style Radar"
        caption="編輯部根據公開分享整理嘅風格評估"
      />
      <div ref={ref} className="mt-10 space-y-8">
        {radar.map((d, i) => (
          <div key={d.label}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-label text-text-primary">{d.label}</span>
              <span className="font-mono text-caption text-ink">{d.score}</span>
            </div>
            {/* 2px hairline track + ink fill;scaleX GPU-only,origin-left */}
            <div className="mt-2 h-[2px] w-full bg-card">
              <motion.div
                className="h-full origin-left bg-ink"
                style={{ width: `${d.score}%` }}
                initial={reduceMotion ? false : { scaleX: 0 }}
                animate={inView ? { scaleX: 1 } : undefined}
                transition={{
                  duration: 0.6,
                  delay: reduceMotion ? 0 : i * 0.08,
                  ease: REVEAL_EASE,
                }}
              />
            </div>
            <p className="mt-2 text-caption text-text-muted">{d.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ================= C. 核心特質 chips ================= */

function CoreTraits({ expert }: { expert: Expert }) {
  const traits = expert.traits ?? [];
  return (
    <section className="mx-auto max-w-[720px] px-6 pt-16 max-md:pt-12">
      <SectionHeader title="核心特質 Core Traits" />
      <Reveal delay={0.08}>
        <div className="mt-6 flex flex-wrap gap-2">
          {traits.map((t) => (
            <span
              key={t}
              className="rounded-sm bg-card px-3 py-1.5 text-overline font-sans text-text-secondary"
            >
              {t}
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ================= D. 工作風格(hairline 分段) ================= */

function WorkingStyle({ expert }: { expert: Expert }) {
  const blocks = expert.workingStyle ?? [];
  return (
    <section className="mx-auto max-w-[720px] px-6 pt-24 max-md:pt-16">
      <SectionHeader title="工作風格 Working Style" />
      <div className="mt-10">
        {blocks.map((b, i) => (
          <Reveal
            key={b.title}
            delay={i * 0.08}
            className={i > 0 ? "mt-8 border-t pt-8" : ""}
          >
            <h3 className="text-h4 font-sans text-text-primary">{b.title}</h3>
            <p className="mt-3 text-body text-text-secondary">{b.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ================= E. 決策原則(numbered rows + hairline dividers) ================= */

function DecisionHeuristics({ expert }: { expert: Expert }) {
  const rules = expert.heuristics ?? [];
  return (
    <section className="mx-auto max-w-[720px] px-6 pt-24 max-md:pt-16">
      <SectionHeader
        title="決策原則 Decision Heuristics"
        caption="蒸餾自公開分享與授權內容"
      />
      <div className="mt-10">
        {rules.map((r, i) => (
          <Reveal
            key={r.name}
            delay={i * 0.06}
            className={i > 0 ? "mt-10 border-t pt-10" : ""}
          >
            <div className="flex gap-6 max-md:gap-4">
              <span className="pt-1 font-mono text-caption text-ink">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <h3 className="text-h4 font-sans text-text-primary">{r.name}</h3>
                <p className="mt-4 text-overline font-sans uppercase text-text-muted">
                  使用時機 When to use
                </p>
                <p className="mt-2 text-body-sm text-text-secondary">
                  {r.whenToUse}
                </p>
                <p className="mt-5 text-overline font-sans uppercase text-text-muted">
                  實例 Real case
                </p>
                <p className="mt-2 text-body-sm text-text-secondary">
                  {r.example}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export default function ExpertStyleSections({ expert }: { expert: Expert }) {
  return (
    <>
      {expert.radar && expert.radar.length > 0 && <StyleRadar expert={expert} />}
      {expert.traits && expert.traits.length > 0 && <CoreTraits expert={expert} />}
      {expert.workingStyle && expert.workingStyle.length > 0 && (
        <WorkingStyle expert={expert} />
      )}
      {expert.heuristics && expert.heuristics.length > 0 && (
        <DecisionHeuristics expert={expert} />
      )}
    </>
  );
}
