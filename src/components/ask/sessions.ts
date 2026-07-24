/**
 * Ask 對話 sessions — localStorage 持久化。
 * 每個分身(key = persona key)各自一組 sessions;每個 session 以第一條問題做標題。
 * 同時遷移舊版單一 history(`aigro-ask-history`)→ 平台編輯部嘅第一個 session。
 */

import type { AiReply } from "./AiMessage";

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
  topicId: string | null = null
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
    const updated: ChatSession = {
      ...list[idx],
      updatedAt: now,
      messages: [...list[idx].messages, ...round].slice(-MESSAGE_LIMIT),
      ...(topicId ? { lastTopicId: topicId } : {}),
    };
    const nextList = [updated, ...list.filter((_, i) => i !== idx)];
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
