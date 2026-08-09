/**
 * Ask guardrail + LLM 自由答 fallback(v1.21 → chat-10x)。
 *
 * B. Guardrail — `isOffGuard`:明顯 spam/無意義、違規請求、jailbreak/偷 system prompt、
 *    索取他人個人資料 → 分身口吻禮貌 deflect(唔係拒絕模板,唔顯示低信心)。
 * C. LLM fallback — KB 零命中時呼叫 Supabase `ask-answer` Edge Function。
 *    Function 端固定用 MiniMax-M3；API key、system prompt 同 provider request
 *    全部留 server-side。失敗 → throw,上層用內建 graceful 模板,UI 永遠唔會 hang。
 */

import type { AiReply } from "@/components/ask/AiMessage";
import type { Persona } from "@/data/personas";
import { ensureAuthenticatedUser, supabase, supabaseReady } from "@/lib/supabase";

const TIMEOUT_MS = 30_000;
const HONG_KONG_OFFSET_MS = 8 * 60 * 60 * 1000;

export type ChatQuotaScope = "daily" | "monthly";

export function quotaResetAt(
  scope: ChatQuotaScope,
  now = Date.now()
): number {
  const hongKongNow = new Date(now + HONG_KONG_OFFSET_MS);
  const year = hongKongNow.getUTCFullYear();
  const month = hongKongNow.getUTCMonth();
  const day = hongKongNow.getUTCDate();
  const nextBoundary = scope === "monthly"
    ? Date.UTC(year, month + 1, 1)
    : Date.UTC(year, month, day + 1);
  return nextBoundary - HONG_KONG_OFFSET_MS;
}

export function safeClientCitationHref(value: unknown): string {
  if (typeof value !== "string") return "";
  const href = value.trim();
  const hasUnsafeCharacter = [...href].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127 || character === "\\";
  });
  if (!href || hasUnsafeCharacter) return "";
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  try {
    const url = new URL(href);
    if (url.protocol !== "https:" || url.username || url.password) return "";
    return url.toString();
  } catch {
    return "";
  }
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
export function guardrailReply(persona: Persona, kind: GuardKind): AiReply {
  void kind;
  return {
    text: DEFLECT_TEXT[persona.key] ?? DEFLECT_TEXT.platform,
    citations: [],
    confidence: 0.7,
    source: "guardrail",
    followUps: persona.suggestions.slice(0, 2),
  };
}

/**
 * Live instructor service failed before a grounded answer was completed.
 * Never reuse the code-based persona reply here: doing so could display stale
 * content and citations that were not returned by the published CMS revision.
 */
export function instructorUnavailableReply(persona: Persona): AiReply {
  const serviceName = persona.kind === "expert" ? "AI 導師服務" : "AI 問答服務";
  return {
    text: `${serviceName}暫時未能連接。為避免提供未經知識庫核實嘅答案，今次唔會用示範內容代答。請稍後再試。`,
    citations: [],
    confidence: 0,
    source: "unavailable",
    answerBasis: "general",
    coverage: "none",
    followUps: [],
  };
}

export function chatQuotaReply(
  persona: Persona,
  scope: ChatQuotaScope = "daily"
): AiReply {
  return {
    text: scope === "monthly"
      ? `你同 ${persona.shortName} 嘅本月對話額度已用完。額度會按香港時間每月重設；你可以下個月再試，或者查看會員方案。`
      : `你同 ${persona.shortName} 嘅今日對話額度已用完。額度會按香港時間每日重設；你可以聽日再試，或者查看會員方案。`,
    citations: [],
    confidence: 0,
    source: "quota",
    answerBasis: "general",
    coverage: "none",
    quotaScope: scope,
    followUps: [],
  };
}

export class InstructorChatError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.code = code;
    this.status = status;
    this.name = "InstructorChatError";
  }
}

/* ---------------- C. Grounded streaming instructor chat ---------------- */

export interface StreamCitation {
  marker?: string;
  title: string;
  href: string;
  excerpt?: string;
  revision_id?: string;
  section?: string;
  page?: number;
  start_seconds?: number;
  end_seconds?: number;
}

interface DoneEvent {
  message_id: string;
  request_id: string;
  answer_basis: "knowledge" | "general";
  coverage: "high" | "medium" | "none";
  citations: StreamCitation[];
  booking_intent?: boolean;
}

interface StreamResult extends DoneEvent {
  text: string;
}

export function parseSseBlock(block: string): { event: string; data: unknown } | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) data.push(line.slice(5).trim());
  }
  if (!data.length) return null;
  try {
    return { event, data: JSON.parse(data.join("\n")) };
  } catch {
    return null;
  }
}

/**
 * Open an authenticated SSE request to ask-answer. The server owns history,
 * retrieval and persistence; the browser only sends one new message.
 */
export async function streamInstructorReply(
  persona: Persona,
  conversationId: string,
  question: string,
  requestId: string,
  onDelta: (fullText: string) => void,
  turnstileToken?: string
): Promise<AiReply> {
  if (!supabase || !supabaseReady) throw new Error("Supabase not configured");
  await ensureAuthenticatedUser();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Anonymous Auth is unavailable");
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!supabaseUrl || !anonKey) throw new Error("Supabase environment is incomplete");

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/ask-answer`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
        "Content-Type": "application/json",
        ...(turnstileToken ? { "x-turnstile-token": turnstileToken } : {}),
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        persona_slug: persona.key,
        message: question,
        request_id: requestId,
      }),
    });
    if (!response.ok || !response.body) {
      const detail = await response.json().catch(() => ({})) as {
        code?: string;
      };
      throw new InstructorChatError(
        detail.code || (response.status === 429 ? "rate_limited" : "instructor_unavailable"),
        response.status
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";
    const citations: StreamCitation[] = [];
    let done: DoneEvent | null = null;
    const handleBlock = (block: string) => {
      const parsed = parseSseBlock(block);
      if (!parsed) return;
      const payload = parsed.data as Record<string, unknown>;
      if (parsed.event === "retrieved_sources") {
        // Retrieval candidates are intentionally not exposed as citations. Only
        // the marker-validated citations in `done` are rendered or persisted.
      } else if (parsed.event === "delta" && typeof payload.text === "string") {
        fullText += payload.text;
        onDelta(fullText);
      } else if (parsed.event === "done") {
        done = payload as unknown as DoneEvent;
      } else if (parsed.event === "error") {
        throw new InstructorChatError(
          typeof payload.code === "string" ? payload.code : "instructor_unavailable",
          503
        );
      }
    };
    while (true) {
      const { value, done: streamDone } = await reader.read();
      if (streamDone) break;
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? "";
      for (const block of blocks) {
        handleBlock(block);
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) handleBlock(buffer);
    const completed = done as DoneEvent | null;
    if (!completed || !fullText.trim()) {
      throw new Error("Instructor stream ended before completion");
    }
    const result: StreamResult = {
      ...completed,
      text: fullText.trim(),
      citations: completed.citations?.length ? completed.citations : citations,
    };
    return {
      text: result.text,
      citations: result.citations,
      // Legacy scripted answers still carry a numeric value. Live answers use
      // server coverage as the only user-facing quality signal; this binary
      // value exists solely for the old low-confidence CTA compatibility.
      confidence: result.coverage === "none" ? 0 : 1,
      source: result.answer_basis === "knowledge" ? "kb" : "llm",
      ragUsed: result.answer_basis === "knowledge",
      answerBasis: result.answer_basis,
      coverage: result.coverage,
      bookingIntent: result.booking_intent === true,
      followUps: persona.suggestions.slice(0, 2),
    };
  } finally {
    window.clearTimeout(timer);
  }
}
