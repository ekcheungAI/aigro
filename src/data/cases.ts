/**
 * cases.ts — 案例庫型別定義。
 *
 * v1.27:5 個示範案例(茶餐廳 / 補習社 / 地產 / 網店 / 會計師樓)全部係虛構,
 * 已按「無真實數據支持唔上架」原則移除。公開頁面改為誠實狀態
 * (src/pages/Cases.tsx),等有真實數據 + 客戶授權嘅案例先再上。
 * 呢度保留型別,等真案例入庫時重用。
 */

export type CaseIndustry = "零售" | "餐飲" | "教育" | "地產" | "專業服務";

export const CASE_INDUSTRIES: CaseIndustry[] = [
  "零售",
  "餐飲",
  "教育",
  "地產",
  "專業服務",
];

export interface CaseMetric {
  /** 顯示字串，如 "-37%"、"+2.4×"、"24/7" */
  value: string;
  label: string;
}

/** 詳情頁深度拆解內容（背景 → 工具/方法 → 成果數據 → 可複製拆解） */
export interface CaseStudyDetail {
  /** H1 下 body-lg 導言 */
  lede: string;
  /** 企業規模，如「8 間分店・120 名員工」 */
  scale: string;
  /** 實施週期，如「3 個月」 */
  duration: string;
  /** 刊登月份，如「2025-01」 */
  date: string;
  /** 速覽卡底部註腳 */
  resultsNote: string;
  /** 工具棧 chips */
  toolStack: string[];
  /** 01 背景 段落 */
  background: string[];
  /** 02 工具與方法 段落 */
  methodParagraphs: string[];
  /** 03 成果數據 段落 */
  resultsParagraphs: string[];
  /** 04 可複製拆解 五步清單 */
  playbook: string[];
  /** 引文與署名 */
  quote: string;
  quoteByline: string;
}

export interface CaseStudy {
  slug: string;
  industry: CaseIndustry;
  /** 第二個 tag，如「自動化」「內容」「數據」 */
  tag: string;
  title: string;
  metrics: CaseMetric[];
  /** 一行方法摘要 */
  method: string;
  source: string;
  /** 案例紀實照片（public/cases/，3:2，muted editorial） */
  image: string;
  detail: CaseStudyDetail;
}
