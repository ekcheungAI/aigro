/** 領航專家 mock data — AIGRO growth hacking club 領航主理人(非導師 marketplace) */

export interface AchievementMetric {
  /** Plex Mono 數字或一般稱謂(避免虛構數據,用事實性身份 chips) */
  value: string;
  /** caption 標籤 */
  label: string;
  /** 媒體報導類 chip 附 external-link 圖標(原型 → #) */
  isMedia?: boolean;
}

export interface Viewpoint {
  title: string;
  summary: string;
}

/** 專家公開平台連結(只放真實 URL,profile 頁成就下方 muted chip 呈列) */
export interface SocialLink {
  label: string;
  url: string;
}

/** 領航風格雷達單一維度(編輯部風格評估,非精確測量 — 頁面附免責 caption) */
export interface RadarDimension {
  /** 維度名,如「實戰導向」 */
  label: string;
  /** 0–100 編輯部評估分 */
  score: number;
  /** 一句描述 */
  note: string;
}

/** 工作風格段落,如「決策方式」 */
export interface WorkingStyleBlock {
  title: string;
  body: string;
}

/** 決策原則 — 一條 if-then 規則 + 使用時機 + 實例 */
export interface Heuristic {
  /** 規則名,如「真問題原則」 */
  name: string;
  /** 使用時機 When to use */
  whenToUse: string;
  /** 實例 Real case(唔好用虛構客戶名/數據) */
  example: string;
}

export interface Expert {
  slug: string;
  nameEn: string;
  /** 中文名(可留空 — 如 Elvin Cheung 只以英文名示人,用 expertFullName() 渲染) */
  nameZh: string;
  title: string;
  /**
   * 專家頭像:真實肖像用 public/ 路徑(如 `/experts/elvin-cheung.jpg`,
   * 由 PhotoAvatar 渲染);未有肖像嘅專家用 brand-color monogram SVG data URI
   * (由 MonogramAvatar 渲染)。以 `image.startsWith("/")` 判斷。
   */
  image: string;
  /** 2:3 cinematic 直度肖像(僅 ExpertProfile verified hero;未有則渲染 monogram 面板) */
  portrait?: string;
  verified: boolean;
  specialties: string[];
  /** 一句觀點(僅領航專家大卡) */
  quote?: string;
  /** 成就 metric 行(僅領航專家) */
  achievements?: string;
  /** 專家專屬色(design.md §2.5,僅 Expert Profile 頁使用;金色禁用) */
  brandColor?: string;

  /* ---- Expert Profile 頁專用 ---- */
  /** Credential overline,如「DOTAI 創辦人・AIGRO 領航專家・香港」 */
  credential?: string;
  /** 領航認證日期,如「2025-06」 */
  verifiedDate?: string;
  /** 簡介(body-lg,max-width 560px) */
  bio?: string;
  /** 成就佐證 chips(一般事實性身份,不虛構數字/獎項) */
  metrics?: AchievementMetric[];
  /** 公開平台連結 chips(profile 頁成就佐證下方,muted external-link) */
  socials?: SocialLink[];
  /** 授權透明度區塊文案 */
  transparency?: string;
  /** 10 個核心觀點(頁面展示首 6 個,餘下收尾卡「+ N 個觀點」) */
  viewpoints?: Viewpoint[];
  /** AI 分身入口說明(body-sm) */
  askIntro?: string;
  /** 待用態「知識庫籌備中」說明 */
  pendingNote?: string;

  /* ---- perskill-grade 深度檔案(僅 verified 專家) ---- */
  /** 分身 prompt 版本,如「v1.0」 */
  promptVersion?: string;
  /** 知識庫更新月份,如「2026-07」 */
  kbUpdated?: string;
  /** 領航風格雷達(5 維編輯部評估) */
  radar?: RadarDimension[];
  /** 核心特質 chips */
  traits?: string[];
  /** 工作風格段落(2–3 段) */
  workingStyle?: WorkingStyleBlock[];
  /** 決策原則(每條含使用時機 + 實例) */
  heuristics?: Heuristic[];
}

/** Ask.tsx header 用嘅 monogram data URI(實心 brand 底 + 襯線白字,深淺色通用) */
const monogramUri = (hex: string, initials: string) =>
  `data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2064%2064'%3E%3Crect%20width='64'%20height='64'%20fill='%23${hex.slice(
    1
  )}'/%3E%3Ctext%20x='32'%20y='41'%20font-family='Georgia,serif'%20font-size='24'%20fill='%23FAF9F6'%20text-anchor='middle'%3E${initials}%3C/text%3E%3C/svg%3E`;

export const experts: Expert[] = [
  {
    slug: "jimmy-lau",
    nameEn: "Jimmy Lau",
    nameZh: "劉泰麟",
    title: "DotAI 共同創辦人 & CMO · AIGRO 領航專家",
    image: monogramUri("#466A5E", "JL"),
    verified: true,
    specialties: ["AI 行銷", "圖像影像", "品牌內容創作"],
    quote:
      "Creator 唔只係創作內容 — 係透過 AI 將靈感轉化為實踐,幫助更多人跨過從 idea 到行動嘅障礙。",
    achievements:
      "DotAI 共同創辦人 & CMO · Everyone.AI 年度大會主辦 · 語境工程路線香港首提",
    brandColor: "#466A5E",
    credential: "DOTAI 共同創辦人 & CMO・AIGRO 領航專家・香港",
    verifiedDate: "2025-06",
    bio: "Jimmy Lau 劉泰麟,DotAI 共同創辦人 & CMO,做咗三年幾 AI Marketing 同 Full-Stack Marketing。佢眼中嘅 Creator 唔只係創作內容,係透過 AI 將靈感轉化為實踐,幫更多人跨過從 idea 到行動嘅障礙。佢創立咗 DotAI 學習基地(dotai.spot 實驗型社群),不斷測試、整理最有用嘅 AI 技術同應用方法 — 因為佢相信學 AI 係一段持續進化嘅旅程,需要陪伴、交流同實戰場域,而唔係上一堂課就完。2026 年 1 月,佢喺尖沙咀 K11 Atelier 主辦 DotAI Everyone.AI 年度大會,全場爆滿 200+ 企業決策者、教育領袖同技術專家,聯同 Microsoft、Google、HP 三大巨頭,首度喺香港提出「語境工程 Context Engineering 取代提示詞工程」。佢倡議 AI-First 思維 — 停止喺工具追逐中空轉,協助香港企業走出「AI 試玩」舒適圈。願景只有一個:打造屬於大家嘅 AI App,構建最落地嘅「AI 放大自身價值」路線圖。",
    metrics: [
      { value: "DotAI", label: "共同創辦人 & CMO・AI Marketing" },
      { value: "200+", label: "Everyone.AI 年度大會實戰者・Microsoft·Google·HP" },
      { value: "語境工程", label: "Context Engineering 路線・香港首提" },
      { value: "青協", label: "數字教育暨創科嘉年華受邀嘉賓" },
    ],
    socials: [
      { label: "Threads", url: "https://www.threads.com/@jimmylau.ai" },
      { label: "LinkedIn", url: "https://hk.linkedin.com/in/jimmy-lau-hk" },
      { label: "dotai.hk", url: "https://dotai.hk" },
    ],
    transparency:
      "此 AI 分身基於 Jimmy 嘅公開分享與授權內容蒸餾,知識庫經本人審核。分身回答僅代表其 AI-First 方法論,唔代表本人即時意見;內容僅供參考,唔構成任何專業建議。",
    viewpoints: [
      {
        title: "AI-First:唔好追工具,追場景",
        summary: "停止喺工具追逐中空轉 — 由你嘅真實場景出發,AI 先至有落腳點。",
      },
      {
        title: "Creator 嘅使命係將靈感轉化為實踐",
        summary: "Creator 唔只係創作內容,係幫更多人跨過從 idea 到行動嘅障礙。",
      },
      {
        title: "Idea 唔行動,等於零",
        summary: "靈感人人都有 — 用 AI 將佢變成做得到嘅第一步,先係分別。",
      },
      {
        title: "語境工程,取代提示詞工程",
        summary: "Context 比 prompt 重要 — 俾啱嘅背景 AI,好過背一百條魔法咒語。",
      },
      {
        title: "學 AI 係旅程,唔係一堂課",
        summary: "持續進化需要陪伴、交流同實戰場域 — 呢個係 DotAI 學習基地存在嘅原因。",
      },
      {
        title: "走出「AI 試玩」舒適圈",
        summary: "試玩一百個工具,不如將一個場景做到底 — 香港企業要由試玩走向落地。",
      },
      {
        title: "AI 放大自身價值,唔係取代你",
        summary: "最落地嘅路線圖係:用 AI 放大你本來最值錢嘅嘢,唔係由零變第二個人。",
      },
      {
        title: "行銷嘅下半場,係 AI 全棧",
        summary: "由策略、內容到圖像影像,Full-Stack Marketing 先係而家嘅入場券。",
      },
      {
        title: "香港需要屬於大家嘅 AI App",
        summary: "與其等矽谷安排,不如自己動手 — 香港人值得有自己語境嘅 AI 產品。",
      },
      {
        title: "下一代嘅 AI 素養,而家開始",
        summary: "支持香港下一代嘅 AI 素養同創造力 — 教育係最長遠嘅投資。",
      },
    ],
    askIntro:
      "基於授權知識庫回答,附觀點出處。問佢 AI-First 思維、由 idea 到行動、AI 行銷同語境工程嘅問題。",
    promptVersion: "v1.0",
    kbUpdated: "2026-07",
    radar: [
      {
        label: "AI-First 思維",
        score: 93,
        note: "由場景出發唔追工具 — 倡議停止喺工具追逐中空轉。",
      },
      {
        label: "行銷實戰",
        score: 91,
        note: "三年幾 AI Marketing 全棧實戰,由策略到圖像影像落地。",
      },
      {
        label: "社群凝聚",
        score: 88,
        note: "dotai.spot 實驗型社群 + Everyone.AI 年度大會,將人聚埋一齊實戰。",
      },
      {
        label: "內容創作",
        score: 85,
        note: "品牌內容同圖像影像創作,將靈感轉化為實踐。",
      },
      {
        label: "教育熱忱",
        score: 90,
        note: "由 DotAI 學習基地到青協創科嘉年華,堅持陪伴式 AI 教育。",
      },
    ],
    traits: ["AI-First", "實戰落地", "社群陪伴", "靈感轉實踐"],
    workingStyle: [
      {
        title: "AI-First 決策",
        body: "每個項目先問:「AI 喺呢個場景可唔可以放大我哋嘅價值?」唔係見到新工具就追 — Jimmy 喺 Everyone.AI 年度大會講得明白:停止喺工具追逐中空轉,由真實業務場景出發,AI 先至有落腳點。",
      },
      {
        title: "社群陪跑節奏",
        body: "學 AI 係持續進化嘅旅程,唔係一堂課。DotAI 學習基地(dotai.spot)以實驗型社群運作:不斷測試、整理最有用嘅 AI 技術同應用方法,靠陪伴、交流同實戰場域,陪住成員由 idea 行到行動。",
      },
      {
        title: "行銷與內容手法",
        body: "Full-Stack Marketing — 由品牌策略、內容創作到圖像影像,一條龍用 AI 落地。Creator 嘅價值唔係產出更多內容,係將靈感轉化為實踐,幫觀眾跨過從 idea 到行動嘅障礙。",
      },
    ],
    heuristics: [
      {
        name: "AI-First 原則",
        whenToUse: "諗緊要唔要引入 AI,或者見到新工具心郁郁嘅時候。",
        example:
          "唔好問「呢個工具勁唔勁」,先問「我邊個場景最痛」。Everyone.AI 大會上 Jimmy 就係咁提醒 200+ 決策者:停止喺工具追逐中空轉,場景先行,工具自然揀得啱。",
      },
      {
        name: "靈感轉實踐律",
        whenToUse: "有一個 idea 但一直停留喺諗嘅階段。",
        example:
          "Idea 唔行動等於零。用 AI 將靈感拆成今日做得到嘅第一步 — 例如用 AI 生成品牌視覺草稿去試水溫,而唔係等萬事俱備先行。",
      },
      {
        name: "語境工程優先",
        whenToUse: "覺得 AI 答非所問、輸出唔到位嘅時候。",
        example:
          "唔好再背 prompt 咒語 — 執好你俾 AI 嘅 context:品牌背景、受眾、語氣、限制。語境工程係 DotAI 首度喺香港提出嘅路線,context 對咗,輸出自然到位。",
      },
      {
        name: "陪伴式學習",
        whenToUse: "想學 AI 但一個人堅持唔落去嘅時候。",
        example:
          "學 AI 係旅程唔係一堂課 — 加入一個實戰場域,好似 dotai.spot 咁嘅實驗型社群,有人一齊測試、交流、覆盤,先至會持續進化。",
      },
    ],
  },
  {
    slug: "elvin-cheung",
    nameEn: "Elvin Cheung",
    nameZh: "",
    title: "@ekcheungAI 創辦人 · SuperBash 主理人 · AIGRO 領航專家",
    image: "/experts/elvin-cheung.jpg",
    portrait: "/experts/elvin-cheung-portrait.jpg",
    verified: true,
    specialties: ["AI 實戰拆解", "自動化 Workflow", "Vibe Coding"],
    quote:
      "AI 落地唔係追 headline — 係 source-aware 咁將工具變 workflow,workflow 變系統。",
    achievements:
      "ekcheungAI 創辦人 · Perskill 創辦人 · AIGRO 聯合發起 · 全平台 AI 實戰內容",
    brandColor: "#8A5A44",
    credential: "EKCHEUNGAI 創辦人・PERSKILL 創辦人・AIGRO 領航專家・香港",
    verifiedDate: "2025-06",
    bio: "@ekcheungAI — 用廣東話將 AI 拆到全網 builders 都跟住學嘅實戰教學者。由新工具、Agent 架構到自動化 workflow,每一篇內容都實測先行、保留來源同限制,唔會將 demo 講到似 production。由內容矩陣到創辦 Perskill(世界級人物 AI 分身庫,invite-only),再到聯合發起 AIGRO — 核心信念只有一個:AI 落地唔係追 headline,係 source-aware 咁將工具變成 workflow、workflow 變成系統。",
    metrics: [
      { value: "ekcheungAI", label: "創辦人・AI 實戰內容矩陣" },
      { value: "Perskill", label: "創辦人・世界級人物 AI 分身庫" },
      { value: "AIGRO", label: "聯合發起・領航專家" },
      { value: "全平台", label: "YouTube / IG / X / Threads 實戰內容" },
      { value: "Vibe Coding", label: "流程實戰者・由 demo 到產品化" },
    ],
    socials: [
      {
        label: "YouTube",
        url: "https://www.youtube.com/channel/UCaqu5I6nqegDt-zs7jr284A",
      },
      { label: "Instagram", url: "https://www.instagram.com/ekcheungAI/" },
      { label: "X", url: "https://x.com/ekcheungAI" },
      { label: "Threads", url: "https://www.threads.com/@ekcheungai" },
      { label: "ekcheung.com", url: "https://www.ekcheung.com" },
    ],
    transparency:
      "此 AI 分身基於 Elvin(@ekcheungAI)嘅公開內容與授權材料蒸餾,知識庫經本人審核。分身回答僅代表其 AI 實戰方法論,唔代表本人即時意見;內容僅供參考,唔構成任何專業建議。",
    viewpoints: [
      {
        title: "冇來源,唔出聲",
        summary: "每個論點保留出處同實測脈絡 — source-aware 係底線,唔係風格。",
      },
      {
        title: "Demo 唔等於 production",
        summary: "實測過先講限制 — 將 demo 講到似 production,係對觀眾最大嘅不誠實。",
      },
      {
        title: "一個工具唔係答案,串成 workflow 先係",
        summary: "工具會過時,workflow 嘅槓桿唔會。",
      },
      {
        title: "Workflow 變系統,先係真正落地",
        summary: "慳一次時間係技巧;將流程沉澱成系統,先係資產。",
      },
      {
        title: "AI 落地香港,要本地語境",
        summary: "廣東話教學、香港案例 — 香港需要更實戰、更本地、更 source-aware 嘅 AI 學習入口。",
      },
      {
        title: "Vibe coding 改變咗「邊個可以做產品」",
        summary: "唔使再等工程師 — 識拆解問題嘅人,而家都可以親手將諗法變成產品。",
      },
      {
        title: "分身經濟:知識可以規模化",
        summary: "Perskill 嘅實驗 — 將世界級人物嘅思維方式,變成可以對話嘅 AI 分身。",
      },
      {
        title: "內容係複利,唔係消耗品",
        summary: "每一篇可以跟住做嘅內容,都會持續累積信任同讀者。",
      },
      {
        title: "教識人,先係最大嘅擴散",
        summary: "內容嘅終點唔係 views,係觀眾真係做到。",
      },
      {
        title: "唔追 hype,追實測",
        summary: "新工具出咗第一時間唔係讚,係試 — 限制同風險,同功能一樣重要。",
      },
    ],
    askIntro:
      "基於授權知識庫回答,附觀點出處。問佢 AI 工具實測、自動化 workflow、vibe coding 流程同產品化落地嘅問題。",
    promptVersion: "v1.0",
    kbUpdated: "2026-07",
    radar: [
      {
        label: "實測精神",
        score: 94,
        note: "每個工具親手試過先講 — 限制同風險唔會收埋。",
      },
      {
        label: "系統拆解力",
        score: 90,
        note: "將 Agent 架構同 workflow 拆到一步一步,跟住就做到。",
      },
      {
        label: "內容爆發力",
        score: 88,
        note: "YouTube / IG / X / Threads 全平台內容矩陣,篇篇可以跟住做。",
      },
      {
        label: "增長直覺",
        score: 86,
        note: "由內容到 Perskill 到 AIGRO,每步都係產品化嘅判斷。",
      },
      {
        label: "工具廣度",
        score: 92,
        note: "新工具、Agent、自動化平台上手極快,但永遠 source-aware。",
      },
    ],
    traits: ["Source-aware", "實測先行", "唔追 Hype", "廣東話教學", "Builder 思維"],
    workingStyle: [
      {
        title: "內容與研究流程",
        body: "由 source 到 briefing:每篇內容由官方文件、release notes 同一手來源出發,親手實測之後先寫。結構永遠係 — 可以點試、限制係咩、風險喺邊、下一步點落地。來源、限制同實測脈絡全部保留,唔會為流量將 demo 講到似 production。",
      },
      {
        title: "實測與產品化節奏",
        body: "demo 同 production 之間有一條誠實線。新工具出咗,第一時間係試,唔係讚 — 試完先講邊度用得、邊度用唔得。驗證過嘅做法沉澱成 workflow,再行多一步產品化 — Perskill 同 ekcheungAI 內容矩陣,都係咁樣由實測行出嚟。",
      },
      {
        title: "社群與教學",
        body: "廣東話教學、香港語境 — 香港 founders 同 builders 嘅問題,要用佢哋嘅語言同案例答。喺 Telegram hkvibecoders 社群同 SuperBash 活動帶住大家實戰,將 vibe coding 流程做到人人跟到、做完真係用到。",
      },
    ],
    heuristics: [
      {
        name: "Source 優先律",
        whenToUse: "講任何 AI 工具、功能或者趨勢之前。",
        example:
          "冇來源唔出聲。每個論點搵返官方文件或者一手出處先講 — 傳聞同截圖唔係來源。保留出處,係對觀眾最基本嘅尊重。",
      },
      {
        name: "Demo ≠ Production",
        whenToUse: "介紹任何新工具或者 AI 能力嘅時候。",
        example:
          "實測過先講限制:邊度會斷、邊度要人把關、成本係幾多。將 demo 講到似 production,觀眾跟住做就會中伏 — 呢條誠實線唔過得。",
      },
      {
        name: "工具變 Workflow 律",
        whenToUse: "有人問「邊個 AI 工具最好」嘅時候。",
        example:
          "一個工具唔係答案 — 將佢串入你嘅流程先係。例如將研究、起草、發佈串成一條自動化 workflow,槓桿大過單獨用任何一個工具好多倍。",
      },
      {
        name: "教識人先係擴散",
        whenToUse: "出任何內容或者指南之前。",
        example:
          "每一篇都要可以跟住做:有步驟、有來源、有預期結果。觀眾真係做到,先會記住你 — views 會過去,信任會留低。",
      },
    ],
  },
  {
    slug: "invited-expert-1",
    nameEn: "Coming Soon",
    nameZh: "領航專家席",
    title: "領航專家邀請中",
    image: "",
    verified: false,
    specialties: ["AI 實戰", "增長系統"],
    pendingNote:
      "下一席領航專家正由 Jimmy 與 Elvin 親自邀請。完成領航認證與知識庫授權審核後,即開放 AI 分身對話 — 敬請期待。",
  },
  {
    slug: "invited-expert-2",
    nameEn: "Coming Soon",
    nameZh: "領航專家席",
    title: "領航專家邀請中",
    image: "",
    verified: false,
    specialties: ["社群增長", "私域運營"],
    pendingNote:
      "下一席領航專家正由 Jimmy 與 Elvin 親自邀請。完成領航認證與知識庫授權審核後,即開放 AI 分身對話 — 敬請期待。",
  },
];

export const verifiedExperts = experts.filter((e) => e.verified);
export const pendingExperts = experts.filter((e) => !e.verified);

/** 專家英文名首名(「與 Jimmy 的 AI 分身對話」) */
export function expertFirstName(expert: Expert): string {
  return expert.nameEn.split(" ")[0] ?? expert.nameEn;
}

/** 顯示全名:「劉泰麟 Jimmy Lau」;中文名留空嘅專家(Elvin Cheung)只顯示英文名 */
export function expertFullName(expert: Expert): string {
  return [expert.nameZh, expert.nameEn].filter(Boolean).join(" ");
}

/** 有真實肖像(public/ 路徑)而非 monogram data URI */
export function expertHasPhoto(expert: Expert): boolean {
  return expert.image.startsWith("/");
}
