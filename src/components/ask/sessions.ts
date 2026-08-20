/**
 * Ask 對話 sessions — localStorage 持久化。
 * 每個分身(key = persona key)各自一組 sessions;每個 session 以第一條問題做標題。
 * 同時遷移舊版單一 history(`aigro-ask-history`)→ 平台編輯部嘅第一個 session。
 */

import type { AiReply, Citation } from "./AiMessage";
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
/** Local device history is deliberately shorter than the server retention window. */
export const SESSION_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
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
  const expiresBefore = Date.now() - SESSION_RETENTION_MS;
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
            .filter((session) => session.updatedAt >= expiresBefore)
            .slice(0, MAX_SESSIONS_PER_PERSONA);
          if (clean.length > 0) sessions[key] = clean;
        }
      }
      const active: SessionStore["active"] = {};
      if (parsed.active && typeof parsed.active === "object") {
        for (const [personaKey, sessionId] of Object.entries(parsed.active)) {
          if (
            (typeof sessionId === "string" || sessionId === null) &&
            sessions[personaKey]?.some((session) => session.id === sessionId)
          ) {
            active[personaKey] = sessionId;
          } else if (sessions[personaKey]) {
            active[personaKey] = null;
          }
        }
      }
      store = {
        sessions,
        active,
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
interface ConversationMapEntry {
  conversationId: string;
  /** Prevent a mapping left by another signed-in/anonymous account being reused. */
  ownerId: string | null;
}
let convMapCache: Map<string, ConversationMapEntry> | null = null;
const pendingConv = new Map<string, Promise<string | null>>();
/** Prevent any late UI path from creating a server row for a deleted session. */
const deletedSessionTombstones = new Set<string>();
export const CONVERSATION_CREATE_TIMEOUT_MS = 8_000;
const DEADLINE_EXPIRED = Symbol("deadline-expired");

export interface ConversationCreateInput {
  conversationId: string;
  ownerId: string;
  personaKey: string;
  title: string;
}

export interface EnsureConversationDependencies {
  authenticate?: () => Promise<string | null>;
  createConversation?: (
    input: ConversationCreateInput,
    signal: AbortSignal,
  ) => Promise<string | null>;
  timeoutMs?: number;
}

async function settleBeforeDeadline<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  onTimeout?: () => void,
): Promise<T | typeof DEADLINE_EXPIRED> {
  if (timeoutMs <= 0) {
    onTimeout?.();
    return DEADLINE_EXPIRED;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof DEADLINE_EXPIRED>((resolve) => {
    timer = setTimeout(() => {
      onTimeout?.();
      resolve(DEADLINE_EXPIRED);
    }, timeoutMs);
  });
  try {
    const work = Promise.resolve().then(operation).catch(() => DEADLINE_EXPIRED);
    return await Promise.race([work, timeout]) as T | typeof DEADLINE_EXPIRED;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function runAbortableBeforeDeadline<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T | typeof DEADLINE_EXPIRED> {
  const controller = new AbortController();
  return settleBeforeDeadline(
    () => operation(controller.signal),
    timeoutMs,
    () => controller.abort(),
  );
}

function loadConvMap(): Map<string, ConversationMapEntry> {
  if (convMapCache) return convMapCache;
  convMapCache = new Map();
  try {
    const raw = window.localStorage.getItem(CONV_MAP_KEY);
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, unknown>;
      for (const [k, v] of Object.entries(obj)) {
        // String entries came from the pre-owner-bound map. They remain
        // deletable, but are never reused for a newly authenticated create.
        if (typeof v === "string") {
          convMapCache.set(k, { conversationId: v, ownerId: null });
        } else if (
          v && typeof v === "object" &&
          typeof (v as Partial<ConversationMapEntry>).conversationId === "string" &&
          (typeof (v as Partial<ConversationMapEntry>).ownerId === "string" ||
            (v as Partial<ConversationMapEntry>).ownerId === null)
        ) {
          convMapCache.set(k, {
            conversationId: (v as ConversationMapEntry).conversationId,
            ownerId: (v as ConversationMapEntry).ownerId,
          });
        }
      }
    }
  } catch {
    /* ignore */
  }
  return convMapCache;
}

function convMapGet(sessionId: string): string | null {
  return loadConvMap().get(sessionId)?.conversationId ?? null;
}

function convMapGetForOwner(sessionId: string, ownerId: string): string | null {
  const entry = loadConvMap().get(sessionId);
  if (!entry) return null;
  if (entry.ownerId === ownerId) return entry.conversationId;
  // This covers both an account switch and legacy unbound entries. Reusing
  // either could target a conversation owned by a different auth identity.
  convMapDelete(sessionId);
  return null;
}

/** Return the owner-scoped server conversation linked to a local session. */
export function conversationIdForSession(sessionId: string): string | null {
  return convMapGet(sessionId);
}

function convMapSet(
  sessionId: string,
  conversationId: string,
  ownerId: string | null,
): void {
  const m = loadConvMap();
  m.set(sessionId, { conversationId, ownerId });
  try {
    window.localStorage.setItem(CONV_MAP_KEY, JSON.stringify(Object.fromEntries(m)));
  } catch {
    /* private mode — in-memory 仍然 work */
  }
}

function convMapDelete(sessionId: string): void {
  const m = loadConvMap();
  m.delete(sessionId);
  try {
    window.localStorage.setItem(CONV_MAP_KEY, JSON.stringify(Object.fromEntries(m)));
  } catch {
    /* private mode — in-memory mapping is still cleared */
  }
}

/** 取得(或建立)呢個 session 嘅 conversations.id;失敗 / 無 env → null */
export function ensureConversationId(
  sessionId: string,
  personaKey: string,
  title: string,
  dependencies: EnsureConversationDependencies = {},
): Promise<string | null> {
  if ((!supabase || !supabaseReady) && !dependencies.createConversation) {
    return Promise.resolve(null);
  }
  if (deletedSessionTombstones.has(sessionId)) return Promise.resolve(null);
  const pending = pendingConv.get(sessionId);
  if (pending) {
    return pending.then((conversationId) =>
      deletedSessionTombstones.has(sessionId) ? null : conversationId
    );
  }

  const p = (async (): Promise<string | null> => {
    const configuredTimeout = dependencies.timeoutMs ?? CONVERSATION_CREATE_TIMEOUT_MS;
    const timeoutMs = Number.isFinite(configuredTimeout)
      ? Math.max(1, configuredTimeout)
      : CONVERSATION_CREATE_TIMEOUT_MS;
    const deadline = Date.now() + timeoutMs;
    const remaining = () => Math.max(0, deadline - Date.now());
    const authenticate = dependencies.authenticate ?? ensureAuthenticatedUser;
    const uid = await settleBeforeDeadline(authenticate, remaining());
    if (uid === DEADLINE_EXPIRED || !uid) return null;
    if (deletedSessionTombstones.has(sessionId)) return null;

    const conversationId = convMapGetForOwner(sessionId, uid) ?? crypto.randomUUID();
    const input: ConversationCreateInput = {
      conversationId,
      ownerId: uid,
      personaKey,
      title,
    };
    // Persist the client-generated target before the request starts. If the
    // transaction commits but its HTTP acknowledgement is lost, deletion and
    // retry still address the same idempotent server row.
    convMapSet(sessionId, conversationId, uid);
    const createConversation = dependencies.createConversation ??
      (async (
        createInput: ConversationCreateInput,
        signal: AbortSignal,
      ): Promise<string | null> => {
        if (!supabase) return null;
        const { data, error } = await supabase
          .rpc("create_chat_conversation_idempotent", {
            p_conversation_id: createInput.conversationId,
            p_persona_slug: createInput.personaKey,
            p_title: createInput.title,
          })
          .abortSignal(signal);
        if (error || typeof data !== "string") return null;
        return data;
      });
    const created = await runAbortableBeforeDeadline(
      (signal) => createConversation(input, signal),
      remaining(),
    );
    if (
      created === DEADLINE_EXPIRED || !created ||
      created !== conversationId
    ) return null;
    // Keep the raw id in the shared pending promise: deletion may have placed a
    // tombstone while create was in flight and needs this id for server cleanup.
    return created;
  })();
  pendingConv.set(sessionId, p);
  void p.finally(() => pendingConv.delete(sessionId));
  return p.then((conversationId) =>
    deletedSessionTombstones.has(sessionId) ? null : conversationId
  );
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
  skipRemoteLog = false,
  /** Session that initiated an async request. Never append to a newly selected session. */
  targetSessionId?: string,
): { store: SessionStore; aiMessageId: number } {
  const aiMessage: ChatMessage = { id: nextMessageId(), role: "ai", reply };
  const round: ChatMessage[] = [
    { id: nextMessageId(), role: "user", text: question },
    aiMessage,
  ];
  const aiMessageId = aiMessage.id;
  const list = store.sessions[personaKey] ?? [];
  const activeId = store.active[personaKey] ?? null;
  const requestedId = targetSessionId ?? activeId;
  const now = Date.now();

  const idx = requestedId ? list.findIndex((s) => s.id === requestedId) : -1;
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
    void skipRemoteLog;
    const nextActiveId = targetSessionId && activeId !== targetSessionId
      ? activeId
      : updated.id;
    return {
      aiMessageId,
      store: {
        sessions: { ...store.sessions, [personaKey]: nextList },
        active: { ...store.active, [personaKey]: nextActiveId },
      },
    };
  }

  // A user may delete the initiating session while an answer is still
  // streaming. Do not resurrect the deleted transcript in a new session.
  if (targetSessionId) {
    void skipRemoteLog;
    return { store, aiMessageId };
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
  void skipRemoteLog;
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

export type DeleteSessionStatus = "deleted" | "local-only" | "retry-required";

export interface DeleteSessionResult {
  store: SessionStore;
  status: DeleteSessionStatus;
}

export interface DeleteSessionDependencies {
  deleteRemoteConversation?: (conversationId: string) => Promise<boolean>;
  /** Test seam for the same in-flight create promise held in `pendingConv`. */
  pendingConversationId?: Promise<string | null>;
}

async function deleteRemoteConversation(conversationId: string): Promise<boolean> {
  if (!supabase || !supabaseReady) return false;
  try {
    if (!await ensureAuthenticatedUser()) return false;
    const { data, error } = await supabase.rpc("delete_chat_conversation", {
      p_conversation_id: conversationId,
    });
    return !error && data === true;
  } catch {
    return false;
  }
}

function removeLocalSession(
  store: SessionStore,
  personaKey: string,
  sessionId: string,
): SessionStore {
  const list = store.sessions[personaKey] ?? [];
  const nextList = list.filter((session) => session.id !== sessionId);
  const activeId = store.active[personaKey] ?? null;
  return {
    sessions: { ...store.sessions, [personaKey]: nextList },
    active: {
      ...store.active,
      [personaKey]: activeId === sessionId ? null : activeId,
    },
  };
}

/**
 * Delete a local session and its known owner-scoped server conversation. When
 * the server delete cannot be confirmed, keep the transcript and mapping so the
 * user can retry instead of silently orphaning retained server data.
 */
export async function deleteSession(
  store: SessionStore,
  personaKey: string,
  sessionId: string,
  dependencies: DeleteSessionDependencies = {},
): Promise<DeleteSessionResult> {
  deletedSessionTombstones.add(sessionId);
  const target = (store.sessions[personaKey] ?? []).find((session) => session.id === sessionId);
  let conversationId = convMapGet(sessionId) ?? target?.conversationId ?? null;
  if (!conversationId) {
    const pendingConversation = dependencies.pendingConversationId ?? pendingConv.get(sessionId);
    if (pendingConversation) {
      conversationId = await pendingConversation.catch(() => null);
      // Preserve a just-created id until deletion is confirmed. If the delete
      // genuinely fails, this mapping is the user's durable retry handle.
      if (conversationId) convMapSet(sessionId, conversationId, null);
    }
  }
  if (conversationId) {
    const deleteKnownConversation = dependencies.deleteRemoteConversation
      ?? deleteRemoteConversation;
    const deleted = await deleteKnownConversation(conversationId).catch(() => false);
    if (!deleted) {
      deletedSessionTombstones.delete(sessionId);
      return { store, status: "retry-required" };
    }
    convMapDelete(sessionId);
    return {
      store: removeLocalSession(store, personaKey, sessionId),
      status: "deleted",
    };
  }

  convMapDelete(sessionId);
  return {
    store: removeLocalSession(store, personaKey, sessionId),
    status: "local-only",
  };
}

export function setActiveSession(
  store: SessionStore,
  personaKey: string,
  sessionId: string | null
): SessionStore {
  return { ...store, active: { ...store.active, [personaKey]: sessionId } };
}

function citationIdentity(citation: Citation): string {
  const source = citation.revision_id || `${citation.title}|${citation.href}`;
  return [
    source,
    citation.href,
    citation.page ?? "",
    citation.start_seconds ?? "",
    citation.end_seconds ?? "",
    citation.section ?? "",
  ].join("|");
}

/** 集合對話入面所有引用(按來源 + locator 去重),俾右欄「引用來源」用 */
export function collectCitations(messages: ChatMessage[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const m of messages) {
    if (m.role !== "ai" || !m.reply) continue;
    for (const c of m.reply.citations) {
      const identity = citationIdentity(c);
      if (seen.has(identity)) continue;
      seen.add(identity);
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
