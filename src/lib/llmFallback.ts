/**
 * Ask guardrail + LLM 一般知識 fallback(v1.21)。
 *
 * B. Guardrail — `isOffGuard`:明顯 spam/無意義、違規請求、jailbreak/偷 system prompt、
 *    索取他人個人資料 → 分身口吻禮貌 deflect(唔係拒絕模板,唔顯示低信心)。
 * C. LLM fallback — KB 零命中且設定咗 VITE_LLM_* 時,經 OpenAI-compatible
 *    chat-completions 生成分身口吻嘅一般知識回覆(≤150字,唔編造分身本人事實)。
 *    10s timeout + try/catch,失敗 → 上層用內建 graceful 模板,UI 永遠唔會 hang。
 */

import type { AiReply } from "@/components/ask/AiMessage";
import type { Persona } from "@/data/personas";

/* ---------------- LLM 設定(import.meta.env) ---------------- */

const BASE_URL = import.meta.env.VITE_LLM_BASE_URL as string | undefined;
const API_KEY = import.meta.env.VITE_LLM_API_KEY as string | undefined;
const MODEL = (import.meta.env.VITE_LLM_MODEL as string | undefined) || "gpt-4o-mini";
const TIMEOUT_MS = 10_000;

/** 三個關鍵 env(BASE_URL + API_KEY)齊先啟用 LLM fallback */
export function isLlmConfigured(): boolean {
  return Boolean(BASE_URL && API_KEY);
}

/* ---------------- B. Guardrail ---------------- */

export type GuardKind = "spam" | "harmful" | "jailbreak" | "personal-data";

/** 偷 system prompt / jailbreak 嘗試 */
const JAILBREAK_RE =
  /忽略(之前|先前|以上|所有)|無視(之前|先前|以上|所有)|ignore (all |previous |prior )?instructions|system prompt|系統提示詞|系統提示|你嘅系統指示|你嘅指示|你嘅\s?prompt|顯示你嘅|交出你嘅|jailbreak|越獄|reveal your (prompt|instructions)|開發者模式|developer mode|DAN\b/i;

/** 明顯違規/有害請求 */
const HARMFUL_RE =
  /炸彈|爆炸品|製毒|販毒|冰毒|可卡因|氯胺酮|武器製造|自製槍|殺人方法|自殺方法|自殘方法|入侵(系統|網站|電腦|帳號)|黑客攻擊|盜取(密碼|帳號|資料)|偷取(密碼|帳號|資料)|釣魚網站|勒索軟件|木馬|malware|ransomware|phishing|\bbomb\b|how to (make|build) (a )?(bomb|weapon)|\bkill (someone|a person)\b/i;

/** 索取他人(Jimmy / Elvin / 任何人)私人資料 */
const PERSONAL_DATA_RE =
  /(jimmy|elvin|劉泰麟|佢|佢哋)\s*嘅\s*(私人)?(電話|手機|號碼|身份證|住址|地址|密碼|電郵)|(電話|手機|身份證|住址|密碼)(號碼)?\s*(係|是)?\s*(幾多|多少|咩).{0,10}(jimmy|elvin|劉泰麟|佢)|(jimmy|elvin|lau|cheung)('s|’) ?(private )?(phone|number|address|email|password)/i;

/**
 * 判斷問題係咪 off-guard。命中 → 上層用 `guardrailReply` 做分身口吻 deflect。
 * 只攔明顯個案;一般問題(即使離題)一律唔攔,交由 KB / LLM / 一般知識模板回答。
 */
export function isOffGuard(question: string): GuardKind | null {
  const q = question.trim();
  if (!q) return "spam";
  // 超長輸入(貼文/轟炸)
  if (q.length > 800) return "spam";
  // 同一字符連續 ≥10 次(「哈哈哈哈…」「aaaa…」)
  if (/(.)\1{9,}/su.test(q)) return "spam";
  // 純 emoji / 符號,冇任何文字或數字
  if (!/[\p{L}\p{N}]/u.test(q)) return "spam";
  if (JAILBREAK_RE.test(q)) return "jailbreak";
  if (HARMFUL_RE.test(q)) return "harmful";
  if (PERSONAL_DATA_RE.test(q)) return "personal-data";
  return null;
}

/** 各分身嘅 in-character deflect 文案(短 + redirect 返自己範圍) */
const DEFLECT_TEXT: Record<string, string> = {
  "jimmy-lau":
    "呢啲我幫唔到手 — 唔係我會掂嘅範圍。但我可以同你傾 AI 落地:AI-First 思維、語境工程、由 idea 變行動,或者 DotAI 同我嘅背景。想由邊度開始?",
  "elvin-cheung":
    "呢啲我幫唔到手 — 我實測嘅係 AI 工具、workflow 同 vibe coding,其他嘢我唔會亂講。不如話我知你想自動化邊個流程,或者想拆邊款工具?",
  platform:
    "呢條問題編輯部處理唔到 — 但全站情報、案例同兩位領航專家分身都可以幫你。試下問今日 AI 大事、行業落地,或者 AIGRO 本身。",
};

/**
 * Guardrail deflect 回覆:分身口吻、短、附 redirect chips。
 * source "guardrail" → AiMessage 唔顯示信心行(呢個係 deflect,唔係低信心答案)。
 */
export function guardrailReply(persona: Persona, _kind: GuardKind): AiReply {
  return {
    text: DEFLECT_TEXT[persona.key] ?? DEFLECT_TEXT.platform,
    citations: [],
    confidence: 0.7,
    source: "guardrail",
    followUps: persona.suggestions.slice(0, 2),
  };
}

/* ---------------- C. LLM 一般知識 fallback ---------------- */

/** 分身口吻 + 專長領域(system prompt 素材) */
const VOICE: Record<string, string> = {
  "jimmy-lau":
    "你嘅風格:AI-First 實戰派,直接、有行動力,鍾意由場景同痛點諗起,鼓勵人將靈感轉化為實踐。你嘅專長領域:AI-First 思維、AI 行銷、品牌內容、語境工程(Context Engineering)、DotAI 學習基地。",
  "elvin-cheung":
    "你嘅風格:source-aware 實測派,誠實直接,講限制講風險,demo 唔當 production。你嘅專長領域:AI 工具實測、自動化 workflow、vibe coding、Perskill 分身庫、SuperBash 活動。",
  platform:
    "你嘅風格:中性編輯語氣,有條理、論點清晰。你嘅專長領域:全站 AI 情報、香港行業落地案例、兩位領航專家(Jimmy Lau、Elvin Cheung)嘅分工。",
};

/** Persona-aware system prompt:書面粵語 + 分身風格 + 一般知識規則 */
export function buildLlmSystemPrompt(persona: Persona): string {
  const voice = VOICE[persona.key] ?? VOICE.platform;
  return `${voice}
你係 ${persona.name} 嘅 AI 分身。用戶問嘅係一般問題,授權知識庫冇直接答案。用你嘅風格簡短回答(≤150字),可以答一般知識,但唔好編造關於 ${persona.name} 本人或公司嘅新事實;答案尾段輕輕帶返去你嘅專長領域。全部用書面粵語回答,唔好用列表,兩至三句搞掂。`;
}

interface ChatCompletionsResponse {
  choices?: { message?: { content?: string } }[];
}

/**
 * 呼叫 OpenAI-compatible chat-completions(single-shot;typewriter 負責漸進渲染)。
 * 10s AbortController timeout;任何錯誤都 throw — 上層 catch 後用內建模板,UI 唔會 hang。
 */
export async function callLlmGeneral(
  persona: Persona,
  question: string
): Promise<string> {
  if (!isLlmConfigured()) throw new Error("LLM not configured");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL!.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: buildLlmSystemPrompt(persona) },
          { role: "user", content: question },
        ],
        max_tokens: 400,
        temperature: 0.7,
        stream: false,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const data = (await res.json()) as ChatCompletionsResponse;
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) throw new Error("LLM empty reply");
    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}

/** LLM 回覆包裝成 AiReply:無引用(confidence 0.6)+「AI 生成 · 一般知識」chip */
export function llmReply(persona: Persona, text: string): AiReply {
  return {
    text,
    citations: [],
    confidence: 0.6,
    source: "llm",
    followUps: persona.suggestions.slice(0, 2),
  };
}
