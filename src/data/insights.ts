import type { LucideIcon } from "lucide-react";
import { Cpu, Package, Building2, FileText, Lightbulb } from "lucide-react";

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

export const INSIGHT_CATEGORIES: InsightCategory[] = [
  "模型發布",
  "產品發布",
  "行業動態",
  "觀點與技巧",
];

export interface Insight {
  slug: string;
  category: InsightCategory;
  title: string;
  /** AI 摘要 */
  summary: string;
  /** 香港視角 HK ANGLE — 差異化核心 */
  hkAngle: string;
  source: string;
  timeAgo: string;
  /** 編輯評分 0–100 (Plex Mono) */
  score: number;
  readMinutes: number;
}

/** Mock insights — home.md Section 2 */
export const insights: Insight[] = [
  {
    slug: "openai-gpt-5-unified",
    category: "模型發布",
    title: "OpenAI 發佈 GPT-5：統一推理與生成，API 價格下調 40%",
    summary:
      "GPT-5 將推理模型與生成模型合併為單一系統，基準測試全面超越前代，API 定價大幅下調。",
    hkAngle:
      "價格下調令香港中小企以更低成本接入頂尖模型，客服與文案自動化的回本週期縮短至數週。",
    source: "OpenAI Blog",
    timeAgo: "2 小時前",
    score: 96,
    readMinutes: 4,
  },
  {
    slug: "minimax-m2-open-source",
    category: "模型發布",
    title: "MiniMax M2 開源：2,300 億參數 MoE，推理成本僅及 Claude 8%",
    summary:
      "MiniMax 開源新一代 MoE 模型，主打 Agent 場景與極低推理成本，支援本地部署。",
    hkAngle:
      "對資料私隱敏感的香港金融與法律行業，本地部署開源模型是合規首選路線。",
    source: "MiniMax",
    timeAgo: "5 小時前",
    score: 91,
    readMinutes: 5,
  },
  {
    slug: "cursor-2-multi-agent",
    category: "產品發布",
    title: "Cursor 2.0 發佈：多 Agent 並行開發成標配",
    summary:
      "Cursor 2.0 引入最多 8 個並行 AI agent，各自獨立處理代碼庫不同部分，並內建瀏覽器測試。",
    hkAngle:
      "香港初創工程團隊精簡，多 Agent 開發等於一人團隊有三倍產能，MVP 開發成本大降。",
    source: "Cursor Blog",
    timeAgo: "8 小時前",
    score: 88,
    readMinutes: 4,
  },
  {
    slug: "hkma-genai-sandbox-2",
    category: "行業動態",
    title: "香港金管局推出生成式 AI 沙盒 2.0，銀行業加速導入",
    summary:
      "沙盒 2.0 聚焦風險管理與反詐騙場景，首批 20 家銀行及科技公司參與。",
    hkAngle:
      "監管態度明朗化，金融從業員現在是建立 AI 實戰經驗的最佳窗口期。",
    source: "HKMA",
    timeAgo: "昨日",
    score: 85,
    readMinutes: 3,
  },
  {
    slug: "traditional-chinese-rag-guide",
    category: "觀點與技巧",
    title: "善用繁體中文 RAG：香港企業知識庫落地的三個關鍵",
    summary:
      "繁中語料的分詞、embedding 模型選擇與混合檢索策略，直接決定 RAG 系統可用性。",
    hkAngle:
      "多數英文教學忽略繁中斷詞陷阱，本文是少數以香港企業場景實測的指南。",
    source: "AIGRO 編輯部",
    timeAgo: "昨日",
    score: 83,
    readMinutes: 7,
  },
  {
    slug: "perplexity-comet-agent-mode",
    category: "產品發布",
    title: "Perplexity 推出 Comet 瀏覽器 Agent 模式",
    summary:
      "Comet 可在瀏覽器內自主完成多步驟研究任務，直接挑戰傳統搜尋與廣告模式。",
    hkAngle:
      "依賴 Google 搜尋廣告的香港零售品牌，需要重新評估未來兩年的流量結構。",
    source: "Perplexity",
    timeAgo: "2 日前",
    score: 80,
    readMinutes: 4,
  },
];

/** 今日 AI 精選速覽 — home.md Section 1 */
export interface DailyPick {
  slug: string;
  title: string;
  source: string;
}

export const dailyPicks: DailyPick[] = [
  { slug: "openai-gpt-5-unified", title: "OpenAI 發佈 GPT-5：統一推理與生成，API 價格下調 40%", source: "OpenAI Blog" },
  { slug: "anthropic-claude-4-5-swe-bench", title: "Anthropic Claude 4.5 Sonnet 登頂 SWE-bench", source: "Anthropic News" },
  { slug: "minimax-m2-open-source", title: "MiniMax M2 開源：推理成本僅及 Claude 8%", source: "MiniMax" },
  { slug: "hkma-genai-sandbox-2", title: "香港金管局生成式 AI 沙盒 2.0 啟動", source: "HKMA" },
  { slug: "perplexity-comet-agent-mode", title: "Perplexity Comet 瀏覽器 Agent 模式上線", source: "Perplexity" },
];
