/** 資源庫 mock data — library.md Sections 3A / 3B */

export type ToolCategory =
  | "寫作"
  | "圖像"
  | "影片"
  | "自動化"
  | "Agent"
  | "數據分析";

export const TOOL_CATEGORIES: ToolCategory[] = [
  "寫作",
  "圖像",
  "影片",
  "自動化",
  "Agent",
  "數據分析",
];

export type TcSupportLevel = "優秀" | "良好" | "一般";

export interface Tool {
  name: string;
  categories: ToolCategory[];
  /** 總分 /10（Plex Mono） */
  score: number;
  /** 一句定位 */
  tagline: string;
  /** 繁體中文支援 1–5 段 */
  tcSupport: number;
  tcNote: string;
  price: string;
  /** 私隱：可本地部署 / 雲端 */
  privacy: string;
}

export const tools: Tool[] = [
  {
    name: "ChatGPT（GPT-5）",
    categories: ["寫作"],
    score: 8.7,
    tagline: "最均衡的通用助手，新定價後性價比大增。",
    tcSupport: 5,
    tcNote: "優秀",
    price: "由 US$20/月",
    privacy: "雲端",
  },
  {
    name: "Claude",
    categories: ["寫作", "Agent"],
    score: 8.9,
    tagline: "長文寫作與程式代理的最強選項，語氣自然。",
    tcSupport: 5,
    tcNote: "優秀",
    price: "由 US$20/月",
    privacy: "雲端",
  },
  {
    name: "MiniMax M2（開源）",
    categories: ["Agent"],
    score: 8.4,
    tagline: "可本地部署的高性價比 MoE，敏感行業首選。",
    tcSupport: 4,
    tcNote: "良好",
    price: "開源免費",
    privacy: "可本地部署",
  },
  {
    name: "Midjourney V7",
    categories: ["圖像"],
    score: 8.2,
    tagline: "商業視覺質感標杆，需 Discord 或網頁版操作。",
    tcSupport: 3,
    tcNote: "一般（建議英文 prompt）",
    price: "由 US$10/月",
    privacy: "雲端",
  },
  {
    name: "Runway Gen-4",
    categories: ["影片"],
    score: 7.8,
    tagline: "短片生成與影片編輯一體化，廣告團隊利器。",
    tcSupport: 3,
    tcNote: "一般",
    price: "由 US$15/月",
    privacy: "雲端",
  },
  {
    name: "Make",
    categories: ["自動化"],
    score: 8.5,
    tagline: "視覺化自動化流程，串接香港常用 SaaS 無難度。",
    tcSupport: 3,
    tcNote: "介面英文（邏輯無語言門檻）",
    price: "免費額度起",
    privacy: "雲端",
  },
  {
    name: "Cursor",
    categories: ["Agent"],
    score: 8.8,
    tagline: "AI 原生 IDE，2.0 多 Agent 並行改變開發節奏。",
    tcSupport: 4,
    tcNote: "註釋/文件生成良好",
    price: "由 US$20/月",
    privacy: "雲端",
  },
  {
    name: "Perplexity",
    categories: ["數據分析"],
    score: 8.1,
    tagline: "帶引用的研究引擎，市場調查效率倍增。",
    tcSupport: 4,
    tcNote: "良好",
    price: "免費額度起",
    privacy: "雲端",
  },
];

export interface Template {
  name: string;
  category: ToolCategory;
  /** 來自案例 */
  fromCase: string;
  description: string;
}

export const templates: Template[] = [
  {
    name: "AI 排班建議 Prompt",
    category: "自動化",
    fromCase: "連鎖茶餐廳",
    description: "輸入 POS 時段數據，輸出翌日人手建議表與理由，含例外處理規則。",
  },
  {
    name: "DSE 英文作文批改 Prompt",
    category: "寫作",
    fromCase: "補習社",
    description: "按考評局準則四維評分，附逐段修改建議與升級詞彙表。",
  },
  {
    name: "樓盤文案生成工作流",
    category: "寫作",
    fromCase: "地產代理行",
    description: "樓盤資料 JSON → 中英雙語文案 → WhatsApp 跟進訊息三步模板。",
  },
  {
    name: "客服分流系統 Prompt",
    category: "Agent",
    fromCase: "網店",
    description: "判斷查詢類型與複雜度，簡單即答、複雜轉人工並附摘要。",
  },
];
