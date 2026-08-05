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

/**
 * snapshot 於生成時（scripts/fetch-aihot.mjs）已用 OpenCC 轉為繁體（s2hk），
 * runtime 不再載入 opencc-js（bundle trim）。
 * 此處僅剝除上游內容偶發的 emoji（taste 政策：可見 UI 文字不用 emoji）。
 */
const clean = (s: string): string =>
  s
    ? s
        .replace(/[\u{1F000}-\u{1FAFF}\u2600-\u27BF\u2B00-\u2BFF]/gu, "")
        .replace(/\uFE0F/gu, "")
        .replace(/[ \t]+\n/g, "\n")
        .trim()
    : s;

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
  selected: boolean;
  attribution: AihotAttribution | null;
  /** 標籤(Supabase items.tags;舊 snapshot 可能缺失) */
  tags?: string[] | null;
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
  sourceNames?: string[];
  latestAt: string | null;
}

interface AihotSnapshot {
  fetchedAt: string;
  items: AihotRawItem[];
  /** mode=all&take=100 — 全部動態（含未入選精選的條目）；舊 snapshot 可能缺失 */
  allItems?: AihotRawItem[];
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

/** AIHOT daily section label → 本站繁體分類（snapshot 已轉繁體，簡體 key 作向下兼容） */
const DAILY_LABEL_MAP: Record<string, InsightCategory> = {
  "產品發佈/更新": "產品發布",
  "产品发布/更新": "產品發布",
  行業動態: "行業動態",
  行业动态: "行業動態",
  技巧與觀點: "觀點與技巧",
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
  /** 標籤(搜尋範圍用;無則空陣列) */
  tags: string[];
  /** 是否入選 AIHOT 精選（mode=selected）；全部動態中未入選者為 false */
  selected: boolean;
  /** 標記為外部內容（無站內詳情長文） */
  external: true;
}

export function toAihotInsight(raw: AihotRawItem): AihotInsight {
  return {
    slug: raw.id,
    category: mapAihotCategory(raw.category),
    title: clean(raw.title),
    summary: clean(raw.summary),
    /** AIHOT 暫無香港視角短評 — 留空即不渲染該區塊（不虛構內容） */
    hkAngle: "",
    source: clean(raw.source),
    timeAgo: timeAgo(raw.publishedAt),
    publishedAt: raw.publishedAt,
    score: raw.score,
    readMinutes: estimateReadMinutes(raw.summary),
    permalink: raw.permalink,
    canonical: raw.attribution?.canonical ?? raw.permalink,
    originalUrl: raw.url,
    titleEn: raw.title_en ? clean(raw.title_en) : null,
    tags: (raw.tags ?? []).map((t) => clean(t)).filter(Boolean),
    selected: raw.selected,
    external: true,
  };
}

/** 全部 AIHOT 精選情報（mode=selected，API 原序，最新在前） */
export const aihotInsights: AihotInsight[] =
  snapshot.items.map(toAihotInsight);

/**
 * 全部動態（mode=all&take=100）— 以 allItems 為主，補上 selected 精選中
 * 未出現在 allItems 的條目（API 窗口差異），按發佈時間倒序。
 */
export const aihotAllInsights: AihotInsight[] = (() => {
  const selectedIds = new Set(snapshot.items.map((i) => i.id));
  const merged = new Map<string, AihotRawItem>();
  for (const raw of snapshot.allItems ?? []) {
    merged.set(raw.id, {
      ...raw,
      selected: raw.selected || selectedIds.has(raw.id),
    });
  }
  for (const raw of snapshot.items) {
    if (!merged.has(raw.id)) merged.set(raw.id, { ...raw, selected: true });
  }
  return [...merged.values()]
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    .map(toAihotInsight);
})();

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
  originalUrl: string | null;
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
    originalUrl: i.originalUrl,
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
          : (DAILY_LABEL_MAP[clean(section.label)] ?? "行業動態"),
        sectionLabel: clean(section.label),
        title: clean(item.title),
        summary: clean(item.summary),
        source: clean(item.sourceName),
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
    sections: snapshot.daily.sections.map((s) => {
      const label = clean(s.label);
      return {
        label,
        category: DAILY_LABEL_MAP[label] ?? "行業動態",
        count: s.items.length,
      };
    }),
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
  sourceNames: string[];
  latestAt: string | null;
  /** 以標題關鍵詞比對出的相關情報（全部動態中，最多 3 條） */
  related: AihotInsight[];
}

/** 由標題抽取比對關鍵詞：Latin 詞（≥4 字母），用於話題 ↔ 情報配對 */
function topicKeywords(title: string): string[] {
  const words = title.match(/[A-Za-z][A-Za-z0-9.+-]{2,}/g) ?? [];
  return [...new Set(words.map((w) => w.toLowerCase()))].filter(
    (w) => w.length >= 4
  );
}

export const aihotHotTopics: AihotHotTopic[] = snapshot.hotTopics.map((t) => {
  const title = clean(t.title);
  const keywords = topicKeywords(title);
  const related =
    keywords.length === 0
      ? []
      : aihotAllInsights
          .filter((i) => {
            if (i.slug === t.id) return false;
            const haystack = `${i.title} ${i.titleEn ?? ""}`.toLowerCase();
            return keywords.some((k) => haystack.includes(k));
          })
          .slice(0, 3);
  return {
    id: t.id,
    title,
    permalink: t.permalink,
    source: clean(t.source),
    sourceCount: t.sourceCount,
    sourceNames: (t.sourceNames ?? []).map(clean),
    latestAt: t.latestAt,
    related,
  };
});
