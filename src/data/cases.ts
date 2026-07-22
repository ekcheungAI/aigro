/** 案例庫 mock data — cases.md Section 3 */

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
}

export const cases: CaseStudy[] = [
  {
    slug: "cha-chaan-teng-ai-scheduling",
    industry: "餐飲",
    tag: "自動化",
    title: "連鎖茶餐廳用 AI 排班與預測備貨，8 間分店全面落地",
    metrics: [
      { value: "-37%", label: "排班工時" },
      { value: "+18%", label: "翻枱率" },
      { value: "-22%", label: "食材浪費" },
    ],
    method: "Claude + Make 串接 POS 數據，每日自動生成排班表與備貨建議",
    source: "AIGRO 學員成果",
  },
  {
    slug: "tutorial-centre-ai-grading",
    industry: "教育",
    tag: "內容",
    title: "補習社以 AI 批改與個人化練習，導師時間放回教學",
    metrics: [
      { value: "-55%", label: "批改時間" },
      { value: "+2.4×", label: "練習內容產出" },
      { value: "92%", label: "家長滿意度" },
    ],
    method: "GPT-5 批改 DSE 英文作文 + 自動生成針對性練習卷",
    source: "Build in Public 社群",
  },
  {
    slug: "property-agency-ai-copywriting",
    industry: "地產",
    tag: "內容",
    title: "地產代理行以 AI 生成樓盤文案與跟進訊息",
    metrics: [
      { value: "+31%", label: "查詢轉化率" },
      { value: "-70%", label: "文案製作時間" },
    ],
    method:
      "以樓盤資料庫驅動 Claude 生成中英雙語文案，WhatsApp 跟進訊息按客戶階段自動起草",
    source: "AIGRO 學員成果",
  },
  {
    slug: "ecommerce-ai-support-automation",
    industry: "零售",
    tag: "自動化",
    title: "網店 AI 客服 + 訂單自動化，一個人營運三個品牌",
    metrics: [
      { value: "-42%", label: "客服成本" },
      { value: "24/7", label: "即時回應" },
      { value: "+15%", label: "回購率" },
    ],
    method: "Shopify + AI 客服串接訂單系統，常見查詢全自動，複雜個案才轉人工",
    source: "當事人授權刊登",
  },
  {
    slug: "accounting-firm-ai-audit",
    industry: "專業服務",
    tag: "數據",
    title: "會計師樓以 AI 做文件審核前期處理",
    metrics: [
      { value: "-60%", label: "核數前期時間" },
      { value: "0", label: "宗資料外洩" },
    ],
    method: "本地部署開源模型（MiniMax M2）處理敏感文件分類與初審，合規優先",
    source: "Build in Public 社群",
  },
];

/** 首頁精選（home.md Section 3 — 僅 Case A / B） */
export const featuredCases: CaseStudy[] = cases.slice(0, 2);
