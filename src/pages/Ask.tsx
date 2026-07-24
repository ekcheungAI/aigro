import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUp, Sparkles } from "lucide-react";
import AiMessage from "@/components/ask/AiMessage";
import PersonaPanel from "@/components/ask/PersonaPanel";
import ContextPanel from "@/components/ask/ContextPanel";
import QuotaMeter from "@/components/ask/QuotaMeter";
import VerifiedBadge from "@/components/VerifiedBadge";
import MonogramAvatar, { PhotoAvatar } from "@/components/MonogramAvatar";
import {
  appendRound,
  collectCitations,
  loadSessionStore,
  saveSessionStore,
  setActiveSession,
} from "@/components/ask/sessions";
import type { SessionStore } from "@/components/ask/sessions";
import { getPersona, personas, personaInitials, pickPersonaReply } from "@/data/personas";
import { expertHasPhoto } from "@/data/experts";
import { EASE_OUT_STRONG } from "@/components/Reveal";
import { cn } from "@/lib/utils";

/**
 * Ask `/ask` — AI 分身對話工作區(v1.6 三欄版)。
 * 左欄(≥lg):分身選擇 + 對話紀錄(sessions)+ 額度 meter;
 * 中欄:chat header → 訊息流(720px 滾動區)→ 輸入 dock;
 * 右欄(≥lg):關於此分身 / 引用來源集合 / 建議問題。
 * 專家變體:`/ask?expert=jimmy-lau`;平台編輯部 = 無參數。
 */
export default function Ask() {
  const [searchParams, setSearchParams] = useSearchParams();
  const persona = getPersona(searchParams.get("expert"));

  const reduced = useReducedMotion();
  const [store, setStore] = useState<SessionStore>(loadSessionStore);
  /**
   * 得呢個 message id 行打字機 — 只喺 send 嗰刻設置;切換 session/分身即清除。
   * 還原歷史(load / 揀返舊 session)永遠唔會命中 → 全部即刻渲染。
   */
  const [animatingId, setAnimatingId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 限時開放:對話額度無限 — 額度用盡升級態暫時 unreachable(保留程式碼)
  const exhausted = false;

  const sessions = store.sessions[persona.key] ?? [];
  const activeSessionId = store.active[persona.key] ?? null;
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const messages = useMemo(() => activeSession?.messages ?? [], [activeSession]);
  const citations = useMemo(() => collectCitations(messages), [messages]);

  // Sessions 持久化 — refresh / 離開後返嚟都仲喺度
  useEffect(() => {
    saveSessionStore(store);
  }, [store]);

  // Toast 自動消失
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 6000);
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
    }
  }, [reduced]);

  // 還原歷史(頁面載入 / 揀返舊 session / 切換分身)→ 即刻跳去最新訊息;
  // 同一 session 內新訊息 → smooth。新鮮回答打字途中由 onTyped 逐字跟住捲。
  const lastSessionRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const instant = lastSessionRef.current !== activeSessionId;
    lastSessionRef.current = activeSessionId;
    if (messages.length === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    if (instant || reduced) {
      el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    } else {
      scrollToBottom();
    }
  }, [messages.length, activeSessionId, reduced, scrollToBottom]);

  const selectPersona = useCallback(
    (key: string) => {
      setAnimatingId(null);
      setSearchParams(key === "platform" ? {} : { expert: key });
    },
    [setSearchParams]
  );

  const selectSession = useCallback(
    (id: string) => {
      setAnimatingId(null);
      setStore((prev) => setActiveSession(prev, persona.key, id));
    },
    [persona.key]
  );

  const newSession = useCallback(() => {
    setAnimatingId(null);
    setStore((prev) => setActiveSession(prev, persona.key, null));
  }, [persona.key]);

  const send = useCallback(
    (raw: string) => {
      const question = raw.trim();
      if (!question || exhausted) return;
      const { store: next, aiMessageId } = appendRound(
        store,
        persona.key,
        question,
        pickPersonaReply(persona, question)
      );
      setStore(next);
      setAnimatingId(aiMessageId); // 淨係呢條新回答行打字機
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    },
    [exhausted, persona, store]
  );

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`; // 1–4 行
  };

  // 專家分身:信心 <0.6 →「Club 優先預約 — 即將開放」toast(唔承諾即時預約)
  const lowConfidenceAction =
    persona.kind === "expert"
      ? {
          label: "Club 優先預約 — 即將開放",
          onClick: () =>
            showToast("Club 優先預約即將開放 — 開放時 Club 會員會優先收到通知。"),
        }
      : undefined;

  return (
    <div
      className="flex h-[calc(100dvh-4rem)] bg-bg"
      style={{ "--ask-accent": persona.accent } as React.CSSProperties}
    >
      {/* ---------- 左欄(≥lg):分身選擇 & 對話管理 ---------- */}
      <div className="hidden h-full lg:block">
        <PersonaPanel
          personas={personas}
          activePersona={persona}
          onSelectPersona={selectPersona}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={selectSession}
          onNewSession={newSession}
        />
      </div>

      {/* ---------- 中欄:chat stream ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Section 1 — Chat Header */}
        <motion.header
          initial={{ opacity: 0, transform: "translateY(-8px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          transition={{ duration: 0.3 }}
          className="flex h-16 shrink-0 items-center gap-3 border-b bg-surface px-4 sm:px-6"
        >
          {/* 分身 signature transition — keyed on persona: 250ms rise +
              cross-fade (GPU transform/opacity, strong ease-out; reduced-motion
              → instant). 切換分身嘅一刻係 Ask 嘅品牌時刻。 */}
          <motion.div
            key={persona.key}
            initial={reduced ? false : { opacity: 0, transform: "translateY(6px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{ duration: 0.25, ease: EASE_OUT_STRONG }}
            className="flex min-w-0 items-center gap-3"
          >
            {persona.kind === "expert" && persona.expert ? (
              <>
                <span className="relative shrink-0">
                  {persona.expert && expertHasPhoto(persona.expert) ? (
                    <PhotoAvatar
                      src={persona.expert.image}
                      alt={persona.name}
                      size={32}
                    />
                  ) : (
                    <MonogramAvatar
                      initials={personaInitials(persona)}
                      color={persona.accent}
                      size={32}
                    />
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5">
                    <VerifiedBadge size={16} />
                  </span>
                </span>
                <div className="min-w-0">
                  <p className="truncate text-label text-text-primary">{persona.name}</p>
                  <p className="hidden text-caption text-text-muted sm:block">
                    {persona.headerCaption}
                  </p>
                </div>
              </>
            ) : (
              <>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ink-soft">
                  <Sparkles className="h-4 w-4 text-ink" strokeWidth={1.5} />
                </span>
                <div className="min-w-0">
                  <p className="text-label text-text-primary">平台編輯部 AI</p>
                  <p className="hidden text-caption text-text-muted sm:block">
                    {persona.headerCaption}
                  </p>
                </div>
              </>
            )}
          </motion.div>

          {/* 對話額度(限時無限開放) */}
          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            <QuotaMeter />
            <Link
              to="/pricing"
              className="group inline-flex items-center gap-1 text-label text-ink"
            >
              升級
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform duration-150 nudge-x"
                strokeWidth={1.5}
              />
            </Link>
          </div>
        </motion.header>

        {/* 手機版分身切換條(<lg) */}
        <div className="flex shrink-0 gap-2 overflow-x-auto border-b bg-surface px-3 py-2 lg:hidden">
          {personas.map((p) => {
            const active = p.key === persona.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => selectPersona(p.key)}
                aria-pressed={active}
                className={cn(
                  "press flex shrink-0 items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-caption transition-colors duration-150",
                  active ? "bg-card" : "text-text-secondary"
                )}
                style={
                  active
                    ? { borderColor: p.accent, color: p.accent }
                    : undefined
                }
              >
                {p.kind === "platform" ? (
                  <Sparkles className="h-3.5 w-3.5 text-ink" strokeWidth={1.5} aria-hidden="true" />
                ) : p.expert && expertHasPhoto(p.expert) ? (
                  <PhotoAvatar src={p.expert.image} alt={p.name} size={16} />
                ) : (
                  <MonogramAvatar initials={personaInitials(p)} color={p.accent} size={16} />
                )}
                {p.shortName}
              </button>
            );
          })}
        </div>

        {/* Sections 2–3 — 訊息流(滾動區) */}
        <div ref={scrollRef} data-lenis-prevent className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[720px] px-6 pb-12">
            {messages.length === 0 ? (
              /* Empty State — 分身專屬 greeting + 建議問題 */
              <div className="flex flex-col items-center pt-24 text-center">
                <motion.h3
                  key={`${persona.key}-title`}
                  initial={{ opacity: 0, transform: "translateY(24px)" }}
                  animate={{ opacity: 1, transform: "translateY(0px)" }}
                  transition={{ duration: 0.5 }}
                  className="font-display text-h3 text-text-primary"
                >
                  {persona.greetingTitle}
                </motion.h3>
                <motion.p
                  key={`${persona.key}-body`}
                  initial={{ opacity: 0, transform: "translateY(24px)" }}
                  animate={{ opacity: 1, transform: "translateY(0px)" }}
                  transition={{ duration: 0.5, delay: 0.08 }}
                  className="mt-3 max-w-md text-body-sm text-text-secondary"
                >
                  {persona.greetingBody}
                </motion.p>
                <div className="mt-8 flex max-w-lg flex-wrap justify-center gap-2">
                  {persona.suggestions.map((s, i) => (
                    <motion.button
                      key={s}
                      type="button"
                      initial={{ opacity: 0, transform: "translateY(12px)" }}
                      animate={{ opacity: 1, transform: "translateY(0px)" }}
                      transition={{ duration: 0.35, delay: 0.16 + i * 0.08 }}
                      onClick={() => send(s)}
                      disabled={exhausted}
                      className="press rounded-sm border bg-surface px-4 py-2.5 text-body-sm text-text-secondary transition-colors duration-150 hover:border-[var(--ask-accent)] hover:text-[var(--ask-accent)] disabled:pointer-events-none disabled:opacity-40"
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6 pt-6">
                {messages.map((m) =>
                  m.role === "user" ? (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, transform: "translateY(12px)" }}
                      animate={{ opacity: 1, transform: "translateY(0px)" }}
                      transition={{ duration: 0.25 }}
                      className="flex justify-end"
                    >
                      <div className="max-w-[80%] whitespace-pre-wrap rounded-lg bg-card px-5 py-4 text-body text-text-primary">
                        {m.text}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25 }}
                      className="flex justify-start"
                    >
                      <div className="w-full">
                        {m.reply && (
                          <AiMessage
                            reply={m.reply}
                            expertBorderColor={
                              persona.kind === "expert" ? persona.accent : undefined
                            }
                            animate={m.id === animatingId}
                            onAnimationDone={() =>
                              setAnimatingId((cur) => (cur === m.id ? null : cur))
                            }
                            lowConfidenceAction={lowConfidenceAction}
                            onTyped={scrollToBottom}
                          />
                        )}
                      </div>
                    </motion.div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sections 4–5 — 輸入 Dock / 額度用盡態 */}
        <div className="shrink-0 border-t border-border-strong bg-overlay/95 backdrop-blur">
          <div className="mx-auto max-w-[720px] px-6 pb-5 pt-4">
            <AnimatePresence mode="wait" initial={false}>
              {exhausted ? (
                <motion.div
                  key="quota-exhausted"
                  initial={{ opacity: 0, transform: "translateY(8px)" }}
                  animate={{ opacity: 1, transform: "translateY(0px)" }}
                  exit={{ opacity: 0, transform: "translateY(-8px)" }}
                  transition={{ duration: 0.25 }}
                  className="rounded-md border bg-surface p-8 text-center"
                >
                  <h4 className="font-display text-h4 text-text-primary">
                    免費無限對話 · 限時開放
                  </h4>
                  <p className="mx-auto mt-2 max-w-md text-body-sm text-text-secondary">
                    限時開放期間,訪客同會員都係免費無限對話 — 繼續問,唔使等聽日。
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                    <Link
                      to="/pricing"
                      className="group inline-flex h-11 items-center gap-1.5 rounded-md bg-ink-solid px-6 text-label text-white press hover:bg-ink-hover"
                    >
                      升級會員
                      <ArrowRight
                        className="h-4 w-4 transition-transform duration-150 nudge-x"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    </Link>
                    <Link
                      to="/experts"
                      className="group inline-flex items-center gap-1 text-label text-ink"
                    >
                      了解真人導師預約
                      <ArrowRight
                        className="h-4 w-4 transition-transform duration-150 nudge-x"
                        strokeWidth={1.5}
                      />
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="input-dock"
                  initial={{ opacity: 0, transform: "translateY(8px)" }}
                  animate={{ opacity: 1, transform: "translateY(0px)" }}
                  exit={{ opacity: 0, transform: "translateY(-8px)" }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex items-end gap-3">
                    <label htmlFor="ask-input" className="sr-only">
                      問下{persona.shortName}
                    </label>
                    <textarea
                      id="ask-input"
                      ref={textareaRef}
                      rows={1}
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value);
                        autoGrow(e.target);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          send(input);
                        }
                      }}
                      placeholder={`問下${persona.shortName}…`}
                      className="max-h-[132px] min-h-[48px] flex-1 resize-none overflow-y-auto rounded-md border border-border-strong bg-surface px-4 py-3 text-body text-text-primary transition-[border-color,box-shadow] duration-150 placeholder:text-text-muted focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink-soft"
                    />
                    <button
                      type="button"
                      onClick={() => send(input)}
                      disabled={!input.trim()}
                      aria-label="送出問題"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-ink-solid text-white press hover:bg-ink-hover disabled:pointer-events-none disabled:opacity-40"
                    >
                      <ArrowUp className="h-5 w-5" strokeWidth={1.5} />
                    </button>
                  </div>
                  <p className="mt-2 text-caption text-text-muted">
                    Shift+Enter 換行・AI 回答僅供參考・免費無限對話 · 限時開放
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ---------- 右欄(≥lg):分身背景 & 引用 ---------- */}
      <div className="hidden h-full lg:block">
        <ContextPanel
          persona={persona}
          citations={citations}
          onSuggestion={send}
          suggestionsDisabled={exhausted}
        />
      </div>

      {/* Club 優先預約 toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="club-toast"
            role="status"
            initial={{ opacity: 0, transform: "translate(-50%, 8px)" }}
            animate={{ opacity: 1, transform: "translate(-50%, 0px)" }}
            exit={{ opacity: 0, transform: "translate(-50%, 8px)" }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 left-1/2 z-50 max-w-[calc(100vw-2rem)] rounded-md border bg-surface px-4 py-3 text-body-sm text-text-primary"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
