/**
 * Admin mock data part 2 — v1.17 admin 360 擴充。
 * 新增資料一律放呢度,避免同 admin-mock.ts 衝突。
 * 涵蓋:專家 360 數據、會員↔專家活動 timeline、email 數據中心、專家投稿佇列。
 *
 * v1.20:會同其他 mock 重複嘅數字(KB chunks、分身對話、社交、MCP 名單、
 * 會員總數、情報投稿)一律改為由 canonical 來源衍生 — admin-mock.ts /
 * portal-mock.ts。Supabase 接入時,呢啲衍生位就係聚合 view 嘅種子。
 */
import {
  dashboardKpis,
  mcpVerticals,
  studioExperts,
} from "./admin-mock";
import {
  portalInsights,
  portalSocials,
  portalStats,
} from "./portal-mock";

/* ==================== A. Expert 360 ==================== */

/** 專家 slug → CRM persona 名(crmLeads.persona 過濾用) */
export const personaByExpertSlug: Record<string, string> = {
  "jimmy-lau": "Jimmy Lau 分身",
  "elvin-cheung": "Elvin 分身",
};

export interface ExpertStats {
  /** 分身對話總數 */
  convTotal: number;
  /** 本週對話 */
  convWeek: number;
  /** 平均信心分 0–100 */
  avgConfidence: number;
  /** 近 7 日對話量(舊 → 新) */
  weeklyBars: number[];
  /** 情報投稿:已發佈 / 總投稿 */
  insightsPublished: number;
  insightsSubmitted: number;
  /** 已連接社交平台 */
  social: { platform: string; handle: string; followers: string }[];
  /** 知識庫規模 */
  kbChunks: number;
  kbSizeMb: number;
}

/**
 * expertStatsBySlug 定義喺檔案底部(section D)— 全部由
 * portal-mock / admin-mock 衍生,避免同專家平台、工作室數字甩轆。
 */

export interface ExpertActivityEntry {
  /** mono 時間戳 */
  time: string;
  /** 創始會員 / 訪客 名稱 */
  actor: string;
  /** 活動描述(已含專家稱呼) */
  text: string;
  kind: "對話" | "里程碑" | "系統";
}

export const expertActivityBySlug: Record<string, ExpertActivityEntry[]> = {
  "jimmy-lau": [
    { time: "今日 11:12", actor: "梁卓文", text: "創始會員 梁卓文 問咗 Jimmy:「公司導入 AI 工具,第一步點行?」", kind: "對話" },
    { time: "今日 09:48", actor: "黃子朗", text: "創始會員 黃子朗 完成咗 3 次對話 — 主題:內容工場搭建", kind: "里程碑" },
    { time: "今日 08:15", actor: "系統", text: "分身信心分低於 70 嘅回答 1 則 — 已標記俾編輯部覆核", kind: "系統" },
    { time: "昨日 17:32", actor: "陳嘉怡", text: "創始會員 陳嘉怡 問咗 Jimmy:「Threads 起號頭 30 日點部署?」", kind: "對話" },
    { time: "昨日 16:05", actor: "梁卓文", text: "創始會員 梁卓文 連續第 5 日同 Jimmy 分身對話", kind: "里程碑" },
    { time: "昨日 11:20", actor: "吳日言", text: "創始會員 吳日言 儲存咗 Jimmy 嘅「語境工程」回答到筆記", kind: "對話" },
    { time: "2 天前 15:44", actor: "黃子朗", text: "創始會員 黃子朗 問咗 Jimmy:「電子報點樣拆做多平台分發?」", kind: "對話" },
    { time: "2 天前 09:02", actor: "系統", text: "知識庫完成每週蒸餾 — 新增 12 個 chunks", kind: "系統" },
  ],
  "elvin-cheung": [
    { time: "今日 10:26", actor: "林子聰", text: "創始會員 林子聰 問咗 Elvin:「Beauty 品牌點用 AI 做產品文案?」", kind: "對話" },
    { time: "今日 08:02", actor: "系統", text: "Elvin 分身 prompt v0.3 已生效 — 加強咗個案引用", kind: "系統" },
    { time: "昨日 19:14", actor: "何凱婷", text: "創始會員 何凱婷 完成咗 2 次對話 — 主題:中小企自動化", kind: "里程碑" },
    { time: "昨日 14:51", actor: "張曉彤", text: "創始會員 張曉彤 問咗 Elvin:「n8n 定 Make 適合香港細公司?」", kind: "對話" },
    { time: "昨日 10:33", actor: "林子聰", text: "創始會員 林子聰 將 Elvin 嘅回答分享咗去 Threads", kind: "對話" },
    { time: "2 天前 16:08", actor: "何凱婷", text: "創始會員 何凱婷 問咗 Elvin:「AI 客服落地有冇香港案例?」", kind: "對話" },
    { time: "3 天前 11:47", actor: "系統", text: "分身信心分低於 70 嘅回答 2 則 — 已標記俾編輯部覆核", kind: "系統" },
    { time: "3 天前 09:10", actor: "張曉彤", text: "創始會員 張曉彤 完成首次對話 — 由 Beauty MCP 名單轉入", kind: "里程碑" },
  ],
};

/* ==================== B. Email 數據中心 ==================== */

export type EmailSegment = "會員" | "MCP-AI" | "MCP-Beauty" | "MCP-Technology" | "Newsletter" | "專家通知";
export type EmailStatus = "active" | "unsubscribed";

export interface EmailContact {
  email: string;
  /** 來源 segment(可多重) */
  segments: EmailSegment[];
  /** 興趣標籤 */
  interest: string;
  joinedAt: string;
  status: EmailStatus;
}

/** Segment 總數 — 會員數同 MCP 名單由 admin-mock 衍生(單一來源) */
export const emailSegmentSummary = {
  members: dashboardKpis.totalMembers,
  mcpTotal: mcpVerticals.reduce((s, v) => s + v.waitlist, 0),
  mcp: mcpVerticals.map((v) => ({ label: v.label, count: v.waitlist })),
  newsletter: 2341,
  expertNotify: 96,
} as const;

export const emailEngagement = {
  openRate: "42%",
  clickRate: "9.6%",
} as const;

export const emailContacts: EmailContact[] = [
  { email: "cheukman.leung@yahoo.com.hk", segments: ["會員", "MCP-AI"], interest: "企業 AI 導入", joinedAt: "2025-12-15", status: "active" },
  { email: "tszlong.wong@outlook.com", segments: ["會員", "Newsletter"], interest: "內容工場", joinedAt: "2025-12-18", status: "active" },
  { email: "kayan.chen@gmail.com", segments: ["會員", "MCP-Beauty"], interest: "Beauty 文案", joinedAt: "2026-07-08", status: "active" },
  { email: "jason.lam@techbase.hk", segments: ["會員", "MCP-Technology", "Newsletter"], interest: "自動化 workflow", joinedAt: "2026-01-09", status: "active" },
  { email: "ting.ho@beautylab.hk", segments: ["MCP-Beauty", "Newsletter"], interest: "AI 客服", joinedAt: "2026-01-12", status: "active" },
  { email: "siuchung.lam@gmail.com", segments: ["MCP-Beauty", "專家通知"], interest: "Beauty 個案", joinedAt: "2026-01-15", status: "active" },
  { email: "hiutung.cheung@yahoo.com.hk", segments: ["MCP-Technology", "Newsletter"], interest: "n8n / Make", joinedAt: "2026-01-19", status: "unsubscribed" },
  { email: "yat.ng@gmail.com", segments: ["Newsletter"], interest: "AI 情報", joinedAt: "2026-01-22", status: "active" },
  { email: "mandy.choi@mediaco.hk", segments: ["會員", "MCP-AI", "專家通知"], interest: "Threads 起號", joinedAt: "2026-01-25", status: "active" },
  { email: "kelvin.tsang@fintech.hk", segments: ["MCP-Technology"], interest: "金融科技 AI", joinedAt: "2026-01-28", status: "active" },
  { email: "winnie.lau@beautyhk.com", segments: ["MCP-Beauty", "Newsletter"], interest: "品牌文案", joinedAt: "2026-02-01", status: "active" },
  { email: "derek.fan@startup.io", segments: ["MCP-AI", "Newsletter"], interest: "語境工程", joinedAt: "2026-02-03", status: "unsubscribed" },
  { email: "grace.yim@retail.hk", segments: ["會員", "Newsletter", "專家通知"], interest: "零售 AI 案例", joinedAt: "2026-02-06", status: "active" },
  { email: "patrick.kwan@agency.hk", segments: ["MCP-AI"], interest: "Agency 轉型", joinedAt: "2026-02-08", status: "active" },
];

/* ==================== C. 專家投稿佇列 ==================== */

export type SubmissionStatus = "待審核" | "已核准" | "已退回" | "已下架";

export interface ExpertSubmission {
  id: string;
  title: string;
  summary: string;
  expert: string;
  expertSlug: string;
  submittedAt: string;
  status: SubmissionStatus;
  /** 退回原因(已退回先會有) */
  note?: string;
}

export const expertSubmissions: ExpertSubmission[] = [
  {
    id: "sub-001",
    title: "語境工程實戰:一間香港 agency 嘅 90 日轉型記錄",
    summary: "由 prompt 堆砌到語境系統 — 記錄團隊點樣將 AI 由「玩具」變成交付流程核心。",
    expert: "Jimmy Lau 劉泰麟",
    expertSlug: "jimmy-lau",
    submittedAt: "2026-02-10",
    status: "待審核",
  },
  {
    id: "sub-002",
    title: "Threads 演算法拆解:點解 2026 年仲係香港起號紅利期",
    summary: "用 3 個帳號 60 日數據,拆解 Threads 分發邏輯同內容工場嘅配合位。",
    expert: "Jimmy Lau 劉泰麟",
    expertSlug: "jimmy-lau",
    submittedAt: "2026-02-09",
    status: "待審核",
  },
  {
    id: "sub-003",
    title: "Beauty 品牌 AI 文案:由 brief 到上架只要 2 個鐘",
    summary: "一個香港本地美妝品牌點樣用 AI 分身將新品文案流程由 3 日壓縮到 2 小時。",
    expert: "Elvin Cheung",
    expertSlug: "elvin-cheung",
    submittedAt: "2026-02-08",
    status: "待審核",
  },
];

/** 首頁「編輯精選」顯示配額 */
export const homepageQuota = {
  used: 2,
  total: 2,
} as const;

/** 情報佇列 — 首頁顯示位置選項 */
export type QueuePlacement = "首頁" | "日報" | "普通";
export const queuePlacements: QueuePlacement[] = ["首頁", "日報", "普通"];

/* ==================== D. Expert 360 派生聚合 ====================
 * Admin「數據 Data」tab 嘅所有數字由 canonical mock 衍生:
 *   - 分身對話 / 信心 / 7 日趨勢 → portal-mock.portalStats(同 /portal 總覽一致)
 *   - 社交觸及 → portal-mock.portalSocials(只計已連接,handle 同 experts.ts 一致)
 *   - 知識庫片段 → admin-mock.studioExperts(同 AdminStudio 一致)
 *   - 情報已發佈 / 投稿 → portal-mock.portalInsights + 本檔 expertSubmissions
 * Supabase 接入:呢段換做 `admin_expert_360` 聚合 view,consumer 唔使改。
 */

const DAY_ORDER = ["一", "二", "三", "四", "五", "六", "日"] as const;

/** 知識庫容量(MB)— admin 獨有展示數字,無其他來源 */
const KB_SIZE_MB: Record<string, number> = {
  "jimmy-lau": 18.6,
  "elvin-cheung": 7.4,
};

function deriveExpertStats(slug: string): ExpertStats {
  const stats = portalStats[slug];
  const trendByLabel = new Map(
    (stats?.weeklyTrend ?? []).map((t) => [t.label, t.count])
  );
  const insights = portalInsights[slug] ?? [];
  const published = insights.filter((i) => i.status === "已發佈").length;
  const pendingSubs = expertSubmissions.filter(
    (s) => s.expertSlug === slug && s.status === "待審核"
  ).length;
  return {
    convTotal: stats?.totalChats ?? 0,
    convWeek: stats?.weekChats ?? 0,
    avgConfidence: Math.round((stats?.avgConfidence ?? 0) * 100),
    weeklyBars: DAY_ORDER.map((d) => trendByLabel.get(d) ?? 0),
    insightsPublished: published,
    insightsSubmitted: insights.length + pendingSubs,
    social: (portalSocials[slug] ?? [])
      .filter((s) => s.connected)
      .map((s) => ({
        platform: s.platform,
        handle: s.handle ?? "",
        followers: s.reach ?? "—",
      })),
    kbChunks:
      studioExperts.find((e) => e.slug === slug)?.kbChunks ?? 0,
    kbSizeMb: KB_SIZE_MB[slug] ?? 0,
  };
}

export const expertStatsBySlug: Record<string, ExpertStats> = {
  "jimmy-lau": deriveExpertStats("jimmy-lau"),
  "elvin-cheung": deriveExpertStats("elvin-cheung"),
};


/* ==================== E. Sources + MCP 管理(fix-23) ==================== */

/* ---- Pipeline 狀態 ---- */

export type PipelineHealth = "ok" | "warn";

export interface PipelineStep {
  key: string;
  zh: string;
  en: string;
  /** 步驟摘要行(每步自定義) */
  detail: string;
  status: PipelineHealth;
}

export const pipelineStatus: PipelineStep[] = [
  {
    key: "sources",
    zh: "來源",
    en: "Sources",
    detail: "12 個啟用 · 2 個待驗證",
    status: "ok",
  },
  {
    key: "fetch",
    zh: "抓取",
    en: "Fetch",
    detail: "cron */2h · 最後 14:00",
    status: "ok",
  },
  {
    key: "enrich",
    zh: "蒸餾",
    en: "Enrich",
    detail: "翻譯 / 分類 / 評分 · 3 條排隊",
    status: "warn",
  },
  {
    key: "output",
    zh: "輸出",
    en: "Output",
    detail: "Feed + 日報 + MCP",
    status: "ok",
  },
];

/* ---- 來源管理 ---- */

export type SourceType = "RSS" | "API" | "Scraper";
export type SourceStatus = "active" | "paused" | "待驗證";
export type SourceHealth = "ok" | "warn" | "down";

export interface Source {
  id: string;
  name: string;
  domain: string;
  type: SourceType;
  industry: string;
  language: string;
  /** 權重 1–10,評分加權用 */
  weight: number;
  status: SourceStatus;
  health: SourceHealth;
  lastFetch: string;
  todayItems: number;
  /** 更新頻率(顯示用) */
  frequency: string;
  /** 最近 7 次抓取健康(1 = ok, 0.5 = warn, 0 = fail),舊 → 新 */
  healthHistory: number[];
}

export const sources: Source[] = [
  {
    id: "src-01",
    name: "OpenAI Blog",
    domain: "openai.com/blog",
    type: "RSS",
    industry: "AI",
    language: "EN",
    weight: 9,
    status: "active",
    health: "ok",
    lastFetch: "今日 14:00",
    todayItems: 3,
    frequency: "每 2 小時",
    healthHistory: [1, 1, 1, 1, 1, 1, 1],
  },
  {
    id: "src-02",
    name: "Anthropic News",
    domain: "anthropic.com/news",
    type: "RSS",
    industry: "AI",
    language: "EN",
    weight: 9,
    status: "active",
    health: "ok",
    lastFetch: "今日 14:00",
    todayItems: 1,
    frequency: "每 2 小時",
    healthHistory: [1, 1, 1, 0.5, 1, 1, 1],
  },
  {
    id: "src-03",
    name: "Google DeepMind",
    domain: "deepmind.google/blog",
    type: "RSS",
    industry: "AI",
    language: "EN",
    weight: 8,
    status: "active",
    health: "ok",
    lastFetch: "今日 14:00",
    todayItems: 2,
    frequency: "每 2 小時",
    healthHistory: [1, 1, 1, 1, 1, 1, 1],
  },
  {
    id: "src-04",
    name: "HuggingFace Papers",
    domain: "huggingface.co/papers",
    type: "API",
    industry: "AI",
    language: "EN",
    weight: 7,
    status: "active",
    health: "ok",
    lastFetch: "今日 14:00",
    todayItems: 6,
    frequency: "每 4 小時",
    healthHistory: [1, 1, 0.5, 1, 1, 1, 1],
  },
  {
    id: "src-05",
    name: "TechCrunch AI",
    domain: "techcrunch.com/ai",
    type: "RSS",
    industry: "AI",
    language: "EN",
    weight: 6,
    status: "active",
    health: "ok",
    lastFetch: "今日 14:00",
    todayItems: 4,
    frequency: "每 2 小時",
    healthHistory: [1, 1, 1, 1, 0.5, 1, 1],
  },
  {
    id: "src-06",
    name: "The Decoder",
    domain: "the-decoder.com",
    type: "RSS",
    industry: "AI",
    language: "EN",
    weight: 6,
    status: "active",
    health: "warn",
    lastFetch: "今日 12:00",
    todayItems: 2,
    frequency: "每 4 小時",
    healthHistory: [1, 1, 0.5, 1, 1, 0.5, 0.5],
  },
  {
    id: "src-07",
    name: "36氪",
    domain: "36kr.com",
    type: "RSS",
    industry: "科技",
    language: "簡中",
    weight: 7,
    status: "active",
    health: "ok",
    lastFetch: "今日 14:00",
    todayItems: 5,
    frequency: "每 2 小時",
    healthHistory: [1, 1, 1, 1, 1, 1, 1],
  },
  {
    id: "src-08",
    name: "量子位",
    domain: "qbitai.com",
    type: "RSS",
    industry: "AI",
    language: "簡中",
    weight: 8,
    status: "active",
    health: "ok",
    lastFetch: "今日 14:00",
    todayItems: 4,
    frequency: "每 2 小時",
    healthHistory: [1, 1, 1, 1, 1, 0.5, 1],
  },
  {
    id: "src-09",
    name: "數字生命卡茲克",
    domain: "mp.weixin.qq.com",
    type: "Scraper",
    industry: "AI",
    language: "簡中",
    weight: 8,
    status: "active",
    health: "warn",
    lastFetch: "今日 09:30",
    todayItems: 1,
    frequency: "每日 2 次",
    healthHistory: [1, 0.5, 1, 1, 0.5, 1, 0.5],
  },
  {
    id: "src-10",
    name: "IT之家",
    domain: "ithome.com",
    type: "RSS",
    industry: "科技",
    language: "簡中",
    weight: 5,
    status: "active",
    health: "ok",
    lastFetch: "今日 14:00",
    todayItems: 7,
    frequency: "每 2 小時",
    healthHistory: [1, 1, 1, 1, 1, 1, 1],
  },
  {
    id: "src-11",
    name: "Hacker News 熱門",
    domain: "news.ycombinator.com",
    type: "API",
    industry: "科技",
    language: "EN",
    weight: 6,
    status: "active",
    health: "ok",
    lastFetch: "今日 14:00",
    todayItems: 5,
    frequency: "每小時",
    healthHistory: [1, 1, 1, 1, 1, 1, 1],
  },
  {
    id: "src-12",
    name: "X 精選帳號",
    domain: "x.com · TikHub",
    type: "API",
    industry: "AI",
    language: "EN",
    weight: 7,
    status: "paused",
    health: "down",
    lastFetch: "昨日 22:10",
    todayItems: 0,
    frequency: "每小時",
    healthHistory: [1, 1, 0.5, 0, 0, 0.5, 0],
  },
];

/* ---- 每個來源最近抓取 items ---- */

export interface SourceItem {
  id: string;
  title: string;
  /** 蒸餾評分 0–100 */
  score: number;
  time: string;
}

export const sourceItems: Record<string, SourceItem[]> = {
  "src-01": [
    { id: "i-01a", title: "GPT-5.1 發佈:推理速度提升 40%,API 再減價 25%", score: 94, time: "今日 08:14" },
    { id: "i-01b", title: "OpenAI for Business:企業版新增私有部署選項", score: 81, time: "昨日 16:40" },
    { id: "i-01c", title: "ChatGPT 新記憶功能向全部付費用戶開放", score: 72, time: "2 天前 09:02" },
    { id: "i-01d", title: "Sora 2 企業 API 開始 invite-only 測試", score: 88, time: "3 天前 11:26" },
    { id: "i-01e", title: "OpenAI 安全框架更新:生物風險評估新標準", score: 55, time: "4 天前 15:44" },
  ],
  "src-02": [
    { id: "i-02a", title: "Claude for Sheets:試算表內直接叫 AI 批量處理", score: 89, time: "昨日 18:07" },
    { id: "i-02b", title: "Claude Sonnet 4.6:編碼 benchmark 再超車", score: 92, time: "2 天前 08:31" },
    { id: "i-02c", title: "Anthropic 公佈 MCP 1.1 規範草案", score: 85, time: "3 天前 13:58" },
    { id: "i-02d", title: "Constitutional AI 研究更新:可解釋性新進展", score: 61, time: "5 天前 10:12" },
    { id: "i-02e", title: "Claude Code 新增背景 agent 模式", score: 90, time: "6 天前 09:47" },
  ],
  "src-03": [
    { id: "i-03a", title: "Google Veo 4 開放企業 API,支援 4K 60s 生成", score: 91, time: "今日 07:52" },
    { id: "i-03b", title: "Gemini 3 Pro 長上下文實測報告(官方)", score: 83, time: "昨日 14:20" },
    { id: "i-03c", title: "AlphaFold 4 擴展至小分子藥物篩選", score: 68, time: "3 天前 09:15" },
    { id: "i-03d", title: "Gemini CLI 開源:terminal 原生 agent", score: 87, time: "4 天前 17:33" },
    { id: "i-03e", title: "DeepMind 公佈 AI 能源消耗白皮書", score: 52, time: "6 天前 12:05" },
  ],
  "src-04": [
    { id: "i-04a", title: "Paper:小模型蒸餾新方法,7B 達 70B 九成表現", score: 86, time: "今日 10:02" },
    { id: "i-04b", title: "Paper:粵語語音辨識新 benchmark 發佈", score: 79, time: "今日 06:18" },
    { id: "i-04c", title: "Trending:Qwen4-VL 開源,多模態榜登頂", score: 93, time: "昨日 20:41" },
    { id: "i-04d", title: "Paper:Agent 規劃失敗模式分類研究", score: 74, time: "2 天前 15:27" },
    { id: "i-04e", title: "Trending:本地 1.5B 模型手機離線跑 GPT-4 級翻譯", score: 82, time: "3 天前 08:52" },
  ],
  "src-05": [
    { id: "i-05a", title: "Perplexity 推出香港地區即時搜尋加強", score: 84, time: "昨日 15:44" },
    { id: "i-05b", title: "AI 編碼工具市場估值一年翻三倍", score: 66, time: "2 天前 11:09" },
    { id: "i-05c", title: "Meta 超級智能實驗室挖角潮持續", score: 58, time: "3 天前 14:36" },
    { id: "i-05d", title: "歐盟 AI Act 首批合規名單公佈", score: 63, time: "4 天前 10:48" },
    { id: "i-05e", title: "Figure 03 人形機器人進入物流倉實測", score: 71, time: "5 天前 16:22" },
  ],
  "src-06": [
    { id: "i-06a", title: "Mistral Large 3 發佈:歐洲最強開源模型", score: 78, time: "今日 12:00" },
    { id: "i-06b", title: "分析:開源模型與閉源差距縮窄至 3 個月", score: 80, time: "昨日 09:14" },
    { id: "i-06c", title: "Runway Gen-5 正式開放 API 計費", score: 85, time: "2 天前 18:30" },
    { id: "i-06d", title: "AI 生成內容標記:C2PA 採用率調查", score: 49, time: "4 天前 13:07" },
    { id: "i-06e", title: "德國企業 AI 採用率首次超過美國", score: 57, time: "6 天前 11:51" },
  ],
  "src-07": [
    { id: "i-07a", title: "字節豆包 2.0 發佈:多模態能力全面升級", score: 82, time: "今日 11:36" },
    { id: "i-07b", title: "阿里雲 AI 收入連續六季三位數增長", score: 64, time: "昨日 16:58" },
    { id: "i-07c", title: "月之暗面 Kimi K3 開源,長文本再突破", score: 90, time: "2 天前 09:41" },
    { id: "i-07d", title: "AI 眼鏡出貨量按年增 240%", score: 59, time: "3 天前 14:12" },
    { id: "i-07e", title: "Manus 母公司完成新一輪融資", score: 67, time: "5 天前 10:33" },
  ],
  "src-08": [
    { id: "i-08a", title: "DeepSeek V4 實測:推理成本再降一半", score: 95, time: "今日 09:47" },
    { id: "i-08b", title: "專訪智譜:Agent 落地一年後嘅真實數據", score: 77, time: "昨日 13:25" },
    { id: "i-08c", title: "國產 AI 晶片出貨量首次過百萬", score: 62, time: "2 天前 16:08" },
    { id: "i-08d", title: "Qwen4 微調生態爆發:社群模型破 10 萬", score: 83, time: "3 天前 08:59" },
    { id: "i-08e", title: "AI 陪伴 App 監管新規徵求意見", score: 56, time: "5 天前 15:19" },
  ],
  "src-09": [
    { id: "i-09a", title: "卡茲克:我點樣用 Claude Code 一星期做三個產品", score: 88, time: "今日 09:30" },
    { id: "i-09b", title: "AI 寫作工具橫評:邊個先係內容工場之王", score: 81, time: "2 天前 08:44" },
    { id: "i-09c", title: "數字生命觀察:分身經濟嘅三個階段", score: 86, time: "4 天前 21:17" },
    { id: "i-09d", title: "實測:用 MCP 串起我嘅全部 AI 工具", score: 91, time: "6 天前 10:26" },
    { id: "i-09e", title: "Vibe coding 一個月後,我改變咗睇法", score: 79, time: "8 天前 19:52" },
  ],
  "src-10": [
    { id: "i-10a", title: "英偉達 RTX 60 系列發佈,AI 算力翻倍", score: 65, time: "今日 12:48" },
    { id: "i-10b", title: "微信接入元寶 AI 搜索全量開放", score: 76, time: "今日 08:03" },
    { id: "i-10c", title: "鴻蒙 NEXT 開發者大會:AI 子系統詳解", score: 60, time: "昨日 17:29" },
    { id: "i-10d", title: "小米 SU8 搭載端側大模型,離線語音助手", score: 54, time: "2 天前 11:47" },
    { id: "i-10e", title: "國產摺疊屏出貨量創新高", score: 41, time: "3 天前 15:36" },
  ],
  "src-11": [
    { id: "i-11a", title: "Show HN:一個 prompt 生成完整 MCP server", score: 87, time: "今日 13:12" },
    { id: "i-11b", title: "AI agent 嘅 context window 管理實踐(長文)", score: 84, time: "今日 07:31" },
    { id: "i-11c", title: "Postgres 18 加入原生向量索引", score: 73, time: "昨日 22:05" },
    { id: "i-11d", title: "點解大公司嘅 AI 落地普遍失敗(HN 熱議)", score: 89, time: "2 天前 19:44" },
    { id: "i-11e", title: "SQLite 作者談 AI 輔助編碼嘅界限", score: 70, time: "4 天前 14:18" },
  ],
  "src-12": [
    { id: "i-12a", title: "@karpathy:LLM 係新一種電腦,唔係 chatbot", score: 92, time: "昨日 22:10" },
    { id: "i-12b", title: "@sama:下一個模型會令好多人跌眼鏡", score: 75, time: "2 天前 18:37" },
    { id: "i-12c", title: "@ylecun:自回歸唔係通往 AGI 嘅路", score: 68, time: "3 天前 09:26" },
    { id: "i-12d", title: "@dotey:AI 工具鏈每週精選(12 款)", score: 80, time: "4 天前 12:54" },
    { id: "i-12e", title: "@bindureddy:開源 agent 框架橫評", score: 71, time: "5 天前 16:41" },
  ],
};

/* ---- MCP instances ---- */

export interface McpTool {
  name: string;
  desc: string;
}

export interface McpInstance {
  id: string;
  name: string;
  /** 封裝中 / 規劃中 */
  phase: string;
  endpoint: string;
  enabled: boolean;
  /** 免費額度 tokens/日 */
  freeQuota: number;
  tools: McpTool[];
  /** 最近 7 日調用數,舊 → 新 */
  weeklyCalls: number[];
  /** 規劃中 = greyed,唔可操作 */
  planned: boolean;
}

export const mcpInstances: McpInstance[] = [
  {
    id: "mcp-ai",
    name: "ai-insights MCP",
    phase: "封裝中",
    endpoint: "mcp-ai.aigro.hk/mcp",
    enabled: true,
    freeQuota: 6551,
    tools: [
      { name: "search_news", desc: "關鍵字搜尋全部情報" },
      { name: "get_hot", desc: "今日熱門情報 top N" },
      { name: "get_insight", desc: "單條情報全文 + 香港視角" },
      { name: "get_sources", desc: "來源清單與狀態" },
    ],
    weeklyCalls: [42, 58, 51, 76, 89, 64, 97],
    planned: false,
  },
  {
    id: "mcp-beauty",
    name: "beauty-insights MCP",
    phase: "規劃中",
    endpoint: "mcp-beauty.aigro.hk/mcp",
    enabled: false,
    freeQuota: 6551,
    tools: [
      { name: "search_news", desc: "美業情報搜尋" },
      { name: "get_hot", desc: "美業熱門 top N" },
    ],
    weeklyCalls: [0, 0, 0, 0, 0, 0, 0],
    planned: true,
  },
];
