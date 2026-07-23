import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink, Search } from "lucide-react";
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
    label: `${parts.year}年${parts.month}月${parts.day}日 ${parts.weekday}`,
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

const EDITOR_PICKS: { insight: Insight; lead: string }[] =
  EDITOR_PICK_SLUGS.flatMap((slug) => {
    const insight = insights.find((i) => i.slug === slug);
    if (!insight) return [];
    return [
      { insight, lead: INSIGHT_ARTICLES[slug]?.lead ?? insight.hkAngle },
    ];
  });

/** 編輯精選卡 — 內部長文連結，展示真實香港視角節錄 */
function EditorPickCard({
  insight,
  lead,
  index,
}: {
  insight: Insight;
  lead: string;
  index: number;
}) {
  return (
    <Link
      to={`/insights/${insight.slug}`}
      className="card-hover group flex h-full flex-col rounded-md border bg-surface p-8 shadow-card dark:shadow-none max-md:p-6"
    >
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
    </Link>
  );
}

/* ============ 即時動態 — Feed row（左 mono rail + 右內容欄，非卡片） ============ */

function FeedRow({ insight }: { insight: AihotInsight }) {
  return (
    <article className="flex gap-6 py-6">
      {/* 左：mono rail ~110px（分類 / 時間 / 分數 + 髮絲線分數條） */}
      <div className="hidden w-[110px] shrink-0 flex-col gap-1.5 pt-1 font-mono text-caption sm:flex">
        <span className="text-text-secondary">{insight.category}</span>
        <span className="text-text-muted">{hkTime(insight.publishedAt)}</span>
        <span className="text-ink">{insight.score} 分</span>
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
            href={insight.permalink}
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
            href={insight.permalink}
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
          {/* mobile：rail 隱藏時的行內 metadata */}
          <span className="font-mono sm:hidden">
            <span aria-hidden="true">· </span>
            {insight.category}・{hkTime(insight.publishedAt)}・
            {insight.score} 分
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

  const [query, setQuery] = useState("");

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

          <div className="relative min-w-[200px] flex-1 sm:max-w-[280px]">
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

          <span className="ml-auto font-mono text-caption text-text-muted">
            已載入 {filtered.length} 則
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

function TopicsTab() {
  const maxCount = Math.max(1, ...aihotHotTopics.map((t) => t.sourceCount));

  return (
    <section className="mx-auto max-w-container px-6 pb-24 pt-16 max-md:pb-16 max-md:pt-12">
      <Reveal y={16} duration={0.4}>
        <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
          <span
            className="inline-block h-px w-6 bg-border-strong"
            aria-hidden="true"
          />
          Signals
        </p>
        <h2 className="mt-4 font-display text-h2 text-text-primary">
          主題地圖
        </h2>
        <p className="mt-3 max-w-[640px] text-body-sm text-text-secondary">
          AIHOT 追蹤中的熱門話題，按訊號強度排列 — 數字為覆蓋該話題的來源數。
        </p>
      </Reveal>

      <div className="mt-10 divide-y border-y">
        {aihotHotTopics.map((topic, i) => (
          <Reveal key={topic.id} y={20} duration={0.45} delay={i * 0.08}>
            <article className="py-8">
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
                className="relative mt-4 h-px w-full bg-border"
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

              <p className="mt-3 text-caption text-text-muted">
                {topic.source}
                {topic.latestAt ? `・更新於 ${timeAgo(topic.latestAt)}` : ""}
              </p>

              {topic.related.length > 0 && (
                <ul className="mt-4 space-y-2">
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

/* ============ Page ============ */

/**
 * 資訊中心（v1.6 feed 重設計）— tab 化情報中樞：
 * 即時動態（日期分組 feed：mono rail + 髮絲線列，精選/全部、搜尋、分類 chips）
 * · 每日日報（Daily 內容嵌入）· 主題地圖（AIHOT 熱門話題訊號）
 * · 資源庫（Library 內容嵌入）。URL 驅動：?tab= / ?mode= / ?category=。
 */
export default function Insights() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: TabKey =
    tabParam && TAB_KEYS.includes(tabParam) ? (tabParam as TabKey) : "feed";

  const selectTab = (key: TabKey) => {
    setSearchParams(key === "feed" ? {} : { tab: key });
  };

  return (
    <>
      {/* Page Header */}
      <section className="mx-auto max-w-container px-6 pt-24 max-md:pt-16">
        <Reveal y={24}>
          <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
            <span
              className="inline-block h-px w-6 bg-border-strong"
              aria-hidden="true"
            />
            Intelligence
          </p>
        </Reveal>
        <Reveal y={24} delay={0.1}>
          <h1 className="mt-4 font-display text-display text-text-primary">
            資訊中心
          </h1>
        </Reveal>
        <Reveal y={24} delay={0.2}>
          <p className="mt-4 max-w-[640px] text-body-lg text-text-secondary">
            每日精選全球 AI 動態，AI 摘要附來源 — 即時動態、每日日報、主題地圖同資源庫，一頁掌握。
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

      {/* Tab bar — sticky 於導航之下，髮絲線底邊 */}
      <div className="sticky top-16 z-40 mt-12 border-b bg-bg">
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
  );
}
