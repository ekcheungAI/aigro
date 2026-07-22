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
  /** 模板全文（預覽 accordion + 一鍵複製內容） */
  content: string;
}

export const templates: Template[] = [
  {
    name: "AI 排班建議 Prompt",
    category: "自動化",
    fromCase: "連鎖茶餐廳",
    description: "輸入 POS 時段數據，輸出翌日人手建議表與理由，含例外處理規則。",
    content: `你係一間香港茶餐廳嘅營運顧問。根據以下資料，生成聽日每兩小時時段嘅人手建議表。

【輸入資料】
- 過去 8 個星期同星期幾嘅 POS 時段銷售數據：{{pos_data}}
- 聽日天氣預報：{{weather}}
- 公眾假期／學校假期：{{holidays}}
- 可用員工名單同可返更時段：{{staff}}

【輸出格式】
1. 時段人手表（每兩小時一行：時段｜預測客流｜建議人手｜負責崗位）
2. 每個建議嘅理由（一行，必須引用數據）
3. 備貨清單：凍肉、菜類、米麵各項建議數量 + 安全存量

【例外處理規則】
- 如果實際客流偏離預測超過 20%，即時標記並建議加人／放人
- 你只提供建議，最終決定由店長作出
- 所有編更必須符合香港勞工法例嘅用膳同休息時間要求`,
  },
  {
    name: "DSE 英文作文批改 Prompt",
    category: "寫作",
    fromCase: "補習社",
    description: "按考評局準則四維評分，附逐段修改建議與升級詞彙表。",
    content: `You are an experienced HKDSE English Language marker, fully familiar with HKEAA marking criteria. Mark the following student essay.

【Essay】{{essay}}
【Paper / Question】{{paper_question}}

【Marking】Score each dimension on the 1–7 scale per HKEAA criteria:
1. Content 內容
2. Language 語言
3. Organisation 組織
4. Task Fulfillment（如適用）

【Output】
1. 四維分數 + 總評等級（以 5** 至 U 為參照）
2. 逐段修改建議：原文句子 → 問題分析 → 修改版本
3. 升級詞彙表：10 個可即時應用嘅高階詞彙／句式，附例句
4. 下次練習建議：針對最弱一維，出一條同類型練習題

【Rules】
- 評語以繁體中文書寫，示例修改以英文書寫
- 語氣係鼓勵但誠實，唔好過分讚揚`,
  },
  {
    name: "樓盤文案生成工作流",
    category: "寫作",
    fromCase: "地產代理行",
    description: "樓盤資料 JSON → 中英雙語文案 → WhatsApp 跟進訊息三步模板。",
    content: `【步驟一：輸入】樓盤資料 JSON：
{
  "地區": "{{district}}",
  "實用面積": "{{sqft}}",
  "間隔": "{{layout}}",
  "叫價": "{{price}}",
  "賣點": ["{{point1}}", "{{point2}}"],
  "校網": "{{school_net}}",
  "交通": "{{transport}}"
}

【步驟二：生成文案】
- 中文版（書面語，120 字內）：開首一句賣點 → 間隔同面積 → 校網／交通 → 叫價同行動呼籲
- 英文版（80 words max）：same structure, formal tone
- 合規過濾：「筍盤」「必賺」「最後機會」等違反地產代理監管局指引嘅字眼一律禁用

【步驟三：跟進訊息】按客戶階段生成 WhatsApp 訊息：
- 新查詢：感謝 + 一個核心賣點 + 兩個睇樓時間選項
- 已睇樓：跟進感受 + 補充一項未提及嘅資料 + 温和行動呼籲
- 猶豫中：同區近期成交數據 + 中立提醒，唔准硬銷`,
  },
  {
    name: "客服分流系統 Prompt",
    category: "Agent",
    fromCase: "網店",
    description: "判斷查詢類型與複雜度，簡單即答、複雜轉人工並附摘要。",
    content: `你係網店客服分流系統。分析以下顧客查詢，並按規則回應。

【顧客查詢】{{customer_message}}
【訂單資料（如有）】{{order_context}}

【第一步：分類】判斷查詢類型：
- 簡單查詢（訂單狀態、運費、退貨政策、產品規格）→ 直接回答
- 複雜個案（退款爭議、損壞索償、情緒激動、涉及法律字眼）→ 轉人工

【第二步：回應】
- 簡單查詢：以顧客所用語言回覆（廣東話／書面中文／英文），語氣友善專業，100 字內
- 複雜個案：回覆「已為你轉接專人跟進，會喺辦公時間內盡快回覆」，並生成內部摘要（問題類型｜顧客情緒｜訂單編號｜建議處理方向）交俾人工客服

【規則】
- 唔可以承諾任何賠償金額或退款決定
- 所有退換貨回覆必須符合公司政策同香港《商品說明條例》
- 顧客重複追問同一複雜問題時，直接轉人工，唔好循環回答`,
  },
];
