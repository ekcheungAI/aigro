import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  Clock3,
  Database,
  ExternalLink,
  FileCheck2,
  FileText,
  Layers3,
  Library,
  MessageSquareText,
  Network,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";

const COURSE_URL =
  "https://dotai.hk/academy/100x-ai-growth-marketer-level-1-level-2-21-hours";
const COURSE_IMAGE =
  "https://framerusercontent.com/images/JkhpxyB22gtACenKHlpHHjKsLqg.png?scale-down-to=1024&width=1672&height=941";
const COURSE_VISUALS = {
  overview:
    "https://framerusercontent.com/images/5PnTDRcZlngo63alnKkJopiu4Ug.png?width=887&height=1774",
  team:
    "https://framerusercontent.com/images/MllFd6la1XRFK2YYauQ57rp0.png?width=887&height=1774",
  funnel:
    "https://framerusercontent.com/images/vUGqQHjHOkrKANFjZzXLrWK014.png?width=887&height=1774",
  system:
    "https://framerusercontent.com/images/psC5XLqUKu6fiK00DE5qLCYJvXk.png?width=887&height=1774",
  outcomes:
    "https://framerusercontent.com/images/S0VtqEdOqgpRbAQAi3hgvVX3E.png?width=887&height=1774",
} as const;

const COURSE_LINKS = [
  {
    title: "三段導讀路線",
    body: "由 Brand Brain、內容與 Funnel，行到可持續改善嘅 Marketing OS。",
    href: "#route",
    external: false,
    cta: "查看導讀路線",
  },
  {
    title: "分章學習筆記",
    body: "逐章睇概念、公開課程圖解、實作任務同 review 標準。",
    href: "#notes",
    external: false,
    cta: "閱讀四章筆記",
  },
  {
    title: "課程產出與工具",
    body: "了解學完可帶走嘅系統、工具層同報讀前資料。",
    href: "#system",
    external: false,
    cta: "查看系統產出",
  },
  {
    title: "時間、形式與報讀資料",
    body: "核對 21 小時課程、開班日期、上堂形式同公開價格。",
    href: "#course-info",
    external: false,
    cta: "查看課程資料",
  },
  {
    title: "官方課程資料",
    body: "查看最新開班安排、名額、價格同正式報讀條款。",
    href: COURSE_URL,
    external: true,
    cta: "到 DotAI 核對資料",
  },
] as const;

const COURSE_FACTS: Array<{
  icon: LucideIcon;
  label: string;
  value: string;
}> = [
  { icon: Clock3, label: "學習時數", value: "21 小時" },
  { icon: Layers3, label: "課程階段", value: "Level 1 + Level 2" },
  { icon: CalendarDays, label: "開班日期", value: "2026 年 8 月 25 日" },
  { icon: Clock3, label: "上堂時間", value: "19:30–22:30" },
  { icon: Users, label: "上堂形式", value: "實體・網上・重播" },
  { icon: BookOpen, label: "學習福利", value: "永久網上重溫" },
];

const CORE_SHIFTS = [
  {
    number: "01",
    title: "由單次 prompt 到 Brand Brain",
    body: "將品牌定位、客群、語氣、案例與內容邊界整理成 AI 團隊共用嘅公司背景。",
  },
  {
    number: "02",
    title: "由一人出文到 5 位 AI 員工協作",
    body: "把研究、策劃、製作、Funnel 與 QA 拆成角色、交接規則同驗收標準。",
  },
  {
    number: "03",
    title: "由內容曝光到可追蹤 Funnel",
    body: "將 Landing Page、表單、CRM、Sales Routing、提醒同日曆接成一條增長路徑。",
  },
  {
    number: "04",
    title: "由一次 Campaign 到 Marketing OS",
    body: "用 Insight、Content、Loop 三個引擎，令每次測試結果沉澱成下一輪可重用能力。",
  },
] as const;

const LEARNING_PHASES: Array<{
  icon: LucideIcon;
  level: string;
  title: string;
  summary: string;
  outcomes: readonly string[];
  image: string;
  imageAlt: string;
}> = [
  {
    icon: Brain,
    level: "PHASE 01 · LEVEL 1",
    title: "建立懂你公司嘅 AI Marketing 團隊",
    summary:
      "先建立 Codex workspace、Company Brand Brain 同人手審核規則，再安裝 5 位有清楚分工嘅 AI 員工。",
    outcomes: [
      "分清 ChatGPT 與 Codex 嘅工作角色",
      "用 AGENTS.md 統一規則與安全邊界",
      "跑通 Research → Content → CTA → QA 接力",
    ],
    image: COURSE_VISUALS.team,
    imageAlt: "由 Company Brand Brain 到 5 位 AI Marketing 員工課程圖解",
  },
  {
    icon: Library,
    level: "PHASE 02 · LEVEL 1",
    title: "把一個 Insight 變成多平台 Campaign",
    summary:
      "以同一份已確認來源同品牌規則，建立可以交接、可以 review、可以跨平台改寫嘅內容工作流。",
    outcomes: [
      "建立 Content Source Card 與 Reference Library",
      "製作 Instagram、Threads、SEO Blog、LinkedIn Skills",
      "交付 Master Draft、Carousel brief 與素材清單",
    ],
    image: COURSE_VISUALS.overview,
    imageAlt: "100x AI Growth Marketer 內容工作流與多平台分發圖解",
  },
  {
    icon: Route,
    level: "PHASE 03 · LEVEL 1",
    title: "建立由網站到 Sales 跟進嘅增長 Funnel",
    summary:
      "將內容 CTA 接入 Landing Page、表單、CRM、Sales owner 同可預約時段，讓每個 Lead 都有來源同下一步。",
    outcomes: [
      "用 Codex 建立帶內置表單嘅 Landing Page",
      "記錄 Campaign、Asset、CTA、Consent 與 Stage",
      "用匿名 Lead 完整測試並找出漏斗斷位",
    ],
    image: COURSE_VISUALS.funnel,
    imageAlt: "由內容走向轉換嘅 Sales Funnel 與 Data Loop 圖解",
  },
  {
    icon: RefreshCw,
    level: "PHASE 04 · LEVEL 2",
    title: "打造可持續改善嘅 AI Marketing OS",
    summary:
      "把市場情報、內容生產、Campaign 表現同每週回顧接成一個可管理、可展示、可持續更新嘅系統。",
    outcomes: [
      "建立 Insight、Content、Loop 三個引擎",
      "所有更新先經 Human Review 再寫回系統",
      "連接版本管理、知識庫、資料庫與 Preview",
    ],
    image: COURSE_VISUALS.system,
    imageAlt: "由 Insight、Content、Loop 三大引擎組成嘅 AI Marketing OS 圖解",
  },
];

const TEAM_ROLES = [
  { role: "Research Assistant", job: "整理來源、競品、受眾問題與 Insight" },
  { role: "Marketing Manager", job: "選定角度、Campaign 目標與工作分配" },
  { role: "Content Creator", job: "產出 Master Draft 與多平台版本" },
  { role: "Funnel Assistant", job: "連接 CTA、Landing Page、CRM 與跟進" },
  { role: "Brand & QA Reviewer", job: "檢查品牌一致性、證據與發布邊界" },
] as const;

const TIMELINE_ROWS = [
  {
    stage: "Stage 01",
    topic: "Brand Brain + AI Team",
    build: "Company Brand Brain、AGENTS.md、5 位 AI Marketing 員工",
    result: "第一條 Research → Content → CTA → QA 接力",
  },
  {
    stage: "Stage 02",
    topic: "Content workflow",
    build: "Source Card、Reference Library、4 個平台 Skills",
    result: "由一個 Insight 產出完整 Campaign Creative Pack",
  },
  {
    stage: "Stage 03",
    topic: "Sales Funnel",
    build: "Landing Page、Form、CRM、Routing、Calendar",
    result: "每個 Lead 都有來源、Owner、Stage 同下一步",
  },
  {
    stage: "Stage 04",
    topic: "Marketing OS",
    build: "Insight Engine、Content Engine、Loop Engine",
    result: "每週 review 後，將已批准學習寫回系統",
  },
] as const;

const CHAPTERS = [
  {
    number: "01",
    label: "BRAND BRAIN & AI TEAM",
    title: "先建立共同背景，再叫 AI 團隊開工",
    thesis:
      "AI 輸出之所以 generic，往往唔係模型唔夠強，而係公司背景、品牌判斷同合格標準未被寫清楚。",
    image: COURSE_VISUALS.team,
    imageAlt: "Brand Brain、5 位 AI Marketing 員工與內容工作流程公開課程圖解",
    learn: [
      "Company Brand Brain 應包含定位、產品、客群、語氣、內容支柱、證據與禁區。",
      "AGENTS.md 負責全 workspace 共用規則；每位 AI 員工再有自己嘅任務與交付格式。",
      "Research、Manager、Creator、Funnel、QA 五個角色要有明確交接，而唔係五個人同時亂做。",
    ],
    build:
      "揀一個已有資料嘅 Campaign，建立最小 Brand Brain，再用同一份 brief 交俾 5 個角色接力。",
    review:
      "每個 output 都要答到：引用咗邊份公司資料？跟咗邊條規則？下一位員工收到咩？邊一刻要人批核？",
  },
  {
    number: "02",
    label: "CONTENT REFERENCE LIBRARY",
    title: "一個 Insight，唔應該喺每個平台由零開始",
    thesis:
      "多平台內容嘅重點唔係一次過生成四篇文，而係所有版本共享來源、核心訊息、品牌規則同證據。",
    image: COURSE_VISUALS.overview,
    imageAlt: "AI Growth Marketer 內容生成、內容中心與多平台分發公開課程圖解",
    learn: [
      "Source Card 保存來源、可用論點、風險、受眾意義與建議 CTA。",
      "Master Draft 先解決邏輯，再由平台 Skills 轉成 Instagram、Threads、SEO、LinkedIn。",
      "Reference Library 保存已批准例子，令下一輪創作有可比較嘅品質基準。",
    ],
    build:
      "由一條 YouTube 影片或公開資料開始，完成 transcript 摘要、research、內容大綱、Master Draft 同四平台版本。",
    review:
      "四個版本可以有唔同結構，但核心 claim、證據、品牌語氣同 CTA 唔可以互相矛盾。",
  },
  {
    number: "03",
    label: "SALES FUNNEL & DATA LOOP",
    title: "內容完成唔係終點，要知道下一步發生咗咩",
    thesis:
      "真正增長工作流要由內容 CTA 一路追蹤到 Lead、Owner、Sales Stage 同下一輪改善，而唔只睇 likes。",
    image: COURSE_VISUALS.funnel,
    imageAlt: "Sales Landing Page、CRM、Routing 與 Data Loop 公開課程圖解",
    learn: [
      "每個 Campaign、Asset 與 CTA 都需要獨立 ID，先可以知道邊個入口帶來結果。",
      "表單提交後要有 CRM 紀錄、Sales Routing、內部通知、客戶提醒與 Calendar 選項。",
      "漏斗數據用嚟揀下一個測試變數，唔係一次過改晒成頁網站。",
    ],
    build:
      "製作一頁式 Landing Page，接入表單與 Google Sheets CRM，再用匿名 Lead 測試完整提交及分配流程。",
    review:
      "由訪客到預約之間，每一站都要有狀態、Owner、時間與失敗後嘅 fallback。",
  },
  {
    number: "04",
    label: "AI MARKETING OS",
    title: "讓有效 Campaign 變成公司下一次嘅起點",
    thesis:
      "Marketing OS 唔係一個漂亮 dashboard；佢係資料、Agent、Skill、內容、審核同更新紀錄之間嘅運作關係。",
    image: COURSE_VISUALS.system,
    imageAlt: "Insight、Content、Loop 三大引擎 AI Marketing OS 公開課程圖解",
    learn: [
      "Insight Engine 將合規來源整理成有證據、有評分、可交接嘅 Insight Card。",
      "Content Engine 只使用已批准 Insight，產出品牌一致、可 review 嘅 Content Pack。",
      "Loop Engine 由表現與 feedback 提出更新候選，經人批准先修改 Agent、Skill 或 Brand Brain。",
    ],
    build:
      "建立 OS v0：用同一個 dashboard 看見 Insight、Content、Review Queue、測試結果與下一輪建議。",
    review:
      "系統每次更新都要保留來源、版本同批核紀錄；AI 可以建議，但唔可以自行改寫公司標準。",
  },
] as const;

const SYSTEM_STEPS = [
  { icon: Search, title: "Public source", caption: "公開或已授權資料" },
  { icon: FileCheck2, title: "Approved insight", caption: "有來源、有判斷" },
  { icon: FileText, title: "Content draft", caption: "按品牌規則生成" },
  { icon: ShieldCheck, title: "Review queue", caption: "人手審核與修改" },
  { icon: Network, title: "Campaign", caption: "跨平台發布與 Funnel" },
  { icon: Database, title: "Performance", caption: "保存結果與 feedback" },
  { icon: RefreshCw, title: "Weekly update", caption: "批准後更新系統" },
] as const;

const DELIVERABLES = [
  "5 位有清楚角色與交接規則嘅 AI Marketing 員工",
  "Company Brand Brain 與共用 AGENTS.md 工作規則",
  "Content Source Card、Reference Library 與平台 Skills",
  "由一個 Insight 延伸嘅多平台 Campaign Creative Pack",
  "可測試嘅 Sales Landing Page、CRM 與 Routing Prototype",
  "由 Insight、Content、Loop 組成嘅 AI Marketing OS v0",
] as const;

const STACK = [
  { name: "Codex", role: "AI 工作空間與執行層" },
  { name: "GitHub", role: "版本、review 與協作記錄" },
  { name: "Notion", role: "內容資料庫與營運視圖" },
  { name: "Obsidian", role: "Brand Brain 與長期知識" },
  { name: "Supabase", role: "結構化資料與應用後端" },
  { name: "Vercel", role: "Preview 與網站部署" },
] as const;

const INSTRUCTORS = [
  {
    initials: "JL",
    name: "劉泰麟 Jimmy Lau",
    role: "DotAI 共同創辦人及 CMO",
    body: "專注將品牌策略、內容、視覺與 AI 應用接成可落地流程，強調由企業場景與品牌語境出發，而唔係追逐單一工具。",
  },
  {
    initials: "EC",
    name: "Elvin Cheung",
    role: "ekcheungAI、PERSKILL 創辦人及 AIGRO 聯合發起人",
    body: "以廣東話拆解 AI Agent、workflow、vibe coding 與產品化方法，重視一手來源、親自實測、限制說明同可跟隨嘅實作步驟。",
  },
] as const;

const FAQS = [
  {
    q: "需要識 Coding 先跟到嗎？",
    a: "公開課程資料列明毋須 Coding 基礎。課程會接觸 Codex、GitHub、Supabase 等工具，重點係理解工作流、資料結構同 review，而唔係先成為軟件工程師。",
  },
  {
    q: "課程以咩形式進行？",
    a: "課程提供實體、網上及重播形式，並採用小班實戰安排。實際席位與上課詳情以 DotAI 官方課程頁最新資料為準。",
  },
  {
    q: "錯過課堂可唔可以補課？",
    a: "公開資料顯示，完整課程學員可在半年內重覆參加同系列課程，亦可永久網上重溫；報名前應再向主辦方確認當期條款。",
  },
  {
    q: "呢頁係完整課堂筆記嗎？",
    a: "唔係。呢頁係根據公開課程大綱整理嘅學習地圖與導讀，目的係幫你理解課程架構、產出同系統思維，並不包含未公開嘅課堂錄音或完整教學內容。",
  },
] as const;

const ROUTE_CARDS = [
  {
    ...LEARNING_PHASES[0],
    level: "LEVEL 1 · FOUNDATION",
    title: "Brand Brain + AI Marketing Team",
    summary:
      "先建立共同公司背景、工作規則同 5 位 AI 員工，再跑通第一條可 review 嘅內容接力。",
    image: COURSE_IMAGE,
    imageAlt: "100x AI Growth Marketer Level 1 課程概覽",
  },
  {
    ...LEARNING_PHASES[2],
    level: "LEVEL 1 · GROWTH WORKFLOW",
    title: "Content + Sales Funnel",
    summary:
      "將同一個 Insight 轉成多平台 Campaign，再接入 Landing Page、CRM、Routing 同 Calendar。",
  },
  {
    ...LEARNING_PHASES[3],
    level: "LEVEL 2 · MARKETING OS",
    title: "Insight + Content + Loop Engine",
    summary:
      "將市場情報、內容、Campaign 表現同每週回顧接成一套可持續更新嘅 AI Marketing OS。",
  },
] as const;

function SectionHeading({
  eyebrow,
  title,
  body,
  id,
}: {
  eyebrow: string;
  title: string;
  body: string;
  id?: string;
}) {
  return (
    <section id={id} className="notes-section-head scroll-mt-24">
      <p className="notes-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p className="notes-section-copy">{body}</p>
    </section>
  );
}

function CheckList({ items }: { items: readonly string[] }) {
  return (
    <ul className="guide-check-list">
      {items.map((item) => (
        <li key={item}>
          <Check className="guide-check-icon" strokeWidth={1.5} aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function GrowthMarketerGuide() {
  return (
    <div className="course-notes-page">
      <section className="course-guide-hero">
        <div className="course-guide-hero-copy">
          <p className="course-guide-kicker">AIGRO CLASS REVIEW · 課堂重溫</p>
          <p className="course-guide-collaboration">
            DotAI <span aria-hidden="true">×</span> EK (ekcheungAI) · 聯合策劃及教學
          </p>
          <h1>
            100x AI Growth Marketer 養成課｜Level 1 + Level 2 導讀
          </h1>
          <p className="course-guide-lead">
            將 21 小時公開 syllabus 整理成一條可閱讀、可執行嘅學習路線：由 Company Brand
            Brain、5 位 AI 員工與多平台內容，行到 Sales Funnel、CRM 同每週 Growth Loop。
          </p>
          <div className="course-guide-actions">
            <a href="#route" className="guide-button guide-button-primary press">
              開始：三段導讀路線
            </a>
            <a
              href={COURSE_URL}
              target="_blank"
              rel="noreferrer"
              className="guide-button guide-button-secondary press"
            >
              到 DotAI 核對及報讀
              <ExternalLink className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </a>
          </div>
        </div>

        <figure className="course-guide-poster">
          <img
            src={COURSE_VISUALS.overview}
            alt="100x AI Growth Marketer 養成課公開課程圖解"
            width={887}
            height={1774}
            fetchPriority="high"
            decoding="async"
          />
        </figure>
      </section>

      <section id="course-links" className="notes-panel scroll-mt-24">
        <h2 className="notes-panel-title">導讀目錄</h2>
        <p className="notes-panel-intro">
          建議先睇完整路線，再按自己卡住嘅位置進入筆記、系統圖或課程資料。
        </p>
        <nav className="guide-link-grid" aria-label="導讀目錄">
          {COURSE_LINKS.map((item) => (
            <a
              key={item.title}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noreferrer" : undefined}
              className="guide-mini-card"
            >
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <span className="guide-mini-card-cta">
                {item.cta}
                {item.external ? (
                  <ExternalLink className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                ) : (
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                )}
              </span>
            </a>
          ))}
        </nav>
      </section>

      <section id="route" className="notes-panel notes-route-panel scroll-mt-24">
        <p className="notes-eyebrow">Learning route</p>
        <h2>由 Level 1 去到 Level 2，逐步砌出 AI Marketing 工作系統</h2>
        <p className="notes-route-intro">
          唔係一次過學晒所有工具，而係先建立品牌背景與角色，再接內容、Funnel，最後用
          Human Review 將學習寫回系統。
        </p>
        <div className="notes-route-grid">
          {ROUTE_CARDS.map((phase, index) => {
            const Icon = phase.icon;
            return (
              <article key={phase.level} className="notes-route-card">
                <img
                  src={phase.image}
                  alt={phase.imageAlt}
                  width={887}
                  height={index === 0 ? 499 : 1774}
                  loading="lazy"
                  decoding="async"
                />
                <div className="notes-route-card-copy">
                  <div className="notes-route-meta">
                    <span>{phase.level}</span>
                    <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  </div>
                  <h3>{phase.title}</h3>
                  <p>{phase.summary}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="guide-summary" aria-label="核心學習轉變">
        {CORE_SHIFTS.map((item) => (
          <div key={item.number}>
            <strong>{item.number}</strong>
            <span>{item.title}</span>
          </div>
        ))}
      </section>

      <SectionHeading
        id="overview"
        eyebrow="Course overview"
        title="21 小時，由 AI 內容使用者走到 AI Growth Builder"
        body="按公開課綱，重點唔係收藏更多工具，而係將品牌背景、角色、內容、Funnel、資料同 review 連成一套其他人都接得到嘅工作系統。"
      />

      <section className="notes-panel">
        <div className="guide-facts-grid">
          {COURSE_FACTS.map((fact) => {
            const Icon = fact.icon;
            return (
              <div key={fact.label} className="guide-fact">
                <Icon className="h-5 w-5 text-lime-text" strokeWidth={1.5} aria-hidden="true" />
                <span>{fact.label}</span>
                <strong>{fact.value}</strong>
              </div>
            );
          })}
        </div>

        <div className="guide-team-block">
          <div>
            <p className="notes-eyebrow">AI team</p>
            <h3>5 位 AI 員工，唔係 5 個 chatbot</h3>
            <p>
              每個角色都要有 input、任務、交付格式、下一位接手人同人手批核位。價值來自分工與交接，而唔係角色名。
            </p>
          </div>
          <ol>
            {TEAM_ROLES.map((member, index) => (
              <li key={member.role}>
                <span>0{index + 1}</span>
                <strong>{member.role}</strong>
                <p>{member.job}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <SectionHeading
        id="timeline"
        eyebrow="Learning timeline"
        title="文字版學習時間線"
        body="用四個 stage 快速睇清楚每段會建立咩、交付咩，以及點樣由內容工作流逐步走到完整 Marketing OS。"
      />

      <section className="notes-panel notes-table-panel">
        <div
          className="notes-table-scroll"
          role="region"
          aria-label="100x AI Growth Marketer 四階段學習時間線"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th>階段</th>
                <th>課程主題</th>
                <th>你會建立</th>
                <th>階段成果</th>
              </tr>
            </thead>
            <tbody>
              {TIMELINE_ROWS.map((row) => (
                <tr key={row.stage}>
                  <td>{row.stage}</td>
                  <td>
                    <strong>{row.topic}</strong>
                  </td>
                  <td>{row.build}</td>
                  <td>{row.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <SectionHeading
        id="notes"
        eyebrow="Teaching notes"
        title="文字版教學筆記＋重點"
        body="以下每章都用同一個骨架：先講核心概念，再展示公開課程圖解，最後列出要建立嘅 output 同可檢查嘅 review 標準。"
      />

      {CHAPTERS.map((chapter) => (
        <article key={chapter.number} className="guide-lesson scroll-mt-24">
          <p className="guide-lesson-label">
            CHAPTER {chapter.number} · {chapter.label}
          </p>
          <h3>
            {chapter.number}. {chapter.title}
          </h3>
          <p className="guide-lesson-thesis">{chapter.thesis}</p>

          <aside className="guide-lesson-visuals" aria-label={chapter.title + "課程圖解"}>
            <figure>
              <img
                src={chapter.image}
                alt={chapter.imageAlt}
                width={887}
                height={499}
                loading="lazy"
                decoding="async"
                className="guide-lesson-image-top"
              />
              <figcaption>公開課程圖解 · {chapter.label} · 上半部重點</figcaption>
            </figure>
            <figure>
              <img
                src={chapter.image}
                alt={chapter.imageAlt + "下半部"}
                width={887}
                height={499}
                loading="lazy"
                decoding="async"
                className="guide-lesson-image-bottom"
              />
              <figcaption>公開課程圖解 · {chapter.label} · 執行與成果</figcaption>
            </figure>
          </aside>

          <div className="guide-lesson-notes">
            <h4>教學筆記</h4>
            <p>{chapter.thesis}</p>

            <h4>你要理解</h4>
            <CheckList items={chapter.learn} />

            <div className="guide-action-grid">
              <section>
                <Target className="h-5 w-5 text-lime-text" strokeWidth={1.5} aria-hidden="true" />
                <h4>動手建立</h4>
                <p>{chapter.build}</p>
              </section>
              <section>
                <ShieldCheck className="h-5 w-5 text-lime-text" strokeWidth={1.5} aria-hidden="true" />
                <h4>Review 標準</h4>
                <p>{chapter.review}</p>
              </section>
            </div>
          </div>
        </article>
      ))}

      <SectionHeading
        id="system"
        eyebrow="System map"
        title="一條完整 Growth Loop，要由來源行到系統更新"
        body="AI Marketing OS 嘅核心唔係自動發布，而係每個轉換都有證據、狀態、Owner 同 Human Review，最後只把已批准嘅學習寫回系統。"
      />

      <section className="notes-panel">
        <ol className="guide-system-steps">
          {SYSTEM_STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title}>
                <div>
                  <Icon className="h-5 w-5 text-lime-text" strokeWidth={1.5} aria-hidden="true" />
                  <span>0{index + 1}</span>
                </div>
                <strong>{step.title}</strong>
                <p>{step.caption}</p>
                {index < SYSTEM_STEPS.length - 1 && (
                  <ArrowRight className="guide-system-arrow" strokeWidth={1.5} aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="notes-panel guide-outcomes-panel">
        <figure>
          <img
            src={COURSE_VISUALS.outcomes}
            alt="100x AI Growth Marketer 學員成果與工具平台圖解"
            width={887}
            height={499}
            loading="lazy"
            decoding="async"
          />
          <figcaption>DotAI 公開課程圖解 · 課程特色與學員成果</figcaption>
        </figure>
        <div className="guide-outcomes-grid">
          <section>
            <p className="notes-eyebrow">Final deliverables</p>
            <h3>按公開課綱會建立嘅系統產出</h3>
            <CheckList items={DELIVERABLES} />
          </section>
          <section>
            <p className="notes-eyebrow">Tool stack</p>
            <h3>課堂會接觸嘅系統層</h3>
            <dl>
              {STACK.map((tool) => (
                <div key={tool.name}>
                  <dt>{tool.name}</dt>
                  <dd>{tool.role}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </section>

      <SectionHeading
        eyebrow="Instructors"
        title="由 Marketing 實戰同 Builder 方法兩邊一齊帶"
        body="課程將品牌、內容、增長同系統建造放喺同一條學習路線，避免只學工具操作而欠缺商業判斷。"
      />

      <section className="notes-panel guide-instructors">
        {INSTRUCTORS.map((instructor) => (
          <article key={instructor.name}>
            <span>{instructor.initials}</span>
            <h3>{instructor.name}</h3>
            <strong>{instructor.role}</strong>
            <p>{instructor.body}</p>
          </article>
        ))}
      </section>

      <SectionHeading
        id="course-info"
        eyebrow="Course information"
        title="適合想由 AI 內容使用者，走到 Growth Builder 嘅人"
        body="尤其適合 Marketing、Content、Social、Growth、CRM、Sales Operations、中小企老闆與創業團隊。重點係建立可交接流程，而唔係要求你本身識寫程式。"
      />

      <section className="notes-panel guide-course-info">
        <div>
          <p className="notes-eyebrow">公開課程價格</p>
          <p className="guide-price">HK$21,800</p>
          <p className="guide-old-price">原價 HK$25,880</p>
          <p>AI In One 公開學員價：HK$17,440</p>
          <p className="guide-price-note">資料檢視日期：2026-08-12；最新價格以 DotAI 為準。</p>
        </div>
        <aside>
          <p className="notes-eyebrow">TC17 · 實體名額 8 位</p>
          <h3>第一期｜100x AI Growth Marketer 養成課</h3>
          <dl>
            <div>
              <dt>開班日期</dt>
              <dd>2026 年 8 月 25 日</dd>
            </div>
            <div>
              <dt>課程時數</dt>
              <dd>21 小時</dd>
            </div>
            <div>
              <dt>形式</dt>
              <dd>實體・網上・重播</dd>
            </div>
          </dl>
          <a
            href={COURSE_URL}
            target="_blank"
            rel="noreferrer"
            className="guide-button guide-button-primary press"
          >
            到 DotAI 核對資料及報讀
            <ExternalLink className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </a>
        </aside>
      </section>

      <section className="notes-panel guide-faq">
        <div>
          <p className="notes-eyebrow">FAQ</p>
          <h2 className="notes-panel-title">報讀前常見問題</h2>
        </div>
        <div>
          {FAQS.map((item) => (
            <details key={item.q}>
              <summary>
                {item.q}
                <MessageSquareText
                  className="h-5 w-5 shrink-0 text-lime-text"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="guide-next-step">
        <div>
          <p className="notes-eyebrow">Next step</p>
          <h2>如果你想由「AI 幫我出文」升級到「我管理一套 Growth System」</h2>
          <p>
            先用呢份學習地圖確認自己要建立嘅系統，再到官方頁核對最新上堂安排、名額同報讀條款。
          </p>
        </div>
        <a
          href={COURSE_URL}
          target="_blank"
          rel="noreferrer"
          className="guide-button guide-button-primary press"
        >
          查看官方課程資料
          <ExternalLink className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        </a>
      </section>

      <aside className="guide-source-note" aria-label="內容來源說明">
        <p>
          課程由 DotAI × EK（ekcheungAI）聯合策劃及教學；AIGRO 根據 DotAI 公開課程頁整理本導讀。資料檢視日期：2026-08-12；實際安排、價格、工具權限與條款以 DotAI 最新資料為準。
        </p>
        <a href={COURSE_URL} target="_blank" rel="noreferrer">
          查看內容來源
        </a>
      </aside>
    </div>
  );
}
