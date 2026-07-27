import type { LucideIcon } from "lucide-react";
import { Cpu, Package, Building2, FileText, Lightbulb } from "lucide-react";

/**
 * insights.ts — 情報分類同型別定義(全站共用)。
 *
 * v1.27:靜態 mock 文章(INSIGHT_ARTICLES / insights / dailyPicks)已全部移除 —
 * 公開頁面一律用真實數據:Supabase `items` live(src/data/liveItems.ts),
 * 未成熟時回落 argro build-time snapshot(src/data/aihot.ts)。
 * 呢度只保留 type 同分類常規,等將來有真實內部長文時重用。
 */

/** 情報分類 (design.md §6.8 — Lucide icons, 16px, text-muted, uncolored) */
export type InsightCategory =
  | "模型發布"
  | "產品發布"
  | "行業動態"
  | "論文研究"
  | "觀點與技巧";

export const INSIGHT_CATEGORY_ICONS: Record<InsightCategory, LucideIcon> = {
  模型發布: Cpu,
  產品發布: Package,
  行業動態: Building2,
  論文研究: FileText,
  觀點與技巧: Lightbulb,
};

/** 分類順序與 URL query 對應 (insights.md Section 3: /insights?category=models) */
export const INSIGHT_CATEGORIES: InsightCategory[] = [
  "模型發布",
  "產品發布",
  "行業動態",
  "論文研究",
  "觀點與技巧",
];

/** 分類 → URL query slug（雙向對應，用於篩選狀態分享） */
export const INSIGHT_CATEGORY_SLUGS: Record<InsightCategory, string> = {
  模型發布: "models",
  產品發布: "products",
  行業動態: "industry",
  論文研究: "research",
  觀點與技巧: "tips",
};

export const INSIGHT_SLUG_CATEGORIES: Record<string, InsightCategory> =
  Object.fromEntries(
    Object.entries(INSIGHT_CATEGORY_SLUGS).map(([cat, slug]) => [
      slug,
      cat as InsightCategory,
    ])
  );

export interface Insight {
  slug: string;
  category: InsightCategory;
  title: string;
  /** AI 摘要 */
  summary: string;
  /** 香港視角 HK ANGLE — 差異化核心（無真實短評時留空,唔渲染） */
  hkAngle: string;
  source: string;
  timeAgo: string;
  /** ISO 發佈時間（用於「最新」排序與詳情頁 meta） */
  publishedAt: string;
  /** 編輯評分 0–100 (Plex Mono) */
  score: number;
  readMinutes: number;
}

/* ============ 詳情頁長文型別（預留 — 有真實內部長文時使用） ============ */

export interface InsightArticleSection {
  heading: string;
  body: string;
}

export interface InsightArticle {
  /** 詳情頁 cinematic hero 圖（16:9，可選 — 僅編輯精選長文配圖） */
  heroImage?: string;
  /** AI 摘要長文（詳情頁 card 色 well，body-lg） */
  summaryLong: string;
  /** 香港視角引言段（body-lg text-primary，2px ink 左邊框） */
  lead: string;
  sections: InsightArticleSection[];
  /** 原始來源文章標題（來源信任區） */
  sourceTitle: string;
  /** 最後更新日期（編輯流程行） */
  updatedAt: string;
}
