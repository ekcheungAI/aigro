/**
 * AIHOT 真實數據層 — 讀取 scripts/fetch-aihot.mjs 生成的 snapshot
 * (src/data/aihot-snapshot.json)，輸出 UI 所需的 typed 結構。
 *
 * 數據來源：AI HOT (https://aihot.virxact.com) 公共 API
 * 使用規則：展示時保留 attribution 與 canonical 連結；摘要為 AI 生成。
 * 更新數據：npm run fetch:aihot
 */
import type { Insight, InsightCategory } from "./insights";
import rawSnapshot from "./aihot-snapshot.json";

/* ============ Snapshot 原始型別 ============ */

export interface AihotAttribution {
  source: string;
  canonical: string;
}

export interface AihotRawItem {
  id: string;
  title: string;
  title_en: string | null;
  url: string | null;
  permalink: string;
  source: string;
  publishedAt: string;
  summary: string;
  category: string;
  score: number;
  attribution: AihotAttribution | null;
}

export interface AihotRawDailyItem {
  title: string;
  summary: string;
  sourceUrl: string | null;
  sourceName: string;
  permalink: string;
  attribution: AihotAttribution | null;
}

export interface AihotRawDailySection {
  label: string;
  items: AihotRawDailyItem[];
}

export interface AihotRawHotTopic {
  id: string;
  title: string;
  url: string | null;
  permalink: string;
  source: string;
  sourceCount: number;
  latestAt: string | null;
}

interface AihotSnapshot {
  fetchedAt: string;
  items: AihotRawItem[];
  daily: {
    date: string | null;
    attribution: AihotAttribution | null;
    sections: AihotRawDailySection[];
  };
  hotTopics: AihotRawHotTopic[];
}

const snapshot = rawSnapshot as AihotSnapshot;

/** snapshot 生成時間（構建時數據截止日期） */
export const aihotFetchedAt: string = snapshot.fetchedAt;

/** 全站統一署名行（凡展示 AIHOT 內容必須可見） */
export const AIHOT_CREDIT =
  "內容來源：AI HOT (aihot.virxact.com)・AI 生成摘要";

export const AIHOT_CANONICAL: string =
  snapshot.daily.attribution?.canonical ?? "https://aihot.virxact.com";

/** AIHOT 暫無香港視角短評 — 誠實 placeholder（不虛構內容） */
export const HK_ANGLE_PLACEHOLDER =
  "香港視角短評即將推出 — AIGRO 編輯部每日跟進";

/* ============ 分類映射 ============ */

/** AIHOT category → 本站中文分類（兼容單數/別名寫法） */
const CATEGORY_MAP: Record<string, InsightCategory> = {
  "ai-models": "模型發布",
  model: "模型發布",
  models: "模型發布",
  "ai-products": "產品發布",
  product: "產品發布",
  products: "產品發布",
  industry: "行業動態",
  paper: "論文研究",
  papers: "論文研究",
  research: "論文研究",
  tip: "觀點與技巧",
  tips: "觀點與技巧",
};

export function mapAihotCategory(raw: string): InsightCategory {
  return CATEGORY_MAP[raw] ?? "行業動態";
}

/** AIHOT daily 簡中 section label → 本站分類 */
const DAILY_LABEL_MAP: Record<string, InsightCategory> = {
  "产品发布/更新": "產品發布",
  行业动态: "行業動態",
  技巧与观点: "觀點與技巧",
};

/* ============ 工具 ============ */

/** ISO 時間 → 中文相對時間（香港讀者習慣） */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMin = Math.floor((Date.now() - then) / 60_000);
  if (diffMin < 60) return `${Math.max(1, diffMin)} 分鐘前`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} 小時前`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "昨日";
  if (diffDay < 30) return `${diffDay} 日前`;
  return iso.slice(0, 10);
}

/** 以摘要長度估算閱讀分鐘（中文約 250–300 字/分鐘） */
function estimateReadMinutes(summary: string): number {
  return Math.min(8, Math.max(2, Math.ceil(summary.length / 280)));
}

/* ============ 情報列表（aihotInsights） ============ */

/** AIHOT 情報 — 完整兼容本站 Insight 形狀，另附 permalink/canonical 供外鏈與署名 */
export interface AihotInsight extends Insight {
  /** AIHOT 原文頁（外部連結目標） */
  permalink: string;
  /** 署名 canonical 連結 */
  canonical: string;
  /** 原始來源文章 URL */
  originalUrl: string | null;
  /** 英文標題（如有） */
  titleEn: string | null;
  /** 標記為外部內容（無站內詳情長文） */
  external: true;
}

function toAihotInsight(raw: AihotRawItem): AihotInsight {
  return {
    slug: raw.id,
    category: mapAihotCategory(raw.category),
    title: raw.title,
    summary: raw.summary,
    hkAngle: HK_ANGLE_PLACEHOLDER,
    source: raw.source,
    timeAgo: timeAgo(raw.publishedAt),
    publishedAt: raw.publishedAt,
    score: raw.score,
    readMinutes: estimateReadMinutes(raw.summary),
    permalink: raw.permalink,
    canonical: raw.attribution?.canonical ?? raw.permalink,
    originalUrl: raw.url,
    titleEn: raw.title_en,
    external: true,
  };
}

/** 全部 AIHOT 精選情報（API 原序，最新在前） */
export const aihotInsights: AihotInsight[] =
  snapshot.items.map(toAihotInsight);

/** 按 slug 查找 AIHOT 情報 */
export function findAihotInsight(slug: string): AihotInsight | undefined {
  return aihotInsights.find((i) => i.slug === slug);
}

/* ============ 今日精選速覽（Home） ============ */

export interface AihotDailyPick {
  slug: string;
  title: string;
  source: string;
  permalink: string;
  score: number;
}

/** 今日 AI 精選速覽 5 條 — 全站評分最高 */
export const aihotDailyPicks: AihotDailyPick[] = [...aihotInsights]
  .sort((a, b) => b.score - a.score)
  .slice(0, 5)
  .map((i) => ({
    slug: i.slug,
    title: i.title,
    source: i.source,
    permalink: i.permalink,
    score: i.score,
  }));

/* ============ 每日日報（Daily） ============ */

export interface AihotDailyEntry {
  /** 對應 items 列表的 slug（可對照站內情報）；僅見於日報的條目為 null */
  slug: string | null;
  category: InsightCategory;
  sectionLabel: string;
  title: string;
  summary: string;
  source: string;
  permalink: string;
  canonical: string;
  score: number | null;
}

export interface AihotDaily {
  date: string | null;
  canonical: string;
  /** 頭條 — 首個 section 的第一條 */
  lead: AihotDailyEntry | null;
  /** 頭條以外的其餘條目（依 section 順序） */
  items: AihotDailyEntry[];
  /** 各 section 標籤（繁體分類） */
  sections: { label: string; category: InsightCategory; count: number }[];
  /** 涉及來源數（粗略 = 條目數，因 AIHOT 日報每條一個來源） */
  itemCount: number;
}

function permalinkId(permalink: string): string {
  return permalink.replace(/\/+$/, "").split("/").pop() ?? "";
}

function buildDaily(): AihotDaily {
  const byId = new Map(snapshot.items.map((i) => [i.id, i]));
  const flat: AihotDailyEntry[] = [];

  for (const section of snapshot.daily.sections) {
    for (const item of section.items) {
      const matched = byId.get(permalinkId(item.permalink));
      flat.push({
        slug: matched ? matched.id : null,
        category: matched
          ? mapAihotCategory(matched.category)
          : (DAILY_LABEL_MAP[section.label] ?? "行業動態"),
        sectionLabel: section.label,
        title: item.title,
        summary: item.summary,
        source: item.sourceName,
        permalink: item.permalink,
        canonical: item.attribution?.canonical ?? item.permalink,
        score: matched ? matched.score : null,
      });
    }
  }

  return {
    date: snapshot.daily.date,
    canonical: snapshot.daily.attribution?.canonical ?? AIHOT_CANONICAL,
    lead: flat[0] ?? null,
    items: flat.slice(1),
    sections: snapshot.daily.sections.map((s) => ({
      label: s.label,
      category: DAILY_LABEL_MAP[s.label] ?? "行業動態",
      count: s.items.length,
    })),
    itemCount: flat.length,
  };
}

export const aihotDaily: AihotDaily = buildDaily();

/* ============ 熱門話題 ============ */

export interface AihotHotTopic {
  id: string;
  title: string;
  permalink: string;
  source: string;
  sourceCount: number;
  latestAt: string | null;
}

export const aihotHotTopics: AihotHotTopic[] = snapshot.hotTopics.map((t) => ({
  id: t.id,
  title: t.title,
  permalink: t.permalink,
  source: t.source,
  sourceCount: t.sourceCount,
  latestAt: t.latestAt,
}));
