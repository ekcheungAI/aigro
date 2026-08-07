import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  MessagesSquare,
  Share2,
} from "lucide-react";
import Reveal from "@/components/Reveal";
import InsightCard from "@/components/InsightCard";
import usePageMeta from "@/hooks/usePageMeta";
import { aihotAllInsights } from "@/data/aihot";
import { useLiveInsights } from "@/data/liveItems";

/** 發佈日期顯示格式(香港時區) */
const HK_DATE = new Intl.DateTimeFormat("zh-HK", {
  timeZone: "Asia/Hong_Kong",
  year: "numeric",
  month: "long",
  day: "numeric",
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : HK_DATE.format(d);
}

/**
 * Insight Detail — v1.27:靜態 mock 長文已移除。
 * 呢頁處理真實情報:slug 命中 live Supabase items(未成熟回落 argro
 * snapshot)即顯示摘要卡 + 外鏈原文;否則誠實「找不到此情報」。
 * news-10x:pool 改 merge(live ∪ snapshot by id — live 成熟後舊 snapshot
 * slug 唔會 404);加 share(copy link,有 navigator.share 就用)、
 * 「問分身呢條情報」deep link、發佈日期 + 閱讀時間;返回 link 保留 ?tab=。
 */
export default function InsightDetail() {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const slug = rawSlug?.trim() ?? "";
  const [searchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);

  /* 返回 link 保留 ?tab= state(由資訊中心某 tab 入嚟就返去嗰個 tab) */
  const tabParam = searchParams.get("tab");
  const backTo = tabParam
    ? `/insights?tab=${encodeURIComponent(tabParam)}`
    : "/insights";

  /* pool = live ∪ snapshot(by id):live 成熟後舊 snapshot slug 依然命中 */
  const liveInsights = useLiveInsights();
  const pool = useMemo(() => {
    if (!liveInsights) return aihotAllInsights;
    const merged = new Map(aihotAllInsights.map((i) => [i.slug, i]));
    for (const i of liveInsights) merged.set(i.slug, i);
    return [...merged.values()];
  }, [liveInsights]);
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

  /* 分享:有 navigator.share 用原生 sheet,否則 copy link(同 Skills/Developers 模式) */
  const share = async () => {
    if (!item) return;
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: item.title, text: item.summary, url });
      } catch {
        /* 用戶取消 / 唔支援時靜默 */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard 被拒時靜默失敗 */
    }
  };

  /* ---- 誠實 not-found:唔扮有內容 ---- */
  if (!item) {
    return (
      <div className="mx-auto max-w-[720px] px-6 py-32 text-center">
        <p className="font-display text-display-sm text-text-muted">找不到此情報</p>
        <p className="mt-4 text-body-sm text-text-secondary">
          呢條連結冇對應嘅真實情報。你可以返回資訊中心查看目前可用嘅情報與資料快照。
        </p>
        <Link
          to={backTo}
          className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-sm bg-ink-solid px-5 py-2.5 text-label text-on-accent press hover:bg-ink-hover"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          返回資訊中心
        </Link>
      </div>
    );
  }

  const publishedDate = formatDate(item.publishedAt);

  return (
    <>
      {/* 頁首 band — detail-band editorial 背景(opacity-45 + 實色 overlay,
          同 Insights 刊頭做法一致);band text tokens 保標題對比,theme-independent */}
      <section className="relative isolate overflow-hidden border-b border-band-border bg-band-bg">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 select-none"
        >
          <img
            src="/editorial/thumbnails/agent-delivery.jpg"
            alt=""
            className="h-full w-full object-cover opacity-30"
          />
          <span className="absolute inset-0 bg-band-bg/60" />
        </div>

        {/* 返回列 */}
        <div className="mx-auto max-w-container px-6 pt-8">
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 text-label text-band-text-secondary transition-colors hover:text-band-ink"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            返回資訊中心
          </Link>
        </div>

        {/* 標頭 — 真實情報元數據 */}
        <header className="mx-auto max-w-[720px] px-6 pb-12 pt-12">
          <Reveal>
            <span className="inline-block rounded-sm bg-band-ink-soft px-3 py-1.5 text-overline font-sans uppercase text-band-ink">
              {item.category}
            </span>
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="mt-6 font-display text-display-sm text-band-text">
              {item.title}
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-caption text-band-text-muted">
              <span>{item.source}</span>
              {publishedDate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{publishedDate}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>{item.timeAgo}</span>
              <span aria-hidden="true">·</span>
              <span>{item.readMinutes} 分鐘閱讀</span>
              <span aria-hidden="true">·</span>
              <span className="text-band-ink">評分 {item.score}</span>
            </div>
          </Reveal>

          {/* 行動列 — 分享 + 問分身呢條情報 */}
          <Reveal delay={0.18}>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={share}
                className="press inline-flex h-11 items-center gap-2 rounded-md border border-band-border-strong px-5 text-label text-band-ink hover:bg-band-ink-soft"
              >
              {copied ? (
                <Check className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <Share2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              )}
              {copied ? "已複製連結" : "分享"}
            </button>
            <Link
              to={`/ask?q=${encodeURIComponent(item.title)}`}
              className="press inline-flex h-11 items-center gap-2 rounded-md bg-ink-solid px-5 text-label text-on-accent hover:bg-ink-hover"
            >
              <MessagesSquare
                className="h-4 w-4"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              問分身呢條情報
            </Link>
            </div>
          </Reveal>
        </header>
      </section>

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
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-sm bg-ink-solid px-6 text-label text-on-accent press hover:bg-ink-hover"
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
                to={backTo}
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
