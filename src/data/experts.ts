/** 認證導師 mock data — experts.md Sections 2–3, expert-profile.md Sections 1–6, design.md §2.5 */

export interface AchievementMetric {
  /** Plex Mono 數字（可含前後綴，如「US$40M」「40+」） */
  value: string;
  /** caption 標籤 */
  label: string;
  /** 媒體報導類 chip 附 external-link 圖標（原型 → #） */
  isMedia?: boolean;
}

export interface Viewpoint {
  title: string;
  summary: string;
}

export interface Expert {
  slug: string;
  nameEn: string;
  nameZh: string;
  title: string;
  image: string;
  verified: boolean;
  specialties: string[];
  /** 一句觀點（僅 Verified 導師大卡） */
  quote?: string;
  /** 成就 metric 行（僅 Verified） */
  achievements?: string;
  /** 專家專屬色（design.md §2.5，僅 Expert Profile 頁使用；金色禁用） */
  brandColor?: string;

  /* ---- Expert Profile 頁專用（expert-profile.md） ---- */
  /** Credential overline，如「前 GOOGLE 香港增長負責人・香港」 */
  credential?: string;
  /** 認證日期，如「2024-11」 */
  verifiedDate?: string;
  /** 簡介（body-lg，max-width 560px） */
  bio?: string;
  /** 成就佐證 chips（expert-profile.md §2） */
  metrics?: AchievementMetric[];
  /** 授權透明度區塊文案（expert-profile.md §3） */
  transparency?: string;
  /** 10 個核心觀點（§4 — 頁面展示首 6 個，餘下收尾卡「+ N 個觀點」） */
  viewpoints?: Viewpoint[];
  /** AI 分身入口說明（§5 body-sm） */
  askIntro?: string;
  /** 待用態「知識庫籌備中」說明（§6） */
  pendingNote?: string;
}

export const experts: Expert[] = [
  {
    slug: "marcus-chan",
    nameEn: "Marcus Chan",
    nameZh: "陳奕朗",
    title: "前 Google 香港增長負責人",
    image: "/expert-marcus-chan.jpg",
    verified: true,
    specialties: ["B2B 增長", "付費廣告", "出海策略"],
    quote: "香港企業最大的增長槓桿不是預算，是決策速度。",
    achievements: "12 年增長經驗 · US$40M 廣告預算管理 · 2 間初創退出",
    brandColor: "#466A5E",
    credential: "前 GOOGLE 香港增長負責人・香港",
    verifiedDate: "2024-11",
    bio: "12 年增長實戰，主導過 US$40M 規模的付費增長體系。現在只關心一個問題：香港中小企如何用大公司的增長方法，而不用大公司的預算。",
    metrics: [
      { value: "12", label: "年增長經驗" },
      { value: "US$40M", label: "管理廣告預算" },
      { value: "2", label: "間初創成功退出" },
      { value: "40+", label: "場企業內訓" },
      { value: "媒體報導", label: "HK01・經濟日報", isMedia: true },
    ],
    transparency:
      "本 AI 分身基於 6 小時原創訪談、42 篇公開文章與 3 場付費課程內容蒸餾，知識庫已獲陳奕朗本人書面授權並親自審核（2025-01）。分身回答不代表本人即時意見；對話收益與本人分成。真人 1:1 預約為獨立服務。",
    viewpoints: [
      {
        title: "增長不是渠道技巧，是決策系統",
        summary: "大多數團隊缺的不是新方法，而是每週檢視數據的紀律。",
      },
      {
        title: "香港市場太細？那是你最好的實驗室",
        summary: "小市場容錯快、反饋快，驗證後直接複製到大灣區。",
      },
      {
        title: "付費廣告的第一性原理：訊息匹配",
        summary: "受眾、訊息、著陸頁三者匹配度決定 80% 的成效。",
      },
      {
        title: "AI 不會取代 marketer，會取代沒有觀點的 marketer",
        summary: "執行自動化後，策略與品味成為唯一壁壘。",
      },
      {
        title: "每間公司都應該有一份「不做事項清單」",
        summary: "增長的最大敵人是分散，而非資源不足。",
      },
      {
        title: "退出經驗教我的事：現金流敘事",
        summary: "併購談判桌上，可預測的增長曲線比爆發故事值錢。",
      },
      {
        title: "AI 工具選型：先問工作流程，再問功能",
        summary: "先畫出團隊每週的工作流，再決定哪一段值得自動化。",
      },
      {
        title: "預算少不是限制，是聚焦的藉口",
        summary: "小預算迫使你只打最痛的一個受眾、一個訊息、一個渠道。",
      },
      {
        title: "出海的真正門檻不是語言，是信任基礎",
        summary: "在陌生市場，先建立可信的第三方佐證，再談投放。",
      },
      {
        title: "數據儀表板愈多，決策愈慢",
        summary: "每週只看三個指標：獲客成本、轉化率、回收期。",
      },
    ],
    askIntro:
      "基於授權知識庫回答，附觀點出處。問佢香港 B2B 增長、廣告預算分配、出海策略嘅問題。",
  },
  {
    slug: "karena-leung",
    nameEn: "Karena Leung",
    nameZh: "梁凱晴",
    title: "AI 內容營銷顧問・前奧美數碼總監",
    image: "/expert-karena-leung.jpg",
    verified: true,
    specialties: ["AI 內容", "品牌策略", "社交媒體"],
    quote: "AI 令你做得更快，但只有觀點令你無可替代。",
    achievements: "15 年品牌經驗 · 服務 40+ 香港品牌 · 3 項行業大獎",
    brandColor: "#8A5A44",
    credential: "AI 內容營銷顧問・前奧美數碼總監・香港",
    verifiedDate: "2024-12",
    bio: "15 年品牌與內容實戰，服務過 40+ 個香港品牌。現在只關心一個問題：AI 時代，香港品牌如何用一半人力，做出十倍有觀點的內容。",
    metrics: [
      { value: "15", label: "年品牌經驗" },
      { value: "40+", label: "服務香港品牌" },
      { value: "3", label: "項行業大獎" },
      { value: "120+", label: "場品牌工作坊" },
      { value: "媒體報導", label: "明報・Marketing Interactive", isMedia: true },
    ],
    transparency:
      "本 AI 分身基於 8 小時原創訪談、56 篇公開文章與 2 場付費工作坊內容蒸餾，知識庫已獲梁凱晴本人書面授權並親自審核（2025-01）。分身回答不代表本人即時意見；對話收益與本人分成。真人 1:1 預約為獨立服務。",
    viewpoints: [
      {
        title: "品牌不是 logo，是持續一致的觀點輸出",
        summary: "香港消費者記住的不是視覺，而是你對世界的看法。",
      },
      {
        title: "AI 內容的第一課：先有人味，才有流量",
        summary: "演算法懲罰罐頭內容 — AI 起稿、人類定調。",
      },
      {
        title: "內容團隊縮編後，品味成為最貴的資產",
        summary: "執行可以外判給 AI，判斷力不能。",
      },
      {
        title: "社交媒體的演算法，獎勵的是對話而非廣播",
        summary: "與其追熱話，不如經營一個可辨識的立場。",
      },
      {
        title: "香港品牌出海前，先答到「為什麼是你」",
        summary: "差異化講不清楚，翻譯做得再好也沒用。",
      },
      {
        title: "每月一次內容審計，好過每日盲目出 post",
        summary: "停低、睇數據、刪走無效欄目，產出自然提升。",
      },
      {
        title: "AI 生成圖文的授權，要早過創意一步處理",
        summary: "品牌資產的法律基礎，比一條爆款重要得多。",
      },
      {
        title: "小團隊內容系統：一個核心敘事，十種切法",
        summary: "一次深度訪談，可以蒸餾成一個月的內容。",
      },
      {
        title: "客戶評價是最被低估的內容金礦",
        summary: "真實用家的語言，比任何文案課都實用。",
      },
      {
        title: "不要問 AI 識做什麼，問你的品牌需要什麼",
        summary: "工具永遠追不完 — 策略先於工具。",
      },
    ],
    askIntro:
      "基於授權知識庫回答，附觀點出處。問佢 AI 內容流程、品牌定位、社交媒體策略嘅問題。",
  },
  {
    slug: "kelvin-wong",
    nameEn: "Kelvin Wong",
    nameZh: "黃啟文",
    title: "連續創業者・AI 自動化",
    image: "/expert-kelvin-wong.jpg",
    verified: false,
    specialties: ["自動化", "一人公司", "No-code"],
    pendingNote:
      "我們正與黃啟文進行深度訪談與知識庫整理 — 內容涵蓋一人公司自動化、No-code 工作流與 AI 代理實戰。完成認證與授權審核後，即開放 AI 分身對話。",
  },
  {
    slug: "jocelyn-ng",
    nameEn: "Jocelyn Ng",
    nameZh: "吳卓琳",
    title: "零售科技數據總監",
    image: "/expert-jocelyn-ng.jpg",
    verified: false,
    specialties: ["數據分析", "零售", "會員營銷"],
    pendingNote:
      "我們正與吳卓琳進行深度訪談與知識庫整理 — 內容涵蓋零售數據分析、會員營銷與 AI 需求預測。完成認證與授權審核後，即開放 AI 分身對話。",
  },
  {
    slug: "eric-cheng",
    nameEn: "Eric Cheng",
    nameZh: "鄭浩然",
    title: "金融科技產品負責人",
    image: "/expert-eric-cheng.jpg",
    verified: false,
    specialties: ["FinTech", "產品策略", "合規"],
    pendingNote:
      "我們正與鄭浩然進行深度訪談與知識庫整理 — 內容涵蓋金融科技產品策略、合規框架與 AI 風控應用。完成認證與授權審核後，即開放 AI 分身對話。",
  },
];

export const verifiedExperts = experts.filter((e) => e.verified);
export const pendingExperts = experts.filter((e) => !e.verified);

/** 專家英文名首名（「與 Marcus 的 AI 分身對話」） */
export function expertFirstName(expert: Expert): string {
  return expert.nameEn.split(" ")[0] ?? expert.nameEn;
}
