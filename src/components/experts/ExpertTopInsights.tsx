import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import Reveal, { REVEAL_EASE } from "@/components/Reveal";
import { hkDayKey } from "@/data/liveItems";
import type { ExpertInsight } from "@/lib/expertProfiles";

interface ExpertTopInsightsProps {
  /** Top 3 精選情報;null = 查詢進行中(skeleton) */
  insights: ExpertInsight[] | null;
  firstName: string;
  askHref: string;
}

/**
 * Top 3 精選情報 — items(expert_slug + published)真查,
 * 大卡橫排:排名 mono / 標題(內鏈詳情頁)/ 摘要 / 香港日期 / 原文外鏈。
 * 零 published → 誠實空態「首批獨家內容籌備中」+ 分身 CTA,唔虛構內容。
 */
export default function ExpertTopInsights({
  insights,
  firstName,
  askHref,
}: ExpertTopInsightsProps) {
  return (
    <section id="top-insights" className="mx-auto max-w-container scroll-mt-20 px-6 pt-24 max-md:pt-16">
      <Reveal>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="text-overline font-sans uppercase text-ink">
            Top Insights
          </p>
          <h2 className="font-display text-h3 text-text-primary">
            {firstName} 嘅精選情報
          </h2>
          <p className="text-caption text-text-muted">
            由 {firstName} 親自投稿・AIGRO 獨家
          </p>
        </div>
      </Reveal>

      {insights === null ? (
        /* 查詢進行中 — 3 張 skeleton 卡,唔出現假內容 */
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[220px] animate-pulse rounded-md border bg-card"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : insights.length === 0 ? (
        /* 誠實空態 — 零 published 時唔扮有內容 */
        <Reveal y={16} duration={0.4}>
          <div className="mt-8 flex flex-col items-center rounded-md border border-dashed border-border-strong px-8 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-ink-soft text-ink">
              <Sparkles className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <h3 className="mt-5 font-display text-h4 text-text-primary">
              首批獨家內容籌備中
            </h3>
            <p className="mx-auto mt-3 max-w-[440px] text-body-sm text-text-secondary">
              {firstName} 嘅獨家情報正在製作 — 想搶先了解佢嘅觀點,
              而家就可以同佢嘅 AI 分身傾計。
            </p>
            <Link
              to={askHref}
              className="mt-6 inline-flex h-11 items-center gap-1.5 rounded-md bg-ink-solid px-6 text-label text-on-accent press hover:bg-ink-hover"
            >
              同 {firstName} 嘅 AI 分身傾計
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </div>
        </Reveal>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {insights.map((item, i) => {
            const day = item.publishedAt ? hkDayKey(item.publishedAt) : null;
            return (
              <motion.article
                key={item.id}
                className="card-hover flex flex-col rounded-md border bg-surface p-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: i * 0.07, ease: REVEAL_EASE }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-mono text-[20px] leading-none text-ink">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  {day && (
                    <p className="font-mono text-caption text-text-muted">{day}</p>
                  )}
                </div>
                <h3 className="mt-4 text-h4 font-sans text-text-primary">
                  <Link
                    to={`/insights/${item.id}`}
                    className="transition-colors duration-150 hover:text-ink"
                  >
                    {item.title}
                  </Link>
                </h3>
                {item.summary && (
                  <p className="mt-2 line-clamp-3 text-body-sm text-text-secondary">
                    {item.summary}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <Link
                    to={`/insights/${item.id}`}
                    className="group inline-flex items-center gap-1 text-label text-ink"
                  >
                    閱讀全文
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-150 nudge-x"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </Link>
                  {item.originalUrl && (
                    <a
                      href={item.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-caption text-text-muted transition-colors duration-150 hover:text-ink"
                    >
                      原文
                      <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </section>
  );
}
