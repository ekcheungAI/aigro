import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import InsightCard from "@/components/InsightCard";
import usePageMeta from "@/hooks/usePageMeta";
import { aihotAllInsights } from "@/data/aihot";
import { useLiveInsights } from "@/data/liveItems";

/**
 * Insight Detail — v1.27:靜態 mock 長文已移除。
 * 呢頁處理真實情報:slug 命中 live Supabase items(未成熟回落 argro
 * snapshot)即顯示摘要卡 + 外鏈原文;否則誠實「找不到此情報」。
 * 將來有真實內部長文時,可以喺呢度加返 article 分支(InsightArticle 型別仍保留)。
 */
export default function InsightDetail() {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const slug = rawSlug?.trim() ?? "";

  /* live 優先,未成熟回落 snapshot;用全庫(aihotAllInsights)提高命中率 */
  const liveInsights = useLiveInsights();
  const pool = liveInsights ?? aihotAllInsights;
  const item = useMemo(() => pool.find((i) => i.slug === slug), [pool, slug]);

  /* 相關情報:同分類優先,評分排序取 3 則(真數據) */
  const related = useMemo(() => {
    if (!item) return [];
    const others = pool.filter((i) => i.slug !== item.slug);
    return others
      .sort((a, b) => {
        const sameCat = Number(b.category === item.category) - Number(a.category === item.category);
        return sameCat !== 0 ? sameCat : b.score - a.score;
      })
      .slice(0, 3);
  }, [pool, item]);

  usePageMeta(item?.title, item?.summary, {
    canonical: item ? `/insights/${item.slug}` : undefined,
    ogType: "article",
  });

  /* ---- 誠實 not-found:唔扮有內容 ---- */
  if (!item) {
    return (
      <div className="mx-auto max-w-[720px] px-6 py-32 text-center">
        <p className="font-display text-display-sm text-text-muted">找不到此情報</p>
        <p className="mt-4 text-body-sm text-text-secondary">
          呢條連結冇對應嘅真實情報 — 資訊中心已改用即時動態,
          情報由自家管道每 30 分鐘更新。
        </p>
        <Link
          to="/insights"
          className="mt-8 inline-flex items-center gap-2 rounded-sm bg-ink-solid px-5 py-2.5 text-label text-white press hover:bg-ink-hover"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          返回資訊中心
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* 返回列 */}
      <div className="mx-auto max-w-container px-6 pt-8">
        <Link
          to="/insights"
          className="inline-flex items-center gap-1.5 text-label text-text-secondary transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          返回資訊中心
        </Link>
      </div>

      {/* 標頭 — 真實情報元數據 */}
      <header className="mx-auto max-w-[720px] px-6 pt-12">
        <Reveal>
          <span className="inline-block rounded-sm bg-ink-soft px-3 py-1.5 text-overline font-sans uppercase text-ink">
            {item.category}
          </span>
        </Reveal>
        <Reveal delay={0.06}>
          <h1 className="mt-6 font-display text-display-sm text-text-primary">
            {item.title}
          </h1>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-caption text-text-muted">
            <span>{item.source}</span>
            <span aria-hidden="true">·</span>
            <span>{item.timeAgo}</span>
            <span aria-hidden="true">·</span>
            <span className="text-ink">評分 {item.score}</span>
          </div>
        </Reveal>
      </header>

      {/* AI 摘要 + 原文外鏈 — 本站唔復制全文 */}
      <Reveal y={16} duration={0.4}>
        <div className="mx-auto mt-12 max-w-[720px] rounded-md border bg-surface px-8 py-8 shadow-card dark:shadow-none max-md:px-6 max-md:py-6 lg:mx-auto">
          <p className="text-overline font-sans uppercase text-text-muted">
            AI 摘要
          </p>
          <p className="mt-3 text-body-lg text-text-primary">{item.summary}</p>
          {item.originalUrl && (
            <a
              href={item.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-sm bg-ink-solid px-6 text-label text-white press hover:bg-ink-hover"
            >
              閱讀原文
              <ArrowUpRight
                className="h-4 w-4"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </a>
          )}
        </div>
      </Reveal>

      {/* 相關情報(同分類優先,真數據) */}
      {related.length > 0 && (
        <section className="mx-auto mt-20 max-w-container px-6 pb-24">
          <Reveal>
            <div className="flex items-baseline justify-between border-b pb-4">
              <h2 className="font-display text-h3 text-text-primary">
                相關情報
              </h2>
              <Link
                to="/insights"
                className="inline-flex items-center gap-1 text-label text-ink hover:underline hover:underline-offset-2"
              >
                全部情報
                <ArrowRight
                  className="h-3.5 w-3.5"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </Link>
            </div>
          </Reveal>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {related.map((r, i) => (
              <Reveal key={r.slug} delay={i * 0.08}>
                <InsightCard insight={r} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
