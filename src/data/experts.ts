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
    nameZh: "劉進",
    title: "DotAI 創辦人 · AIGRO 領航專家",
    image: monogramUri("#466A5E", "JL"),
    verified: true,
    specialties: ["AI 教育", "實戰落地", "增長系統"],
    quote: "AI 落地冇捷徑 — 實戰先行,邊做邊學,由識用工具進化到用 AI 建立增長系統。",
    achievements: "DotAI 創辦人 · AIGRO 聯合發起 · AI 實戰教育領航",
    brandColor: "#466A5E",
    credential: "DOTAI 創辦人・AIGRO 領航專家・香港",
    verifiedDate: "2025-06",
    bio: "創辦 DotAI,帶領香港學員由「識用 AI 工具」進化到「用 AI 建立增長系統」。主張實戰先行、邊做邊學 — 而家作為 AIGRO 領航專家,唔係教書,係帶住成個 club 將 AI 落地變成增長日常。",
    metrics: [
      { value: "DotAI", label: "創辦人・香港 AI 教育" },
      { value: "AIGRO", label: "聯合發起・領航專家" },
      { value: "實戰先行", label: "邊做邊學的教學主張" },
      { value: "增長系統", label: "由工具到系統的落地路線" },
    ],
    transparency:
      "此 AI 分身基於 Jimmy 嘅公開分享與授權內容蒸餾,知識庫經本人審核。分身回答僅代表其增長方法論,唔代表本人即時意見;內容僅供參考,唔構成任何專業建議。",
    viewpoints: [
      {
        title: "識用工具,唔等於識用 AI",
        summary: "工具教學只能令你入門,系統思維先令你增值。",
      },
      {
        title: "邊做邊學,係成年人學 AI 唯一有效嘅方法",
        summary: "由真實業務問題出發,工具自然做中學識。",
      },
      {
        title: "每間公司都需要一份「AI 使用憲章」",
        summary: "邊啲可以交俾 AI、邊啲一定要人把關,寫清楚先唔會亂。",
      },
      {
        title: "AI 落地最大嘅阻力唔係技術,係習慣",
        summary: "改變每日工作流程,好過買十個新工具。",
      },
      {
        title: "由「用 AI 慳時間」到「用 AI 造系統」",
        summary: "慳返嚟嘅時間要再投資,先會變成增長。",
      },
      {
        title: "Prompt 係消耗品,工作流先係資產",
        summary: "將驗證過嘅 prompt 沉澱成團隊 SOP,先可以複製。",
      },
      {
        title: "香港團隊學 AI,細反而係優勢",
        summary: "決策鏈短,一個下午已經可以試完一個新流程。",
      },
      {
        title: "唔好問 AI 做唔做到,問呢個流程值唔值得自動化",
        summary: "策略先於工具 — 工具永遠追唔完。",
      },
      {
        title: "AI 教育要教判斷,唔係教按制",
        summary: "識評核 AI 輸出嘅人,先係真正識用 AI。",
      },
      {
        title: "每星期一次「AI 實驗時間」",
        summary: "增長系統係由無數個小實驗累積出嚟,唔係一次大變革。",
      },
    ],
    askIntro:
      "基於授權知識庫回答,附觀點出處。問佢 AI 工具落地、團隊 AI 工作流、由識用工具到建立增長系統嘅問題。",
    promptVersion: "v1.0",
    kbUpdated: "2026-07",
    radar: [
      { label: "實戰導向", score: 92, note: "由真實業務問題出發,唔會為用 AI 而用 AI。" },
      { label: "系統思維", score: 85, note: "將散亂工具整合成可複製嘅增長工作流。" },
      { label: "教學拆解力", score: 88, note: "複雜概念拆到一步一步,跟住就做到。" },
      { label: "工具廣度", score: 80, note: "主流 AI 工具上手快,但主張策略先於工具。" },
      { label: "數據紀律", score: 74, note: "重視成效驗證,不過決策上更信實戰手感。" },
    ],
    traits: ["實戰先行", "邊做邊學", "化繁為簡", "長期主義"],
    workingStyle: [
      {
        title: "決策方式",
        body: "唔由工具開始,由真實業務問題開始。接到需求先問「呢件事值唔值得自動化」,再用最小成本試行 — 小步快跑,兩週內見唔到成效就調整方向,唔會為用而用。",
      },
      {
        title: "教學與執行節奏",
        body: "示範 → 陪做 → 放手:先做俾學員睇一次,再陪住做一次,最後放手俾佢自己跑。做過兩次嘅流程就沉澱成 SOP,等團隊可以自己複製,唔使次次問人。",
      },
      {
        title: "溝通風格",
        body: "直接、用例子、唔講術語。解釋 AI 概念時鍾意用香港中小企嘅日常做比喻,講到對方明為止 — 唔會用 buzzword 嚇人。",
      },
    ],
    heuristics: [
      {
        name: "真問題原則",
        whenToUse: "當有人問「邊個 AI 工具最好」嘅時候。",
        example:
          "先問返佢業務上最嘥時間嘅係邊一 part。多數情況,佢哋唔係需要新工具,係需要將現有流程裏面最嘥時間嗰步交俾 AI。",
      },
      {
        name: "兩週見效規則",
        whenToUse: "導入任何 AI 工具或工作流之後。",
        example:
          "兩週內要數到慳咗幾多時間 — 例如整理會議記錄由個半鐘縮到十五分鐘。見唔到數,就檢討係咪用錯咗地方,而唔係加碼買更多工具。",
      },
      {
        name: "SOP 沉澱律",
        whenToUse: "同一個 AI 流程成功跑過兩次之後。",
        example:
          "即刻將 prompt、步驟同檢查點寫成一份 SOP,放入團隊文件夾。下次新人照住做,半個鐘就上手,唔使次次重頭教。",
      },
      {
        name: "示範先行法",
        whenToUse: "教人用新工具或者新流程之前。",
        example:
          "唔好先講理論 — 開住螢幕由零做到出結果,做一次俾佢睇。睇完實際操作,學員嘅問題先至具體,教學先至到位。",
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

/** 顯示全名:「劉進 Jimmy Lau」;中文名留空嘅專家(Elvin Cheung)只顯示英文名 */
export function expertFullName(expert: Expert): string {
  return [expert.nameZh, expert.nameEn].filter(Boolean).join(" ");
}

/** 有真實肖像(public/ 路徑)而非 monogram data URI */
export function expertHasPhoto(expert: Expert): boolean {
  return expert.image.startsWith("/");
}
