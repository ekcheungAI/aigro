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
  nameZh: string;
  title: string;
  /**
   * Ask.tsx 專家變體 header 使用(不可改 Ask.tsx)。
   * 領航專家唔用生成人像 — 用 brand-color monogram SVG data URI;
   * 頁面頭像統一用 MonogramAvatar 組件。
   */
  image: string;
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
    nameZh: "張曉峰",
    title: "SuperBash 主理人 · AIGRO 領航專家",
    image: monogramUri("#8A5A44", "EC"),
    verified: true,
    specialties: ["Growth Hacking", "社群增長", "私域運營"],
    quote: "增長唔係想出嚟,係試出嚟 — 數據說話,快速試錯。",
    achievements: "SuperBash 主理人 · AIGRO 聯合發起 · 增長實驗策動者",
    brandColor: "#8A5A44",
    credential: "SUPERBASH 主理人・AIGRO 領航專家・香港",
    verifiedDate: "2025-06",
    bio: "透過 SuperBash 策動增長實驗與社群,擅長將海外 growth playbook 本地化落地香港。主張數據說話、快速試錯 — 而家作為 AIGRO 領航專家,帶住成個 club 用實驗節奏做增長。",
    metrics: [
      { value: "SuperBash", label: "主理人・增長實驗社群" },
      { value: "AIGRO", label: "聯合發起・領航專家" },
      { value: "本地化", label: "海外 growth playbook 落地香港" },
      { value: "快速試錯", label: "數據說話的實驗文化" },
    ],
    transparency:
      "此 AI 分身基於 Elvin 嘅公開分享與授權內容蒸餾,知識庫經本人審核。分身回答僅代表其增長方法論,唔代表本人即時意見;內容僅供參考,唔構成任何專業建議。",
    viewpoints: [
      {
        title: "Growth hacking 唔係招數,係實驗節奏",
        summary: "每星期一個假設、一個實驗、一個覆盤。",
      },
      {
        title: "海外 playbook 要本地化,唔係複製貼上",
        summary: "香港用戶嘅信任路徑,同歐美完全唔同。",
      },
      {
        title: "社群先於流量",
        summary: "一千個真會員,好過十萬個路人粉絲。",
      },
      {
        title: "活動唔係終點,係私域嘅起點",
        summary: "活動後 48 小時嘅跟進,決定大部分留存。",
      },
      {
        title: "意見可以有好多個,實驗結果只有一個",
        summary: "用最小成本,驗證最大嘅假設。",
      },
      {
        title: "快速試錯嘅前提,係低成本試錯",
        summary: "將實驗做到一星期內有結果,失敗都係賺咗數據。",
      },
      {
        title: "增長漏斗第一步,永遠係「被人記住」",
        summary: "冇記憶點嘅曝光,等於冇發生過。",
      },
      {
        title: "私域運營嘅核心係「有來有往」",
        summary: "單向廣播嘅群組,好快就會死。",
      },
      {
        title: "香港市場細,正好做高密度實驗",
        summary: "小市場反饋快,驗證完先複製出海。",
      },
      {
        title: "口碑係唯一唔使續費嘅渠道",
        summary: "設計「值得講」嘅體驗,好過加大廣告預算。",
      },
    ],
    askIntro:
      "基於授權知識庫回答,附觀點出處。問佢 growth hacking、社群增長、活動策劃與私域運營嘅問題。",
    promptVersion: "v1.0",
    kbUpdated: "2026-07",
    radar: [
      { label: "實驗速度", score: 94, note: "由諗法到落地試,以日計、唔以月計。" },
      { label: "增長直覺", score: 87, note: "將海外 playbook 本地化嘅判斷快而準。" },
      { label: "社群洞察力", score: 86, note: "睇得穿社群嘅真互動同假熱鬧。" },
      { label: "數據先行", score: 90, note: "感覺唔準,實驗結果先係答案。" },
      { label: "內容爆發力", score: 78, note: "識造記憶點,但更依賴系統化測試。" },
    ],
    traits: ["快速試錯", "數據說話", "社群驅動", "敢於出手"],
    workingStyle: [
      {
        title: "決策方式",
        body: "假設先行:任何增長諗法都寫成一條可以驗證嘅假設,然後搵最平嘅方法試。數據支持先加大投入 — 唔係靠感覺落注。",
      },
      {
        title: "增長節奏",
        body: "每星期一個假設、一個實驗、一個覆盤。數據唔好就停,唔會因為「都做咗一半」而繼續 — 停得快,先試得多。",
      },
      {
        title: "社群經營",
        body: "私域係長線關係,唔係廣播頻道。活動只係槓桿:用一次線下聚會換返嚟嘅信任,之後喺私域慢慢經營。",
      },
    ],
    heuristics: [
      {
        name: "最小實驗律",
        whenToUse: "任何增長諗法未驗證之前。",
        example:
          "想試新渠道?唔使即刻落廣告 — 先喺社群出個 post 試水溫,或者整一頁簡單 landing page 收 email。有反應,先加大投入。",
      },
      {
        name: "數據否決權",
        whenToUse: "團隊對某個方向各執一詞嘅時候。",
        example:
          "感覺唔準,數據先至準。兩個版本揀邊個?唔係開會投票,係做一星期 A/B test,由點擊率話事。",
      },
      {
        name: "私域優先律",
        whenToUse: "決定資源投放喺公域定私域嘅時候。",
        example:
          "流量係租返嚟,名單先係資產。廣告一停流量就停;但一個願意開你訊息嘅名單,可以陪你好多年。",
      },
      {
        name: "覆盤不過夜",
        whenToUse: "每個實驗或者活動結束之後。",
        example:
          "結果 24 小時內要覆盤:預期係咩、實際係咩、下次點改。拖過一週,細節就唔記得晒,實驗等於白做。",
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
