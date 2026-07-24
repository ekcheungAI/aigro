import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Cpu,
  ExternalLink,
  Flower2,
  Plus,
  Radar,
  Search,
  type LucideIcon,
} from "lucide-react";
import CategoryChip from "@/components/CategoryChip";
import Reveal, { REVEAL_EASE } from "@/components/Reveal";
import { DailyContent } from "@/pages/Daily";
import { LibraryEmbed } from "@/pages/Library";
import {
  INSIGHT_ARTICLES,
  INSIGHT_CATEGORIES,
  INSIGHT_CATEGORY_SLUGS,
  INSIGHT_SLUG_CATEGORIES,
  insights,
  type Insight,
  type InsightCategory,
} from "@/data/insights";
import {
  AIHOT_CREDIT,
  aihotAllInsights,
  aihotHotTopics,
  aihotInsights,
  timeAgo,
  type AihotInsight,
} from "@/data/aihot";
import {
  TOPIC_GROUPS,
  TOPIC_TOTAL,
  countTopicItems,
  topicHref,
  type TopicDef,
  type TopicGroup,
} from "@/data/topics";
import { cn } from "@/lib/utils";

/* ============ Tabs ============ */

type TabKey = "feed" | "daily" | "topics" | "library";

const TABS: { key: TabKey; label: string }[] = [
  { key: "feed", label: "即時動態" },
  { key: "daily", label: "每日日報" },
  { key: "topics", label: "主題地圖" },
  { key: "library", label: "資源庫" },
];

const TAB_KEYS = TABS.map((t) => t.key) as string[];

/* ============ 香港時區日期工具（feed 分組） ============ */

const HK_DAY_PARTS = new Intl.DateTimeFormat("zh-HK", {
  timeZone: "Asia/Hong_Kong",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  weekday: "long",
});

const HK_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Hong_Kong",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function dayKeyLabel(iso: string): { key: string; label: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { key: "unknown", label: "日期待定" };
  const parts = Object.fromEntries(
    HK_DAY_PARTS.formatToParts(d).map((p) => [p.type, p.value])
  );
  return {
    key: `${parts.year}-${parts.month}-${parts.day}`,
    label: `${parts.year}年${parts.month}月${parts.day}日${parts.weekday}`,
  };
}

function hkTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : HK_TIME.format(d);
}

interface FeedGroup {
  key: string;
  label: string;
  items: AihotInsight[];
}

/** 依香港日期分組（輸入須已按時間倒序，分組順序即最新日期在前） */
function groupByDay(items: AihotInsight[]): FeedGroup[] {
  const groups: FeedGroup[] = [];
  const index = new Map<string, FeedGroup>();
  for (const item of items) {
    const { key, label } = dayKeyLabel(item.publishedAt);
    let group = index.get(key);
    if (!group) {
      group = { key, label, items: [] };
      index.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

/* ============ 編輯精選 Editor's Pick ============ */

/**
 * 站內長文精選 — 有完整香港視角長評的編輯部作品（design.md §6.5:
 * 「差異化核心，絕不可埋沒」）。示範真實 HK angle，取代已移除的 placeholder。
 */
const EDITOR_PICK_SLUGS = ["openai-gpt-5-unified", "hkma-genai-sandbox-2"];

const EDITOR_PICKS: { insight: Insight; lead: string; heroImage?: string }[] =
  EDITOR_PICK_SLUGS.flatMap((slug) => {
    const insight = insights.find((i) => i.slug === slug);
    if (!insight) return [];
    return [
      {
        insight,
        lead: INSIGHT_ARTICLES[slug]?.lead ?? insight.hkAngle,
        heroImage: INSIGHT_ARTICLES[slug]?.heroImage,
      },
    ];
  });

/** 編輯精選卡 — 內部長文連結，頂部 cinematic 縮圖 + 真實香港視角節錄 */
function EditorPickCard({
  insight,
  lead,
  heroImage,
  index,
}: {
  insight: Insight;
  lead: string;
  heroImage?: string;
  index: number;
}) {
  return (
    <Link
      to={`/insights/${insight.slug}`}
      className="card-hover group flex h-full flex-col overflow-hidden rounded-md border bg-surface shadow-card dark:shadow-none"
    >
      {/* 頂部影像帶（16:9 ≈ 200px）— saturate 語言同案例照片 */}
      {heroImage && (
        <img
          src={heroImage}
          alt=""
          loading="lazy"
          className="aspect-video h-[200px] w-full object-cover saturate-[0.8] transition-[filter] duration-250 group-hover:saturate-100"
        />
      )}
      <div className="flex flex-1 flex-col p-8 pt-6 max-md:p-6 max-md:pt-5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-caption text-ink" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="rounded-sm bg-ink-soft px-3 py-1.5 text-overline font-sans uppercase text-ink">
            {insight.category}
          </span>
          <span className="ml-auto text-caption text-text-muted">
            {insight.readMinutes} 分鐘閱讀
          </span>
        </div>

        <h4 className="mt-4 font-sans text-h4 text-text-primary transition-colors duration-150 group-hover:text-ink">
          {insight.title}
        </h4>

        {/* 真實香港視角節錄 — 差異化核心 */}
        <div className="mt-4 border-l-2 border-ink pl-3">
          <p className="text-overline font-sans uppercase text-ink">
            香港視角 HK Angle
          </p>
          <p className="mt-1 line-clamp-3 text-body-sm text-text-secondary">
            {lead}
          </p>
        </div>

        <span className="mt-auto inline-flex items-center gap-1 pt-5 text-label text-ink">
          閱讀全文
          <ArrowRight
            className="h-4 w-4 transition-transform duration-150 nudge-x"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}

/* ============ 即時動態 — Feed row（左 mono rail + 右內容欄，非卡片） ============ */

function FeedRow({ insight }: { insight: AihotInsight }) {
  /** 標題 / 原文 → 原始來源 URL；AIHOT permalink 僅作署名（via AI HOT） */
  const originalHref = insight.originalUrl ?? insight.permalink;
  return (
    <article className="flex gap-6 py-6">
      {/* 左：mono rail ~110px（分類 / 時間 / 分數 + 髮絲線分數條） */}
      <div className="hidden w-[110px] shrink-0 flex-col gap-1.5 pt-1 font-mono text-caption sm:flex">
        <span className="text-ink">{insight.category}</span>
        <span className="text-text-muted">{hkTime(insight.publishedAt)}</span>
        <span className="text-text-secondary">{insight.score} 分</span>
        {/* 分數快讀條 — 髮絲線比例條(0–100 分制),純視覺輔助 */}
        <span
          className="relative mt-0.5 block h-px w-full bg-border"
          aria-hidden="true"
        >
          <span
            className="absolute left-0 top-[-0.5px] h-[2px] bg-ink"
            style={{
              width: `${Math.max(6, Math.min(100, insight.score))}%`,
            }}
          />
        </span>
      </div>

      {/* 右：標題 + 摘要 + 來源行 */}
      <div className="min-w-0 flex-1">
        <h4 className="font-sans text-h4 text-text-primary">
          <a
            href={originalHref}
            target="_blank"
            rel="noreferrer"
            className="transition-colors duration-150 hover:text-ink"
          >
            {insight.title}
          </a>
        </h4>
        <p className="mt-2 line-clamp-2 text-body-sm text-text-secondary">
          {insight.summary}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-text-muted">
          <span>{insight.source}</span>
          <span aria-hidden="true">·</span>
          <a
            href={originalHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 transition-colors duration-150 hover:text-ink"
          >
            原文
            <ExternalLink
              className="h-3 w-3"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </a>
          {/* AIHOT 署名 — 保留 canonical 連結（使用規則）；原始來源缺失時「原文」已指 permalink，唔重複 */}
          {insight.originalUrl && (
            <>
              <span aria-hidden="true">·</span>
              <a
                href={insight.permalink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 transition-colors duration-150 hover:text-ink"
              >
                via AI HOT
                <ExternalLink
                  className="h-3 w-3"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </a>
            </>
          )}
          {/* mobile：rail 隱藏時的行內 metadata */}
          <span className="font-mono sm:hidden">
            <span aria-hidden="true">· </span>
            <span className="text-ink">{insight.category}</span>
            <span aria-hidden="true">・</span>
            {hkTime(insight.publishedAt)}・{insight.score} 分
          </span>
        </div>
      </div>
    </article>
  );
}

/* ============ 即時動態 tab ============ */

type FeedMode = "selected" | "all";

const MODE_OPTIONS: { key: FeedMode; label: string }[] = [
  { key: "selected", label: "精選" },
  { key: "all", label: "全部動態" },
];

function FeedTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode: FeedMode =
    searchParams.get("mode") === "all" ? "all" : "selected";
  const categoryParam = searchParams.get("category");
  const activeCategory: InsightCategory | null =
    (categoryParam && INSIGHT_SLUG_CATEGORIES[categoryParam]) || null;

  /** 搜尋詞支援 URL 驅動（?q=）— 主題地圖卡片直達 feed 搜尋狀態 */
  const qParam = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(qParam);
  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  const filtered = useMemo(() => {
    const source = mode === "all" ? aihotAllInsights : aihotInsights;
    const q = query.trim().toLowerCase();
    return source.filter((i) => {
      if (activeCategory && i.category !== activeCategory) return false;
      if (
        q &&
        !(
          i.title.toLowerCase().includes(q) ||
          i.summary.toLowerCase().includes(q) ||
          i.source.toLowerCase().includes(q)
        )
      )
        return false;
      return true;
    });
  }, [mode, activeCategory, query]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  const updateParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    setSearchParams(next);
  };

  return (
    <>
      {/* 編輯精選 Editor's Pick（站內長文，真實香港視角）— 置於 feed 之上 */}
      <section className="mx-auto max-w-container px-6 pt-12">
        <Reveal y={16} duration={0.4}>
          <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
            <span
              className="inline-block h-px w-6 bg-border-strong"
              aria-hidden="true"
            />
            編輯精選 Editor's Pick
          </p>
        </Reveal>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {EDITOR_PICKS.map((pick, i) => (
            <Reveal
              key={pick.insight.slug}
              y={20}
              duration={0.45}
              delay={i * 0.08}
            >
              <EditorPickCard
                insight={pick.insight}
                lead={pick.lead}
                heroImage={pick.heroImage}
                index={i}
              />
            </Reveal>
          ))}
        </div>
      </section>

      {/* 工具列：精選/全部動態 + 搜尋 + 分類 chips + 計數 */}
      <section className="mx-auto max-w-container px-6 pt-12">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div
            className="flex items-center rounded-md border bg-surface p-1"
            role="group"
            aria-label="動態範圍"
          >
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() =>
                  updateParams({ mode: option.key === "all" ? "all" : null })
                }
                aria-pressed={mode === option.key}
                className={cn(
                  "press rounded-sm px-3 py-1.5 text-label",
                  mode === option.key
                    ? "bg-ink-soft text-ink"
                    : "text-text-secondary hover:text-ink"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* 搜尋 — live filtering + 明確「搜尋」按鈕（click / Enter 均觸發） */}
          <form
            className="flex min-w-[200px] flex-1 items-center gap-2 sm:max-w-[360px]"
            role="search"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="例如 OpenAI、Sora"
                aria-label="搜尋情報標題、摘要或來源"
                className="h-11 w-full rounded-md border border-border-strong bg-surface pl-9 pr-3 text-body-sm text-text-primary placeholder:text-text-muted focus:border-ink focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="press h-11 shrink-0 rounded-md bg-ink-solid px-5 text-label text-on-accent hover:bg-ink-hover"
            >
              搜尋
            </button>
          </form>

          <span className="ml-auto font-mono text-caption text-text-muted">
            已載入 {filtered.length} 則{mode === "selected" ? "精選" : "動態"}
          </span>
        </div>

        <div
          className="mt-4 flex flex-wrap items-center gap-2"
          role="group"
          aria-label="分類篩選"
        >
          <CategoryChip
            label="全部"
            active={activeCategory === null}
            onClick={() => updateParams({ category: null })}
          />
          {INSIGHT_CATEGORIES.map((category) => (
            <CategoryChip
              key={category}
              label={category}
              active={activeCategory === category}
              onClick={() =>
                updateParams({
                  category: INSIGHT_CATEGORY_SLUGS[category],
                })
              }
            />
          ))}
        </div>
      </section>

      {/* Feed：日期分組，髮絲線分隔的列（非卡片） */}
      <section className="mx-auto max-w-container px-6 pb-24 pt-4 max-md:pb-16">
        {groups.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-body-sm text-text-muted">
              沒有符合「{query.trim()}」的情報。
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="press mt-4 inline-flex h-11 items-center rounded-md border border-border-strong px-6 text-label text-ink hover:bg-ink-soft"
            >
              清除搜尋
            </button>
          </div>
        )}
        {groups.map((group) => (
          <section key={group.key} className="pt-10">
            <Reveal y={16} duration={0.4}>
              <div className="flex items-baseline gap-4 border-b pb-3">
                <h3 className="font-display text-h3 text-text-primary">
                  {group.label}
                </h3>
                <span className="font-mono text-caption text-text-muted">
                  {group.items.length} 則
                </span>
              </div>
            </Reveal>
            <div className="divide-y">
              {group.items.map((insight, i) => (
                <Reveal
                  key={insight.slug}
                  y={20}
                  duration={0.45}
                  delay={Math.min(i, 7) * 0.08}
                >
                  <FeedRow insight={insight} />
                </Reveal>
              ))}
            </div>
          </section>
        ))}
      </section>
    </>
  );
}

/* ============ 主題地圖 tab ============ */

/** 最新焦點 — aihotInsights 按發佈時間倒序取 5 則（1 lead + 4 small） */
const FOCUS_ITEMS: AihotInsight[] = [...aihotInsights]
  .sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
  .slice(0, 5);

/** 焦點卡共用 metadata 行 — 來源 chip + 分類 · 相對時間 */
function FocusSourceLine({ item }: { item: AihotInsight }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="rounded-sm bg-ink-soft px-2 py-0.5 text-overline font-sans text-ink">
        {item.source}
      </span>
      <span className="font-mono text-caption text-text-muted">
        {item.category} · {item.timeAgo}
      </span>
    </div>
  );
}

/** 最新焦點 section — 1 張 lead 大卡 + 4 張小卡，全部外鏈原文 */
function FocusSection() {
  const [lead, ...rest] = FOCUS_ITEMS;
  if (!lead) return null;
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <Reveal y={20} duration={0.45} className="h-full">
        <a
          href={lead.originalUrl ?? lead.permalink}
          target="_blank"
          rel="noreferrer"
          className="card-hover group flex h-full flex-col rounded-md border bg-surface p-8 shadow-card dark:shadow-none max-md:p-6"
        >
          <FocusSourceLine item={lead} />
          <h3 className="mt-4 font-display text-h3 text-text-primary transition-colors duration-150 group-hover:text-ink">
            {lead.title}
          </h3>
          <p className="mt-3 line-clamp-3 text-body-sm text-text-secondary">
            {lead.summary}
          </p>
          <span className="mt-auto inline-flex items-center gap-1 pt-6 text-label text-ink">
            閱讀原文
            <ArrowRight
              className="h-4 w-4 transition-transform duration-150 nudge-x"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </span>
        </a>
      </Reveal>
      <div className="grid gap-6 sm:grid-cols-2">
        {rest.map((item, i) => (
          <Reveal
            key={item.slug}
            y={20}
            duration={0.45}
            delay={(i + 1) * 0.08}
            className="h-full"
          >
            <a
              href={item.originalUrl ?? item.permalink}
              target="_blank"
              rel="noreferrer"
              className="card-hover group flex h-full flex-col rounded-md border bg-surface p-5 shadow-card dark:shadow-none"
            >
              <FocusSourceLine item={item} />
              <h4 className="mt-3 line-clamp-3 text-body-sm font-medium text-text-primary transition-colors duration-150 group-hover:text-ink">
                {item.title}
              </h4>
            </a>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/** 主題卡 — monogram tile + 名 + 一句描述 + 相關動態計數 + → feed 搜尋/分類 */
function TopicCard({ topic }: { topic: TopicDef }) {
  const count = countTopicItems(topic);
  return (
    <Link
      to={topicHref(topic)}
      className="card-hover group flex h-full flex-col rounded-md border bg-surface p-5 shadow-card dark:shadow-none"
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-ink-soft font-mono text-caption text-ink"
          aria-hidden="true"
        >
          {topic.mono}
        </span>
        <div className="min-w-0">
          <h4 className="truncate text-label text-text-primary transition-colors duration-150 group-hover:text-ink">
            {topic.name}
          </h4>
          {topic.nameEn && (
            <p className="truncate font-mono text-caption text-text-muted">
              {topic.nameEn}
            </p>
          )}
        </div>
        <ArrowRight
          className="ml-auto h-4 w-4 shrink-0 text-text-muted transition-[color,transform] duration-150 nudge-x group-hover:text-ink"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>
      <p className="mt-3 line-clamp-2 text-caption text-text-secondary">
        {topic.desc}
      </p>
      <p className="mt-3 font-mono text-caption text-text-muted">
        {count > 0 ? `本週 ${count} 則` : "暫無新訊號"}
      </p>
    </Link>
  );
}

/** 主題群組 section — 髮絲線標頭（名 + 描述 + 計數）+ 卡片 grid */
function TopicGroupSection({ group }: { group: TopicGroup }) {
  return (
    <section className="mt-16 max-md:mt-12">
      <Reveal y={16} duration={0.4}>
        <div className="border-b pb-4">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h3 className="font-display text-h3 text-text-primary">
              {group.name}
            </h3>
            <span className="text-overline font-sans uppercase text-text-muted">
              {group.nameEn}
            </span>
            <span className="ml-auto font-mono text-caption text-text-muted">
              {group.topics.length} 個主題
            </span>
          </div>
          <p className="mt-1 text-caption text-text-secondary">{group.desc}</p>
        </div>
      </Reveal>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {group.topics.map((topic, i) => (
          <Reveal
            key={topic.id}
            y={20}
            duration={0.45}
            delay={Math.min(i, 7) * 0.06}
            className="h-full"
          >
            <TopicCard topic={topic} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/** 熱議訊號 — AIHOT 熱門話題訊號條（保留原有數據,收細為底部子 section） */
function HotSignalsSection() {
  const maxCount = Math.max(1, ...aihotHotTopics.map((t) => t.sourceCount));
  return (
    <section className="mt-20 max-md:mt-16">
      <Reveal y={16} duration={0.4}>
        <div className="border-b pb-4">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h3 className="font-display text-h3 text-text-primary">
              熱議訊號
            </h3>
            <span className="text-overline font-sans uppercase text-text-muted">
              Hot Signals
            </span>
            <span className="ml-auto font-mono text-caption text-text-muted">
              {aihotHotTopics.length} 個話題
            </span>
          </div>
          <p className="mt-1 text-caption text-text-secondary">
            AIHOT 追蹤中嘅熱門話題,按訊號強度排列 — 數字為覆蓋該話題嘅來源數。
          </p>
        </div>
      </Reveal>

      <div className="divide-y border-b">
        {aihotHotTopics.map((topic, i) => (
          <Reveal
            key={topic.id}
            y={16}
            duration={0.4}
            delay={Math.min(i, 7) * 0.06}
          >
            <article className="py-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <h4 className="font-display text-h4 text-text-primary">
                  <a
                    href={topic.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors duration-150 hover:text-ink"
                  >
                    {topic.title}
                  </a>
                </h4>
                <span className="shrink-0 font-mono text-caption text-ink">
                  {topic.sourceCount} 個來源
                </span>
              </div>

              {/* 訊號強度：髮絲線比例條 */}
              <div
                className="relative mt-3 h-px w-full bg-border"
                role="img"
                aria-label={`訊號強度：${topic.sourceCount} 個來源`}
              >
                <div
                  className="absolute left-0 top-[-0.5px] h-[2px] bg-ink"
                  style={{
                    width: `${Math.max(
                      4,
                      Math.round((topic.sourceCount / maxCount) * 100)
                    )}%`,
                  }}
                />
              </div>

              <p className="mt-2.5 text-caption text-text-muted">
                {topic.source}
                {topic.latestAt ? `・更新於 ${timeAgo(topic.latestAt)}` : ""}
              </p>

              {topic.related.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {topic.related.map((item) => (
                    <li key={item.slug}>
                      <a
                        href={item.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-baseline gap-1.5 text-body-sm text-text-secondary transition-colors duration-150 hover:text-ink"
                      >
                        {item.title}
                        <ExternalLink
                          className="h-3 w-3 shrink-0 self-center"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function TopicsTab() {
  return (
    <section className="mx-auto max-w-container px-6 pb-24 pt-16 max-md:pb-16 max-md:pt-12">
      <Reveal y={16} duration={0.4}>
        <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
          <span
            className="inline-block h-px w-6 bg-border-strong"
            aria-hidden="true"
          />
          Topic Map
        </p>
        <h2 className="mt-4 font-display text-h2 text-text-primary">
          AI 主題地圖
        </h2>
        <p className="mt-3 max-w-[640px] text-body-sm text-text-secondary">
          先看最新焦點,再按公司、技術同內容類型追蹤 {TOPIC_TOTAL} 個主題 —
          每張卡直達即時動態嘅搜尋或分類篩選。
        </p>
      </Reveal>

      {/* 最新焦點 */}
      <div className="mt-12">
        <Reveal y={16} duration={0.4}>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b pb-4">
            <h3 className="font-display text-h3 text-text-primary">
              最新焦點
            </h3>
            <span className="text-overline font-sans uppercase text-text-muted">
              Latest Focus
            </span>
            <span className="ml-auto font-mono text-caption text-text-muted">
              最近更新 · 顯示 {FOCUS_ITEMS.length} 則焦點
            </span>
          </div>
        </Reveal>
        <FocusSection />
      </div>

      {/* 三個主題群組 */}
      {TOPIC_GROUPS.map((group) => (
        <TopicGroupSection key={group.id} group={group} />
      ))}

      {/* 熱議訊號（底部子 section） */}
      <HotSignalsSection />
    </section>
  );
}

/* ============ 行業切換 Sector Switcher ============ */

type SectorKey = "ai" | "beauty" | "tech" | "more";

interface SectorDef {
  key: SectorKey;
  /** 芯片顯示名（如「AI 情報」「Beauty 美妝」） */
  name: string;
  icon: LucideIcon;
  live: boolean;
}

const SECTORS: SectorDef[] = [
  { key: "ai", name: "AI 情報", icon: Radar, live: true },
  { key: "beauty", name: "Beauty 美妝", icon: Flower2, live: false },
  { key: "tech", name: "Technology 科技", icon: Cpu, live: false },
  { key: "more", name: "更多行業", icon: Plus, live: false },
];

const SECTOR_KEYS = SECTORS.map((s) => s.key) as string[];

/** 非 AI 行業嘅優雅空狀態（非錯誤頁）— URL 可分享（?sector=beauty） */
function SectorEmptyState({ sector }: { sector: SectorDef }) {
  const Icon = sector.icon;
  return (
    <section className="mx-auto flex max-w-container flex-col items-center px-6 py-24 text-center max-md:py-16">
      <Reveal y={20} duration={0.45}>
        <span className="flex h-16 w-16 items-center justify-center rounded-md border bg-surface shadow-card dark:shadow-none">
          <Icon
            className="h-7 w-7 text-text-muted"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </span>
      </Reveal>
      <Reveal y={20} duration={0.45} delay={0.08}>
        <p className="mt-8 text-overline font-sans uppercase text-text-muted">
          Coming Soon
        </p>
        <h3 className="mt-3 font-display text-h2 text-text-primary">
          {sector.name}情報 · 即將推出
        </h3>
      </Reveal>
      <Reveal y={20} duration={0.45} delay={0.16}>
        <p className="mt-4 max-w-[520px] text-body-sm text-text-secondary">
          我哋正籌備呢個行業嘅情報網 — 登記優先名單,開放時第一批通知你。
        </p>
      </Reveal>
      <Reveal y={20} duration={0.45} delay={0.24}>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/developers"
            className="press inline-flex h-11 items-center gap-2 rounded-md bg-ink-solid px-6 text-label text-on-accent hover:bg-ink-hover"
          >
            登記優先名單
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </Link>
          <Link
            to="/insights"
            className="press inline-flex h-11 items-center gap-2 rounded-md border border-border-strong px-6 text-label text-ink hover:bg-ink-soft"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            返回 AI 情報
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

/* ============ Page ============ */

/**
 * 資訊中心 Intelligence Hub（v1.18 多行業情報網）— 行業切換 + tab 化情報中樞：
 * 行業層（?sector=）：AI 情報 live,Beauty / Technology / 更多行業 greyed
 * （waitlist 提示 → /developers,直接訪問 URL 見優雅空狀態）。
 * AI 行業內：即時動態（日期分組 feed：mono rail + 髮絲線列，精選/全部、
 * 搜尋、分類 chips）· 每日日報 · 主題地圖（最新焦點 + 31 主題卡 + 熱議訊號）
 * · 資源庫。URL 驅動：?sector= / ?tab= / ?mode= / ?category= / ?q=。
 */
export default function Insights() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: TabKey =
    tabParam && TAB_KEYS.includes(tabParam) ? (tabParam as TabKey) : "feed";

  /** 行業層 — 預設 ai;非 AI 行業 URL 可分享,渲染空狀態 */
  const sectorParam = searchParams.get("sector");
  const sector: SectorKey =
    sectorParam && SECTOR_KEYS.includes(sectorParam)
      ? (sectorParam as SectorKey)
      : "ai";
  /** greyed 行業點擊後嘅靜態 waitlist 提示（唔導航） */
  const [sectorNotice, setSectorNotice] = useState<SectorKey | null>(null);

  const selectTab = (key: TabKey) => {
    setSearchParams(key === "feed" ? {} : { tab: key });
  };

  const selectSector = (key: SectorKey) => {
    const def = SECTORS.find((s) => s.key === key);
    if (!def || key === sector) return;
    if (!def.live) {
      // 未開放行業 — 唔導航,靜靜哋顯示優先名單提示
      setSectorNotice(sectorNotice === key ? null : key);
      return;
    }
    setSectorNotice(null);
    setSearchParams({});
  };

  const activeSectorDef =
    SECTORS.find((s) => s.key === sector) ?? SECTORS[0];

  return (
    <>
      {/* Page Header — cinematic dark band: editorial image layer (opacity-45
          saturate-[0.85]) + solid band overlay, band text tokens. Theme-
          independent (band tokens fixed near-black in both themes). */}
      <section className="relative isolate overflow-hidden border-b border-band-border bg-band-bg">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 select-none"
        >
          <img
            src="/editorial/newsroom.jpg"
            alt=""
            className="h-full w-full object-cover opacity-45 saturate-[0.85]"
          />
          <span className="absolute inset-0 bg-band-bg/60" />
        </div>
        <div className="mx-auto flex min-h-[300px] max-w-container flex-col justify-center px-6 py-16 max-md:min-h-[280px] max-md:py-12">
          <Reveal y={24}>
            <p className="flex items-center gap-3 text-overline font-sans uppercase text-band-text-muted">
              <span
                className="inline-block h-px w-6 bg-band-border-strong"
                aria-hidden="true"
              />
              Intelligence
            </p>
          </Reveal>
          <Reveal y={24} delay={0.1}>
            <h1 className="mt-4 font-display text-display text-band-text">
              資訊中心 <span className="text-band-ink">Intelligence Hub</span>
            </h1>
          </Reveal>
          <Reveal y={24} delay={0.2}>
            <p className="mt-4 max-w-[640px] text-body-lg text-band-text-secondary">
              由 AI 開始,逐個行業建起情報網 — 你嘅 AI 工具值得每個行業嘅雷達。
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-caption text-band-text-muted">
              {/* 「香港繁體整理」徽章 — lime-soft chip（band tokens，兩主題一致） */}
              <span className="rounded-sm bg-band-ink-soft px-2 py-0.5 text-overline font-sans text-band-ink">
                香港繁體整理
              </span>
              <a
                href="https://aihot.virxact.com"
                target="_blank"
                rel="noreferrer"
                className="transition-colors duration-150 hover:text-band-ink"
              >
                {AIHOT_CREDIT}
              </a>
            </p>
          </Reveal>
        </div>
      </section>

      {/* Sector switcher — 多行業情報網入口（AI 先發 live;其餘 greyed 即將推出） */}
      <section className="mx-auto max-w-container px-6 pt-12">
        <Reveal y={16} duration={0.4}>
          <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
            <span
              className="inline-block h-px w-6 bg-border-strong"
              aria-hidden="true"
            />
            Sectors 行業情報網
          </p>
        </Reveal>
        <div
          className="mt-5 flex flex-wrap items-stretch gap-3"
          role="group"
          aria-label="選擇行業"
        >
          {SECTORS.map((s) => {
            const Icon = s.icon;
            const isActive = sector === s.key;
            if (s.live) {
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => selectSector(s.key)}
                  aria-pressed={isActive}
                  className={cn(
                    "press inline-flex items-center gap-2.5 rounded-md border px-4 py-3 text-label transition-colors duration-150",
                    isActive
                      ? "border-transparent bg-ink-solid text-on-accent"
                      : "border-border-strong bg-surface text-ink hover:border-ink"
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  {s.name}
                  <span
                    className={cn(
                      "rounded-sm px-1.5 py-0.5 text-overline font-sans uppercase",
                      isActive
                        ? "bg-on-accent/10 text-on-accent"
                        : "bg-ink-soft text-ink"
                    )}
                  >
                    Live
                  </span>
                </button>
              );
            }
            /* greyed 行業 — dashed border + 低透明度,唔導航,點擊出 waitlist 提示 */
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => selectSector(s.key)}
                aria-disabled="true"
                aria-pressed={isActive}
                className={cn(
                  "press inline-flex items-center gap-2.5 rounded-md border border-dashed px-4 py-3 text-label transition-[color,opacity] duration-150",
                  isActive
                    ? "border-border-strong bg-surface text-text-secondary"
                    : "border-border-strong text-text-muted opacity-60 hover:text-text-secondary hover:opacity-100"
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                {s.name}
                <span className="rounded-sm border border-current px-1.5 py-0.5 text-overline font-sans">
                  情報即將推出
                </span>
              </button>
            );
          })}
        </div>
        {/* 靜態 waitlist 提示 — 點擊 greyed 行業後出現 */}
        {sectorNotice && sectorNotice !== sector && (
          <p className="mt-4 text-caption text-text-muted">
            {SECTORS.find((s) => s.key === sectorNotice)?.name}情報整緊 —
            想第一批收到?
            <Link
              to="/developers"
              className="ml-1 text-ink underline decoration-border-strong underline-offset-4 transition-colors duration-150 hover:decoration-ink"
            >
              登記優先名單
            </Link>
          </p>
        )}
      </section>

      {sector !== "ai" ? (
        /* 非 AI 行業 — 優雅空狀態（URL 可分享） */
        <SectorEmptyState sector={activeSectorDef} />
      ) : (
        <>
          {/* Tab bar — sticky 於導航之下，髮絲線底邊 */}
          <div className="sticky top-16 z-40 mt-10 border-b bg-bg">
            <div
              className="mx-auto flex max-w-container items-center gap-6 overflow-x-auto px-6"
              role="tablist"
              aria-label="資訊中心分頁"
            >
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => selectTab(t.key)}
                  className={cn(
                    "press relative shrink-0 py-3 text-label transition-colors duration-150",
                    tab === t.key
                      ? "text-ink"
                      : "text-text-secondary hover:text-ink"
                  )}
                >
                  {t.label}
                  {tab === t.key && (
                    <motion.span
                      layoutId="insights-tab-underline"
                      className="absolute inset-x-0 -bottom-px h-[2px] bg-ink"
                      transition={{ duration: 0.2, ease: REVEAL_EASE }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab 內容（key remount：切換時重播進場 reveal） */}
          <div key={tab}>
            {tab === "feed" && <FeedTab />}
            {tab === "daily" && <DailyContent embedded />}
            {tab === "topics" && <TopicsTab />}
            {tab === "library" && <LibraryEmbed />}
          </div>
        </>
      )}
    </>
  );
}
