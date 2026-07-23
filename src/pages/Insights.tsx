import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, ExternalLink } from "lucide-react";
import CategoryChip from "@/components/CategoryChip";
import Reveal from "@/components/Reveal";
import {
  INSIGHT_CATEGORIES,
  INSIGHT_CATEGORY_SLUGS,
  INSIGHT_SLUG_CATEGORIES,
  INSIGHT_CATEGORY_ICONS,
  type InsightCategory,
} from "@/data/insights";
import {
  AIHOT_CREDIT,
  aihotInsights,
  type AihotInsight,
} from "@/data/aihot";
import { cn } from "@/lib/utils";
import { todayInfo } from "@/lib/daily";

type SortMode = "score" | "latest";

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "score", label: "最高評分" },
  { key: "latest", label: "最新" },
];

const PAGE_SIZE = 6;

/**
 * AIHOT 情報卡 — 與 InsightCard 同版式，但：
 * 1. 整卡外鏈至 AIHOT permalink（不虛構站內詳情頁）
 * 2. 香港視角為誠實 placeholder，視覺上收斂（text-muted）
 */
function AihotInsightCard({ insight }: { insight: AihotInsight }) {
  const CategoryIcon = INSIGHT_CATEGORY_ICONS[insight.category];
  return (
    <a
      href={insight.permalink}
      target="_blank"
      rel="noreferrer"
      className="card-hover group flex h-full flex-col rounded-md border bg-surface p-6 shadow-card dark:shadow-none"
    >
      {/* Overline row */}
      <div className="flex items-center gap-2">
        <span className="rounded-sm bg-ink-soft px-3 py-1.5 text-overline font-sans uppercase text-ink">
          {insight.category}
        </span>
        <CategoryIcon className="h-4 w-4 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
        <span className="ml-auto inline-flex items-center gap-1 text-caption text-text-muted">
          AI HOT
          <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
        </span>
      </div>

      {/* Title */}
      <h4 className="mt-4 line-clamp-2 font-display text-h4 text-text-primary transition-colors duration-150 group-hover:text-ink">
        {insight.title}
      </h4>

      {/* AI summary */}
      <p className="mt-2 line-clamp-3 text-body-sm text-text-secondary">
        {insight.summary}
      </p>

      {/* 香港視角 — placeholder（AIHOT 暫無 HK 短評，視覺收斂） */}
      <div className="mt-4 border-l-2 border-border pl-3">
        <p className="text-overline font-sans uppercase text-text-muted">
          香港視角 HK Angle
        </p>
        <p className="mt-1 line-clamp-2 text-body-sm text-text-muted">
          {insight.hkAngle}
        </p>
      </div>

      {/* Footer row */}
      <div className="mt-auto flex items-center gap-2 pt-4 text-caption text-text-muted">
        <span className="inline-flex items-center gap-1">
          {insight.source}
          <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
        </span>
        <span aria-hidden="true">·</span>
        <span>{insight.timeAgo}</span>
        <span className="ml-auto font-mono text-caption text-ink">
          {insight.score}
        </span>
      </div>
    </a>
  );
}

/**
 * Insights 情報列表頁 (insights.md):
 * Page Header → Daily 日報入口橫幅 → sticky Filter & Sort 工具列
 * （分類 chips + 排序 segmented control，URL query 同步）→ 2 欄卡格
 * （首屏 6 張 + 載入更多）→ Newsletter/Footer（Layout 全域共用）。
 */
export default function Insights() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const activeCategory: InsightCategory | null =
    (categoryParam && INSIGHT_SLUG_CATEGORIES[categoryParam]) || null;

  const [sort, setSort] = useState<SortMode>("score");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const list = activeCategory
      ? aihotInsights.filter((i) => i.category === activeCategory)
      : [...aihotInsights];
    list.sort((a, b) =>
      sort === "score"
        ? b.score - a.score
        : new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    return list;
  }, [activeCategory, sort]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const selectCategory = (category: InsightCategory | null) => {
    setVisibleCount(PAGE_SIZE);
    if (category) {
      setSearchParams({ category: INSIGHT_CATEGORY_SLUGS[category] });
    } else {
      setSearchParams({});
    }
  };

  const selectSort = (mode: SortMode) => {
    setSort(mode);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <>
      {/* Section 1 — Page Header (上方 padding 96px, 行級 reveal stagger 100ms) */}
      <section className="mx-auto max-w-container px-6 pt-24 max-md:pt-16">
        <Reveal y={24}>
          <p className="text-overline font-sans uppercase text-text-muted">
            Intelligence
          </p>
        </Reveal>
        <Reveal y={24} delay={0.1}>
          <h1 className="mt-2 font-display text-display text-text-primary">
            情報 Insights
          </h1>
        </Reveal>
        <Reveal y={24} delay={0.2}>
          <p className="mt-4 max-w-[640px] text-body-lg text-text-secondary">
            全球 AI 動態，AI 摘要即日更新；香港視角短評由編輯部每日跟進。
          </p>
          <p className="mt-3 text-caption text-text-muted">
            <a
              href="https://aihot.virxact.com"
              target="_blank"
              rel="noreferrer"
              className="transition-colors duration-150 hover:text-ink"
            >
              {AIHOT_CREDIT}
            </a>
          </p>
        </Reveal>
      </section>

      {/* Section 2 — Daily 日報入口橫幅 */}
      <section className="mx-auto max-w-container px-6 pt-12">
        <Reveal y={16} duration={0.4}>
          <div className="card-hover flex flex-col gap-6 rounded-md border bg-surface px-8 py-6 max-md:px-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-caption text-text-muted">
                {`${todayInfo().date}・${todayInfo().weekday}・第 ${todayInfo().number} 期`}
              </p>
              <h3 className="mt-2 font-display text-h3 text-text-primary">
                每日精選日報
              </h3>
              <p className="mt-1 text-body-sm text-text-secondary">
                今日 5 條必讀，3 分鐘讀完。
              </p>
            </div>
            <Link
              to="/insights/daily"
              className="group inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-border-strong px-6 text-label text-ink transition-colors duration-150 hover:bg-ink-soft"
            >
              翻開今日日報
              <ArrowRight
                className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Section 3 — Filter & Sort 工具列 (sticky, top 64px 導航之下) */}
      <div className="sticky top-16 z-40 mt-12 border-b bg-bg">
        <div className="mx-auto flex max-w-container flex-wrap items-center gap-x-4 gap-y-3 px-6 py-3">
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="分類篩選"
          >
            <CategoryChip
              label="全部"
              active={activeCategory === null}
              onClick={() => selectCategory(null)}
            />
            {INSIGHT_CATEGORIES.map((category) => (
              <CategoryChip
                key={category}
                label={category}
                active={activeCategory === category}
                onClick={() => selectCategory(category)}
              />
            ))}
          </div>

          <div className="ml-auto flex items-center gap-4">
            <span className="text-caption text-text-muted">
              共 {filtered.length} 條
            </span>
            <div
              className="flex items-center rounded-md border bg-surface p-1"
              role="group"
              aria-label="排序方式"
            >
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => selectSort(option.key)}
                  aria-pressed={sort === option.key}
                  className={cn(
                    "rounded-sm px-3 py-1.5 text-label transition-colors duration-150",
                    sort === option.key
                      ? "bg-ink-soft text-ink"
                      : "text-text-secondary hover:text-ink"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section 4 — 卡格 (2 欄 desktop / 1 欄 mobile, 24px gap; 切換時 key remount 重新 stagger) */}
      <section className="mx-auto max-w-container px-6 py-12">
        <div
          key={`${activeCategory ?? "all"}-${sort}`}
          className="grid grid-cols-1 gap-6 lg:grid-cols-2"
        >
          {visible.map((insight, i) => (
            <Reveal key={insight.slug} delay={(i % 8) * 0.08}>
              <AihotInsightCard insight={insight} />
            </Reveal>
          ))}
        </div>

        {hasMore && (
          <div className="mt-12 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount(filtered.length)}
              className="inline-flex h-11 items-center rounded-md border border-border-strong px-6 text-label text-ink transition-colors duration-150 hover:bg-ink-soft"
            >
              載入更多
            </button>
          </div>
        )}
      </section>
    </>
  );
}
