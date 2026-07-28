import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Cpu,
  ExternalLink,
  Flower2,
  Landmark,
  Plus,
  Radar,
  Search,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import CategoryChip from "@/components/CategoryChip";
import Reveal, { REVEAL_EASE } from "@/components/Reveal";
import UpdatedChip from "@/components/UpdatedChip";
import { DailyContent } from "@/pages/Daily";
import DataPartnership from "@/pages/DataPartnership";
import {
  INSIGHT_CATEGORIES,
  INSIGHT_CATEGORY_SLUGS,
  INSIGHT_SLUG_CATEGORIES,
  type InsightCategory,
} from "@/data/insights";
import {
  aihotAllInsights,
  aihotHotTopics,
  aihotInsights,
  timeAgo,
  toAihotInsight,
  type AihotInsight,
} from "@/data/aihot";
import {
  synthesizeWeeklyFromInsights,
  useLiveHotTopics,
  useLiveInsights,
  useLiveItems,
} from "@/data/liveItems";
import {
  TOPIC_GROUPS,
  TOPIC_TOTAL,
  countTopicItems,
  filterTopicItems,
  findTopicById,
  topicHref,
  type TopicDef,
  type TopicGroup,
} from "@/data/topics";
import { cn } from "@/lib/utils";

/* ============ Tabs ============ */

type TabKey = "feed" | "daily" | "weekly" | "topics" | "data";

const TABS: { key: TabKey; label: string }[] = [
  { key: "feed", label: "即時動態" },
  { key: "daily", label: "每日日報" },
  { key: "weekly", label: "每週回顧" },
  { key: "topics", label: "主題地圖" },
  { key: "data", label: "數據合作" },
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

/* ============ 即時動態 — Feed row（左 mono rail + 右內容欄，非卡片） ============ */

function FeedRow({ insight }: { insight: AihotInsight }) {
  /** 標題 → 原始來源 URL（缺失時 fallback permalink）；「原文」僅在指向原始來源時顯示 */
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
          {/* 「原文」連結僅在指向原始來源時顯示（不署名上游聚合站） */}
          {insight.originalUrl && (
            <>
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

/** 全部動態模式下每個日期分組首 10 條,「顯示更多」每次遞增 10 */
const FEED_PAGE_SIZE = 10;

/**
 * 日期分組 feed section — paginate=true(mode=all)時首 FEED_PAGE_SIZE 條 +
 * 「顯示更多」遞增;精選模式全列(數量本身受編輯篩選限制)。
 */
function FeedGroupSection({
  group,
  paginate,
}: {
  group: FeedGroup;
  paginate: boolean;
}) {
  const [visible, setVisible] = useState(FEED_PAGE_SIZE);
  const shown = paginate ? group.items.slice(0, visible) : group.items;
  const remaining = group.items.length - shown.length;
  return (
    <section className="pt-10">
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
        {shown.map((insight, i) => (
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
      {remaining > 0 && (
        <div className="flex justify-center pt-6">
          <button
            type="button"
            onClick={() => setVisible((v) => v + FEED_PAGE_SIZE)}
            className="press inline-flex h-11 items-center rounded-md border border-border-strong px-6 text-label text-ink hover:bg-ink-soft"
          >
            顯示更多
            <span className="ml-2 font-mono text-caption text-text-muted">
              尚有 {remaining} 則
            </span>
          </button>
        </div>
      )}
    </section>
  );
}

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

  /** Supabase live items(argro→Supabase sync)— 成熟時取代 build-time snapshot */
  const liveRaw = useLiveItems();
  const liveInsights = useMemo(
    () => (liveRaw ? liveRaw.map(toAihotInsight) : null),
    [liveRaw]
  );

  const filtered = useMemo(() => {
    /* live 模式下精選/全部 toggle 都要生效:live 分支按 selected 旗標過濾 */
    const source = liveInsights
      ? mode === "selected"
        ? liveInsights.filter((i) => i.selected)
        : liveInsights
      : mode === "all"
        ? aihotAllInsights
        : aihotInsights;
    const q = query.trim().toLowerCase();
    return source.filter((i) => {
      if (activeCategory && i.category !== activeCategory) return false;
      if (
        q &&
        !(
          i.title.toLowerCase().includes(q) ||
          (i.titleEn ?? "").toLowerCase().includes(q) ||
          i.summary.toLowerCase().includes(q) ||
          i.source.toLowerCase().includes(q) ||
          i.tags.some((tag) => tag.toLowerCase().includes(q))
        )
      )
        return false;
      return true;
    });
  }, [mode, activeCategory, query, liveInsights]);

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
                aria-label="搜尋情報標題、英文標題、標籤、摘要或來源"
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

          <span className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2">
            <UpdatedChip />
            <span className="font-mono text-caption text-text-muted">
              已載入 {filtered.length} 則{mode === "selected" ? "精選" : "動態"}
            </span>
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
            {/* 空態 copy 分搜尋 / 分類兩款 — 唔會出現空引號「」 */}
            {query.trim() ? (
              <>
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
              </>
            ) : activeCategory ? (
              <>
                <p className="text-body-sm text-text-muted">
                  「{activeCategory}」分類暫無符合的情報 — 試下其他分類。
                </p>
                <button
                  type="button"
                  onClick={() => updateParams({ category: null })}
                  className="press mt-4 inline-flex h-11 items-center rounded-md border border-border-strong px-6 text-label text-ink hover:bg-ink-soft"
                >
                  清除分類篩選
                </button>
              </>
            ) : (
              <p className="text-body-sm text-text-muted">
                暫無情報 — 數據同步中,稍後再試。
              </p>
            )}
          </div>
        )}
        {groups.map((group) => (
          <FeedGroupSection
            key={`${group.key}|${mode}|${activeCategory ?? ""}|${query.trim()}`}
            group={group}
            paginate={mode === "all"}
          />
        ))}
      </section>
    </>
  );
}

/* ============ 主題地圖 tab ============ */

/** 主題地圖數據源 — live 優先,未成熟回落 snapshot(全 tab 共用) */
function useTopicInsights(): AihotInsight[] {
  const live = useLiveInsights();
  return live ?? aihotInsights;
}

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

/** 最新焦點 section — 1 張 lead 大卡 + 4 張小卡，全部外鏈原文（live 優先） */
function FocusSection() {
  const insights = useTopicInsights();
  const focusItems = useMemo(
    () =>
      [...insights]
        .sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        )
        .slice(0, 5),
    [insights]
  );
  const [lead, ...rest] = focusItems;
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

/**
 * 主題 logo tile — 公司與模型群組優先用 Simple Icons CDN 真實 logo
 * （黑色版本 + dark:invert 反白，兩主題皆 muted tile）；CDN 無該 logo
 * 或載入失敗時 onError fallback 到 monogram 文字。
 */
function TopicLogoTile({ topic }: { topic: TopicDef }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = topic.logo && !logoFailed;
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-ink-soft font-mono text-caption text-ink"
      aria-hidden="true"
    >
      {showLogo ? (
        <img
          src={`https://cdn.simpleicons.org/${topic.logo}/000000`}
          alt=""
          loading="lazy"
          onError={() => setLogoFailed(true)}
          className="h-6 w-6 dark:invert"
        />
      ) : (
        topic.mono
      )}
    </span>
  );
}

/** 主題卡 — logo/monogram tile + 名 + 一句描述 + 相關動態計數 + → feed 搜尋/分類 */
function TopicCard({
  topic,
  items,
}: {
  topic: TopicDef;
  items: AihotInsight[];
}) {
  const count = countTopicItems(topic, items);
  return (
    <Link
      to={topicHref(topic)}
      className="card-hover group flex h-full flex-col rounded-md border bg-surface p-5 shadow-card dark:shadow-none"
    >
      <div className="flex items-center gap-3">
        <TopicLogoTile topic={topic} />
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
function TopicGroupSection({
  group,
  items,
}: {
  group: TopicGroup;
  items: AihotInsight[];
}) {
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
            <TopicCard topic={topic} items={items} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/** 熱議訊號 — 熱門話題訊號條（live 聚合優先,未成熟回落 snapshot） */
function HotSignalsSection() {
  const liveTopics = useLiveHotTopics();
  const hotTopics = liveTopics ?? aihotHotTopics;
  const maxCount = Math.max(1, ...hotTopics.map((t) => t.sourceCount));
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
              {hotTopics.length} 個話題
            </span>
          </div>
          <p className="mt-1 text-caption text-text-secondary">
            編輯部追蹤中嘅熱門話題,按訊號強度排列 — 數字為覆蓋該話題嘅來源數。
          </p>
        </div>
      </Reveal>

      <div className="divide-y border-b">
        {hotTopics.map((topic, i) => (
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

function TopicMapView() {
  const topicInsights = useTopicInsights();
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
          每張卡直達主題閱讀 view（日期分組嘅過濾 feed）。
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
              最近更新 · 顯示 {Math.min(5, topicInsights.length)} 則焦點
            </span>
          </div>
        </Reveal>
        <FocusSection />
      </div>

      {/* 三個主題群組 */}
      {TOPIC_GROUPS.map((group) => (
        <TopicGroupSection key={group.id} group={group} items={topicInsights} />
      ))}

      {/* 熱議訊號（底部子 section） */}
      <HotSignalsSection />
    </section>
  );
}

/* ============ 主題閱讀 view（?tab=topics&topic=<id>） ============ */

/**
 * 主題閱讀 — 單一主題嘅日期分組過濾 feed（v1.20）。
 * 結構：← 返回主題地圖 ghost button · logo tile + serif H2 + 描述 +
 * mono caption「顯示「{name}」最近 N 則情報」· 同主 feed 格式嘅
 * 日期分組列（mono rail + 髮絲線分隔）· 底部同群組相關主題 rail。
 */
function TopicView({
  topic,
  group,
  onBack,
}: {
  topic: TopicDef;
  group: TopicGroup;
  onBack: () => void;
}) {
  /** 過濾邏輯同卡片計數一致（filterTopicItems：分類直取 / keywords 比對）— live 優先 */
  const topicInsights = useTopicInsights();
  const items = useMemo(
    () => filterTopicItems(topic, topicInsights),
    [topic, topicInsights]
  );
  const groups = useMemo(() => groupByDay(items), [items]);
  /** 相關主題 rail — 同群組、排除當前、最多 4 個（保持探索 loop） */
  const related = useMemo(
    () => group.topics.filter((t) => t.id !== topic.id).slice(0, 4),
    [group, topic.id]
  );

  return (
    <section className="mx-auto max-w-container px-6 pb-24 pt-16 max-md:pb-16 max-md:pt-12">
      {/* ← 返回主題地圖（清除 topic param,保留 tab=topics） */}
      <Reveal y={16} duration={0.4}>
        <button
          type="button"
          onClick={onBack}
          className="press inline-flex h-11 items-center gap-2 rounded-md border border-border-strong px-5 text-label text-ink transition-colors duration-150 hover:bg-ink-soft"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          返回主題地圖
        </button>
      </Reveal>

      {/* 標頭：overline + logo tile + serif H2 + 描述 + mono caption */}
      <Reveal y={16} duration={0.4} delay={0.06}>
        <p className="mt-12 flex items-center gap-3 text-overline font-sans uppercase text-text-muted max-md:mt-10">
          <span
            className="inline-block h-px w-6 bg-border-strong"
            aria-hidden="true"
          />
          主題閱讀 Topic Reading
        </p>
        <div className="mt-5 flex items-center gap-4">
          <TopicLogoTile topic={topic} />
          <div className="min-w-0">
            <h2 className="font-display text-h2 text-text-primary">
              {topic.name}
            </h2>
            {topic.nameEn && (
              <p className="mt-1 font-mono text-caption text-text-muted">
                {topic.nameEn}
              </p>
            )}
          </div>
        </div>
        <p className="mt-4 max-w-[640px] text-body-sm text-text-secondary">
          {topic.desc}
        </p>
        <p className="mt-3 font-mono text-caption text-text-muted">
          顯示「{topic.name}」最近 {items.length} 則情報
        </p>
      </Reveal>

      {/* 過濾 feed — 同主 feed 格式：日期分組 + mono rail 髮絲線列 */}
      {items.length === 0 ? (
        /* 誠實空狀態 — 唔虛構內容 */
        <Reveal y={20} duration={0.45} delay={0.12}>
          <div className="mt-12 border-t pt-16 text-center">
            <p className="text-body-sm text-text-muted">
              暫無新訊號 — 編輯部追蹤中
            </p>
            <button
              type="button"
              onClick={onBack}
              className="press mt-6 inline-flex h-11 items-center gap-2 rounded-md border border-border-strong px-6 text-label text-ink transition-colors duration-150 hover:bg-ink-soft"
            >
              <ArrowLeft
                className="h-4 w-4"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              返回主題地圖
            </button>
          </div>
        </Reveal>
      ) : (
        groups.map((feedGroup) => (
          <section key={feedGroup.key} className="pt-10">
            <Reveal y={16} duration={0.4}>
              <div className="flex items-baseline gap-4 border-b pb-3">
                <h3 className="font-display text-h3 text-text-primary">
                  {feedGroup.label}
                </h3>
                <span className="font-mono text-caption text-text-muted">
                  {feedGroup.items.length} 則
                </span>
              </div>
            </Reveal>
            <div className="divide-y">
              {feedGroup.items.map((insight, i) => (
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
        ))
      )}

      {/* 相關主題 rail — 同群組最多 4 個,延續探索 loop */}
      {related.length > 0 && (
        <section className="mt-20 max-md:mt-16">
          <Reveal y={16} duration={0.4}>
            <div className="border-b pb-4">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h3 className="font-display text-h3 text-text-primary">
                  相關主題
                </h3>
                <span className="text-overline font-sans uppercase text-text-muted">
                  Related · {group.name}
                </span>
                <span className="ml-auto font-mono text-caption text-text-muted">
                  {related.length} 個主題
                </span>
              </div>
            </div>
          </Reveal>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((rel, i) => (
              <Reveal
                key={rel.id}
                y={20}
                duration={0.45}
                delay={Math.min(i, 3) * 0.06}
                className="h-full"
              >
                <TopicCard topic={rel} items={topicInsights} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

/**
 * 主題 tab 調度 — ?topic=<id> 在場即渲染主題閱讀 view（取代主題地圖,
 * 同一 tab 內）；未知 id fallback 返主題地圖。
 * Scroll fix：Layout 只喺 pathname 改變時 scroll-to-top,topic param 改變
 * （進入 / 切換 / 返回地圖）會留喺頁底 — 呢度按 topicParam 重置。
 */
function TopicsTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const topicParam = searchParams.get("topic");
  const match = topicParam ? findTopicById(topicParam) : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [topicParam]);

  if (match) {
    return (
      <TopicView
        topic={match.topic}
        group={match.group}
        onBack={() => setSearchParams({ tab: "topics" })}
      />
    );
  }
  return <TopicMapView />;
}

/* ============ 每週回顧 tab ============ */

/**
 * 每週回顧 — 由真實情報按週合成(liveItems.synthesizeWeeklyFromInsights:
 * 數據時鐘所在週,週一至週日按分數 top 12,按分類分組)。
 * 唔經 argro API(避免前端暴露 key);live 未成熟時用 snapshot 全庫合成,
 * 仍然係真數據。版式同日報:頭條 + 分類小標編號列表 + anchor 列。
 */
function WeeklyTab() {
  const liveInsights = useLiveInsights();
  const pool = liveInsights ?? aihotAllInsights;
  const weekly = useMemo(() => synthesizeWeeklyFromInsights(pool), [pool]);
  if (!weekly) return null;

  /* 按 section 分組 + 全刊連續編號(頭條 = 01,其餘 02 起) */
  let counter = 1;
  const groups = weekly.sections
    .map((s) => ({
      ...s,
      entries: weekly.items
        .filter((i) => i.category === s.category)
        .map((entry) => ({ entry, num: ++counter })),
    }))
    .filter((g) => g.entries.length > 0);
  const lead = weekly.lead;

  return (
    <section className="mx-auto max-w-container px-6 pb-24 pt-16 max-md:pb-16 max-md:pt-12">
      <Reveal y={16} duration={0.4}>
        <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
          <span
            className="inline-block h-px w-6 bg-border-strong"
            aria-hidden="true"
          />
          Weekly Review
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-h2 text-text-primary">每週回顧</h2>
          <UpdatedChip />
        </div>
        <p className="mt-3 max-w-[640px] text-body-sm text-text-secondary">
          一週 AI 脈搏,一次過睇晒 — 編輯部從本週 {weekly.itemCount}{" "}
          則情報揀出 {(lead ? 1 : 0) + weekly.items.length} 條必讀,按分類分組。
        </p>
        <p className="mt-3 font-mono text-caption text-text-muted">
          {weekly.weekStart} – {weekly.weekEnd} · 週一至週日
        </p>
      </Reveal>

      {/* 分類 anchor 列 */}
      {groups.length > 1 && (
        <nav
          aria-label="每週回顧分類跳轉"
          className="mt-8 flex flex-wrap gap-2"
        >
          {groups.map((g, gi) => (
            <a
              key={g.category}
              href={`#weekly-sec-${gi}`}
              className="press rounded-sm border px-3 py-1.5 font-mono text-caption text-text-secondary transition-colors duration-150 hover:border-ink hover:text-ink"
            >
              {g.label} · {g.entries.length}
            </a>
          ))}
        </nav>
      )}

      {/* 本週頭條 */}
      {lead && (
        <Reveal y={24} duration={0.5}>
          <article className="mt-12 rounded-md border bg-surface p-12 max-md:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-sm bg-ink-soft px-3 py-1.5 text-overline font-sans uppercase text-ink">
                {lead.category}
              </span>
              <span className="text-overline font-sans uppercase text-ink">
                本週頭條 Lead
              </span>
            </div>
            <h3 className="mt-4 font-display text-h2 text-text-primary">
              {lead.title}
            </h3>
            <p className="mt-4 max-w-prose text-body-lg text-text-secondary">
              {lead.summary}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-3 text-caption text-text-muted">
              <a
                href={lead.permalink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 transition-colors duration-150 hover:text-ink"
              >
                {lead.source}
                <ExternalLink
                  className="h-3 w-3"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </a>
              {lead.score !== null && (
                <span className="font-mono text-ink">{lead.score}</span>
              )}
              <a
                href={lead.permalink}
                target="_blank"
                rel="noreferrer"
                className="group ml-auto inline-flex items-center gap-1.5 text-label text-ink"
              >
                閱讀原文
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-150 nudge-x"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </a>
            </div>
          </article>
        </Reveal>
      )}

      {/* 分類小標編號列表 */}
      {groups.map((g, gi) => (
        <section
          key={g.category}
          id={`weekly-sec-${gi}`}
          className="mt-12 scroll-mt-24"
        >
          <Reveal y={16} duration={0.4}>
            <div className="flex items-baseline gap-4 border-b pb-3">
              <h3 className="font-display text-h3 text-text-primary">
                {g.label}
              </h3>
              <span className="font-mono text-caption text-text-muted">
                {g.entries.length} 則
              </span>
            </div>
          </Reveal>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {g.entries.map(({ entry, num }, i) => (
              <Reveal
                key={entry.permalink}
                y={20}
                duration={0.4}
                delay={Math.min(i, 7) * 0.08}
              >
                <a
                  href={entry.permalink}
                  target="_blank"
                  rel="noreferrer"
                  className="card-hover group flex h-full gap-6 rounded-md border bg-surface p-6"
                >
                  <span
                    className="font-mono text-[28px] leading-none text-ink"
                    aria-hidden="true"
                  >
                    {String(num).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-display text-h4 text-text-primary transition-colors duration-150 group-hover:text-ink">
                      {entry.title}
                    </h4>
                    <p className="mt-2 line-clamp-2 text-body-sm text-text-secondary">
                      {entry.summary}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-caption text-text-muted">
                      <span
                        className="h-2 w-2 rounded-full bg-text-muted"
                        aria-hidden="true"
                      />
                      {entry.source}
                      <ExternalLink
                        className="h-3 w-3"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}

/* ============ 行業切換 Sector Switcher ============ */

type SectorKey =
  | "ai"
  | "beauty"
  | "tech"
  | "finance"
  | "property"
  | "retail"
  | "more";

interface SectorDef {
  key: SectorKey;
  /** 芯片顯示名（如「AI 情報」「Beauty 美妝」） */
  name: string;
  icon: LucideIcon;
  live: boolean;
}

/**
 * 行業切換唯一數據源 — 加新行業只需加一行（live: false 即 greyed
 * 「情報即將推出」+ 空狀態，空狀態文案由 SectorDef 驅動）。
 */
const SECTORS: SectorDef[] = [
  { key: "ai", name: "AI 情報", icon: Radar, live: true },
  { key: "beauty", name: "Beauty 美妝", icon: Flower2, live: false },
  { key: "tech", name: "Technology 科技", icon: Cpu, live: false },
  { key: "finance", name: "Finance 金融", icon: Landmark, live: false },
  { key: "property", name: "Property 地產", icon: Building2, live: false },
  { key: "retail", name: "Retail 零售", icon: ShoppingBag, live: false },
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
 * 資訊中心 Intelligence Hub（v1.20 多行業情報網）— 行業切換 + tab 化情報中樞：
 * 行業層（?sector=）：AI 情報 live,Beauty / Technology / Finance / Property /
 * Retail / 更多行業 greyed（waitlist 提示 → /developers,直接訪問 URL 見優雅空狀態，
 * 全部由 SECTORS array 驅動 — 加行業只加一行）。
 * AI 行業內：即時動態（日期分組 feed：mono rail + 髮絲線列，精選/全部、
 * 搜尋、分類 chips）· 每日日報 · 主題地圖（最新焦點 + 31 主題卡
 * — 公司與模型用 Simple Icons 真實 logo,onError fallback monogram — + 熱議訊號）
 * · 主題閱讀 view（?tab=topics&topic=<id>：← 返回主題地圖 · logo tile + serif H2
 * + mono caption · 同格式日期分組過濾 feed · 同群組相關主題 rail;
 * topic param 改變時 scroll-to-top — 補 Layout 只睇 pathname 嘅缺口）。
 * URL 驅動：?sector= / ?tab= / ?topic= / ?mode= / ?category= / ?q=。
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
    // tab 切換都清走 transient 行業提示(唔俾 Beauty 提示殘留)
    setSectorNotice(null);
    setSearchParams(key === "feed" ? {} : { tab: key });
  };

  const selectSector = (key: SectorKey) => {
    const def = SECTORS.find((s) => s.key === key);
    if (!def) return;
    if (key === sector) {
      // 已喺呢個行業(例如撳返 AI)— 清除任何 transient 提示
      setSectorNotice(null);
      return;
    }
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
        {/* 緊湊刊頭（~150px）：桌面左標題右副題一行排列，py 收緊、H1 由 display 降至 h2 */}
        <div className="mx-auto flex max-w-container flex-col gap-4 px-6 py-10 max-md:py-8 md:flex-row md:items-end md:justify-between">
          <div>
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
              <h1 className="mt-3 font-display text-h2 text-band-text">
                資訊中心 <span className="text-band-ink">Intelligence Hub</span>
              </h1>
            </Reveal>
          </div>
          <Reveal y={24} delay={0.2}>
            <div className="md:max-w-[360px] md:text-right">
              <p className="text-body-sm text-band-text-secondary">
                由 AI 開始,逐個行業建起情報網 — 你嘅 AI 工具值得每個行業嘅雷達。
              </p>
              <p className="mt-2 text-caption text-band-text-muted">
                香港繁體整理 · 每 30 分鐘同步
              </p>
            </div>
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
            {tab === "weekly" && <WeeklyTab />}
            {tab === "topics" && <TopicsTab />}
            {tab === "data" && (
              /* /data 併入 — DataPartnership 內容原封不動,僅外包一層
                 tab 容器收緊頂部間距(原頁面 pt-24 為獨立頁設計) */
              <div className="[&>section:first-child]:pt-16 [&>section:first-child]:max-md:pt-12">
                <DataPartnership />
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
