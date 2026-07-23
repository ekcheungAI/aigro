/** 案例庫 mock data — cases.md Section 3 + case-detail.md 全文內容 */

export type CaseIndustry = "零售" | "餐飲" | "教育" | "地產" | "專業服務";

export const CASE_INDUSTRIES: CaseIndustry[] = [
  "零售",
  "餐飲",
  "教育",
  "地產",
  "專業服務",
];

export interface CaseMetric {
  /** 顯示字串，如 "-37%"、"+2.4×"、"24/7" */
  value: string;
  label: string;
}

/** 詳情頁深度拆解內容（case-detail.md：背景 → 工具/方法 → 成果數據 → 可複製拆解） */
export interface CaseStudyDetail {
  /** H1 下 body-lg 導言 */
  lede: string;
  /** 企業規模，如「8 間分店・120 名員工」 */
  scale: string;
  /** 實施週期，如「3 個月」 */
  duration: string;
  /** 刊登月份，如「2025-01」 */
  date: string;
  /** 速覽卡底部註腳 */
  resultsNote: string;
  /** 工具棧 chips */
  toolStack: string[];
  /** 01 背景 段落 */
  background: string[];
  /** 02 工具與方法 段落 */
  methodParagraphs: string[];
  /** 03 成果數據 段落 */
  resultsParagraphs: string[];
  /** 04 可複製拆解 五步清單 */
  playbook: string[];
  /** 引文與署名 */
  quote: string;
  quoteByline: string;
}

export interface CaseStudy {
  slug: string;
  industry: CaseIndustry;
  /** 第二個 tag，如「自動化」「內容」「數據」 */
  tag: string;
  title: string;
  metrics: CaseMetric[];
  /** 一行方法摘要 */
  method: string;
  source: string;
  /** 案例紀實照片（public/cases/，3:2，muted editorial） */
  image: string;
  detail: CaseStudyDetail;
}

export const cases: CaseStudy[] = [
  {
    slug: "cha-chaan-teng-ai-scheduling",
    industry: "餐飲",
    tag: "自動化",
    title: "連鎖茶餐廳用 AI 排班與預測備貨，8 間分店全面落地",
    metrics: [
      { value: "-37%", label: "排班工時" },
      { value: "+18%", label: "翻枱率" },
      { value: "-22%", label: "食材浪費" },
    ],
    method: "Claude + Make 串接 POS 數據，每日自動生成排班表與備貨建議",
    source: "AIGRO 學員成果",
    image: "/cases/cha-chaan-teng.jpg",
    detail: {
      lede: "一間 8 店連鎖茶餐廳，用三個月時間將排班與備貨決策交給 AI 輔助 — 店長從每週 6 小時的 Excel 地獄解放，食材浪費同步下降。",
      scale: "8 間分店・120 名員工",
      duration: "3 個月",
      date: "2025-01",
      resultsNote: "實施 3 個月後對比基線月份",
      toolStack: ["Claude", "Make", "Google Sheets", "POS 系統 API"],
      background: [
        "這間茶餐廳集團在香港有 8 間分店，排班一直依賴各店店長的經驗與 Excel。痛點有三：店長每週花 5–6 小時排班；繁忙時段人手預測失準，閒時過剩、旺時崩潰；備貨靠感覺，凍肉與菜類浪費率長期高企。集團營運總監是 AIGRO 學員，決定以數據驅動方式重建流程。",
      ],
      methodParagraphs: [
        "第一步，將兩年 POS 銷售數據與天氣、公眾假期數據整理進 Google Sheets；第二步，用 Make 建立自動化流程，每晚將數據交給 Claude 分析，生成翌日每兩小時時段的人手建議與備貨清單；第三步，店長在平板確認或微調 — AI 提建議，人做決定。首月只在一間分店試行，驗證準確度後推至全線。",
      ],
      resultsParagraphs: [
        "三個月後對比基線月份：排班工時 -37%（每店每週 6 小時 → 3.8 小時）；翻枱率 +18%（繁忙時段人手與客流匹配改善）；食材浪費 -22%（備貨預測誤差率由 31% 降至 12%）。額外發現：員工加班時數下降 15%，流失率同步改善 — 這是項目啟動時未預期的收益。",
      ],
      playbook: [
        "盤點你手上已有的數據（POS、預約、客服記錄），先不買新工具",
        "選一個高頻、規則明確、錯誤成本低的決策點（排班、備貨、跟進訊息是好起點）",
        "單點試行一個月，設定量化的成敗線",
        "AI 出建議、人做決定 — 保留人類否決權是合規與品質的底線",
        "驗證有效才橫向複製，每次只擴一間店/一條線",
      ],
      quote: "最驚喜不是慳咗時間，係店長終於有時間行落樓面同客傾偈。",
      quoteByline: "— 集團營運總監・連鎖茶餐廳（匿名處理）",
    },
  },
  {
    slug: "tutorial-centre-ai-grading",
    industry: "教育",
    tag: "內容",
    title: "補習社以 AI 批改與個人化練習，導師時間放回教學",
    metrics: [
      { value: "-55%", label: "批改時間" },
      { value: "+2.4×", label: "練習內容產出" },
      { value: "92%", label: "家長滿意度" },
    ],
    method: "GPT-5 批改 DSE 英文作文 + 自動生成針對性練習卷",
    source: "Build in Public 社群",
    image: "/cases/tutorial-centre.jpg",
    detail: {
      lede: "一間三分校補習社，導師曾經每週近三成工時花在批改與出卷。導入 AI 批改與個人化練習生成後，導師時間重新放回課堂與弱項面授。",
      scale: "3 間分校・18 名導師",
      duration: "4 個月",
      date: "2024-11",
      resultsNote: "實施 4 個月後對比上學期同月",
      toolStack: ["GPT-5", "Google Classroom", "Make", "Google Sheets"],
      background: [
        "這間補習社主打 DSE 英文與數學，三間分校共 18 名導師。痛點清晰：英文作文批改每篇需 20–30 分鐘，導師放工後仍要帶作文回家；練習卷由導師各自出題，質素參差、重複勞動嚴重；家長要求進度報告，導師卻沒有時間整理數據。創辦人在 Build in Public 社群分享過程，決定從批改環節入手。",
      ],
      methodParagraphs: [
        "第一步，把考評局評分準則與歷年高分範文整理成固定 prompt 框架，GPT-5 按內容、語言、組織三維批改 DSE 英文作文，輸出逐段修改建議；第二步，系統根據每位學生的錯誤類型，自動生成針對性練習卷，經導師五分鐘覆核後經 Google Classroom 派發；第三步，批改數據自動滙入 Google Sheets，每月生成家長進度報告。所有 AI 批改結果必須經導師覆核才發還學生 — AI 做初稿，導師做把關。",
      ],
      resultsParagraphs: [
        "四個月後對比上學期同月：批改時間 -55%（每篇作文由 25 分鐘降至約 11 分鐘，含覆核）；練習內容產出 +2.4×（同一導師每週可支援的個人化練習卷數量）；家長滿意度 92%（學期末問卷，較之前上升 14 個百分點）。額外發現：學生重交修改版作文的比例上升近一倍 — 更快的回饋循環改變了學習行為。",
      ],
      playbook: [
        "把評分準則白紙黑字寫進 prompt，AI 批改才有穩定標準",
        "由單一科目、單一年級開始試行，先證明準確度再談擴展",
        "AI 批改結果必須經導師覆核 — 教育行業的信任底線不能省",
        "把錯誤數據沉澱下來，個人化練習才有彈藥",
        "定期向家長展示數據，滿意度本身也是續報率的來源",
      ],
      quote: "學生以為我哋請多咗老師，其實係老師終於有時間教書。",
      quoteByline: "— 創辦人・連鎖補習社（匿名處理）",
    },
  },
  {
    slug: "property-agency-ai-copywriting",
    industry: "地產",
    tag: "內容",
    title: "地產代理行以 AI 生成樓盤文案與跟進訊息",
    metrics: [
      { value: "+31%", label: "查詢轉化率" },
      { value: "-70%", label: "文案製作時間" },
    ],
    method:
      "以樓盤資料庫驅動 Claude 生成中英雙語文案，WhatsApp 跟進訊息按客戶階段自動起草",
    source: "AIGRO 學員成果",
    image: "/cases/real-estate.jpg",
    detail: {
      lede: "一間兩分行地產代理行，40 名前線代理各自為政寫文案。以樓盤資料庫驅動 AI 後，全行口吻統一，代理的時間回到睇樓與議價上。",
      scale: "2 間分行・40 名代理",
      duration: "2 個月",
      date: "2024-12",
      resultsNote: "實施 2 個月後對比基線月份",
      toolStack: ["Claude", "Airtable", "WhatsApp Business API", "Make"],
      background: [
        "這間代理行深耕港島區二手盤，兩間分行共 40 名代理。痛點在內容：每個新盤要出中英兩版文案放搵樓平台與社交媒體，代理文筆參差，同一屋苑出現十種寫法；跟進訊息靠代理個人發揮，新查詢回覆慢、舊客疏於跟進；管理層亦擔心誇大用詞觸犯地產代理監管局指引。分行經理是 AIGRO 學員，決定把內容流程標準化。",
      ],
      methodParagraphs: [
        "第一步，把全行樓盤資料結構化進 Airtable：地區、實用面積、間隔、叫價、賣點、校網、交通；第二步，Make 每晚將新盤資料交給 Claude，按固定模板生成中英雙語文案，並以禁用詞清單過濾誇大字眼；第三步，WhatsApp 跟進訊息按客戶階段（新查詢／已睇樓／猶豫中）自動起草，代理按 send 前可改 — AI 起草，代理把關。",
      ],
      resultsParagraphs: [
        "兩個月後對比基線月份：查詢轉化率 +31%（文案統一賣點前置，搵樓平台查詢到約睇的轉化改善）；文案製作時間 -70%（每盤中英兩版由約 60 分鐘降至 18 分鐘，含人工覆核）。額外發現：新入職代理的跟進訊息質素即時追上資深同事 — 模板成了最快的入職培訓。",
      ],
      playbook: [
        "先把資料結構化 — AI 文案的質素上限由你的資料庫決定",
        "建立禁用詞與合規清單，行業監管要求寫進流程而不是靠人記",
        "按客戶階段設計訊息模板，新查詢與猶豫客不該收到同一番話",
        "保留代理最終修改權 — 本地知識與人情味是 AI 寫不出的",
        "每季檢視一次模板，市況轉變時口吻也要轉",
      ],
      quote: "以前寫一個盤要成個鐘，而家十分鐘出到中英兩版，仲統一咗全行口吻。",
      quoteByline: "— 分行經理・地產代理行（匿名處理）",
    },
  },
  {
    slug: "ecommerce-ai-support-automation",
    industry: "零售",
    tag: "自動化",
    title: "網店 AI 客服 + 訂單自動化，一個人營運三個品牌",
    metrics: [
      { value: "-42%", label: "客服成本" },
      { value: "24/7", label: "即時回應" },
      { value: "+15%", label: "回購率" },
    ],
    method: "Shopify + AI 客服串接訂單系統，常見查詢全自動，複雜個案才轉人工",
    source: "當事人授權刊登",
    image: "/cases/ecommerce.jpg",
    detail: {
      lede: "一人公司同時營運三個 Shopify 品牌。AI 客服分流系統處理八成查詢、訂單流程全自動，店主的時間放回選品與供應鏈。",
      scale: "1 人團隊・3 個品牌",
      duration: "6 星期",
      date: "2024-10",
      resultsNote: "實施 6 星期後對比基線月份",
      toolStack: ["Shopify", "GPT-5", "Make", "WhatsApp Business API"],
      background: [
        "當事人獨自營運三個利基品牌，客群橫跨香港與東南亞。痛點是一人分飾多角：客服查詢八成是重複問題（訂單狀態、運費、退貨政策），卻日夜不停湧入；訂單確認、出貨通知、缺貨跟進全靠手動；凌晨查詢無人回應，直接流失訂單。他曾嘗試請兼職客服，但訓練成本與品質波動令成效不彰。",
      ],
      methodParagraphs: [
        "第一步，把三個品牌的 FAQ、退換政策與語氣指引整理成知識庫；第二步，AI 分流系統判斷查詢類型與複雜度 — 簡單查詢即時以顧客所用語言（廣東話、書面中文或英文）回答，複雜個案（退款爭議、損壞索償）轉人工並附上摘要；第三步，Make 串接 Shopify 訂單系統，確認、出貨、缺貨通知全自動，WhatsApp 與 email 雙軌並行。店主每天早上用十五分鐘處理轉人工個案。",
      ],
      resultsParagraphs: [
        "六星期後對比基線月份：客服成本 -42%（終止兼職客服合約，AI 用量成本僅為原支出六成）；24/7 即時回應（凌晨查詢平均回應時間由 9 小時降至 1 分鐘內）；回購率 +15%（出貨與售後通知自動化後，顧客體驗評分上升）。額外發現：AI 轉人工時附上的摘要，令店主處理複雜個案的時間也縮短了一半。",
      ],
      playbook: [
        "先統計你的查詢分佈 — 如果八成是重複問題，你就該自動化",
        "知識庫先於模型：政策、語氣、禁用承諾都要白紙黑字",
        "設定清晰的轉人工界線 — 涉及金錢與情緒的個案不交給 AI",
        "轉人工必附摘要，別讓顧客重複講一次問題",
        "保留一條真人通道並寫明回應時限，信任比自動化率重要",
      ],
      quote: "凌晨三點嘅查詢都有人答 — 嗰個『人』唔使瞓覺。",
      quoteByline: "— 品牌創辦人（當事人授權刊登）",
    },
  },
  {
    slug: "accounting-firm-ai-audit",
    industry: "專業服務",
    tag: "數據",
    title: "會計師樓以 AI 做文件審核前期處理",
    metrics: [
      { value: "-60%", label: "核數前期時間" },
      { value: "0", label: "宗資料外洩" },
    ],
    method: "本地部署開源模型（MiniMax M2）處理敏感文件分類與初審，合規優先",
    source: "Build in Public 社群",
    image: "/cases/accounting.jpg",
    detail: {
      lede: "一間中型會計師樓，每年核數季被海量敏感文件淹沒。以本地部署的開源模型做分類與初審 — 資料從不離開辦公室，合規與效率同時達標。",
      scale: "35 名專業人員",
      duration: "5 個月",
      date: "2024-09",
      resultsNote: "實施 5 個月後對比上一核數季",
      toolStack: ["MiniMax M2", "本地伺服器", "Python", "內部文件系統"],
      background: [
        "這間會計師樓服務中小企客戶，35 名專業人員。核數前期處理是公認的樽頸：客戶交來的單據、銀行月結單、合約格式五花八門，初級員工要花大量時間分類、核對與摘錄；管理層曾評估雲端 AI 服務，但客戶文件受專業保密責任約束，資料不能經第三方伺服器 — 這是硬底線，不是偏好。",
      ],
      methodParagraphs: [
        "第一步，在內部伺服器部署開源模型 MiniMax M2，整個推理過程在公司內網完成，無任何外連；第二步，以 Python 建立文件管線：掃描件 OCR → 按文件類型分類（單據／月結單／合約）→ 抽取關鍵欄位並與帳目初核 → 標記異常項目交專業人員覆核；第三步，所有 AI 輸出附信心評分，低於門檻一律轉人工。項目由合夥人直接督導，每一步都留下審計記錄。",
      ],
      resultsParagraphs: [
        "五個月後對比上一核數季：核數前期時間 -60%（文件分類與初步核對由每客平均 14 小時降至 5.6 小時）；0 宗資料外洩（全部推理於內網完成，並通過年度資訊安全審查）。額外發現：異常標記的命中率達 78%，初級員工從重複勞動轉向覆核與判斷 — 工作內容的升級比工時節省更有長遠價值。",
      ],
      playbook: [
        "先定合規底線，再選技術方案 — 順序反了項目注定失敗",
        "敏感行業優先評估可本地部署的開源模型，雲端不是唯一選項",
        "AI 輸出必附信心評分，低於門檻自動轉人工",
        "每個自動化決策保留審計記錄，專業行業的責任鏈不能斷",
        "把釋放出來的初級人力投向覆核與判斷，而不是裁減 — 這是品質保證",
      ],
      quote: "客戶最關心嘅唔係快幾多，係資料有冇離開過我哋嘅伺服器 — 答案係冇。",
      quoteByline: "— 合夥人・會計師樓（匿名處理）",
    },
  },
];

/** 首頁精選（home.md Section 3 — 僅 Case A / B） */
export const featuredCases: CaseStudy[] = cases.slice(0, 2);

/** 以 slug 取案例 */
export function getCaseBySlug(slug: string): CaseStudy | undefined {
  return cases.find((c) => c.slug === slug);
}

/** 相關案例（case-detail.md Section 5 — 排除自身，取 3 張） */
export function relatedCases(slug: string, count = 3): CaseStudy[] {
  return cases.filter((c) => c.slug !== slug).slice(0, count);
}
