import Reveal from "@/components/Reveal";
import { ChevronDown } from "lucide-react";
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

/* ================= B. 已審核方法摘要（移除無來源嘅百分比分數） ================= */

function MethodSummary({ expert }: { expert: Expert }) {
  const radar = expert.radar ?? [];
  const traits = expert.traits ?? [];

  return (
    <section
      id="method-summary"
      className="mx-auto max-w-container scroll-mt-32 px-6 pt-24 max-md:pt-16"
    >
      <SectionHeader
        title="方法摘要 Method Summary"
        caption="編輯部整理・不作量化評分"
      />
      {traits.length > 0 && (
        <Reveal delay={0.04}>
          <div className="mt-6 flex flex-wrap gap-2">
            {traits.map((trait) => (
              <span
                key={trait}
                className="rounded-sm bg-ink-soft px-3 py-1.5 font-sans text-overline text-ink"
              >
                {trait}
              </span>
            ))}
          </div>
        </Reveal>
      )}
      <div className="mt-8 flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:overflow-visible md:pb-0 lg:grid-cols-3">
        {radar.map((d, i) => (
          <Reveal
            key={d.label}
            delay={i * 0.06}
            className="h-full w-[78vw] max-w-[280px] shrink-0 snap-start md:w-auto md:max-w-none"
          >
            <div className="h-full rounded-md border bg-surface p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink-soft font-mono text-caption text-ink">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-5 font-sans text-h4 text-text-primary">{d.label}</h3>
              <p className="mt-3 text-body-sm text-text-secondary">{d.note}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ================= C–D. 工作風格 + 決策原則 ================= */

function ExpertPlaybook({ expert }: { expert: Expert }) {
  const blocks = expert.workingStyle ?? [];
  const rules = expert.heuristics ?? [];

  if (blocks.length === 0 && rules.length === 0) return null;

  return (
    <section className="mx-auto max-w-container px-6 pt-24 max-md:pt-16">
      {blocks.length > 0 && (
        <>
          <SectionHeader title="工作風格 Working Style" />
          <div className="mt-8 flex snap-x gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
            {blocks.map((block, index) => (
              <Reveal
                key={block.title}
                delay={index * 0.06}
                className="h-full w-[82vw] max-w-[300px] shrink-0 snap-start md:w-auto md:max-w-none"
              >
                <article className="h-full border-t-2 border-ink bg-surface p-6">
                  <p className="font-mono text-caption text-ink">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-4 font-sans text-h4 text-text-primary">{block.title}</h3>
                  <p className="mt-3 text-body-sm text-text-secondary">{block.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </>
      )}

      {rules.length > 0 && (
        <div className="mt-20 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] max-md:mt-16">
          <Reveal
            y={16}
            duration={0.4}
          >
            <p className="text-overline font-sans uppercase text-ink">Decision Playbook</p>
            <h2 className="mt-3 font-display text-h3 text-text-primary">決策原則</h2>
            <p className="mt-3 text-body-sm text-text-secondary">
              蒸餾自公開分享與授權內容。展開每條原則，查看適用時機同實際用法。
            </p>
          </Reveal>
          <div className="border-y">
            {rules.map((rule, index) => (
              <Reveal key={rule.name} delay={index * 0.05}>
                <details className="group border-b last:border-b-0" open={index === 0}>
                  <summary className="press flex min-h-16 cursor-pointer list-none items-center gap-4 py-4 [&::-webkit-details-marker]:hidden">
                    <span className="font-mono text-caption text-ink">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="font-sans text-h4 text-text-primary">{rule.name}</span>
                    <ChevronDown
                      className="ml-auto h-5 w-5 text-text-muted transition-transform duration-200 group-open:rotate-180"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="grid gap-6 pb-6 pl-10 md:grid-cols-2">
                    <div>
                      <p className="text-overline font-sans uppercase text-text-muted">使用時機</p>
                      <p className="mt-2 text-body-sm text-text-secondary">{rule.whenToUse}</p>
                    </div>
                    <div>
                      <p className="text-overline font-sans uppercase text-text-muted">實際用法</p>
                      <p className="mt-2 text-body-sm text-text-secondary">{rule.example}</p>
                    </div>
                  </div>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default function ExpertStyleSections({ expert }: { expert: Expert }) {
  return (
    <>
      {expert.radar && expert.radar.length > 0 && <MethodSummary expert={expert} />}
      <ExpertPlaybook expert={expert} />
    </>
  );
}
