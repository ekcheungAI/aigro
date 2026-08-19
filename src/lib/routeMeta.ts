export const SITE_NAME = "AIGRO";
export const SITE_URL = "https://aigro-blue.vercel.app";
export const DEFAULT_DESC =
  "香港最值得信賴的 AI・增長・商業情報平台 — 每日精選情報、實戰案例、認證導師 AI 分身，香港視角。";
export const DEFAULT_TITLE = `${SITE_NAME} — 香港 AI × Growth 情報平台`;

export interface RouteMetaInfo {
  title: string;
  description: string;
}

const ROUTE_META: [RegExp, string, string][] = [
  [/^\/$/, "香港 #1 AI Builder 社群", "每日精選全球 AI 情報，連接香港 builders、導師與 MCP，將情報變成實戰成果。"],
  [/^\/insights\/daily/, "每日精選日報", "編輯部每日精選 5 條必讀 AI・增長情報 — 3 分鐘掌握全球脈搏的香港意義。"],
  [/^\/insights\/[^/]+/, "情報詳情", "AI 摘要 + 香港視角長評 + 來源連結。"],
  [/^\/insights/, "資訊中心 Insights", "即時動態 feed、每日日報、主題地圖與數據合作 — 每日 AI・增長情報，附香港視角解讀。"],
  [/^\/cases\/[^/]+/, "案例深度拆解", "背景 → 工具/方法 → 成果數據 → 可複製步驟。"],
  [/^\/cases/, "實戰案例 Cases", "香港本地 AI 落地案例庫 — 數據化成果，可複製的做法拆解。"],
  [/^\/experts\/[^/]+/, "專家檔案", "領航專家個人頁 — 成就佐證、授權透明度、AI 分身對話入口。"],
  [/^\/experts/, "領航專家 Experts", "由領航專家帶領嘅 growth hacking club — AI 分身基於授權內容蒸餾。"],
  [/^\/ask/, "Ask 問答", "問 AI 編輯部任何 AI、增長、營銷問題 — 命中已批准知識時顯示可核實來源。"],
  [/^\/developers/, "AIGRO MCP Network", "行業情報 MCP server — 你嘅 AI 工具一連接,即刻有行業雷達。AI 行業優先名單開放中。"],
  [/^\/sources/, "情報渠道", "AIGRO 情報渠道 — 公開透明嘅來源牆、數據流程與免費任用方式。"],
  [/^\/skills/, "Skills", "AIGRO Skills — 俾你嘅 AI agent 裝上專業能力。"],
  [/^\/branding/, "品牌指南 Branding", "AIGRO 品牌識別、標誌、色彩、字體、語氣與應用規範。"],
  [/^\/class-review/, "Class Review 課堂重溫", "AIGRO 會員課堂重溫目錄 — 將直播、課堂同實戰分享整理成可閱讀、可重做嘅完整筆記。"],
  [/^\/guides\/100x-ai-growth-marketer/, "8.13 AI Growth Marketer 直播重溫攻略", "AIGRO 會員限定 8.13 直播重溫：18 章完整筆記，由 AI Marketing 觀念、八段 Campaign 工作流，到 Growth Builder 可重用嘅 Marketing 做法。"],
  [/^\/guides\/?$/, "Class Review 課堂重溫", "AIGRO 會員課堂重溫目錄 — 將直播、課堂同實戰分享整理成可閱讀、可重做嘅完整筆記。"],
  [/^\/ux-preview/, "UX Direction Preview", "AIGRO 全站體驗優化概念預覽。"],
  [/^\/access/, "全級別入口", "AIGRO 全級別入口 — 訪客、會員、創始會員、領航專家、管理員示範登入。"],
  [/^\/login/, "登入", "登入 AIGRO Club — 無限分身對話、完整案例拆解、MCP 優先接入。"],
  [/^\/join/, "免費加入 Club", "免費加入 AIGRO Club，成為創始會員，優先體驗 Ask、Experts、MCP 同導師 Live Chat。"],
  [/^\/reset-password/, "設定新密碼", "安全更新你嘅 AIGRO 帳號密碼。"],
  [/^\/account/, "會員專區", "你嘅 AIGRO 會員專區 — 層級、對話紀錄、MCP 名單與設定。"],
  [/^\/admin/, "AIGRO Admin", "內部管理後台。"],
  [/^\/portal\/kb/, "專家知識庫", "管理已授權嘅專家知識、來源與 AI 分身內容。"],
  [/^\/portal\/insights/, "專家數據洞察", "查看專家 AI 分身嘅內容與互動趨勢。"],
  [/^\/portal\/profile/, "專家資料設定", "管理專家公開資料與 AI 分身設定。"],
  [/^\/portal\/socials/, "社交渠道", "管理專家公開社交渠道。"],
  [/^\/portal\/leads/, "專家潛在客戶", "管理由 AIGRO 帶來嘅專家合作查詢。"],
  [/^\/portal\/bookings/, "專家預約", "管理專家諮詢與合作預約。"],
  [/^\/portal/, "領航專家平台", "AIGRO 領航專家嘅內容、分身與合作管理平台。"],
];

const TAB_META: Record<string, RouteMetaInfo> = {
  daily: {
    title: "每日精選日報",
    description: "編輯部每日精選必讀 AI・增長情報 — 3 分鐘掌握全球脈搏的香港意義。",
  },
  weekly: {
    title: "每週回顧",
    description: "一週 AI・增長脈搏一次過睇晒，按分類整理編輯部必讀情報。",
  },
  topics: {
    title: "主題地圖",
    description: "按公司、模型與技術主題探索 AIGRO 情報庫。",
  },
  data: {
    title: "數據合作",
    description: "了解 AIGRO 情報來源、數據合作方式與 MCP 發展方向。",
  },
};

export function formatPageTitle(title?: string): string {
  return title ? `${title} — ${SITE_NAME} 香港 AI × Growth 情報平台` : DEFAULT_TITLE;
}

export function getRouteMeta(pathname: string, search = ""): RouteMetaInfo | null {
  const tab = pathname === "/insights" ? new URLSearchParams(search).get("tab") : null;
  if (tab && TAB_META[tab]) return TAB_META[tab];

  const hit = ROUTE_META.find(([re]) => re.test(pathname));
  return hit ? { title: hit[1], description: hit[2] } : null;
}
