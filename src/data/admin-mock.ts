/**
 * Admin 後台 mock data — 前端原型專用(Supabase 接入後由真實查詢取代)。
 * 涵蓋:Dashboard KPI、會員、對話參與、內容審核佇列、專家文章、MCP 設定。
 */

/* ---------------- Dashboard ---------------- */

export const dashboardKpis = {
  todayInsights: 15,
  totalMembers: 1284,
  todayChats: 96,
  pendingContent: 7,
} as const;

/** 本週對話趨勢(週一 → 週日) */
export const weeklyChats: { label: string; count: number }[] = [
  { label: "一", count: 72 },
  { label: "二", count: 84 },
  { label: "三", count: 68 },
  { label: "四", count: 91 },
  { label: "五", count: 88 },
  { label: "六", count: 54 },
  { label: "日", count: 96 },
];

export interface ActivityItem {
  id: string;
  kind: "新會員" | "新對話" | "內容發佈";
  text: string;
  time: string;
}

export const recentActivity: ActivityItem[] = [
  {
    id: "act-1",
    kind: "新會員",
    text: "陳家欣(kayan.chen@gmail.com)註冊成為免費會員",
    time: "12 分鐘前",
  },
  {
    id: "act-2",
    kind: "新對話",
    text: "訪客 #A4821 與 Jimmy Lau 分身展開對話 — 「AI 內容工場點起步?」",
    time: "38 分鐘前",
  },
  {
    id: "act-3",
    kind: "內容發佈",
    text: "情報「OpenAI 發佈 GPT-5 統一模型」已通過審核並發佈",
    time: "1 小時前",
  },
  {
    id: "act-4",
    kind: "新會員",
    text: "黃子朗升級至進階會員",
    time: "3 小時前",
  },
  {
    id: "act-5",
    kind: "新對話",
    text: "訪客 #A4770 與平台編輯部對話被標記為低信心(0.42)",
    time: "5 小時前",
  },
];

/* ---------------- 會員 ---------------- */

export type MemberTier = "免費" | "進階" | "VIP";
export type MemberStatus = "活躍" | "停用";

export interface MemberEvent {
  date: string;
  label: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  tier: MemberTier;
  joinedAt: string;
  chatCount: number;
  status: MemberStatus;
  lastActive: string;
  mcpInterests: string[];
  timeline: MemberEvent[];
}

export const members: Member[] = [
  {
    id: "m-001",
    name: "黃子朗",
    email: "tszlong.wong@outlook.com",
    tier: "VIP",
    joinedAt: "2025-11-02",
    chatCount: 214,
    status: "活躍",
    lastActive: "10 分鐘前",
    mcpInterests: ["AI", "Technology"],
    timeline: [
      { date: "2025-11-02", label: "註冊成為免費會員" },
      { date: "2025-11-20", label: "升級至進階會員" },
      { date: "2026-01-14", label: "升級至 VIP · 解鎖領航專家分身" },
      { date: "2026-07-02", label: "加入 AI 行業 MCP 優先名單" },
    ],
  },
  {
    id: "m-002",
    name: "陳家欣",
    email: "kayan.chen@gmail.com",
    tier: "免費",
    joinedAt: "2026-07-08",
    chatCount: 3,
    status: "活躍",
    lastActive: "12 分鐘前",
    mcpInterests: ["Beauty"],
    timeline: [
      { date: "2026-07-08", label: "註冊成為免費會員" },
      { date: "2026-07-08", label: "首次對話 — 平台編輯部" },
      { date: "2026-07-08", label: "加入 Beauty 行業 MCP 優先名單" },
    ],
  },
  {
    id: "m-003",
    name: "梁卓文",
    email: "cheukman.leung@yahoo.com.hk",
    tier: "進階",
    joinedAt: "2025-12-15",
    chatCount: 87,
    status: "活躍",
    lastActive: "1 小時前",
    mcpInterests: ["AI"],
    timeline: [
      { date: "2025-12-15", label: "註冊成為免費會員" },
      { date: "2026-02-01", label: "升級至進階會員" },
      { date: "2026-05-19", label: "加入 AI 行業 MCP 優先名單" },
    ],
  },
  {
    id: "m-004",
    name: "吳詠琳",
    email: "winglam.ng@gmail.com",
    tier: "免費",
    joinedAt: "2026-03-22",
    chatCount: 12,
    status: "活躍",
    lastActive: "2 小時前",
    mcpInterests: [],
    timeline: [
      { date: "2026-03-22", label: "註冊成為免費會員" },
      { date: "2026-04-03", label: "首次對話 — Elvin 分身" },
    ],
  },
  {
    id: "m-005",
    name: "張俊賢",
    email: "chunyin.cheung@icloud.com",
    tier: "VIP",
    joinedAt: "2025-10-08",
    chatCount: 342,
    status: "活躍",
    lastActive: "25 分鐘前",
    mcpInterests: ["AI", "Beauty", "Technology"],
    timeline: [
      { date: "2025-10-08", label: "註冊成為免費會員" },
      { date: "2025-10-30", label: "升級至 VIP(創始優惠)" },
      { date: "2026-01-05", label: "加入全部 MCP 優先名單" },
      { date: "2026-06-28", label: "對話數突破 300" },
    ],
  },
  {
    id: "m-006",
    name: "李凱彤",
    email: "hoitung.lee@gmail.com",
    tier: "進階",
    joinedAt: "2026-01-19",
    chatCount: 56,
    status: "活躍",
    lastActive: "昨天",
    mcpInterests: ["Technology"],
    timeline: [
      { date: "2026-01-19", label: "註冊成為免費會員" },
      { date: "2026-03-11", label: "升級至進階會員" },
    ],
  },
  {
    id: "m-007",
    name: "何嘉俊",
    email: "kachun.ho@hotmail.com",
    tier: "免費",
    joinedAt: "2026-05-30",
    chatCount: 8,
    status: "活躍",
    lastActive: "昨天",
    mcpInterests: ["Beauty"],
    timeline: [
      { date: "2026-05-30", label: "註冊成為免費會員" },
      { date: "2026-06-14", label: "加入 Beauty 行業 MCP 優先名單" },
    ],
  },
  {
    id: "m-008",
    name: "周穎怡",
    email: "wingyi.chow@gmail.com",
    tier: "進階",
    joinedAt: "2025-11-27",
    chatCount: 129,
    status: "活躍",
    lastActive: "3 天前",
    mcpInterests: ["AI"],
    timeline: [
      { date: "2025-11-27", label: "註冊成為免費會員" },
      { date: "2026-01-09", label: "升級至進階會員" },
      { date: "2026-04-22", label: "加入 AI 行業 MCP 優先名單" },
    ],
  },
  {
    id: "m-009",
    name: "林曉峰",
    email: "hiufung.lam@gmail.com",
    tier: "免費",
    joinedAt: "2026-06-11",
    chatCount: 2,
    status: "停用",
    lastActive: "2 星期前",
    mcpInterests: [],
    timeline: [
      { date: "2026-06-11", label: "註冊成為免費會員" },
      { date: "2026-06-25", label: "因濫用對話額度被停用" },
    ],
  },
  {
    id: "m-010",
    name: "鄭曉彤",
    email: "hiutung.cheng@outlook.com",
    tier: "VIP",
    joinedAt: "2025-09-14",
    chatCount: 401,
    status: "活躍",
    lastActive: "1 小時前",
    mcpInterests: ["Technology"],
    timeline: [
      { date: "2025-09-14", label: "註冊成為免費會員(首批 beta)" },
      { date: "2025-09-14", label: "升級至 VIP(創始優惠)" },
      { date: "2026-02-18", label: "加入 Technology 行業 MCP 優先名單" },
    ],
  },
  {
    id: "m-011",
    name: "許志明",
    email: "chiming.hui@gmail.com",
    tier: "免費",
    joinedAt: "2026-04-07",
    chatCount: 19,
    status: "活躍",
    lastActive: "4 天前",
    mcpInterests: ["AI"],
    timeline: [
      { date: "2026-04-07", label: "註冊成為免費會員" },
      { date: "2026-06-30", label: "加入 AI 行業 MCP 優先名單" },
    ],
  },
  {
    id: "m-012",
    name: "謝嘉慧",
    email: "kawai.tse@yahoo.com.hk",
    tier: "進階",
    joinedAt: "2026-02-25",
    chatCount: 73,
    status: "活躍",
    lastActive: "6 小時前",
    mcpInterests: ["Beauty", "Technology"],
    timeline: [
      { date: "2026-02-25", label: "註冊成為免費會員" },
      { date: "2026-04-16", label: "升級至進階會員" },
      { date: "2026-05-08", label: "加入 Beauty 行業 MCP 優先名單" },
    ],
  },
];

/* ---------------- 對話參與 ---------------- */

export interface ChatMessage {
  role: "user" | "ai";
  text: string;
  time: string;
}

export interface Conversation {
  id: string;
  /** 訪客匿名 ID */
  anonId: string;
  /** 分身顯示名 */
  persona: string;
  /** 分身對應專家(平台分身為 null) */
  expertSlug: string | null;
  firstQuestion: string;
  date: string;
  messageCount: number;
  /** 平均信心 0–1 */
  confidenceAvg: number;
  flagged: boolean;
  messages: ChatMessage[];
}

export const conversations: Conversation[] = [
  {
    id: "c-001",
    anonId: "#A4821",
    persona: "Jimmy Lau 分身",
    expertSlug: "jimmy-lau",
    firstQuestion: "我哋公司想做 AI 內容工場,第一步應該點行?",
    date: "今日 14:22",
    messageCount: 8,
    confidenceAvg: 0.87,
    flagged: false,
    messages: [
      { role: "user", text: "我哋公司想做 AI 內容工場,第一步應該點行?", time: "14:22" },
      {
        role: "ai",
        text: "AI-First 思維第一步:唔好問「用邊個工具」,先問「我邊個場景最痛」。建議你先列出一星期內重複三次以上嘅內容工序,揀最耗時嗰項,用一個工具做到底 — 試玩一百個工具,不如一個場景落地。",
        time: "14:22",
      },
      { role: "user", text: "我哋主要係社交媒體 caption 同埋電子報,邊個先?", time: "14:25" },
      {
        role: "ai",
        text: "由電子報開始 — 長文先係母體。一篇長文可以拆做 LinkedIn post、IG caption 同 WhatsApp 廣播稿,「一次生產、多平台分發」。記住觀點同本地案例必須人手注入,同質化係香港細市場最快被懲罰嘅問題。",
        time: "14:26",
      },
    ],
  },
  {
    id: "c-002",
    anonId: "#A4770",
    persona: "平台編輯部",
    expertSlug: null,
    firstQuestion: "香港邊度可以學到正規嘅 AI 課程?",
    date: "今日 11:05",
    messageCount: 4,
    confidenceAvg: 0.42,
    flagged: true,
    messages: [
      { role: "user", text: "香港邊度可以學到正規嘅 AI 課程?", time: "11:05" },
      {
        role: "ai",
        text: "本平台知識庫主要涵蓋 AI・增長實戰情報,未收錄完整嘅香港課程名錄。建議你參考 DotAI 學習基地等實戰社群,或留意平台日後嘅資源庫更新。",
        time: "11:05",
      },
    ],
  },
  {
    id: "c-003",
    anonId: "#A4803",
    persona: "Elvin 分身",
    expertSlug: "elvin-cheung",
    firstQuestion: "Claude Code 同 Cursor 邊個適合非技術出身嘅人?",
    date: "今日 09:47",
    messageCount: 12,
    confidenceAvg: 0.91,
    flagged: false,
    messages: [
      { role: "user", text: "Claude Code 同 Cursor 邊個適合非技術出身嘅人?", time: "09:47" },
      {
        role: "ai",
        text: "以我實測,非技術出身建議由 Cursor 入手 — GUI 介面門檻低,可以即刻見到改動。Claude Code 係 terminal-based,威力大但要習慣指令式互動。兩者我都拍過實測片,重點係:工具其次,你描述需求嘅清晰度先係瓶頸。",
        time: "09:47",
      },
      { role: "user", text: "咁學習曲線大概幾耐?", time: "09:50" },
      {
        role: "ai",
        text: "每日用 30 分鐘,大約兩星期可以做到第一個自己用得到嘅小工具。關鍵係由自己嘅真實需求出發,唔好跟住教學做 todo app。",
        time: "09:51",
      },
    ],
  },
  {
    id: "c-004",
    anonId: "#A4795",
    persona: "Jimmy Lau 分身",
    expertSlug: "jimmy-lau",
    firstQuestion: "語境工程同提示詞工程有咩分別?",
    date: "昨日 18:31",
    messageCount: 6,
    confidenceAvg: 0.93,
    flagged: false,
    messages: [
      { role: "user", text: "語境工程同提示詞工程有咩分別?", time: "18:31" },
      {
        role: "ai",
        text: "提示詞工程係背「魔法咒語」;語境工程係執好你俾 AI 嘅 context — 品牌背景、受眾、語氣、限制。Context 對咗,輸出自然到位。呢條路線係 DotAI 喺 Everyone.AI 大會首度喺香港提出嘅。",
        time: "18:31",
      },
    ],
  },
  {
    id: "c-005",
    anonId: "#A4688",
    persona: "平台編輯部",
    expertSlug: null,
    firstQuestion: "補習社想用 AI 批改,有冇本地案例參考?",
    date: "昨日 15:12",
    messageCount: 10,
    confidenceAvg: 0.84,
    flagged: false,
    messages: [
      { role: "user", text: "補習社想用 AI 批改,有冇本地案例參考?", time: "15:12" },
      {
        role: "ai",
        text: "有 — 平台案例庫收錄咗一間香港補習社用 AI 做批改同個人化練習,導師時間放回教學,內容產出提升 2.4 倍。詳細拆解見案例「補習社以 AI 批改與個人化練習」。",
        time: "15:12",
      },
    ],
  },
  {
    id: "c-006",
    anonId: "#A4654",
    persona: "Elvin 分身",
    expertSlug: "elvin-cheung",
    firstQuestion: "點樣用 MCP 將 AIGRO 情報接入我自己嘅 AI 工具?",
    date: "昨日 10:58",
    messageCount: 5,
    confidenceAvg: 0.55,
    flagged: true,
    messages: [
      { role: "user", text: "點樣用 MCP 將 AIGRO 情報接入我自己嘅 AI 工具?", time: "10:58" },
      {
        role: "ai",
        text: "AIGRO MCP Network 而家仲喺優先名單階段,AI 行業 server 會第一批開放。你可以先喺 Developers 頁登記,開放時會優先通知。具體接入文件會隨開放一併提供。",
        time: "10:58",
      },
    ],
  },
  {
    id: "c-007",
    anonId: "#A4590",
    persona: "Jimmy Lau 分身",
    expertSlug: "jimmy-lau",
    firstQuestion: "AI 會唔會取代 marketing 團隊?",
    date: "2 天前 20:14",
    messageCount: 7,
    confidenceAvg: 0.89,
    flagged: false,
    messages: [
      { role: "user", text: "AI 會唔會取代 marketing 團隊?", time: "20:14" },
      {
        role: "ai",
        text: "AI 放大自身價值,唔係取代你。最落地嘅路線圖係:用 AI 放大你本來最值錢嘅嘢。行銷嘅下半場係 AI 全棧 — 由策略、內容到圖像影像,識得用 AI 嘅 marketer 會取代唔識用嘅。",
        time: "20:14",
      },
    ],
  },
  {
    id: "c-008",
    anonId: "#A4543",
    persona: "平台編輯部",
    expertSlug: null,
    firstQuestion: "GPT-5 對香港中小企有咩實際影響?",
    date: "2 天前 16:40",
    messageCount: 9,
    confidenceAvg: 0.78,
    flagged: false,
    messages: [
      { role: "user", text: "GPT-5 對香港中小企有咩實際影響?", time: "16:40" },
      {
        role: "ai",
        text: "統一模型意味住中小企唔使再煩「揀邊個模型」— 一個入口處理寫作、分析同編碼。實際影響最大嘅係客服同內容工序,建議由重複性最高嘅環節開始試。",
        time: "16:40",
      },
    ],
  },
  {
    id: "c-009",
    anonId: "#A4501",
    persona: "Elvin 分身",
    expertSlug: "elvin-cheung",
    firstQuestion: "用 AI 做 YouTube 縮圖有咩 workflow 推介?",
    date: "3 天前 13:26",
    messageCount: 11,
    confidenceAvg: 0.86,
    flagged: false,
    messages: [
      { role: "user", text: "用 AI 做 YouTube 縮圖有咩 workflow 推介?", time: "13:26" },
      {
        role: "ai",
        text: "我嘅 workflow:先用 Midjourney 出 4 個構圖方向,再用 Photoshop 生成填充執細節,最後加字。重點係縮圖要喺手機尺寸先檢查一次 — 大部分人係 mobile 睇。",
        time: "13:26",
      },
    ],
  },
  {
    id: "c-010",
    anonId: "#A4477",
    persona: "平台編輯部",
    expertSlug: null,
    firstQuestion: "VIP 會員同進階會員有咩分別?",
    date: "3 天前 09:02",
    messageCount: 3,
    confidenceAvg: 0.95,
    flagged: false,
    messages: [
      { role: "user", text: "VIP 會員同進階會員有咩分別?", time: "09:02" },
      {
        role: "ai",
        text: "進階會員解鎖無限情報閱讀同每日對話額度提升;VIP 再解鎖領航專家 AI 分身無限對話、案例深度拆解全文同 Club 活動優先名額。詳細比較見 Pricing 頁。",
        time: "09:02",
      },
    ],
  },
];

/* ---------------- 內容管理 ---------------- */

export type QueueStatus = "待審核" | "已通過" | "已拒絕";

export interface QueueItem {
  id: string;
  title: string;
  source: string;
  fetchedAt: string;
  category: string;
  summary: string;
  status: QueueStatus;
  featured: boolean;
}

export const contentQueue: QueueItem[] = [
  {
    id: "q-001",
    title: "OpenAI 發佈 GPT-5.1:推理速度提升 40%",
    source: "OpenAI Blog",
    fetchedAt: "今日 08:14",
    category: "模型發佈",
    summary:
      "GPT-5.1 主打推理速度同成本下降,API 價格再減 25%。香港視角:中小企 AI 應用門檻進一步降低,客服同內容工序係首批受惠場景。",
    status: "待審核",
    featured: false,
  },
  {
    id: "q-002",
    title: "Google Veo 4 開放企業 API,香港代理率先接入",
    source: "Google DeepMind",
    fetchedAt: "今日 07:52",
    category: "AI 影片",
    summary:
      "Veo 4 企業 API 支援 4K 60s 生成,按秒計費。香港視角:地產同零售嘅商品影片成本有望跌一個數量級。",
    status: "待審核",
    featured: false,
  },
  {
    id: "q-003",
    title: "Meta 開源 Llama 5 90B:繁體中文能力大幅加強",
    source: "Meta AI",
    fetchedAt: "昨日 22:31",
    category: "開源模型",
    summary:
      "Llama 5 90B 首次喺官方 benchmark 加入繁體中文評測,粵語口語理解達 GPT-4.5 水平。香港視角:本地部署嘅私隱敏感場景(醫療、法律)有咗新選擇。",
    status: "待審核",
    featured: false,
  },
  {
    id: "q-004",
    title: "Anthropic 推出 Claude for Sheets:試算表內直接叫 AI",
    source: "Anthropic",
    fetchedAt: "昨日 18:07",
    category: "AI 工具",
    summary:
      "Claude for Sheets 支援批量分類、摘要同資料清洗。香港視角:會計師樓同市場研究團隊可以即刻用,配合案例庫嘅文件審核流程。",
    status: "待審核",
    featured: false,
  },
  {
    id: "q-005",
    title: "Perplexity 推出香港地區即時搜尋加強",
    source: "Perplexity Blog",
    fetchedAt: "昨日 15:44",
    category: "AI 搜尋",
    summary:
      "Perplexity 新增香港新聞源同政府公告索引。香港視角:情報類產品競爭加劇,本地化深度先係護城河。",
    status: "待審核",
    featured: false,
  },
  {
    id: "q-006",
    title: "Runway Gen-5 實測:產品廣告一鍵生成時代來臨?",
    source: "YouTube · AI 工具實測",
    fetchedAt: "昨日 11:20",
    category: "AI 影片",
    summary:
      "實測 Runway Gen-5 生成 15 秒產品廣告,成品率約 60%。香港視角:網店店主可以用低成本試廣告素材,但品牌調性仍需人手把關。",
    status: "待審核",
    featured: false,
  },
  {
    id: "q-007",
    title: "MCP 生態週報:新增 42 個社群 server",
    source: "MCP Registry",
    fetchedAt: "2 天前 09:15",
    category: "MCP 生態",
    summary:
      "本週 MCP Registry 新增 42 個 server,以資料庫同設計工具類為主。香港視角:AIGRO MCP Network 嘅行業情報定位仍然稀缺。",
    status: "待審核",
    featured: false,
  },
  {
    id: "q-008",
    title: "調查:73% 香港企業計劃未來一年增加 AI 預算",
    source: "HKPC 生產力局",
    fetchedAt: "2 天前 08:02",
    category: "行業數據",
    summary:
      "生產力局調查 500 間香港中小企,73% 計劃增加 AI 預算,但 61% 表示「唔知由邊度入手」。香港視角:「AI 試玩」走向落地嘅教育需求巨大。",
    status: "已通過",
    featured: true,
  },
];

export type PostStatus = "已發佈" | "草稿";

export interface ExpertPost {
  id: string;
  title: string;
  expert: string;
  expertSlug: string;
  status: PostStatus;
  date: string;
  summary: string;
  body: string;
}

export const expertPosts: ExpertPost[] = [
  {
    id: "p-001",
    title: "語境工程入門:香港企業嘅 AI 落地第一步",
    expert: "Jimmy Lau 劉泰麟",
    expertSlug: "jimmy-lau",
    status: "已發佈",
    date: "2026-06-28",
    summary: "點解話 context 比 prompt 重要?由 Everyone.AI 大會嘅 200+ 決策者提問講起。",
    body: "喺 Everyone.AI 大會,最多人問嘅唔係「邊個工具勁」,而係「點解 AI 答非所問」。答案十居其九係 context 唔夠...",
  },
  {
    id: "p-002",
    title: "AI 內容工場嘅三條紅線",
    expert: "Jimmy Lau 劉泰麟",
    expertSlug: "jimmy-lau",
    status: "已發佈",
    date: "2026-05-17",
    summary: "同質化、事實把關、品牌語氣 — 內容規模化之前必須劃好嘅三條線。",
    body: "內容產出提升 10 倍唔難,難嘅係唔犧牲信任。香港市場細,一篇出錯嘅內容傳得比十篇好內容快...",
  },
  {
    id: "p-003",
    title: "由 idea 到行動:我嘅 48 小時實驗法",
    expert: "Jimmy Lau 劉泰麟",
    expertSlug: "jimmy-lau",
    status: "草稿",
    date: "2026-07-05",
    summary: "每個 idea 俾佢 48 小時:AI 出草稿、小範圍試水溫、數據話事。",
    body: "Idea 唔行動等於零。我嘅方法係:任何 idea 都俾佢 48 小時...",
  },
  {
    id: "p-004",
    title: "Claude Code 實測:非技術出身嘅 14 天上手日記",
    expert: "Elvin Cheung",
    expertSlug: "elvin-cheung",
    status: "已發佈",
    date: "2026-06-10",
    summary: "每日 30 分鐘,由 terminal 恐懼到做出自己第一個小工具。",
    body: "第一日我連 cd 都唔識。第十四日,我用 Claude Code 做咗個自動整理 YouTube 字幕嘅小工具...",
  },
  {
    id: "p-005",
    title: "點解我拍片堅持用廣東話講 AI",
    expert: "Elvin Cheung",
    expertSlug: "elvin-cheung",
    status: "已發佈",
    date: "2026-04-22",
    summary: "語言係語境嘅一部分 — 香港人值得有自己語境嘅 AI 內容。",
    body: "有人問我點解唔拍普通話片,市場大啲。答案好簡單:語言係語境嘅一部分...",
  },
  {
    id: "p-006",
    title: "MCP 係咩?用香港人聽得明嘅方式講一次",
    expert: "Elvin Cheung",
    expertSlug: "elvin-cheung",
    status: "草稿",
    date: "2026-07-07",
    summary: "MCP 之於 AI,好似 USB-C 之於充電器 — 一個標準,全部駁通。",
    body: "MCP 全名 Model Context Protocol。講人話:佢係 AI 工具之間嘅 USB-C...",
  },
];

/* ---------------- 案例管理(featured 狀態) ---------------- */

export interface AdminCase {
  slug: string;
  title: string;
  industry: string;
  featured: boolean;
  publishedAt: string;
}

export const adminCases: AdminCase[] = [
  {
    slug: "cha-chaan-teng-ai-scheduling",
    title: "連鎖茶餐廳用 AI 排班與預測備貨,8 間分店全面落地",
    industry: "餐飲",
    featured: true,
    publishedAt: "2025-01",
  },
  {
    slug: "tutorial-centre-ai-grading",
    title: "補習社以 AI 批改與個人化練習,導師時間放回教學",
    industry: "教育",
    featured: true,
    publishedAt: "2025-03",
  },
  {
    slug: "property-agency-ai-copywriting",
    title: "地產代理行以 AI 生成樓盤文案與跟進訊息",
    industry: "地產",
    featured: false,
    publishedAt: "2025-05",
  },
  {
    slug: "ecommerce-ai-support-automation",
    title: "網店 AI 客服 + 訂單自動化,一個人營運三個品牌",
    industry: "零售",
    featured: false,
    publishedAt: "2025-08",
  },
  {
    slug: "accounting-firm-ai-audit",
    title: "會計師樓以 AI 做文件審核前期處理",
    industry: "專業服務",
    featured: false,
    publishedAt: "2025-11",
  },
];

/* ---------------- 設定 ---------------- */

export interface McpVertical {
  key: string;
  label: string;
  enabled: boolean;
  waitlist: number;
}

export const mcpVerticals: McpVertical[] = [
  { key: "ai", label: "AI", enabled: true, waitlist: 412 },
  { key: "beauty", label: "Beauty", enabled: false, waitlist: 203 },
  { key: "technology", label: "Technology", enabled: false, waitlist: 187 },
];

export interface AihotSource {
  name: string;
  endpoint: string;
  lastFetch: string;
  items: number;
  ok: boolean;
}

export const aihotSources: AihotSource[] = [
  {
    name: "OpenAI Blog",
    endpoint: "RSS · openai.com/blog",
    lastFetch: "今日 08:14",
    items: 3,
    ok: true,
  },
  {
    name: "Google DeepMind",
    endpoint: "RSS · deepmind.google",
    lastFetch: "今日 07:52",
    items: 2,
    ok: true,
  },
  {
    name: "TikHub · X/Twitter 熱榜",
    endpoint: "API · tikhub.io",
    lastFetch: "今日 08:00",
    items: 6,
    ok: true,
  },
  {
    name: "Firecrawl · 社群論壇",
    endpoint: "Scrape · firecrawl.dev",
    lastFetch: "昨日 23:41",
    items: 4,
    ok: false,
  },
];


/* ---------------- 專家工作室 Instructor Studio ---------------- */

export type StudioResourceType = "文件" | "研究" | "連結" | "逐字稿";

export interface StudioResource {
  id: string;
  name: string;
  type: StudioResourceType;
  /** 檔案類型+大小(文件/研究/逐字稿)或來源平台(連結) */
  detail: string;
  addedAt: string;
  /** 已入知識庫(完成切塊 + embedding) */
  inKb: boolean;
}

export interface StudioPromptVersion {
  version: string;
  date: string;
  status: "已上線" | "待審批";
}

export interface StudioPersonaReply {
  q: string;
  a: string;
}

export interface StudioExpert {
  /** 對應 experts.ts slug */
  slug: string;
  /** selector chip 短名 */
  shortName: string;
  /** header 顯示名 */
  displayName: string;
  resources: StudioResource[];
  /** 素材收集步驟 — 已收集項數 */
  collectedCount: number;
  /** 知識庫片段數(Plex Mono 顯示) */
  kbChunks: number;
  lastDistilled: string;
  topics: string[];
  promptVersions: StudioPromptVersion[];
  /** 測試分身 — 專家語氣嘅 scripted 回覆(輪播) */
  personaReplies: StudioPersonaReply[];
}

export const studioExperts: StudioExpert[] = [
  {
    slug: "jimmy-lau",
    shortName: "Jimmy",
    displayName: "Jimmy Lau 劉泰麟",
    collectedCount: 11,
    kbChunks: 1284,
    lastDistilled: "2026-07-22",
    topics: ["AI-First", "語境工程", "AI 行銷", "圖像影像", "社群營運"],
    promptVersions: [
      { version: "Prompt v1.0", date: "2026-07", status: "已上線" },
      { version: "Prompt v1.1", date: "2026-07", status: "待審批" },
    ],
    personaReplies: [
      {
        q: "我間公司想開始用 AI,應該點起步?",
        a: "我嘅答案永遠係 AI-First:唔好問「呢個工具勁唔勁」,先問「我邊個場景最痛」。停止喺工具追逐中空轉 — 由你嘅真實業務場景出發,AI 先至有落腳點。揀一個場景,做到底。",
      },
      {
        q: "有個 idea 但一直未開始,點算?",
        a: "Idea 唔行動,等於零。用 AI 將你嘅靈感拆成今日做得到嘅第一步 — 例如先生成一個品牌視覺草稿去試水溫,而唔係等萬事俱備先行。Creator 嘅使命係將靈感轉化為實踐。",
      },
      {
        q: "點解 AI 成日答非所問?",
        a: "唔好再背 prompt 咒語 — 執好你俾 AI 嘅 context:品牌背景、受眾、語氣、限制。語境工程 Context Engineering 係我喺 Everyone.AI 大會首度喺香港提出嘅路線:context 對咗,輸出自然到位。",
      },
    ],
    resources: [
      { id: "j-r1", name: "Everyone.AI 大會簡報.pdf", type: "文件", detail: "PDF · 24.6 MB", addedAt: "2026-07-02", inKb: true },
      { id: "j-r2", name: "AI-First 企業導入指南.docx", type: "文件", detail: "DOCX · 1.8 MB", addedAt: "2026-06-18", inKb: true },
      { id: "j-r3", name: "語境工程白皮書(Context Engineering).pdf", type: "文件", detail: "PDF · 6.2 MB", addedAt: "2026-07-11", inKb: false },
      { id: "j-r4", name: "AI Marketing 全棧方法論研究.md", type: "研究", detail: "MD · 84 KB", addedAt: "2026-05-30", inKb: true },
      { id: "j-r5", name: "香港企業 AI 採用調查 2026.pdf", type: "研究", detail: "PDF · 3.1 MB", addedAt: "2026-07-08", inKb: false },
      { id: "j-r6", name: "dotai.hk — 停止工具追逐系列文章", type: "連結", detail: "dotai.hk", addedAt: "2026-06-25", inKb: true },
      { id: "j-r7", name: "Everyone.AI 大會回顧(Microsoft · Google · HP)", type: "連結", detail: "dotai.hk", addedAt: "2026-07-15", inKb: true },
      { id: "j-r8", name: "Threads @jimmylau.ai 精選貼文(36 則)", type: "連結", detail: "Threads", addedAt: "2026-07-19", inKb: false },
      { id: "j-r9", name: "AI-First 訪談逐字稿.md", type: "逐字稿", detail: "MD · 128 KB", addedAt: "2026-06-05", inKb: true },
      { id: "j-r10", name: "Everyone.AI 主題演講逐字稿.txt", type: "逐字稿", detail: "TXT · 96 KB", addedAt: "2026-07-03", inKb: true },
      { id: "j-r11", name: "Podcast《AI 放大自身價值》逐字稿", type: "逐字稿", detail: "MP3 → TXT · 74 KB", addedAt: "2026-07-20", inKb: false },
    ],
  },
  {
    slug: "elvin-cheung",
    shortName: "Elvin",
    displayName: "Elvin Cheung @ekcheungAI",
    collectedCount: 10,
    kbChunks: 968,
    lastDistilled: "2026-07-18",
    topics: ["AI 實戰拆解", "自動化 Workflow", "Vibe Coding", "Agent 架構", "分身經濟"],
    promptVersions: [
      { version: "Prompt v1.0", date: "2026-06", status: "已上線" },
      { version: "Prompt v1.1", date: "2026-07", status: "待審批" },
    ],
    personaReplies: [
      {
        q: "新 AI 工具層出不窮,值唔值得追?",
        a: "先講底線:冇來源,唔出聲。我每個論點都會保留出處同實測脈絡 — demo 唔等於 production,實測過先講限制。一個工具唔係答案,串成 workflow 先係。",
      },
      {
        q: "點樣先算真正 AI 落地?",
        a: "慳一次時間係技巧;將流程沉澱成系統,先係資產。工具會過時,workflow 嘅槓桿唔會 — source-aware 咁將工具變 workflow,workflow 變系統,先係真正落地。",
      },
      {
        q: "唔識寫 code 可唔可以做產品?",
        a: "Vibe coding 改變咗「邊個可以做產品」— 唔使再等工程師,識拆解問題嘅人,而家都可以親手將諗法變成產品。但記住:由 demo 到產品化,中間嗰段先係真功夫。",
      },
    ],
    resources: [
      { id: "e-r1", name: "ekcheungAI 指南系列 — Agent 架構篇.pdf", type: "文件", detail: "PDF · 9.4 MB", addedAt: "2026-06-12", inKb: true },
      { id: "e-r2", name: "Perskill persona 檔案.md", type: "文件", detail: "MD · 156 KB", addedAt: "2026-07-05", inKb: true },
      { id: "e-r3", name: "Vibe Coding 實戰手冊.docx", type: "文件", detail: "DOCX · 2.3 MB", addedAt: "2026-07-14", inKb: false },
      { id: "e-r4", name: "自動化 Workflow 拆解研究(n8n / Make).md", type: "研究", detail: "MD · 112 KB", addedAt: "2026-05-28", inKb: true },
      { id: "e-r5", name: "AI 工具實測記錄庫(來源 + 限制).md", type: "研究", detail: "MD · 240 KB", addedAt: "2026-07-09", inKb: true },
      { id: "e-r6", name: "YouTube 拆解連結 —「工具變 Workflow」系列", type: "連結", detail: "YouTube", addedAt: "2026-06-20", inKb: true },
      { id: "e-r7", name: "IG Reels 教學連結(實測先行系列)", type: "連結", detail: "Instagram", addedAt: "2026-07-01", inKb: false },
      { id: "e-r8", name: "ekcheung.com — 分身經濟長文", type: "連結", detail: "ekcheung.com", addedAt: "2026-07-16", inKb: true },
      { id: "e-r9", name: "YouTube「Workflow 變系統」逐字稿", type: "逐字稿", detail: "TXT · 88 KB", addedAt: "2026-06-27", inKb: true },
      { id: "e-r10", name: "Podcast 訪談逐字稿 — 分身經濟與授權", type: "逐字稿", detail: "MP3 → TXT · 102 KB", addedAt: "2026-07-21", inKb: false },
    ],
  },
];

/* ---------------- CRM 線索 ---------------- */

export type CrmStage = "新線索" | "已接觸" | "跟進中" | "已轉化";
export type CrmLeadType = "訪客" | "免費會員" | "進階會員";
/** 意向訊號 — 公司導入/預約/價錢 = 高意向,課程 = 中,閒聊 = 低 */
export type CrmSignal = "問公司導入" | "問預約" | "問價錢" | "問課程" | "閒聊";

export interface CrmQuestion {
  date: string;
  text: string;
  persona: string;
}

export interface CrmTimelineEntry {
  date: string;
  label: string;
}

export interface CrmMemberProfile {
  email: string;
  tier: string;
  joinedAt: string;
  mcpInterests: string[];
}

export interface CrmLead {
  id: string;
  /** 訪客匿名 ID */
  anonId: string;
  /** 註冊會員姓名,訪客為 null */
  name: string | null;
  type: CrmLeadType;
  /** 主要接觸分身 */
  persona: string;
  /**
   * 意向評分 0–100,由問題內容推算:
   * 問公司導入/預約/價錢 = 高意向(70+),問課程 = 中(40–69),閒聊 = 低(<40)。
   */
  score: number;
  signals: CrmSignal[];
  lastActivity: string;
  stage: CrmStage;
  questions: CrmQuestion[];
  /** 意向分析 — 偵測訊號摘要 + 建議切入角度 */
  analysis: { detected: string[]; angle: string };
  /** 註冊會員資料,訪客為 null */
  member: CrmMemberProfile | null;
  timeline: CrmTimelineEntry[];
  /** 跟進 email 範本(按分身語氣預填) */
  emailDraft: { subject: string; body: string };
  /** 建議跟進動作(未接觸線索用) */
  suggestedAction: string;
}

/** 全站 KPI(mock)— 列表樣本見 crmLeads */
export const crmKpis = {
  total: 342,
  highIntent: 28,
  newThisWeek: 41,
  following: 15,
} as const;

export const crmLeads: CrmLead[] = [
  {
    id: "lead-001",
    anonId: "#A4821",
    name: null,
    type: "訪客",
    persona: "Jimmy Lau 分身",
    score: 88,
    signals: ["問公司導入", "問價錢"],
    lastActivity: "今日 14:38",
    stage: "新線索",
    questions: [
      { date: "今日 14:22", text: "我哋公司想做 AI 內容工場,第一步應該點行?", persona: "Jimmy Lau 分身" },
      { date: "今日 14:25", text: "我哋主要係社交媒體 caption 同埋電子報,邊個先?", persona: "Jimmy Lau 分身" },
      { date: "今日 14:31", text: "公司導入 AI 工具,預算大概要幾多先合理?", persona: "Jimmy Lau 分身" },
      { date: "今日 14:38", text: "你哋 Club 有冇企業方案?", persona: "Jimmy Lau 分身" },
    ],
    analysis: {
      detected: ["連續四問圍繞公司導入", "主動問預算範圍", "問及 Club 企業方案"],
      angle: "對企業導入有明確預算意圖 — 建議 Club 優先預約角度",
    },
    member: null,
    timeline: [
      { date: "今日 14:22", label: "與 Jimmy Lau 分身對話發生(8 則訊息)" },
      { date: "今日 14:40", label: "系統評分 88 — 歸類高意向線索" },
    ],
    emailDraft: {
      subject: "你問嘅 AI 內容工場 — Jimmy 想同你傾 15 分鐘",
      body: "你好,\n\n睇到你今日同 Jimmy 分身傾咗一輪 AI 內容工場嘅導入方向,由電子報做母體、再拆做多平台分發,呢條路線好適合香港細市場。\n\n既然你已經諗緊預算同團隊層面,想約你同 Jimmy 本人傾 15 分鐘,針對你哋公司嘅場景出一份落地第一步建議。Club 企業席位亦可以一次過解答。\n\nAIGRO 團隊",
    },
    suggestedAction: "發出 Club 企業方案 + 預約 15 分鐘顧問傾談",
  },
  {
    id: "lead-002",
    anonId: "#A4760",
    name: "梁卓文",
    type: "進階會員",
    persona: "Jimmy Lau 分身",
    score: 92,
    signals: ["問公司導入", "問預約"],
    lastActivity: "今日 11:12",
    stage: "跟進中",
    questions: [
      { date: "昨日 16:05", text: "公司 20 人 marketing team 想導入 AI workflow,有冇顧問式支援?", persona: "Jimmy Lau 分身" },
      { date: "昨日 16:20", text: "可唔可以預約 Jimmy 本人傾下企業培訓?", persona: "Jimmy Lau 分身" },
      { date: "今日 11:12", text: "Club 企業席位係按人頭計定按公司計?", persona: "Jimmy Lau 分身" },
    ],
    analysis: {
      detected: ["明確團隊規模(20 人)", "主動要求預約真人", "問席位計費模式"],
      angle: "對企業導入有明確預算意圖 — 建議 Club 優先預約角度",
    },
    member: {
      email: "cheukman.leung@yahoo.com.hk",
      tier: "進階",
      joinedAt: "2025-12-15",
      mcpInterests: ["AI"],
    },
    timeline: [
      { date: "昨日 16:05", label: "與 Jimmy Lau 分身對話發生(9 則訊息)" },
      { date: "昨日 17:02", label: "已讀 — 開啟咗 Club 介紹頁兩次" },
      { date: "今日 09:30", label: "發出跟進 email(Club 企業席位)" },
      { date: "今日 11:15", label: "收到回覆 — 「想約下星期同 Jimmy 傾」" },
    ],
    emailDraft: {
      subject: "約實你 — Jimmy 企業培訓 15 分鐘快傾",
      body: "卓文你好,\n\n收到你嘅回覆,已經幫你 hold 咗下星期兩個時段同 Jimmy 快傾 15 分鐘,重點傾 20 人團隊嘅導入次序同 Club 企業席位計法。\n\n回覆呢封 email 揀個時間就可以。\n\nAIGRO 團隊",
    },
    suggestedAction: "確認預約時段,轉介 Jimmy 真人跟進",
  },
  {
    id: "lead-003",
    anonId: "#A4795",
    name: null,
    type: "訪客",
    persona: "Jimmy Lau 分身",
    score: 61,
    signals: ["問課程"],
    lastActivity: "昨日 18:41",
    stage: "已接觸",
    questions: [
      { date: "昨日 18:31", text: "語境工程同提示詞工程有咩分別?", persona: "Jimmy Lau 分身" },
      { date: "昨日 18:41", text: "有冇相關課程或者工作坊可以上?", persona: "Jimmy Lau 分身" },
    ],
    analysis: {
      detected: ["學習導向提問", "問及課程/工作坊"],
      angle: "一般學習需求 — 建議由免費情報訂閱切入,再推 Club 工作坊",
    },
    member: null,
    timeline: [
      { date: "昨日 18:31", label: "與 Jimmy Lau 分身對話發生(6 則訊息)" },
      { date: "今日 09:05", label: "發出跟進 email(語境工程文章 + 工作坊資訊)" },
    ],
    emailDraft: {
      subject: "語境工程入門 — Jimmy 嘅文章同工作坊時間表",
      body: "你好,\n\n你昨日問到語境工程同提示詞工程嘅分別,Jimmy 寫咗篇完整拆解「語境工程入門:香港企業嘅 AI 落地第一步」,另外每月 Club 都有一場實戰工作坊。\n\n附上連結,有問題隨時再傾。\n\nAIGRO 團隊",
    },
    suggestedAction: "發送語境工程文章 + Club 工作坊時間表",
  },
  {
    id: "lead-004",
    anonId: "#A4788",
    name: "陳家欣",
    type: "免費會員",
    persona: "平台編輯部",
    score: 47,
    signals: ["問課程"],
    lastActivity: "今日 12:04",
    stage: "已接觸",
    questions: [
      { date: "今日 11:48", text: "VIP 會員同進階會員有咩分別?", persona: "平台編輯部" },
      { date: "今日 12:04", text: "Beauty 行業有冇 AI 文案案例可以參考?", persona: "平台編輯部" },
    ],
    analysis: {
      detected: ["比較會員層級", "指定行業(Beauty)案例需求"],
      angle: "有升級潛力 — 建議以 Beauty 案例 + 進階會員權益切入",
    },
    member: {
      email: "kayan.chen@gmail.com",
      tier: "免費",
      joinedAt: "2026-07-08",
      mcpInterests: ["Beauty"],
    },
    timeline: [
      { date: "今日 11:48", label: "與平台編輯部對話發生(5 則訊息)" },
      { date: "今日 12:20", label: "發出跟進 email(Beauty 案例合集)" },
    ],
    emailDraft: {
      subject: "Beauty 行業 AI 案例合集 — 專屬你嘅行業情報",
      body: "家欣你好,\n\n你問到 Beauty 行業嘅 AI 文案案例,我哋整理咗三個香港本地案例,涵蓋產品文案、KOL brief 同社群內容。進階會員可以睇到完整拆解。\n\nAIGRO 團隊",
    },
    suggestedAction: "發送 Beauty 案例合集,附進階會員升級連結",
  },
  {
    id: "lead-005",
    anonId: "#A4803",
    name: null,
    type: "訪客",
    persona: "Elvin 分身",
    score: 55,
    signals: ["問課程"],
    lastActivity: "今日 09:58",
    stage: "新線索",
    questions: [
      { date: "今日 09:47", text: "Claude Code 同 Cursor 邊個適合非技術出身嘅人?", persona: "Elvin 分身" },
      { date: "今日 09:50", text: "咁學習曲線大概幾耐?", persona: "Elvin 分身" },
      { date: "今日 09:58", text: "有冇實測片可以跟住做?", persona: "Elvin 分身" },
    ],
    analysis: {
      detected: ["工具選型提問", "自學意願高(跟片實作)"],
      angle: "一般學習需求 — 建議推 Elvin 14 天上手日記,自然帶出 VIP 分身額度",
    },
    member: null,
    timeline: [
      { date: "今日 09:47", label: "與 Elvin 分身對話發生(12 則訊息)" },
      { date: "今日 10:01", label: "系統評分 55 — 歸類中意向線索" },
    ],
    emailDraft: {
      subject: "Elvin 嘅 14 天 Claude Code 上手日記",
      body: "你好,\n\n你問非技術出身點上手 Claude Code — Elvin 自己就係咁樣行過嚟,佢嘅「14 天上手日記」記錄咗每日 30 分鐘嘅實作路線。\n\n文章附喺下面,VIP 會員仲可以無限同 Elvin 分身跟進實作問題。\n\nAIGRO 團隊",
    },
    suggestedAction: "發送 Elvin 上手日記 + 免費會員註冊引導",
  },
  {
    id: "lead-006",
    anonId: "#A4688",
    name: null,
    type: "訪客",
    persona: "平台編輯部",
    score: 74,
    signals: ["問公司導入", "問價錢"],
    lastActivity: "昨日 15:30",
    stage: "新線索",
    questions: [
      { date: "昨日 15:12", text: "補習社想用 AI 批改,有冇本地案例參考?", persona: "平台編輯部" },
      { date: "昨日 15:19", text: "導入成本大概幾多?細規模補習社負擔到嗎?", persona: "平台編輯部" },
      { date: "昨日 15:30", text: "有冇人可以幫手評估我哋嘅流程?", persona: "平台編輯部" },
    ],
    analysis: {
      detected: ["具體行業場景(補習社批改)", "主動問成本", "要求評估支援"],
      angle: "中小企導入意圖明確 — 建議以補習社案例 + 免費流程評估切入",
    },
    member: null,
    timeline: [
      { date: "昨日 15:12", label: "與平台編輯部對話發生(10 則訊息)" },
      { date: "昨日 15:35", label: "系統評分 74 — 歸類高意向線索" },
    ],
    emailDraft: {
      subject: "補習社 AI 批改 — 案例拆解 + 免費流程評估",
      body: "你好,\n\n你問到補習社 AI 批改,平台案例庫收錄咗一間香港補習社嘅完整拆解:批改同個人化練習交俾 AI,導師時間放回教學,內容產出提升 2.4 倍。\n\n我哋可以為你做一次免費流程評估,睇下邊個環節最值得先導入。\n\nAIGRO 團隊",
    },
    suggestedAction: "發送補習社案例 + 提供免費流程評估",
  },
  {
    id: "lead-007",
    anonId: "#A4733",
    name: "吳詠琳",
    type: "免費會員",
    persona: "Elvin 分身",
    score: 34,
    signals: ["閒聊"],
    lastActivity: "今日 10:22",
    stage: "新線索",
    questions: [
      { date: "今日 10:11", text: "AI 會唔會取代 marketing 團隊?", persona: "Elvin 分身" },
      { date: "今日 10:18", text: "你係咪真人嚟㗎?", persona: "Elvin 分身" },
      { date: "今日 10:22", text: "香港邊間茶餐廳好食?", persona: "Elvin 分身" },
    ],
    analysis: {
      detected: ["話題發散", "無明確學習或商業意圖"],
      angle: "閒聊型互動 — 保持輕觸及,用每週情報電子報培養",
    },
    member: {
      email: "winglam.ng@gmail.com",
      tier: "免費",
      joinedAt: "2026-03-22",
      mcpInterests: [],
    },
    timeline: [
      { date: "今日 10:11", label: "與 Elvin 分身對話發生(6 則訊息)" },
      { date: "今日 10:25", label: "系統評分 34 — 歸類低意向線索" },
    ],
    emailDraft: {
      subject: "今週香港 AI 情報速遞",
      body: "詠琳你好,\n\n多謝你同 Elvin 分身傾計!今週香港 AI 圈有幾單值得留意嘅消息,整理咗喺呢封速遞入面。\n\n有咩想深入了解,隨時返嚟傾。\n\nAIGRO 團隊",
    },
    suggestedAction: "加入每週情報電子報名單,暫不主動跟進",
  },
  {
    id: "lead-008",
    anonId: "#A4654",
    name: null,
    type: "訪客",
    persona: "Elvin 分身",
    score: 66,
    signals: ["問課程"],
    lastActivity: "昨日 11:10",
    stage: "已接觸",
    questions: [
      { date: "昨日 10:58", text: "點樣用 MCP 將 AIGRO 情報接入我自己嘅 AI 工具?", persona: "Elvin 分身" },
      { date: "昨日 11:10", text: "AI 行業 server 幾時開放?有冇文件可以先睇?", persona: "Elvin 分身" },
    ],
    analysis: {
      detected: ["技術整合意圖(MCP)", "主動問開放時間同文件"],
      angle: "開發者型線索 — 建議推 MCP 優先名單登記 + Developers 頁",
    },
    member: null,
    timeline: [
      { date: "昨日 10:58", label: "與 Elvin 分身對話發生(5 則訊息)" },
      { date: "昨日 14:00", label: "發出跟進 email(MCP 優先名單登記連結)" },
    ],
    emailDraft: {
      subject: "AIGRO MCP 優先名單 — AI 行業 server 第一批開放",
      body: "你好,\n\n你問到點樣用 MCP 接入 AIGRO 情報 — AI 行業 server 會係第一批開放,依家喺 Developers 頁登記優先名單,開放時會第一時間通知,接入文件會一併提供。\n\nAIGRO 團隊",
    },
    suggestedAction: "確認已登記 MCP 優先名單,開放時優先通知",
  },
  {
    id: "lead-009",
    anonId: "#A4402",
    name: "黃子朗",
    type: "進階會員",
    persona: "Jimmy Lau 分身",
    score: 95,
    signals: ["問公司導入", "問預約", "問價錢"],
    lastActivity: "3 天前",
    stage: "已轉化",
    questions: [
      { date: "4 天前 14:02", text: "想幫公司成個 marketing team 導入 AI workflow", persona: "Jimmy Lau 分身" },
      { date: "4 天前 14:15", text: "Club 企業方案幾錢?包幾多個席位?", persona: "Jimmy Lau 分身" },
      { date: "4 天前 14:20", text: "可唔可以今個星期預約傾?", persona: "Jimmy Lau 分身" },
    ],
    analysis: {
      detected: ["三個高意向訊號齊發", "明確時間要求(今個星期)", "決策者身份"],
      angle: "已完成轉化 — 企業方案簽約,進入 Club 客戶成功流程",
    },
    member: {
      email: "tszlong.wong@outlook.com",
      tier: "VIP",
      joinedAt: "2025-11-02",
      mcpInterests: ["AI", "Technology"],
    },
    timeline: [
      { date: "4 天前 14:02", label: "與 Jimmy Lau 分身對話發生(11 則訊息)" },
      { date: "4 天前 15:10", label: "已讀 — 開啟 Club 企業方案頁" },
      { date: "4 天前 16:30", label: "發出跟進 email(企業方案 + 預約連結)" },
      { date: "3 天前 10:05", label: "收到回覆 — 確認預約" },
      { date: "3 天前 15:00", label: "完成顧問傾談 — 簽約 Club 企業席位" },
    ],
    emailDraft: {
      subject: "歡迎加入 AIGRO Club 企業方案",
      body: "子朗你好,\n\n多謝你同公司信任 AIGRO Club 企業方案。跟住落嚟客戶成功團隊會安排 onboarding,幫 20 人團隊分批上手。\n\n有任何問題隨時搵我哋。\n\nAIGRO 團隊",
    },
    suggestedAction: "已完成轉化 — 轉介客戶成功團隊 onboarding",
  },
  {
    id: "lead-010",
    anonId: "#A4590",
    name: null,
    type: "訪客",
    persona: "Jimmy Lau 分身",
    score: 28,
    signals: ["閒聊"],
    lastActivity: "2 天前",
    stage: "新線索",
    questions: [
      { date: "2 天前 20:14", text: "AI 會唔會取代 marketing 團隊?", persona: "Jimmy Lau 分身" },
      { date: "2 天前 20:22", text: "你答嘢咁快,係咪抄 Google?", persona: "Jimmy Lau 分身" },
    ],
    analysis: {
      detected: ["測試型提問", "無後續深入"],
      angle: "閒聊型互動 — 不主動跟進,靠內容自然回流",
    },
    member: null,
    timeline: [
      { date: "2 天前 20:14", label: "與 Jimmy Lau 分身對話發生(7 則訊息)" },
      { date: "2 天前 20:30", label: "系統評分 28 — 歸類低意向線索" },
    ],
    emailDraft: {
      subject: "AI 會唔會取代 marketing?Jimmy 嘅完整回答",
      body: "你好,\n\n你問 AI 會唔會取代 marketing 團隊 — Jimmy 嘅睇法係:識得用 AI 嘅 marketer 會取代唔識用嘅。完整論述喺平台情報區。\n\nAIGRO 團隊",
    },
    suggestedAction: "低意向 — 暫不跟進,觀察回流",
  },
  {
    id: "lead-011",
    anonId: "#A4543",
    name: null,
    type: "訪客",
    persona: "平台編輯部",
    score: 52,
    signals: ["閒聊", "問課程"],
    lastActivity: "2 天前",
    stage: "已接觸",
    questions: [
      { date: "2 天前 16:40", text: "GPT-5 對香港中小企有咩實際影響?", persona: "平台編輯部" },
      { date: "2 天前 16:55", text: "有冇啲入門級嘅情報可以訂閱?", persona: "平台編輯部" },
    ],
    analysis: {
      detected: ["時事型提問", "對訂閱有興趣"],
      angle: "內容消費型線索 — 建議引導訂閱免費情報,逐步培養",
    },
    member: null,
    timeline: [
      { date: "2 天前 16:40", label: "與平台編輯部對話發生(9 則訊息)" },
      { date: "昨日 09:00", label: "發出跟進 email(免費情報訂閱連結)" },
    ],
    emailDraft: {
      subject: "香港中小企 AI 情報 — 每週免費訂閱",
      body: "你好,\n\n你問到 GPT-5 對香港中小企嘅影響,呢類本地化分析我哋每週都會出。免費訂閱就可以收到。\n\nAIGRO 團隊",
    },
    suggestedAction: "已發訂閱連結 — 一週後檢查開信率再決定",
  },
  {
    id: "lead-012",
    anonId: "#A4621",
    name: "周穎怡",
    type: "進階會員",
    persona: "Elvin 分身",
    score: 81,
    signals: ["問預約", "問課程"],
    lastActivity: "今日 08:47",
    stage: "跟進中",
    questions: [
      { date: "昨日 21:03", text: "Elvin 有冇開實體 workshop?", persona: "Elvin 分身" },
      { date: "昨日 21:15", text: "想預約一對一,傾下我嘅 YouTube 頻道點用 AI 提速", persona: "Elvin 分身" },
      { date: "今日 08:47", text: "VIP 係咪可以無限問 Elvin 分身?", persona: "Elvin 分身" },
    ],
    analysis: {
      detected: ["主動要求一對一預約", "問 VIP 權益", "具體使用場景(YouTube 頻道)"],
      angle: "升級 VIP 意圖明確 — 建議以一對一預約 + VIP 無限分身角度促成",
    },
    member: {
      email: "wingyi.chow@gmail.com",
      tier: "進階",
      joinedAt: "2025-11-27",
      mcpInterests: ["AI"],
    },
    timeline: [
      { date: "昨日 21:03", label: "與 Elvin 分身對話發生(8 則訊息)" },
      { date: "昨日 21:40", label: "已讀 — 開啟 Pricing 頁" },
      { date: "今日 09:10", label: "發出跟進 email(VIP 升級 + 一對一預約選項)" },
    ],
    emailDraft: {
      subject: "幫你留咗位 — Elvin 一對一 + VIP 無限分身",
      body: "穎怡你好,\n\n你問到一對一預約同 VIP 權益:VIP 會員除咗無限同 Elvin 分身對話,每季仲有一次優先預約實體/視像一對一嘅名額,正好用嚟拆你嘅 YouTube 頻道提速方案。\n\n升級連結附喺下面。\n\nAIGRO 團隊",
    },
    suggestedAction: "跟進 VIP 升級進度,三日內未升級再提醒",
  },
  {
    id: "lead-013",
    anonId: "#A4501",
    name: null,
    type: "訪客",
    persona: "Elvin 分身",
    score: 44,
    signals: ["閒聊"],
    lastActivity: "3 天前",
    stage: "新線索",
    questions: [
      { date: "3 天前 13:26", text: "用 AI 做 YouTube 縮圖有咩 workflow 推介?", persona: "Elvin 分身" },
      { date: "3 天前 13:40", text: "Midjourney 而家月費幾多?", persona: "Elvin 分身" },
    ],
    analysis: {
      detected: ["單次工具提問", "無深入對話"],
      angle: "一般學習需求 — 推 Elvin 縮圖 workflow 實測片即可",
    },
    member: null,
    timeline: [
      { date: "3 天前 13:26", label: "與 Elvin 分身對話發生(11 則訊息)" },
      { date: "3 天前 13:45", label: "系統評分 44 — 歸類中意向線索" },
    ],
    emailDraft: {
      subject: "Elvin 嘅 AI 縮圖 workflow(實測片)",
      body: "你好,\n\n你問到 AI 縮圖 workflow — Elvin 拍咗條完整實測片:Midjourney 出構圖、生成填充執細節、最後手機尺寸檢查。連結附喺下面。\n\nAIGRO 團隊",
    },
    suggestedAction: "發送實測片連結,觀察是否回流",
  },
  {
    id: "lead-014",
    anonId: "#A4315",
    name: "李凱彤",
    type: "進階會員",
    persona: "平台編輯部",
    score: 77,
    signals: ["問價錢", "問公司導入"],
    lastActivity: "1 星期前",
    stage: "已轉化",
    questions: [
      { date: "1 星期前", text: "進階會員年費有冇優惠?", persona: "平台編輯部" },
      { date: "1 星期前", text: "公司想買 5 個席位有冇團隊折扣?", persona: "平台編輯部" },
    ],
    analysis: {
      detected: ["問團隊席位", "價格敏感但有明確購買意圖"],
      angle: "已完成轉化 — 5 席位團隊方案,按季檢視使用情況",
    },
    member: {
      email: "hoitung.lee@gmail.com",
      tier: "進階",
      joinedAt: "2026-01-19",
      mcpInterests: ["Technology"],
    },
    timeline: [
      { date: "1 星期前", label: "與平台編輯部對話發生(6 則訊息)" },
      { date: "1 星期前", label: "發出跟進 email(團隊席位報價)" },
      { date: "6 天前", label: "收到回覆 — 確認 5 席位" },
      { date: "5 天前", label: "完成付款 — 轉化為團隊方案" },
    ],
    emailDraft: {
      subject: "你嘅 5 席位團隊方案已生效",
      body: "凱彤你好,\n\n5 個席位已經全部開通,團隊成員用公司 email 註冊就會自動加入。按季我哋會出使用報告,睇下邊啲情報最有用。\n\nAIGRO 團隊",
    },
    suggestedAction: "已完成轉化 — 季度使用報告跟進",
  },
  {
    id: "lead-015",
    anonId: "#A4477",
    name: null,
    type: "訪客",
    persona: "平台編輯部",
    score: 58,
    signals: ["問價錢"],
    lastActivity: "3 天前",
    stage: "新線索",
    questions: [
      { date: "3 天前 09:02", text: "VIP 會員同進階會員有咩分別?", persona: "平台編輯部" },
      { date: "3 天前 09:10", text: "價錢係咪包晒所有分身?會唔會有額外收費?", persona: "平台編輯部" },
    ],
    analysis: {
      detected: ["比較層級", "關注收費透明度"],
      angle: "有付費意願但需消除疑慮 — 建議發送清晰收費表 + 7 日保證",
    },
    member: null,
    timeline: [
      { date: "3 天前 09:02", label: "與平台編輯部對話發生(3 則訊息)" },
      { date: "3 天前 09:15", label: "系統評分 58 — 歸類中意向線索" },
    ],
    emailDraft: {
      subject: "AIGRO 收費一覽 — 無隱藏收費",
      body: "你好,\n\n你問到收費透明度:VIP 月費已包晒全部專家分身無限對話、案例拆解全文同 Club 活動優先名額,無任何額外收費。附上完整比較表。\n\nAIGRO 團隊",
    },
    suggestedAction: "發送收費比較表,強調無隱藏收費",
  },
];
