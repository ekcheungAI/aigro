/**
 * Expert Portal mock data — 專家平台(/portal)前端原型專用。
 * 全部按 expert slug scoped(Supabase 接入後由 RLS 查詢取代)。
 * 涵蓋:對話統計、最近對話、情報(max 3 規則)、社交連結、檔案預設。
 */

/* ---------------- 對話統計(總覽) ---------------- */

export interface PortalStats {
  /** 累計對話 */
  totalChats: number;
  /** 本週對話 */
  weekChats: number;
  /** 平均信心 0–1 */
  avgConfidence: number;
  /** 知識庫片段 */
  kbChunks: number;
  /** 7 日對話趨勢(舊 → 新,hairline bars) */
  weeklyTrend: { label: string; count: number }[];
}

export const portalStats: Record<string, PortalStats> = {
  "jimmy-lau": {
    totalChats: 1847,
    weekChats: 126,
    avgConfidence: 0.83,
    kbChunks: 1284,
    weeklyTrend: [
      { label: "四", count: 15 },
      { label: "五", count: 19 },
      { label: "六", count: 11 },
      { label: "日", count: 14 },
      { label: "一", count: 22 },
      { label: "二", count: 18 },
      { label: "三", count: 27 },
    ],
  },
  "elvin-cheung": {
    totalChats: 1293,
    weekChats: 98,
    avgConfidence: 0.86,
    kbChunks: 968,
    weeklyTrend: [
      { label: "四", count: 12 },
      { label: "五", count: 16 },
      { label: "六", count: 9 },
      { label: "日", count: 10 },
      { label: "一", count: 17 },
      { label: "二", count: 15 },
      { label: "三", count: 19 },
    ],
  },
};

/* ---------------- 最近對話(總覽 5 條) ---------------- */

export interface PortalConversation {
  id: string;
  /** 訪客匿名 ID */
  anonId: string;
  /** 訪客第一條問題 */
  firstQuestion: string;
  date: string;
  /** 該對話平均信心 0–1 */
  confidence: number;
}

export const portalRecentConversations: Record<string, PortalConversation[]> = {
  "jimmy-lau": [
    {
      id: "pc-j1",
      anonId: "#A4821",
      firstQuestion: "我哋公司想做 AI 內容工場,第一步應該點行?",
      date: "今日 14:22",
      confidence: 0.87,
    },
    {
      id: "pc-j2",
      anonId: "#A4795",
      firstQuestion: "語境工程同提示詞工程有咩分別?",
      date: "昨日 18:31",
      confidence: 0.93,
    },
    {
      id: "pc-j3",
      anonId: "#A4590",
      firstQuestion: "AI 會唔會取代 marketing 團隊?",
      date: "2 天前 20:14",
      confidence: 0.89,
    },
    {
      id: "pc-j4",
      anonId: "#A4512",
      firstQuestion: "細公司冇預算請 agency,自己用 AI 做品牌得唔得?",
      date: "3 天前 11:05",
      confidence: 0.81,
    },
    {
      id: "pc-j5",
      anonId: "#A4468",
      firstQuestion: "Threads 嘅內容可以點樣一次生產、多平台分發?",
      date: "4 天前 16:47",
      confidence: 0.78,
    },
  ],
  "elvin-cheung": [
    {
      id: "pc-e1",
      anonId: "#A4803",
      firstQuestion: "Claude Code 同 Cursor 邊個適合非技術出身嘅人?",
      date: "今日 09:47",
      confidence: 0.91,
    },
    {
      id: "pc-e2",
      anonId: "#A4654",
      firstQuestion: "點樣用 MCP 將 AIGRO 情報接入我自己嘅 AI 工具?",
      date: "昨日 10:58",
      confidence: 0.55,
    },
    {
      id: "pc-e3",
      anonId: "#A4501",
      firstQuestion: "用 AI 做 YouTube 縮圖有咩 workflow 推介?",
      date: "3 天前 13:26",
      confidence: 0.86,
    },
    {
      id: "pc-e4",
      anonId: "#A4470",
      firstQuestion: "n8n 定 Make 適合香港小團隊做自動化?",
      date: "3 天前 21:12",
      confidence: 0.88,
    },
    {
      id: "pc-e5",
      anonId: "#A4399",
      firstQuestion: "Vibe coding 做出嚟嘅嘢點樣由 demo 變產品?",
      date: "5 天前 15:33",
      confidence: 0.84,
    },
  ],
};

/* ---------------- 我的情報(max 3 規則) ---------------- */

export type PortalInsightStatus = "已發佈" | "待審核" | "已下架";

export interface PortalInsight {
  id: string;
  title: string;
  /** 摘要 */
  summary: string;
  /** 香港視角 */
  hkAngle: string;
  /** 原文連結 */
  sourceUrl: string;
  date: string;
  status: PortalInsightStatus;
  /** 瀏覽數(mock) */
  views: number;
}

/** 每週情報上限 — 保持質量密度 */
export const PORTAL_INSIGHT_QUOTA = 3;

export const portalInsights: Record<string, PortalInsight[]> = {
  "jimmy-lau": [
    {
      id: "pi-j1",
      title: "OpenAI 發佈 GPT-5 統一模型",
      summary:
        "寫作、分析、編碼統一入口 — 模型選擇焦慮正式終結,工具整合商嘅價值重新洗牌。",
      hkAngle:
        "香港中小企唔使再煩「揀邊個模型」— 一個入口處理晒客服同內容工序,導入門檻再降一級;但數據私隱條款要睇清楚,客戶資料出境仲係紅線。",
      sourceUrl: "https://openai.com",
      date: "2026-07-21",
      status: "已發佈",
      views: 1204,
    },
    {
      id: "pi-j2",
      title: "Meta 開源 Llama 4 多模態版本",
      summary:
        "開源多模態入場,圖文混合理解成本大降 — 品牌內容工場嘅自建路線正式可行。",
      hkAngle:
        "對香港品牌团队係好消息:唔使再逐張圖俾 API 錢,本地部署仲過到私隱關 — 但記住開源唔等於免維護,技術債照計。",
      sourceUrl: "https://ai.meta.com",
      date: "2026-07-14",
      status: "已發佈",
      views: 876,
    },
  ],
  "elvin-cheung": [
    {
      id: "pi-e1",
      title: "Anthropic 開放 Claude Agent SDK",
      summary:
        "官方 Agent 框架落地 — 由 prompt 堆砌走向正式工程化,workflow 搭建方式改寫。",
      hkAngle:
        "香港 builders 可以少寫好多膠水代碼 — 但記住 demo 唔等於 production,權限同成本控制仲要自己把關,我會出實測片拆解。",
      sourceUrl: "https://anthropic.com",
      date: "2026-07-19",
      status: "已發佈",
      views: 1532,
    },
    {
      id: "pi-e2",
      title: "Google Veo 4 開放 API 預覽",
      summary:
        "影片生成 API 化 — 縮圖到短片嘅全 AI 影像 pipeline 最後一塊拼圖到位。",
      hkAngle:
        "廣東話內容係差異化武器 — API 一出,粵語短片產能係香港創作者嘅時間窗,早三個月入場同遲三個月係兩個世界。",
      sourceUrl: "https://deepmind.google",
      date: "2026-07-12",
      status: "待審核",
      views: 0,
    },
  ],
};

/* ---------------- 社交連結 ---------------- */

export type PortalPlatform =
  | "YouTube"
  | "Instagram"
  | "X"
  | "Threads"
  | "LinkedIn"
  | "Podcast";

export interface PortalSocial {
  platform: PortalPlatform;
  /** 已連接 */
  connected: boolean;
  /** 帳號 handle(已連接先有) */
  handle?: string;
  /** 觸及標籤,如「12.4K 訂閱」 */
  reach?: string;
  /** 訂閱/追蹤數(數據卡 Plex Mono) */
  subscribers?: number;
  /** 30 日增長(hairline bars,舊 → 新) */
  growth30d?: number[];
  /** 同步狀態 */
  syncNote?: string;
}

export const portalSocials: Record<string, PortalSocial[]> = {
  "jimmy-lau": [
    {
      platform: "YouTube",
      connected: true,
      handle: "@DotAI香港",
      reach: "12.4K 訂閱",
      subscribers: 12400,
      growth30d: [42, 58, 51, 66, 74, 69, 88, 96, 91, 108, 121, 134],
      syncNote: "每 6 小時更新",
    },
    {
      platform: "Instagram",
      connected: false,
    },
    {
      platform: "X",
      connected: false,
    },
    {
      platform: "Threads",
      connected: true,
      handle: "@jimmylau.ai",
      reach: "8.2K 追蹤",
      subscribers: 8200,
      growth30d: [61, 74, 69, 82, 95, 88, 102, 118, 109, 126, 141, 152],
      syncNote: "每 6 小時更新",
    },
    {
      platform: "LinkedIn",
      connected: true,
      handle: "jimmy-lau-hk",
      reach: "5.6K 追蹤",
      subscribers: 5600,
      growth30d: [18, 22, 19, 27, 24, 31, 29, 36, 33, 41, 38, 45],
      syncNote: "每 6 小時更新",
    },
    {
      platform: "Podcast",
      connected: false,
    },
  ],
  "elvin-cheung": [
    {
      platform: "YouTube",
      connected: true,
      handle: "@ekcheungAI",
      reach: "48.7K 訂閱",
      subscribers: 48700,
      growth30d: [182, 214, 196, 248, 271, 255, 302, 336, 318, 364, 391, 428],
      syncNote: "每 6 小時更新",
    },
    {
      platform: "Instagram",
      connected: true,
      handle: "@ekcheungAI",
      reach: "22.1K 追蹤",
      subscribers: 22100,
      growth30d: [96, 118, 104, 132, 149, 138, 165, 181, 172, 198, 214, 236],
      syncNote: "每 6 小時更新",
    },
    {
      platform: "X",
      connected: true,
      handle: "@ekcheungAI",
      reach: "15.8K 追蹤",
      subscribers: 15800,
      growth30d: [54, 63, 58, 71, 66, 79, 85, 78, 92, 88, 101, 97],
      syncNote: "每 6 小時更新",
    },
    {
      platform: "Threads",
      connected: true,
      handle: "@ekcheungai",
      reach: "9.4K 追蹤",
      subscribers: 9400,
      growth30d: [38, 44, 41, 52, 48, 59, 55, 66, 62, 74, 71, 83],
      syncNote: "每 6 小時更新",
    },
    {
      platform: "LinkedIn",
      connected: false,
    },
    {
      platform: "Podcast",
      connected: false,
    },
  ],
};

/* ---------------- 會員 email → 專家 slug(示範模式) ---------------- */

/** 示範模式專家帳號:jimmy@dotai.hk / elvin@ekcheung.com;其他一律 Jimmy */
export function expertSlugForEmail(email: string): string {
  const e = email.trim().toLowerCase();
  if (e === "elvin@ekcheung.com") return "elvin-cheung";
  return "jimmy-lau";
}

/** 專家 slug → CRM 分身名(過濾 crmLeads.persona) */
export function personaNameForSlug(slug: string): string {
  return slug === "elvin-cheung" ? "Elvin 分身" : "Jimmy Lau 分身";
}
