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
