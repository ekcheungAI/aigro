/**
 * Ask 對話 sessions — localStorage 持久化。
 * 每個分身(key = persona key)各自一組 sessions;每個 session 以第一條問題做標題。
 * 同時遷移舊版單一 history(`aigro-ask-history`)→ 平台編輯部嘅第一個 session。
 */

import type { AiReply } from "./AiMessage";
import {
  ensureAuthenticatedUser,
  supabase,
  supabaseReady,
} from "@/lib/supabase";

export interface ChatMessage {
  id: number;
  role: "user" | "ai";
  text?: string;
  reply?: AiReply;
}

export interface ChatSession {
  id: string;
  /** 第一條問題截斷而成 */
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  /**
   * Session memory(v1.19)— 最近命中嘅話題 id(personas.ts ScriptedReply.id)。
   * 模糊追問(「咁然後呢?」「點樣開始?」)會承接呢個話題繼續;per-session only。
   */
  lastTopicId?: string;
  /**
   * Supabase `conversations.id`(P0 logging)— 第一條訊息異步建立後回填,
   * 之後每條訊息都寫入對應 `messages.conversation_id`。無 env / 離線 = undefined。
   */
  conversationId?: string;
}

export interface SessionStore {
  /** persona key → sessions(新嘅排前) */
  sessions: Record<string, ChatSession[]>;
  /** persona key → 當前 session id;null = 全新對話(empty state) */
  active: Record<string, string | null>;
}

const SESSIONS_KEY = "aigro-ask-sessions-v1";
const LEGACY_HISTORY_KEY = "aigro-ask-history";
export const MESSAGE_LIMIT = 40;
const MAX_SESSIONS_PER_PERSONA = 12;
const TITLE_LENGTH = 22;

let idCounter = 0;
const newSessionId = () =>
  `s-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

let msgCounter = Date.now() * 64;
export const nextMessageId = () => ++msgCounter;

export function sessionTitle(question: string): string {
  const clean = question.replace(/\s+/g, " ").trim();
  return clean.length > TITLE_LENGTH ? `${clean.slice(0, TITLE_LENGTH)}…` : clean;
}

function sanitizeSession(raw: unknown): ChatSession | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<ChatSession>;
  if (typeof s.id !== "string" || !Array.isArray(s.messages)) return null;
  return {
    id: s.id,
    title: typeof s.title === "string" && s.title ? s.title : "未命名對話",
    createdAt: typeof s.createdAt === "number" ? s.createdAt : Date.now(),
    updatedAt: typeof s.updatedAt === "number" ? s.updatedAt : Date.now(),
    messages: s.messages.slice(-MESSAGE_LIMIT),
    ...(typeof s.lastTopicId === "string" ? { lastTopicId: s.lastTopicId } : {}),
    ...(typeof s.conversationId === "string" ? { conversationId: s.conversationId } : {}),
  };
}

/** 讀取 store + 一次性遷移舊版 history */
export function loadSessionStore(): SessionStore {
  const empty: SessionStore = { sessions: {}, active: {} };
  let store = empty;
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SessionStore>;
      const sessions: SessionStore["sessions"] = {};
      if (parsed.sessions && typeof parsed.sessions === "object") {
        for (const [key, list] of Object.entries(parsed.sessions)) {
          if (!Array.isArray(list)) continue;
          const clean = list
            .map(sanitizeSession)
            .filter((s): s is ChatSession => s !== null)
            .slice(0, MAX_SESSIONS_PER_PERSONA);
          if (clean.length > 0) sessions[key] = clean;
        }
      }
      store = {
        sessions,
        active:
          parsed.active && typeof parsed.active === "object" ? { ...parsed.active } : {},
      };
    }
  } catch {
    store = empty;
  }

  // 舊版單一 history → 平台編輯部 session(只遷移一次)
  try {
    const legacy = window.localStorage.getItem(LEGACY_HISTORY_KEY);
    if (legacy) {
      const messages = JSON.parse(legacy) as ChatMessage[];
      if (Array.isArray(messages) && messages.length > 0) {
        const firstUser = messages.find((m) => m.role === "user");
        const migrated = sanitizeSession({
          id: newSessionId(),
          title: firstUser?.text ? sessionTitle(firstUser.text) : "之前嘅對話",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages,
        });
        if (migrated) {
          const list = store.sessions.platform ?? [];
          store.sessions.platform = [migrated, ...list].slice(0, MAX_SESSIONS_PER_PERSONA);
          store.active.platform ??= migrated.id;
        }
      }
      window.localStorage.removeItem(LEGACY_HISTORY_KEY);
    }
  } catch {
    /* ignore */
  }
  return store;
}

export function saveSessionStore(store: SessionStore): void {
  try {
    window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(store));
  } catch {
    /* localStorage unavailable — mock state only */
  }
}

/* ================= Supabase 對話 logging(P0)=================
 * localStorage 仍然係讀取路徑(今輪唔 migrate);呢度係**額外**嘅
 * fire-and-forget 寫入 — 每個 session 第一條訊息建 `conversations` row,
 * 每條訊息(user + AI)寫 `messages` row。離線 / 無 env 完全靜默,唔阻塞 UI。
 */

/** sessionId ↔ conversations.id 映射(持久,reload 後繼續寫入同一對話) */
const CONV_MAP_KEY = "aigro-ask-conv-map";
let convMapCache: Map<string, string> | null = null;
const pendingConv = new Map<string, Promise<string | null>>();

function loadConvMap(): Map<string, string> {
  if (convMapCache) return convMapCache;
  convMapCache = new Map();
  try {
    const raw = window.localStorage.getItem(CONV_MAP_KEY);
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, unknown>;
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === "string") convMapCache.set(k, v);
      }
    }
  } catch {
    /* ignore */
  }
  return convMapCache;
}

function convMapGet(sessionId: string): string | null {
  return loadConvMap().get(sessionId) ?? null;
}

function convMapSet(sessionId: string, conversationId: string): void {
  const m = loadConvMap();
  m.set(sessionId, conversationId);
  try {
    window.localStorage.setItem(CONV_MAP_KEY, JSON.stringify(Object.fromEntries(m)));
  } catch {
    /* private mode — in-memory 仍然 work */
  }
}

/** AiReply.source → messages.source(schema 註釋:kb / llm / guardrail / scripted) */
function mapMessageSource(source: AiReply["source"]): string {
  if (source === "general" || source === "unavailable") return "scripted";
  return source ?? "kb";
}

/** 取得(或建立)呢個 session 嘅 conversations.id;失敗 / 無 env → null */
export function ensureConversationId(
  sessionId: string,
  personaKey: string,
  title: string
): Promise<string | null> {
  if (!supabase || !supabaseReady) return Promise.resolve(null);
  const cached = convMapGet(sessionId);
  if (cached) return Promise.resolve(cached);
  const pending = pendingConv.get(sessionId);
  if (pending) return pending;

  const p = (async (): Promise<string | null> => {
    try {
      const uid = await ensureAuthenticatedUser();
      if (!uid) return null;
      const { data: expert, error: expertError } = await supabase
        .from("experts")
        .select("id")
        .eq("slug", personaKey)
        .eq("status", "active")
        .maybeSingle();
      if (expertError || !expert) return null;
      const { data, error } = await supabase
        .from("conversations")
        .insert({
          owner_id: uid,
          user_id: uid,
          anon_id: null,
          persona: personaKey,
          expert_id: expert.id,
          title,
        })
        .select("id")
        .single();
      if (error || !data) return null;
      convMapSet(sessionId, data.id as string);
      return data.id as string;
    } catch {
      return null;
    }
  })();
  pendingConv.set(sessionId, p);
  void p.finally(() => pendingConv.delete(sessionId));
  return p;
}

/** 一輪問答 → messages rows(user + assistant) */
function roundToMessageRows(
  conversationId: string,
  round: ChatMessage[]
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const m of round) {
    if (m.role === "user") {
      rows.push({
        conversation_id: conversationId,
        role: "user",
        content: m.text ?? "",
        source: "kb",
        confidence: null,
        citations: [],
      });
    } else if (m.reply) {
      rows.push({
        conversation_id: conversationId,
        role: "assistant",
        content: m.reply.text,
        source: mapMessageSource(m.reply.source),
        confidence: m.reply.confidence,
        citations: m.reply.citations,
      });
    }
  }
  return rows;
}

/** fire-and-forget:確保 conversation 存在,然後寫入呢一輪嘅 messages */
function logRoundToSupabase(
  sessionId: string,
  personaKey: string,
  title: string,
  round: ChatMessage[]
): void {
  if (!supabase || !supabaseReady) return;
  // G2:每個訪客變 CRM lead — 同 messages 寫入互相獨立,各自靜默
  void upsertLeadFromRound(personaKey, round);
  void ensureConversationId(sessionId, personaKey, title)
    .then(async (conversationId) => {
      if (!conversationId || !supabase) return;
      const rows = roundToMessageRows(conversationId, round);
      if (rows.length === 0) return;
      await supabase.from("messages").insert(rows);
    })
    .catch(() => {
      /* 離線靜默 */
    });
}

/* ================= G2:CRM leads 自動生成 =================
 * 每輪問答後 upsert `leads` 表(leads_insert_all 允許 anon insert;
 * leads_anon_update_own 允許 anon_id 非空嘅 row 被 update)。
 * RLS 限制:anon 唔可以 SELECT,所以採用「本地累積快照 + 絕對值寫入」:
 * - localStorage 累積 score / questions / signals(每分身一份)
 * - 先 update(anon_id+persona,count=exact)→ 0 rows → insert
 * 冇 select 依賴、唔會整出重複 lead;fire-and-forget,失敗靜默。
 */

const LEAD_STATE_KEY = "aigro-ask-lead-state-v1";
const LEAD_MAX_QUESTIONS = 20;
const LEAD_MAX_SIGNALS = 20;
/** 高意圖關鍵字 — 每中一個 +20 分 + 一條 signal */
const HIGH_INTENT_RE = /收費|價錢|幾錢|預約|導入|合作|報名|加入/g;

interface LeadSnapshot {
  score: number;
  questions: string[];
  signals: string[];
}

function highIntentSignal(keyword: string): string {
  if (/收費|價錢|幾錢/.test(keyword)) return "高意圖:詢問收費";
  if (keyword === "預約") return "高意圖:預約查詢";
  if (/導入|合作/.test(keyword)) return "高意圖:合作導入";
  return "高意圖:報名加入";
}

function loadLeadStates(): Record<string, LeadSnapshot> {
  try {
    const raw = window.localStorage.getItem(LEAD_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, LeadSnapshot>;
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function saveLeadState(personaKey: string, snap: LeadSnapshot): void {
  try {
    const all = loadLeadStates();
    all[personaKey] = snap;
    window.localStorage.setItem(LEAD_STATE_KEY, JSON.stringify(all));
  } catch {
    /* private mode — 靜默 */
  }
}

/** 一輪問答 → 累積 lead 快照(每條用戶訊息 +5;高意圖關鍵字每中一個 +20 + signal) */
function applyRoundToLead(personaKey: string, round: ChatMessage[]): LeadSnapshot | null {
  const userTexts = round
    .filter((m) => m.role === "user" && typeof m.text === "string" && m.text.trim())
    .map((m) => (m.text as string).trim());
  if (userTexts.length === 0) return null;
  const prev = loadLeadStates()[personaKey] ?? { score: 0, questions: [], signals: [] };
  let delta = 0;
  const newSignals: string[] = [];
  for (const text of userTexts) {
    delta += 5;
    for (const match of text.matchAll(HIGH_INTENT_RE)) {
      delta += 20;
      newSignals.push(highIntentSignal(match[0]));
    }
  }
  const questions = [...prev.questions, ...userTexts].slice(-LEAD_MAX_QUESTIONS);
  const signals = [...prev.signals];
  for (const s of newSignals) {
    if (!signals.includes(s)) signals.push(s);
  }
  const snap: LeadSnapshot = {
    score: prev.score + delta,
    questions,
    signals: signals.slice(-LEAD_MAX_SIGNALS),
  };
  saveLeadState(personaKey, snap);
  return snap;
}

/** fire-and-forget upsert:update 中就用快照絕對值;0 rows → insert 新線索 */
async function upsertLeadFromRound(personaKey: string, round: ChatMessage[]): Promise<void> {
  if (!supabase || !supabaseReady) return;
  const snap = applyRoundToLead(personaKey, round);
  if (!snap) return;
  try {
    const uid = await ensureAuthenticatedUser();
    if (!uid) return;
    const base = {
      score: snap.score,
      questions: snap.questions,
      signals: snap.signals,
      last_activity_at: new Date().toISOString(),
    };
    const { count, error } = await supabase
      .from("leads")
      .update(base, { count: "exact" })
      .eq("owner_id", uid)
      .eq("persona", personaKey);
    if (!error && count && count > 0) return;
    // 未存在(或 update 不可見)→ insert;anon_id 必帶(update policy 需要),登入咗加埋 user_id
    await supabase.from("leads").insert({
      owner_id: uid,
      anon_id: null,
      user_id: uid,
      persona: personaKey,
      stage: "新線索",
      ...base,
    });
  } catch {
    /* 離線 / RLS 靜默 — 本地快照已記低,下輪再試 */
  }
}

/**
 * 追加一輪問答;無 active session 時開新 session(第一條問題做標題)。
 * 回傳新 store + 新 AI 訊息 id — 只有呢個 id 會行打字機;還原嘅歷史訊息即刻渲染。
 */
export function appendRound(
  store: SessionStore,
  personaKey: string,
  question: string,
  reply: AiReply,
  /** 命中話題 id — 寫入 session memory;null(fallback)時保留舊 topic,唔洗走條 thread */
  topicId: string | null = null,
  /** ask-answer already persisted this round; avoid duplicate client writes. */
  skipRemoteLog = false
): { store: SessionStore; aiMessageId: number } {
  const aiMessage: ChatMessage = { id: nextMessageId(), role: "ai", reply };
  const round: ChatMessage[] = [
    { id: nextMessageId(), role: "user", text: question },
    aiMessage,
  ];
  const aiMessageId = aiMessage.id;
  const list = store.sessions[personaKey] ?? [];
  const activeId = store.active[personaKey];
  const now = Date.now();

  const idx = activeId ? list.findIndex((s) => s.id === activeId) : -1;
  if (idx >= 0) {
    const prior = list[idx];
    const convId = convMapGet(prior.id) ?? prior.conversationId;
    const updated: ChatSession = {
      ...prior,
      updatedAt: now,
      messages: [...prior.messages, ...round].slice(-MESSAGE_LIMIT),
      ...(topicId ? { lastTopicId: topicId } : {}),
      ...(convId ? { conversationId: convId } : {}),
    };
    const nextList = [updated, ...list.filter((_, i) => i !== idx)];
    // P0:fire-and-forget 寫入 Supabase(離線 / 無 env 靜默)
    if (!skipRemoteLog) {
      void logRoundToSupabase(updated.id, personaKey, updated.title, round);
    }
    return {
      aiMessageId,
      store: {
        sessions: { ...store.sessions, [personaKey]: nextList },
        active: { ...store.active, [personaKey]: updated.id },
      },
    };
  }

  const created: ChatSession = {
    id: newSessionId(),
    title: sessionTitle(question),
    createdAt: now,
    updatedAt: now,
    messages: round,
    ...(topicId ? { lastTopicId: topicId } : {}),
  };
  // P0:第一條訊息 — fire-and-forget 建 conversations row + 寫 messages
  if (!skipRemoteLog) {
    void logRoundToSupabase(created.id, personaKey, created.title, round);
  }
  return {
    aiMessageId,
    store: {
      sessions: {
        ...store.sessions,
        [personaKey]: [created, ...list].slice(0, MAX_SESSIONS_PER_PERSONA),
      },
      active: { ...store.active, [personaKey]: created.id },
    },
  };
}

/**
 * Create an empty local session before a streamed server request. This gives the
 * browser and database one stable conversation mapping before the first token.
 */
export function prepareSession(
  store: SessionStore,
  personaKey: string,
  question: string
): { store: SessionStore; session: ChatSession } {
  const list = store.sessions[personaKey] ?? [];
  const activeId = store.active[personaKey];
  const active = activeId ? list.find((session) => session.id === activeId) : null;
  if (active) return { store, session: active };
  const now = Date.now();
  const session: ChatSession = {
    id: newSessionId(),
    title: sessionTitle(question),
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  return {
    session,
    store: {
      sessions: {
        ...store.sessions,
        [personaKey]: [session, ...list].slice(0, MAX_SESSIONS_PER_PERSONA),
      },
      active: { ...store.active, [personaKey]: session.id },
    },
  };
}

export function setActiveSession(
  store: SessionStore,
  personaKey: string,
  sessionId: string | null
): SessionStore {
  return { ...store, active: { ...store.active, [personaKey]: sessionId } };
}

/** 集合對話入面所有引用(按 href 去重),俾右欄「引用來源」用 */
export function collectCitations(messages: ChatMessage[]): { title: string; href: string }[] {
  const seen = new Set<string>();
  const out: { title: string; href: string }[] = [];
  for (const m of messages) {
    if (m.role !== "ai" || !m.reply) continue;
    for (const c of m.reply.citations) {
      if (seen.has(c.href)) continue;
      seen.add(c.href);
      out.push(c);
    }
  }
  return out;
}

/** 最近 n 條對話 → MiniMax-M3 function 歷史格式，避免追問記憶退化。 */
export function buildChatHistory(
  messages: ChatMessage[],
  n = 6
): { role: "user" | "assistant"; content: string }[] {
  return messages
    .slice(-n)
    .map((m) =>
      m.role === "user"
        ? { role: "user" as const, content: m.text ?? "" }
        : { role: "assistant" as const, content: m.reply?.text ?? "" }
    )
    .filter((t) => t.content.length > 0);
}

/**
 * 呢個分身當前 session 嘅最後一條用戶問題(capture note 用,50 字節錄)。
 * 直接讀 localStorage store — About 卡等冇 messages prop 嘅位置都用得。
 */
export function lastUserQuestion(personaKey: string, maxLen = 50): string | null {
  const store = loadSessionStore();
  const activeId = store.active[personaKey];
  const session = (store.sessions[personaKey] ?? []).find((s) => s.id === activeId);
  if (!session) return null;
  for (let i = session.messages.length - 1; i >= 0; i--) {
    const m = session.messages[i];
    if (m.role === "user" && m.text) {
      const clean = m.text.replace(/\s+/g, " ").trim();
      return clean.length > maxLen ? `${clean.slice(0, maxLen)}…` : clean;
    }
  }
  return null;
}

/** href → 來源 domain 標籤 */
export function citationDomain(href: string): string {
  if (href.startsWith("/insights")) return "AIGRO 情報庫";
  if (href.startsWith("/cases")) return "AIGRO 案例庫";
  if (href.startsWith("/experts")) return "AIGRO 專家頁";
  if (href.startsWith("/library")) return "AIGRO 資源庫";
  if (href.startsWith("/")) return "AIGRO";
  try {
    return new URL(href).hostname;
  } catch {
    return href;
  }
}
