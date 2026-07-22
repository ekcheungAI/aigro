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
  /** 香港視角 HK ANGLE — 差異化核心 */
  hkAngle: string;
  source: string;
  timeAgo: string;
  /** ISO 發佈時間（用於「最新」排序與詳情頁 meta） */
  publishedAt: string;
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
    publishedAt: "2025-01-15T06:30:00+08:00",
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
    publishedAt: "2025-01-15T03:00:00+08:00",
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
    publishedAt: "2025-01-15T00:30:00+08:00",
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
    publishedAt: "2025-01-14T09:00:00+08:00",
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
    publishedAt: "2025-01-14T07:30:00+08:00",
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
    publishedAt: "2025-01-13T18:00:00+08:00",
    score: 80,
    readMinutes: 4,
  },
  /* ---- insights.md Section 4 mock 第 7–14 條 ---- */
  {
    slug: "anthropic-claude-4-5-swe-bench",
    category: "模型發布",
    title: "Anthropic Claude 4.5 Sonnet 登頂 SWE-bench：程式代理能力再躍進",
    summary:
      "Claude 4.5 Sonnet 在 SWE-bench Verified 達 82%，連續編碼工作時長突破 30 小時。",
    hkAngle:
      "香港 IT 外判與金融科技團隊可評估以 Claude 處理遺留系統維護，釋放工程師做新開發。",
    source: "Anthropic News",
    timeAgo: "2 日前",
    publishedAt: "2025-01-13T14:00:00+08:00",
    score: 92,
    readMinutes: 4,
  },
  {
    slug: "google-gemini-3-pro",
    category: "模型發布",
    title: "Google Gemini 3 Pro：100 萬 token 上下文，原生強化繁體中文",
    summary:
      "Gemini 3 Pro 推理與多模態能力大幅升級，官方特別強調繁體中文理解質素提升。",
    hkAngle:
      "繁中強化對香港內容團隊是直接利好 — 終於有旗艦模型第一方認真對待繁體市場。",
    source: "Google DeepMind",
    timeAgo: "2 日前",
    publishedAt: "2025-01-13T10:00:00+08:00",
    score: 90,
    readMinutes: 5,
  },
  {
    slug: "hk-sme-ai-budget-survey",
    category: "行業動態",
    title: "調查：72% 香港中小企計劃未來一年增加 AI 預算",
    summary:
      "生產力促進局調查顯示中小企 AI 採用意慾創新高，最大障礙為人才與數據基礎。",
    hkAngle:
      "預算上升但人才短缺，正是『外部顧問 + 內部種子團隊』混合模式的機會窗口。",
    source: "香港生產力促進局",
    timeAgo: "3 日前",
    publishedAt: "2025-01-12T11:00:00+08:00",
    score: 79,
    readMinutes: 3,
  },
  {
    slug: "notion-ai-3-cross-app-agent",
    category: "產品發布",
    title: "Notion AI 3.0 加入跨應用 Agent，自動整理會議紀錄",
    summary:
      "Notion AI 可連接 Slack、Google Drive 等工具，自動歸納跨平台資訊並生成行動項。",
    hkAngle:
      "香港團隊普遍 WhatsApp 為主，Notion 生態整合有限，採用前須評估實際工作流覆蓋度。",
    source: "Notion Blog",
    timeAgo: "3 日前",
    publishedAt: "2025-01-12T08:00:00+08:00",
    score: 74,
    readMinutes: 4,
  },
  {
    slug: "openai-stripe-agentic-commerce",
    category: "行業動態",
    title: "OpenAI 與 Stripe 合作推出 Agentic Commerce 協議",
    summary:
      "新協議讓 AI agent 可直接完成商品搜尋與結帳，首批接入 Etsy 與 Shopify 商戶。",
    hkAngle:
      "香港 Shopify 網店眾多，Agent 電商一旦普及，SEO 與商品資料結構化將決定被 AI 選中的機會。",
    source: "OpenAI Blog",
    timeAgo: "4 日前",
    publishedAt: "2025-01-11T16:00:00+08:00",
    score: 86,
    readMinutes: 4,
  },
  {
    slug: "karpathy-vibe-coding-verification",
    category: "觀點與技巧",
    title: "Andrej Karpathy：Vibe Coding 時代，工程師的核心能力是驗證",
    summary:
      "Karpathy 認為 AI 生成代碼時代，審查、測試與架構判斷比打字速度更重要。",
    hkAngle:
      "對考慮轉型 AI 開發的香港工程師，投資 code review 與系統設計能力的回報最高。",
    source: "Karpathy X 訪談",
    timeAgo: "4 日前",
    publishedAt: "2025-01-11T09:00:00+08:00",
    score: 81,
    readMinutes: 6,
  },
  {
    slug: "moe-architecture-survey",
    category: "論文研究",
    title: "混合專家架構最新綜述：從 Switch Transformer 到 M2",
    summary:
      "綜述梳理 MoE 路由策略、訓練穩定性與推理成本優化的五年演進。",
    hkAngle:
      "想理解開源模型為何突然便宜十倍，這篇是最有效率的技術背景讀物。",
    source: "arXiv",
    timeAgo: "5 日前",
    publishedAt: "2025-01-10T15:00:00+08:00",
    score: 70,
    readMinutes: 9,
  },
  {
    slug: "ai-content-factory-red-lines",
    category: "觀點與技巧",
    title: "AI 內容工場的三條紅線：香港品牌如何避免同質化",
    summary:
      "大量品牌以 AI 量產內容導致語氣雷同，本文提出觀點、數據、在地案例三重差異化框架。",
    hkAngle:
      "香港市場細、受眾重疊，同質化內容的傷害比歐美市場更快顯現。",
    source: "AIGRO 編輯部",
    timeAgo: "6 日前",
    publishedAt: "2025-01-09T10:00:00+08:00",
    score: 77,
    readMinutes: 5,
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

/* ============ 詳情頁長文 (insight-detail.md) ============ */

export interface InsightArticleSection {
  heading: string;
  body: string;
}

export interface InsightArticle {
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

/** 詳情頁 mock 長文 — slug 對應；未有長文的情報由詳情頁以 summary/hkAngle 組裝 */
export const INSIGHT_ARTICLES: Record<string, InsightArticle> = {
  "openai-gpt-5-unified": {
    summaryLong:
      "OpenAI 正式發佈 GPT-5，將 o 系列推理能力與 GPT 系列生成能力合併為單一系統，根據任務自動調節思考深度。基準測試全面超越前代：SWE-bench 74.9%、GPQA Diamond 88.4%、AIME 2025 達 94.6%。API 定價較 GPT-4o 下調 40%，並開放 minimal / low / high 三檔推理強度，供開發者按成本與時延取捨。同步推出 GPT-5 mini 與 nano，覆蓋高併發低價場景。",
    lead: "API 降價四成，不只是一條產品新聞 — 它重新改寫了香港中小企導入 AI 的成本曲線。",
    sections: [
      {
        heading: "成本重估：回本週期由月變週",
        body: "過去一年，我們接觸的香港中小企導入 AI 的最大阻力不是技術，而是單次調用成本。以日均 2,000 次客服查詢的網店為例，GPT-4o 時代的月成本約 HK$4,800；按新定價測算降至 HK$2,900 以下，配合 mini 檔分流簡單查詢，可再降三成。客服自動化的回本週期由兩至三個月縮短至數週。",
      },
      {
        heading: "三檔推理：按場景精細控制開支",
        body: "GPT-5 的三檔推理強度是香港企業最容易忽略的升級。簡單 FAQ 用 minimal、訂單查詢用 low、合約條款分析才動用 high — 這種『按需推理』策略，正是我們在案例庫中見到的成熟團隊做法（參見：連鎖茶餐廳 AI 排班案例）。",
      },
      {
        heading: "本週行動建議",
        body: "一，重新測算現有 AI 專案的單次成本，降價後部分場景可能首次達到正回報；二，檢查你的供應商（客服 SaaS、文案工具）是否仍按舊價收費 — 差價就是你的談判籌碼；三，留意繁體中文在新模型的表現，官方基準未涵蓋，建議以自家語料做小型測試。",
      },
    ],
    sourceTitle: "OpenAI Blog《Introducing GPT-5》",
    updatedAt: "2025-01-15",
  },
  "minimax-m2-open-source": {
    summaryLong:
      "MiniMax 開源新一代 MoE 模型 M2，總參數 2,300 億、激活參數僅約 100 億，主打 Agent 場景與極低推理成本 — 官方測算成本僅及 Claude 同級方案的 8%。模型以 Apache 2.0 授權釋出，支援本地部署，工具調用與長任務規劃能力針對 Agent 工作流優化，繁體中文表現在同級開源模型中領先。",
    lead: "當開源模型的推理成本降到閉源方案的十分之一以下，『用唔用得起 AI』不再是問題 — 問題變成『你敢不敢把它放進核心流程』。",
    sections: [
      {
        heading: "本地部署：合規行業的破局點",
        body: "香港金融、法律與醫療行業對資料出境高度敏感，過去只能選擇昂貴的私有雲部署或卻步。M2 的激活參數規模讓單機部署成為可能，配合內部 RAG，合規團隊首次可以在不離開內網的前提下獲得接近旗艦模型的能力。",
      },
      {
        heading: "本週行動建議",
        body: "一，技術團隊可用一個下午在測試環境部署量化版，以自家繁中語料跑基準；二，評估現有按 token 計費的內部工具，用量大的場景（文件摘要、客服分流）是切換首選；三，留意開源授權條款對商用的具體限制。",
      },
    ],
    sourceTitle: "MiniMax《M2: Open-Source Agentic Model》",
    updatedAt: "2025-01-15",
  },
  "hkma-genai-sandbox-2": {
    summaryLong:
      "香港金融管理局宣佈生成式 AI 沙盒 2.0 正式啟動，首批 20 家銀行及科技公司參與，聚焦風險管理、反詐騙與客戶服務三大場景。沙盒提供監管對話通道與真實數據測試環境，參與機構可在受控條件下驗證生成式 AI 方案。",
    lead: "監管態度明朗化，是香港金融業 AI 導入最重要的訊號 — 不確定性消除後，預算與人才會快速跟進。",
    sections: [
      {
        heading: "從觀望到實戰的窗口期",
        body: "沙盒 1.0 以實驗性質為主，2.0 明確聚焦可落地的風控與反詐騙場景，意味監管已接受生成式 AI 進入核心業務流程。對金融從業員而言，現在是累積 AI 實戰經驗、建立內部話語權的最佳時機。",
      },
      {
        heading: "本週行動建議",
        body: "一，金融科技團隊應研究沙盒參與機構的公開案例，識別可複製的合規框架；二，服務金融業的顧問與供應商，應把『沙盒級』風控文件能力納入方案；三，留意金管局後續指引，預計將涵蓋模型風險管理要求。",
      },
    ],
    sourceTitle: "HKMA《生成式人工智能沙盒 2.0》",
    updatedAt: "2025-01-14",
  },
  "cursor-2-multi-agent": {
    summaryLong:
      "Cursor 2.0 正式發佈，引入最多 8 個並行 AI agent，各自在獨立工作樹中處理代碼庫不同部分，並內建瀏覽器自動測試與 Agent 間衝突檢測。新版本將多 Agent 並行開發由實驗功能提升為預設工作流。",
    lead: "香港初創工程團隊向來精簡 — 多 Agent 並行等於一人團隊擁有三倍產能，MVP 開發的成本結構被重新改寫。",
    sections: [
      {
        heading: "一人團隊的槓桿再放大",
        body: "過去並行開發需要多人協作與複雜的分支管理；現在單一開發者可以同時推進功能開發、測試補完與重構三條線。對兩三人的香港初創技術團隊，這直接壓縮了 MVP 的時間與外判開支。",
      },
      {
        heading: "本週行動建議",
        body: "一，以一個低風險功能試行多 Agent 工作流，建立審查並行產出的紀律；二，把測試覆蓋率不足的模組列為優先 — Agent 產能越高，驗證缺口越大；三，重新評估外判報價，部分工作已可由內部一人完成。",
      },
    ],
    sourceTitle: "Cursor Blog《Introducing Cursor 2.0》",
    updatedAt: "2025-01-15",
  },
  "traditional-chinese-rag-guide": {
    summaryLong:
      "繁體中文語料的分詞特性、embedding 模型選擇與混合檢索策略，直接決定 RAG 系統的可用性。本文以香港企業知識庫場景實測：比較三種 embedding 方案在繁中法律與金融語料的召回率，拆解分詞陷阱與檢索重排的最佳實踐。",
    lead: "多數英文教學忽略繁中斷詞陷阱 — 直接搬運的 RAG 架構，在香港企業語料上召回率可以跌三成。",
    sections: [
      {
        heading: "三個成敗關鍵",
        body: "第一，分詞：繁中無空格，通用 chunking 策略會切斷語義單元，應以句讀與標題層級為界。第二，embedding 選型：多語言模型對繁中的支援差異極大，必須以自家語料做召回測試。第三，混合檢索：關鍵詞與向量並行再重排，對合約編號、產品型號等精確查詢尤其關鍵。",
      },
      {
        heading: "本週行動建議",
        body: "一，用 50 條真實內部查詢建立評估集，先量度再優化；二，中英混合語料（香港企業常態）應分開索引再合併重排；三，把『答唔到就話唔知』的拒答機制列為上線前提，避免幻覺侵蝕信任。",
      },
    ],
    sourceTitle: "AIGRO 編輯部《繁中 RAG 實戰手記》",
    updatedAt: "2025-01-14",
  },
};
