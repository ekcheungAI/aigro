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
