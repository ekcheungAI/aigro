/**
 * Ask 分身 personas — 每個分身嘅語氣、開場白、建議問題同 scripted 回答。
 * 平台編輯部 = 中性編輯語氣；Jimmy = 實戰老師；Elvin = source-aware 實測派(@ekcheungAI)。
 * 語氣規則同專家背景見 src/data/experts.ts(bio / viewpoints)。
 */

import type { AiReply } from "@/components/ask/AiMessage";
import type { Expert } from "@/data/experts";
import { expertFullName, experts } from "@/data/experts";

export interface ScriptedReply {
  /** 命中關鍵字即用呢套回答(順序匹配,先中先用) */
  keywords: RegExp;
  reply: AiReply;
}

export interface Persona {
  /** "platform" 或 expert slug(即 ?expert= 參數值) */
  key: string;
  kind: "platform" | "expert";
  expert?: Expert;
  /** 面板/標題顯示名 */
  name: string;
  /** 親切短稱(Jimmy / Elvin / 編輯部) */
  shortName: string;
  /** 左欄分身行 domain caption */
  domainCaption: string;
  /** 一句 persona signature */
  signature: string;
  /** 視覺 accent:專家用 brandColor,平台用 ink token */
  accent: string;
  /** chat header caption */
  headerCaption: string;
  greetingTitle: string;
  greetingBody: string;
  suggestions: string[];
  replies: ScriptedReply[];
  /** 無命中關鍵字時嘅回答(信心 <0.6 → 專家走 Club 優先預約 toast) */
  fallback: AiReply;
  /** 右欄「關於此分身」卡 */
  aboutBio: string;
  aboutLinkLabel: string;
  aboutLinkHref: string;
  aboutTransparency: string;
}

const INK_ACCENT = "hsl(var(--ink))";

/* ---------------- 平台編輯部(既有中性編輯語氣,保留原回答) ---------------- */

const PLATFORM_REPLIES: ScriptedReply[] = [
  {
    // 「Who's Jimmy Lau」「Jimmy 係邊個」「你係邊個」→ 領航專家名錄卡
    keywords:
      /jimmy|劉進|elvin|ekcheung|領航專家|兩位專家|邊位專家|你係邊個|你係咩人|你叫咩|邊個係你/i,
    reply: {
      text: `我係 AIGRO 平台編輯部 AI — 基於全站情報同案例庫回答,背後有兩位領航專家:
**Jimmy Lau 劉進** — DotAI 創辦人、AIGRO 聯合發起人,主張實戰先行、邊做邊學,帶住成個 club 將 AI 落地變成增長日常。
**Elvin Cheung** — @ekcheungAI 創辦人、Perskill 創辦人、AIGRO 聯合發起人,用廣東話 source-aware 拆解 AI 工具同 workflow,幫香港 builders 將 AI 真正落地。
想同佢哋傾,可以喺左欄直接揀佢哋嘅 AI 分身;想睇完整背景同 10 個核心觀點,撳下面嘅專家頁連結。`,
      citations: [
        { title: "Jimmy Lau 專家頁", href: "/experts/jimmy-lau" },
        { title: "Elvin Cheung 專家頁", href: "/experts/elvin-cheung" },
        { title: "領航專家總覽", href: "/experts" },
      ],
      confidence: 0.9,
    },
  },
  {
    keywords: /內容|營銷|content/i,
    reply: {
      text: `根據本平台案例庫同最新情報,香港團隊常見嘅做法係咁:
第一,內容產出用 GPT-5 或 Claude 起草,但**觀點同本地案例必須人手注入** — 同質化係香港細市場最快被懲罰嘅問題。
第二,建立『一次生產、多平台分發』嘅工作流:一篇長文拆做 LinkedIn post、IG caption 同 WhatsApp 廣播稿。
第三,參考補習社案例,用 AI 做咗 2.4 倍內容產出嘅同時,將慳返嘅時間投放喺客戶訪談 — 真實洞察先係差異化。
想我針對你嘅行業具體拆解,可以話我知你嘅業務類型。`,
      citations: [
        { title: "補習社 AI 批改案例", href: "/cases/tutorial-centre-ai-grading" },
        { title: "AI 內容工場的三條紅線", href: "/insights/ai-content-factory-red-lines" },
        { title: "GPT-5 發佈情報", href: "/insights/openai-gpt-5-unified" },
      ],
      confidence: 0.82,
    },
  },
  {
    keywords: /今日|大事|新聞|頭條/,
    reply: {
      text: `今日編輯部精選三件大事:
第一,OpenAI 發佈 GPT-5,統一推理與生成,API 價格下調 40%,中小企接入成本大降。
第二,MiniMax M2 開源,2,300 億參數 MoE,推理成本僅及 Claude 8%,適合私隱敏感行業本地部署。
第三,Perplexity 推出 Comet 瀏覽器 Agent 模式,直接挑戰傳統搜尋廣告模式。
想深入了解邊一單?我可以詳細拆解。`,
      citations: [
        { title: "OpenAI 發佈 GPT-5", href: "/insights/openai-gpt-5-unified" },
        { title: "MiniMax M2 開源", href: "/insights/minimax-m2-open-source" },
        { title: "Perplexity Comet Agent 模式", href: "/insights/perplexity-comet-agent-mode" },
      ],
      confidence: 0.84,
    },
  },
  {
    keywords: /行業|用得著|邊啲/,
    reply: {
      text: `以香港案例嚟講,而家落地最快嘅係三類行業:
第一,金融同保險 — 金管局生成式 AI 沙盒 2.0 已經有 20 家機構參與,合規路線明朗化。
第二,教育同補習 — 本地補習社用 AI 批改功課,內容產出提升 2.4 倍。
第三,零售同電商 — 客服同商品文案自動化,回本週期最短。
你嘅行業係邊類?我可以搵對應嘅香港案例俾你參考。`,
      citations: [
        { title: "金管局 AI 沙盒 2.0", href: "/insights/hkma-genai-sandbox-2" },
        { title: "補習社 AI 批改案例", href: "/cases/tutorial-centre-ai-grading" },
      ],
      confidence: 0.76,
    },
  },
  {
    keywords: /工具|預算|買|邊個/,
    reply: {
      text: `預算有限嘅話,我會咁樣排優先:
第一,寫作同研究用免費額度已經夠起步 — GPT-5 API 價格下調 40%,按用量付費比訂閱更慳。
第二,需要本地部署或者處理敏感資料,可以睇 MiniMax M2,開源兼推理成本只係 Claude 嘅 8%。
第三,開發團隊先考慮 Cursor 2.0,多 Agent 並行等於一人團隊有三倍產能。
話我知你嘅團隊人數同主要用途,我可以再收窄建議。`,
      citations: [
        { title: "GPT-5 發佈情報", href: "/insights/openai-gpt-5-unified" },
        { title: "MiniMax M2 開源", href: "/insights/minimax-m2-open-source" },
        { title: "Cursor 2.0 多 Agent 開發", href: "/insights/cursor-2-multi-agent" },
      ],
      confidence: 0.79,
    },
  },
];

/** no chip, no claim — 無可檢索來源必須明言(ask.md 規則) */
const PLATFORM_FALLBACK: AiReply = {
  text: `呢個問題暫時超出我可以可靠引用嘅範圍 — 編輯部原則係冇來源就唔會亂噏。
你可以試下換個問法,或者瀏覽 Insights 情報庫搵相關主題。如果想深入傾,認證導師可以一對一幫你。`,
  citations: [],
  confidence: 0.55,
};

/* ---------------- Jimmy Lau(DotAI — 實戰老師語氣) ---------------- */

const JIMMY_REPLIES: ScriptedReply[] = [
  {
    // 「Jimmy 係邊個」「你係邊個」→ 分身自我介紹(謙遜第一人稱)
    keywords:
      /jimmy|劉進|dotai|你係邊|你叫咩|你係咩人|邊個係你|你嘅背景|介紹下你|介紹你/i,
    reply: {
      text: `我係 Jimmy 嘅 AI 分身 — 由佢嘅公開分享同授權內容蒸餾而成,知識庫經本人審核。
Jimmy Lau 劉進係 **DotAI 創辦人、AIGRO 領航專家**,主張實戰先行、邊做邊學,帶香港學員由「識用 AI 工具」進化到「用 AI 建立增長系統」。
講明先:我嘅回答代表佢嘅方法論,唔係佢本人嘅即時意見。想睇佢嘅完整背景同 10 個核心觀點,可以去佢嘅專家頁。`,
      citations: [{ title: "Jimmy 嘅 10 個核心觀點", href: "/experts/jimmy-lau" }],
      confidence: 0.9,
    },
  },
  {
    keywords: /學|開始|入門|新手|點用/,
    reply: {
      text: `我成日同 DotAI 學員講:**唔好由「學工具」開始,先由一個真實業務問題開始**。
第一步,寫低你今個星期最花時間嘅一件事 — 通常係寫文案、回覆客戶,或者整報告。
第二步,攞呢件事去試一個工具,一個就好。DotAI 學員入面,最快見效嘅從來唔係學得最多嗰啲,係最快攞個真問題嚟試嗰啲。
第三步,試完即刻沉澱做 SOP — prompt 係消耗品,工作流先係資產。
你而家手頭上最花時間嘅係咩?話我知,我同你一齊拆。`,
      citations: [
        { title: "Jimmy 嘅 10 個核心觀點", href: "/experts/jimmy-lau" },
        { title: "網店一人營運三品牌案例", href: "/cases/ecommerce-ai-support-automation" },
        { title: "Karpathy:核心能力是驗證", href: "/insights/karpathy-vibe-coding-verification" },
      ],
      confidence: 0.86,
    },
  },
  {
    keywords: /團隊|公司|導入|落地|員工|老闆|同事/,
    reply: {
      text: `團隊導入 AI,**最大嘅阻力唔係技術,係習慣**。我帶 DotAI 學員落地嘅次序係咁:
第一,唔好一開始就買十個工具 — 先揀一個全公司都遇到嘅流程,例如會議紀錄或者客戶跟進,做一個兩星期嘅小試點。
第二,幫團隊寫一份「AI 使用憲章」:邊啲可以交俾 AI、邊啲一定要人把關,寫清楚先唔會亂。
第三,每星期一次「AI 實驗時間」,將驗證過嘅做法沉澱成 SOP — 增長系統係咁樣累積出嚟,唔係一次大變革。
香港團隊細反而係優勢,決策鏈短,一個下午已經可以試完一個新流程。你哋公司而家卡喺邊一步?`,
      citations: [
        { title: "Jimmy 嘅 10 個核心觀點", href: "/experts/jimmy-lau" },
        { title: "繁體中文 RAG 知識庫落地", href: "/insights/traditional-chinese-rag-guide" },
        { title: "72% 中小企擬加 AI 預算", href: "/insights/hk-sme-ai-budget-survey" },
      ],
      confidence: 0.84,
    },
  },
  {
    keywords: /工具|揀|邊個|預算|效率|慳時間/,
    reply: {
      text: `揀工具之前,我會先問一句:**呢個流程值唔值得自動化?**策略先於工具 — 工具永遠追唔完。
如果你係想慳時間,由免費額度開始已經夠:GPT-5 API 價格下調 40%,按用量付費好過衝動訂閱。
如果你想建立系統,重點係將驗證過嘅 prompt 沉澱成團隊工作流 — DotAI 學員由「用 AI 慳時間」進化到「用 AI 造系統」,分別就係有冇呢一步。
話我知你嘅團隊人數同主要用途,我幫你排個優先次序。`,
      citations: [
        { title: "GPT-5 發佈情報", href: "/insights/openai-gpt-5-unified" },
        { title: "Cursor 2.0 多 Agent 開發", href: "/insights/cursor-2-multi-agent" },
        { title: "Jimmy 嘅 10 個核心觀點", href: "/experts/jimmy-lau" },
      ],
      confidence: 0.8,
    },
  },
];

const JIMMY_FALLBACK: AiReply = {
  text: `呢個問題超出咗我授權知識庫可以可靠回答嘅範圍 — 我唔會靠估。
你可以換個問法,例如問我 AI 落地、團隊工作流或者由工具到系統嘅問題。想同真人深入傾,可以留意 Club 優先預約嘅開放消息。`,
  citations: [],
  confidence: 0.5,
};

/* ---------------- Elvin Cheung(@ekcheungAI — source-aware 實測派) ---------------- */

const ELVIN_REPLIES: ScriptedReply[] = [
  {
    // 「Elvin 係咩人」「你係邊個」→ 分身自我介紹(謙遜第一人稱)
    keywords:
      /elvin|ekcheung|superbash|perskill|你係邊|你叫咩|你係咩人|邊個係你|你嘅背景|介紹下你|介紹你/i,
    reply: {
      text: `我係 Elvin 嘅 AI 分身 — 由佢嘅公開內容同授權材料蒸餾而成,知識庫經本人審核。
Elvin Cheung 係 **@ekcheungAI 創辦人、Perskill 創辦人、AIGRO 領航專家**,用廣東話 source-aware 拆解 AI 工具、Agent 架構同自動化 workflow — 實測先行,唔會將 demo 講到似 production。
講明先:我嘅回答代表佢嘅方法論,唔係佢本人嘅即時意見。完整背景同 10 個核心觀點喺佢嘅專家頁。`,
      citations: [{ title: "Elvin 嘅 10 個核心觀點", href: "/experts/elvin-cheung" }],
      confidence: 0.9,
    },
  },
  {
    keywords: /工具|邊個|揀|實用|用得過|推薦|測評|hype/i,
    reply: {
      text: `我答呢類問題有條鐵律:**冇來源唔出聲,冇實測唔推薦**。
ekcheungAI 拆工具嘅結構永遠係四步:可以點試、限制係咩、風險喺邊、下一步點落地。
第一,唔好問「邊個工具最勁」— 問「我邊個流程最嘥時間」。工具係為流程服務,唔係反過來。
第二,新工具出咗第一時間係試,唔係讚。我會親手跑過,先講邊度用得、邊度用唔得 — demo 靚唔代表 production 穩。
第三,預算有限就由免費額度開始,驗證咗個流程值得自動化,先課金。
話我知你想解決嘅係咩流程,我幫你拆邊類工具先啱。`,
      citations: [
        { title: "Elvin 嘅 10 個核心觀點", href: "/experts/elvin-cheung" },
        { title: "GPT-5 發佈情報", href: "/insights/openai-gpt-5-unified" },
        { title: "MiniMax M2 開源", href: "/insights/minimax-m2-open-source" },
      ],
      confidence: 0.85,
    },
  },
  {
    keywords: /workflow|自動化|流程|demo|production|落地|串|agent/i,
    reply: {
      text: `直接講:**一個工具唔係答案,串成 workflow 先係**。
由 prompt demo 變真 workflow,我嘅次序係咁:
第一,將你而家人手做嘅流程寫低 — 邊步係重複、邊步要判斷。重複嘅先交俾 AI。
第二,逐個步驟實測:邊度會斷、邊度要人把關、成本係幾多。呢條係 demo 同 production 之間嘅誠實線,唔過得就唔好講到似過得。
第三,跑順咗就沉澱 — workflow 變系統,先係真正落地。慳一次時間係技巧,變成系統先係資產。
你而家手頭上邊個流程最想自動化?講出嚟,我同你一齊拆步驟。`,
      citations: [
        { title: "Elvin 嘅 10 個核心觀點", href: "/experts/elvin-cheung" },
        { title: "繁體中文 RAG 知識庫落地", href: "/insights/traditional-chinese-rag-guide" },
      ],
      confidence: 0.84,
    },
  },
  {
    keywords: /vibe|coding|寫code|寫程式|做產品|產品化|開發|整app|整網站/i,
    reply: {
      text: `Vibe coding 最大嘅改變係:**唔使再等工程師 — 識拆解問題嘅人,而家都可以親手將諗法變成產品**。
想開始,我建議咁行:
第一,由一個好細嘅真問題開始 — 幫自己或者公司解決一件實際嘢,唔好一開始就想做平台。
第二,學識「驗證」而唔係淨係「生成」— AI 寫嘅嘢要識睇、識測,呢個先係核心能力。
第三,跑通一次完整流程:諗法 → prototype → 真用戶試 → 迭代。我做 Perskill 都係咁樣由實測行出嚟。
想跟住做,可以去 Telegram hkvibecoders 社群或者 SuperBash 活動,成班香港 builders 一齊實戰。`,
      citations: [
        { title: "Elvin 嘅 10 個核心觀點", href: "/experts/elvin-cheung" },
        { title: "Karpathy:核心能力是驗證", href: "/insights/karpathy-vibe-coding-verification" },
        { title: "Cursor 2.0 多 Agent 開發", href: "/insights/cursor-2-multi-agent" },
      ],
      confidence: 0.82,
    },
  },
];

const ELVIN_FALLBACK: AiReply = {
  text: `呢條問題超出咗我實測過同授權內容支持嘅範圍 — 冇來源我唔會亂講。
試下問我 AI 工具實測、自動化 workflow 或者 vibe coding 嘅問題。想同真人傾,留意 Club 優先預約開放。`,
  citations: [],
  confidence: 0.48,
};

/* ---------------- Persona 組裝 ---------------- */

const PLATFORM_PERSONA: Persona = {
  key: "platform",
  kind: "platform",
  name: "平台編輯部 AI",
  shortName: "編輯部",
  domainCaption: "基於全站內容庫",
  signature: "每個論點附來源,無引用唔會亂噏",
  accent: INK_ACCENT,
  headerCaption: "基於 Insights / Cases 內容庫回答",
  greetingTitle: "有咩想知?",
  greetingBody:
    "問 AI 編輯部任何 AI、增長、營銷問題 — 每個論點附來源引用,無引用唔會亂噏。",
  suggestions: [
    "今日 AI 有咩大事?",
    "香港邊啲行業最用得著 AI?",
    "點樣用 AI 做內容營銷?",
    "預算有限應該買邊個工具?",
  ],
  replies: PLATFORM_REPLIES,
  fallback: PLATFORM_FALLBACK,
  aboutBio:
    "平台編輯部 AI 基於 AIGRO 全站情報、案例同資源庫蒸餾,所有論點附可檢索來源,遵守「no chip, no claim」原則。",
  aboutLinkLabel: "瀏覽全站情報庫",
  aboutLinkHref: "/insights",
  aboutTransparency: "回答經編輯審核流程整理,僅供參考,唔構成任何專業建議。",
};

function expertPersona(
  slug: string,
  overrides: Pick<
    Persona,
    | "signature"
    | "greetingTitle"
    | "greetingBody"
    | "suggestions"
    | "replies"
    | "fallback"
  >
): Persona {
  const expert = experts.find((e) => e.slug === slug && e.verified);
  if (!expert) throw new Error(`persona: unknown expert ${slug}`);
  return {
    key: expert.slug,
    kind: "expert",
    expert,
    name: expertFullName(expert),
    shortName: expert.nameEn.split(" ")[0] ?? expert.nameEn,
    domainCaption: expert.specialties.join("・"),
    accent: expert.brandColor ?? INK_ACCENT,
    headerCaption: "AI 分身・基於授權內容蒸餾",
    aboutBio: expert.bio ?? "",
    aboutLinkLabel: `${expert.nameEn.split(" ")[0]} 嘅 10 個核心觀點`,
    aboutLinkHref: `/experts/${expert.slug}`,
    aboutTransparency: expert.transparency ?? "",
    ...overrides,
  };
}

export const personas: Persona[] = [
  PLATFORM_PERSONA,
  expertPersona("jimmy-lau", {
    signature: "實戰先行,邊做邊學",
    greetingTitle: "有咩業務問題,攞嚟傾?",
    greetingBody:
      "我係 Jimmy 嘅 AI 分身。我唔會由工具講起 — 話我知你嘅真實業務問題,我哋由嗰度開始,邊做邊學。",
    suggestions: [
      "新手應該由邊度開始學 AI?",
      "點樣幫團隊導入 AI 工作流?",
      "AI 工具咁多,應該點揀?",
      "點樣由慳時間進化到造系統?",
    ],
    replies: JIMMY_REPLIES,
    fallback: JIMMY_FALLBACK,
  }),
  expertPersona("elvin-cheung", {
    signature: "Source-aware,實測先行",
    greetingTitle: "想將 AI 真係落地?",
    greetingBody:
      "我係 Elvin 嘅 AI 分身 — @ekcheungAI 嘅實戰派。唔好問邊個工具最勁,問邊個流程值得自動化 — 限制同來源我會講明,demo 唔等於 production。",
    suggestions: [
      "邊個 AI 工具真係用得過?",
      "點樣由 prompt demo 變真 workflow?",
      "Vibe coding 點開始?",
      "點樣幫公司做 AI 自動化?",
    ],
    replies: ELVIN_REPLIES,
    fallback: ELVIN_FALLBACK,
  }),
];

export function getPersona(key: string | null): Persona {
  return personas.find((p) => p.key === key) ?? PLATFORM_PERSONA;
}

/** 按問題關鍵字揀 scripted 回答;無命中 → 分身 fallback(no chip, no claim) */
export function pickPersonaReply(persona: Persona, question: string): AiReply {
  for (const r of persona.replies) {
    if (r.keywords.test(question)) return r.reply;
  }
  return persona.fallback;
}

/** Monogram initials,如 "Jimmy Lau" → "JL" */
export function personaInitials(persona: Persona): string {
  const source = persona.expert?.nameEn ?? persona.name;
  return source
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
