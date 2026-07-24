import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, ExternalLink } from "lucide-react";
import InsightCard from "@/components/InsightCard";
import Reveal from "@/components/Reveal";
import {
  INSIGHT_ARTICLES,
  insights,
  type Insight,
  type InsightArticle,
} from "@/data/insights";
import { findAihotInsight } from "@/data/aihot";

/** 設計稿中的原型路由別名 (daily.md / insight-detail.md 使用 openai-gpt-5-launch) */
const SLUG_ALIASES: Record<string, string> = {
  "openai-gpt-5-launch": "openai-gpt-5-unified",
};

function formatDateTime(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

/** 未有長文的情報：以 summary / hkAngle 組裝文章本體 */
function fallbackArticle(insight: Insight): InsightArticle {
  return {
    summaryLong: insight.summary,
    lead: insight.hkAngle,
    sections: [],
    sourceTitle: `${insight.source} 原始報道`,
    updatedAt: insight.publishedAt.slice(0, 10),
  };
}

/** 相關情報：同分類優先（評分排序），不足由全站高分補齊 3 張 */
function pickRelated(current: Insight): Insight[] {
  const others = insights.filter((i) => i.slug !== current.slug);
  const sameCategory = others
    .filter((i) => i.category === current.category)
    .sort((a, b) => b.score - a.score);
  const rest = others
    .filter((i) => i.category !== current.category)
    .sort((a, b) => b.score - a.score);
  return [...sameCategory, ...rest].slice(0, 3);
}

/**
 * Insight Detail 單篇情報詳情 (insight-detail.md):
 * 文章頭部（720px）→ AI 摘要 well → 香港視角長評 → 來源信任區
 * → Ask CTA 卡 → 相關情報（1200px，3 欄）→ Footer（全域）。
 */
export default function InsightDetail() {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const slug = rawSlug ? (SLUG_ALIASES[rawSlug] ?? rawSlug) : undefined;
  const insight = insights.find((i) => i.slug === slug);

  const article = useMemo(
    () =>
      insight
        ? (INSIGHT_ARTICLES[insight.slug] ?? fallbackArticle(insight))
        : null,
    [insight]
  );
  const related = useMemo(
    () => (insight ? pickRelated(insight) : []),
    [insight]
  );

  if (!insight || !article) {
    /* AIHOT 外部情報：無站內長文，展示摘要卡 + 閱讀原文（不虛構詳情） */
    const aihot = rawSlug ? findAihotInsight(rawSlug) : undefined;
    if (aihot) {
      return (
        <section className="mx-auto max-w-[720px] px-6 py-24 max-md:py-16">
          <Reveal>
            <nav aria-label="麵包屑" className="text-caption text-text-muted">
              <Link
                to="/insights"
                className="transition-colors duration-150 hover:text-ink"
              >
                情報 Insights
              </Link>
              <span aria-hidden="true"> / </span>
              <span>{aihot.category}</span>
            </nav>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="rounded-sm bg-ink-soft px-3 py-1.5 text-overline font-sans uppercase text-ink">
                {aihot.category}
              </span>
              <span className="font-mono text-caption text-ink">
                {aihot.score}
              </span>
              <span className="text-caption text-text-muted">
                {aihot.timeAgo}
              </span>
            </div>
            <h1 className="mt-4 font-display text-display text-text-primary">
              {aihot.title}
            </h1>
            <div className="mt-8 rounded-md bg-card p-8 max-md:p-6">
              <p className="text-overline font-sans uppercase text-text-muted">
                香港繁體整理 · 編輯部每日更新
              </p>
              <p className="mt-3 text-body-lg text-text-secondary">
                {aihot.summary}
              </p>
            </div>
            <p className="mt-6 text-caption text-text-muted">
              原始來源：{aihot.source}
            </p>
            {/* 「閱讀原文」僅在指向原始來源時顯示；移除上游聚合站出處連結 */}
            {aihot.originalUrl && (
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href={aihot.originalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex h-11 items-center gap-2 rounded-md bg-ink-solid px-6 text-label text-white press hover:bg-ink-hover"
                >
                  閱讀原文
                  <ExternalLink
                    className="h-4 w-4 transition-transform duration-150 nudge-x"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </a>
              </div>
            )}
          </Reveal>
        </section>
      );
    }
    return (
      <section className="mx-auto max-w-container px-6 py-24 max-md:py-16">
        <Reveal>
          <p className="text-overline font-sans uppercase text-text-muted">
            Insight
          </p>
          <h1 className="mt-2 font-display text-display text-text-primary">
            找不到此情報
          </h1>
          <p className="mt-4 max-w-[640px] text-body-lg text-text-secondary">
            此篇情報不存在或已下架。
          </p>
          <Link
            to="/insights"
            className="group mt-8 inline-flex h-11 items-center gap-2 rounded-md bg-ink-solid px-6 text-label text-white press hover:bg-ink-hover"
          >
            返回情報列表
            <ArrowRight
              className="h-4 w-4 transition-transform duration-150 nudge-x"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </Link>
        </Reveal>
      </section>
    );
  }

  return (
    <>
      {/* Section 1 — 文章頭部（容器收窄 720px 置中，上方 padding 96px） */}
      <section className="mx-auto max-w-[720px] px-6 pt-24 max-md:pt-16">
        <Reveal duration={0.2} y={0}>
          <nav aria-label="麵包屑" className="text-caption text-text-muted">
            <Link
              to="/insights"
              className="transition-colors duration-150 hover:text-ink"
            >
              情報 Insights
            </Link>
            <span aria-hidden="true"> / </span>
            <span>{insight.category}</span>
          </nav>
        </Reveal>

        <Reveal y={24} duration={0.5} delay={0.1}>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-sm bg-ink-soft px-3 py-1.5 text-overline font-sans uppercase text-ink">
              {insight.category}
            </span>
            <span className="font-mono text-caption text-ink">
              {insight.score}
            </span>
            <span className="text-caption text-text-muted">
              {insight.readMinutes} 分鐘閱讀
            </span>
          </div>
        </Reveal>

        <Reveal y={24} duration={0.5} delay={0.2}>
          <h1 className="mt-4 font-display text-display text-text-primary">
            {insight.title}
          </h1>
        </Reveal>

        <Reveal duration={0.3} y={0} delay={0.4}>
          <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-text-muted">
            <a
              href="#"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 transition-colors duration-150 hover:text-ink"
            >
              {insight.source}
              <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
            </a>
            <span aria-hidden="true">·</span>
            <span>{formatDateTime(insight.publishedAt)}</span>
            <span aria-hidden="true">·</span>
            <span>編輯審核：AIGRO 編輯部</span>
          </div>
        </Reveal>
      </section>

      {/* Section 1.5 — Cinematic hero image（僅編輯精選長文；16:9, max-h-420,
          rounded-md hairline border, saturate 語言同案例照片） */}
      {article.heroImage && (
        <section className="mx-auto max-w-[920px] px-6 pt-10">
          <Reveal y={20} duration={0.45}>
            <img
              src={article.heroImage}
              alt=""
              className="aspect-video max-h-[420px] w-full rounded-md border object-cover saturate-[0.85]"
            />
          </Reveal>
        </section>
      )}

      {/* Section 2 — AI 摘要 well（card 色, padding 32px） */}
      <section className="mx-auto max-w-[720px] px-6 pt-12">
        <Reveal y={16} duration={0.4}>
          <div className="rounded-md bg-card p-8 max-md:p-6">
            <p className="text-overline font-sans uppercase text-text-muted">
              AI 摘要 Summary
            </p>
            <p className="mt-3 text-body-lg text-text-secondary">
              {article.summaryLong}
            </p>
          </div>
        </Reveal>
      </section>

      {/* Section 3 — 香港視角長評（文章本體, 最大行寬 44rem） */}
      <section className="mx-auto max-w-[720px] px-6 pt-12">
        <Reveal y={16} duration={0.4}>
          <p className="text-overline font-sans uppercase text-ink">
            香港視角 HK Angle — 對香港 marketer / founder 的實際影響
          </p>
        </Reveal>
        <Reveal y={16} duration={0.4} delay={0.06}>
          <p className="mt-6 border-l-2 border-ink pl-4 text-body-lg text-text-primary">
            {article.lead}
          </p>
        </Reveal>
        {article.sections.map((section, i) => (
          <Reveal key={section.heading} y={16} duration={0.4} delay={0.06 * ((i % 6) + 2)}>
            <h3 className="mt-10 font-display text-h3 text-text-primary">
              {section.heading}
            </h3>
            <p className="mt-4 max-w-prose text-body text-text-secondary">
              {section.body}
            </p>
          </Reveal>
        ))}
      </section>

      {/* Section 4 — 來源與信任區塊（上下 1px border 包夾, caption 雙欄） */}
      <section className="mx-auto max-w-[720px] px-6 pt-12">
        <Reveal duration={0.3}>
          <div className="grid gap-8 border-y py-6 sm:grid-cols-2">
            <div>
              <p className="text-overline font-sans uppercase text-text-muted">
                原始來源
              </p>
              <p className="mt-2 text-caption text-text-secondary">
                {article.sourceTitle}
              </p>
              <a
                href="#"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong px-4 text-caption text-ink press hover:bg-ink-soft"
              >
                閱讀原文
                <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
              </a>
            </div>
            <div>
              <p className="text-overline font-sans uppercase text-text-muted">
                編輯流程
              </p>
              <p className="mt-2 text-caption text-text-secondary">
                AI 初步摘要 → 編輯核實事實 → 撰寫香港視角 → 上架。最後更新{" "}
                {article.updatedAt}。
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Section 5 — Ask CTA 卡（ink-soft 底 well, radius-lg） */}
      <section className="mx-auto max-w-[720px] px-6 pt-12">
        <Reveal y={20} duration={0.45}>
          <div className="rounded-md bg-ink-soft p-8 max-md:p-6">
            <h4 className="font-display text-h4 text-text-primary">
              想知呢條新聞對你生意嘅具體影響？
            </h4>
            <p className="mt-2 text-body-sm text-text-secondary">
              AI 編輯部會基於全站情報與案例庫，為你的行業即場分析。
            </p>
            <Link
              to="/ask"
              className="group mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-ink-solid px-6 text-label text-white press hover:bg-ink-hover"
            >
              問 AI 編輯部
              <ArrowRight
                className="h-4 w-4 transition-transform duration-150 nudge-x"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Section 6 — 相關情報（1200px 容器, 3 欄卡格） */}
      <section className="mx-auto max-w-container px-6 py-24 max-md:py-16">
        <Reveal y={24}>
          <h3 className="font-display text-h3 text-text-primary">相關情報</h3>
        </Reveal>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {related.map((item, i) => (
            <Reveal key={item.slug} y={24} delay={i * 0.08}>
              <InsightCard insight={item} />
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
