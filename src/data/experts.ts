/** 認證導師 mock data — experts.md Sections 2–3, design.md §2.5 */

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
  },
  {
    slug: "kelvin-wong",
    nameEn: "Kelvin Wong",
    nameZh: "黃啟文",
    title: "連續創業者・AI 自動化",
    image: "/expert-kelvin-wong.jpg",
    verified: false,
    specialties: ["自動化", "一人公司", "No-code"],
  },
  {
    slug: "jocelyn-ng",
    nameEn: "Jocelyn Ng",
    nameZh: "吳卓琳",
    title: "零售科技數據總監",
    image: "/expert-jocelyn-ng.jpg",
    verified: false,
    specialties: ["數據分析", "零售", "會員營銷"],
  },
  {
    slug: "eric-cheng",
    nameEn: "Eric Cheng",
    nameZh: "鄭浩然",
    title: "金融科技產品負責人",
    image: "/expert-eric-cheng.jpg",
    verified: false,
    specialties: ["FinTech", "產品策略", "合規"],
  },
];

export const verifiedExperts = experts.filter((e) => e.verified);
export const pendingExperts = experts.filter((e) => !e.verified);
