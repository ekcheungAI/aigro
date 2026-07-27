import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUp, Check, History, Info, Sparkles, X } from "lucide-react";
import AiMessage from "@/components/ask/AiMessage";
import ThinkingBars from "@/components/ask/ThinkingBars";
import PersonaPanel, { SessionsList } from "@/components/ask/PersonaPanel";
import ClubBookingCapture from "@/components/ask/ClubBookingCapture";
import ContextPanel from "@/components/ask/ContextPanel";
import QuotaMeter from "@/components/ask/QuotaMeter";
import PresenceDot from "@/components/ask/PresenceDot";
import SpotlightCard from "@/components/ask/SpotlightCard";
import PersonaPopup from "@/components/ask/PersonaPopup";
import VerifiedBadge from "@/components/VerifiedBadge";
import MonogramAvatar, { PhotoAvatar } from "@/components/MonogramAvatar";
import {
  appendRound,
  buildChatHistory,
  collectCitations,
  lastUserQuestion,
  loadSessionStore,
  saveSessionStore,
  setActiveSession,
} from "@/components/ask/sessions";
import type { SessionStore } from "@/components/ask/sessions";
import { getPersona, personas, personaInitials, pickReply } from "@/data/personas";
import {
  guardrailReply,
  isOffGuard,
  resolveLlmReply,
} from "@/lib/llmFallback";
import { expertHasPhoto } from "@/data/experts";
import {
  DEFAULT_NOTIFICATIONS,
  loadMember,
  saveMember,
  validEmail,
} from "@/components/auth/member";
import type { AigroMember } from "@/components/auth/member";
import { EASE_OUT_STRONG } from "@/components/Reveal";
import { captureWaitlist } from "@/lib/waitlist";
import { cn } from "@/lib/utils";

/** 訪客第 3 條訊息後嘅註冊捕捉卡 — dismiss 改 snooze(7 日後可再出一次) */
const CAPTURE_DISMISS_KEY = "aigro-ask-capture-dismissed";
/** G13:用戶訊息數改跨 session 全局累計(唔好轉 session 就重新計) */
const USER_MSG_COUNT_KEY = "aigro-ask-user-msg-count";
const CAPTURE_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

const CAPTURE_BENEFITS = ["無限對話", "歷史同步", "個人化分身推薦"] as const;

function loadCaptureDismissed(): boolean {
  try {
    const raw = window.localStorage.getItem(CAPTURE_DISMISS_KEY);
    if (raw === null) return false;
    // 新格式:snooze 截止 timestamp;過期 → 可以再出
    const until = Number(raw);
    if (Number.isFinite(until) && until > 1) return until > Date.now();
    // 舊格式("1")視為已過期 snooze — 7 日制開始生效
    return false;
  } catch {
    return false;
  }
}

function loadGlobalUserCount(): number {
  try {
    const n = Number(window.localStorage.getItem(USER_MSG_COUNT_KEY));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function bumpGlobalUserCount(): number {
  const next = loadGlobalUserCount() + 1;
  try {
    window.localStorage.setItem(USER_MSG_COUNT_KEY, String(next));
  } catch {
    /* private mode — in-memory 由 state 頂住 */
  }
  return next;
}

/** 「對話中」mono 計時器 — 每秒 tick,顯示呢個文字對話進行咗幾耐(唔係通話)。
 *  key 用 persona.key,切換分身即由 00:00 重新計起。 */
function SessionTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  const hh = Math.floor(seconds / 3600);
  const mm = Math.floor((seconds % 3600) / 60);
  const ss = seconds % 60;
  const text =
    hh > 0
      ? `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
      : `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return (
    <span className="flex items-center gap-1.5" aria-label={`對話開始咗 ${text}`}>
      <PresenceDot size={8} />
      <span className="font-mono text-caption text-text-muted">對話中 {text}</span>
    </span>
  );
}

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
  // 「關於佢」persona popup(MasterClass 式導師宣傳卡)
  const [popupOpen, setPopupOpen] = useState(false);
  const toastTimer = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // v1.21:LLM 一般知識 fallback 嘅異步狀態 — 等待期間渲染用戶氣泡 + thinking bars,
  // resolve 後先入 store(同一條 typewriter 路徑)。同時間只准一條 in-flight。
  const [pendingLlm, setPendingLlm] = useState<{
    personaKey: string;
    question: string;
  } | null>(null);
  // 最新 store 嘅 ref — async LLM resolve 時喺最新狀態上 append,唔會冧咗中途嘅新訊息
  const storeRef = useRef(store);
  useEffect(() => {
    storeRef.current = store;
  }, [store]);
  const showPending = pendingLlm !== null && pendingLlm.personaKey === persona.key;

  // 訪客註冊捕捉:有 member record 就永遠唔顯示
  const [member, setMember] = useState<AigroMember | null>(loadMember);
  const [captureDismissed, setCaptureDismissed] = useState(loadCaptureDismissed);
  const [captureEmail, setCaptureEmail] = useState("");
  const [captureError, setCaptureError] = useState<string | null>(null);
  // G13:跨 session 全局訊息計數(捕捉卡時機用)
  const [globalUserCount, setGlobalUserCount] = useState(loadGlobalUserCount);
  // G5:Club 優先預約 — 低信心 CTA 開 inline email capture(唔再係空 toast)
  const [clubCaptureOpen, setClubCaptureOpen] = useState(false);
  // G10:<lg sessions drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 限時開放:對話額度無限 — 額度用盡升級態暫時 unreachable(保留程式碼)
  const exhausted = false;

  const sessions = store.sessions[persona.key] ?? [];
  const activeSessionId = store.active[persona.key] ?? null;
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const messages = useMemo(() => activeSession?.messages ?? [], [activeSession]);
  const citations = useMemo(() => collectCitations(messages), [messages]);
  // 訪客第 3 條訊息後(跨 session 全局累計),喺訊息流插入一張註冊捕捉卡(snooze 7 日)
  const showCapture = !member && !captureDismissed && globalUserCount >= 3;

  // Sessions 持久化 — refresh / 離開後返嚟都仲喺度
  useEffect(() => {
    saveSessionStore(store);
  }, [store]);

  // 切換分身 → 關 popup(避免舊分身內容殘留);drawer / Club capture 喺 selectPersona 關
  useEffect(() => {
    setPopupOpen(false);
  }, [persona.key]);

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

  /** 「而家唔使」— snooze 7 日(G13,唔再係永久 dismiss) */
  const dismissCapture = useCallback(() => {
    try {
      window.localStorage.setItem(
        CAPTURE_DISMISS_KEY,
        String(Date.now() + CAPTURE_SNOOZE_MS)
      );
    } catch {
      /* private mode — 靜默 */
    }
    setCaptureDismissed(true);
  }, []);

  /** 「免費加入」— 即場開 free 會員(record 經 member.ts,同 Join 同源) */
  const captureSignup = useCallback(() => {
    const email = captureEmail.trim();
    if (!validEmail(email)) {
      setCaptureError("請輸入有效嘅 Email 地址");
      return;
    }
    const next: AigroMember = {
      name: email.split("@")[0] || "會員",
      email,
      interests: [],
      persona: null,
      role: "free",
      tier: "free",
      joinedAt: Date.now(),
      notifications: { ...DEFAULT_NOTIFICATIONS },
    };
    saveMember(next);
    // 真實收集:寫入 Supabase waitlist(無 env / 離線 → 靜默)
    // G6:vertical = 分身 key,note = 最後一條用戶問題節錄(50字)— 專家跟進有上下文
    const question = lastUserQuestion(persona.key);
    void captureWaitlist({
      email,
      kind: "newsletter",
      source: "ask-capture",
      vertical: persona.key,
      note: question ? `對話 capture — 最近問題:「${question}」` : "對話 capture",
    });
    setMember(next);
    setCaptureError(null);
    showToast("已免費加入 — 對話紀錄會同步到你嘅帳號");
  }, [captureEmail, showToast, persona.key]);

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
      setDrawerOpen(false);
      setClubCaptureOpen(false);
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
      if (!question || exhausted || pendingLlm) return;
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      // G13:全局累計訊息數(捕捉卡時機)
      setGlobalUserCount(bumpGlobalUserCount());

      const personaKey = persona.key;
      /** 即刻入 store + 行打字機(KB / guardrail / 內建模板都係同步路徑) */
      const commit = (reply: Parameters<typeof appendRound>[3], topicId: string | null) => {
        const { store: next, aiMessageId } = appendRound(
          storeRef.current,
          personaKey,
          question,
          reply,
          topicId
        );
        storeRef.current = next;
        setStore(next);
        setAnimatingId(aiMessageId); // 淨係呢條新回答行打字機
      };

      // B. Guardrail — 明顯 spam / 違規 / jailbreak / 偷個人資料 → 分身口吻 deflect(唔係拒絕模板)
      const guard = isOffGuard(question);
      if (guard) {
        commit(guardrailReply(persona, guard), null);
        return;
      }

      // v1.19:加權匹配 + 問題類型感知 + 多意圖 compose;
      // 傳入 session memory(lastTopicId)俾模糊追問承接上一個話題
      const { reply, topicId, matched } = pickReply(
        persona,
        question,
        activeSession?.lastTopicId ?? null
      );

      // KB 命中(含近話題 bridge)→ 直接用;matched 附上俾 AiMessage 信任行用
      if (matched !== "fallback") {
        commit({ ...reply, matched }, topicId);
        return;
      }

      // C. LLM 自由答 — 先渲染用戶氣泡 + thinking bars(pendingLlm),resolve 後先入 store
      //    行同一條 typewriter 路徑。PRIMARY 自家 argro /chat(帶近 6 條歷史,
      //    追問記憶唔退化)→ SECONDARY VITE_LLM_* OpenAI(env 有設先用)
      //    → 全部失敗 → 內建一般知識模板;UI 永遠唔 hang。
      setPendingLlm({ personaKey, question });
      const history = buildChatHistory(messages, 6);
      resolveLlmReply(persona, question, history)
        .catch(() => reply) // timeout / 網絡 / 503 / rate-limit → graceful 內建一般知識回覆
        .then((finalReply) => {
          setPendingLlm((cur) =>
            cur && cur.personaKey === personaKey && cur.question === question ? null : cur
          );
          commit(finalReply, null);
        });
    },
    [exhausted, persona, activeSession, pendingLlm, messages]
  );

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`; // 1–4 行
  };

  // 專家分身:信心 <0.6 →「Club 優先預約 — 即將開放」→ inline email capture(G5)
  const lowConfidenceAction =
    persona.kind === "expert"
      ? {
          label: "Club 優先預約 — 即將開放",
          onClick: () => setClubCaptureOpen(true),
        }
      : undefined;

  return (
    <div
      className="flex h-[calc(100dvh-4rem)] bg-bg"
      style={{ "--ask-accent": persona.accent } as React.CSSProperties}
    >
      {/* ---------- 左欄(≥lg):分身選擇 & 對話管理 ----------
          首次 mount slide-in(x -12px,250ms,一次性;reduced-motion → 純 fade) */}
      <motion.div
        initial={
          reduced
            ? { opacity: 0 }
            : { opacity: 0, transform: "translateX(-12px)" }
        }
        animate={{ opacity: 1, transform: "translateX(0px)" }}
        transition={{ duration: 0.25, ease: EASE_OUT_STRONG }}
        className="hidden h-full lg:block"
      >
        <PersonaPanel
          personas={personas}
          activePersona={persona}
          onSelectPersona={selectPersona}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={selectSession}
          onNewSession={newSession}
          anonymous={!member}
        />
      </motion.div>

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
                {/* 頭像可點 → 「關於佢」popup;presence dot(lime 軟脈衝「在線」) */}
                <button
                  type="button"
                  onClick={() => setPopupOpen(true)}
                  aria-label={`關於${persona.name}`}
                  className="press relative shrink-0 rounded-full"
                >
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
                  <PresenceDot
                    size={10}
                    className="absolute -bottom-0.5 -right-0.5"
                  />
                </button>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate text-label text-text-primary">
                    <span className="truncate">{persona.name}</span>
                    <VerifiedBadge size={16} />
                  </p>
                  <p className="hidden text-caption text-text-muted sm:block">
                    AI 分身 · 與你單對單
                  </p>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setPopupOpen(true)}
                  aria-label="關於平台編輯部 AI"
                  className="press relative shrink-0 rounded-md"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink-soft">
                    <Sparkles className="h-4 w-4 text-ink" strokeWidth={1.5} />
                  </span>
                  <PresenceDot
                    size={10}
                    className="absolute -bottom-0.5 -right-0.5"
                  />
                </button>
                <div className="min-w-0">
                  <p className="text-label text-text-primary">平台編輯部 AI</p>
                  <p className="hidden text-caption text-text-muted sm:block">
                    AI 分身 · 與你單對單
                  </p>
                </div>
              </>
            )}
          </motion.div>

          {/* 對話中計時 + 關於佢 + 對話額度(限時無限開放) */}
          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            <span className="hidden sm:flex">
              <SessionTimer key={persona.key} />
            </span>
            <button
              type="button"
              onClick={() => setPopupOpen(true)}
              aria-label={`關於${persona.name}`}
              title={`關於${persona.name}`}
              className="press flex h-8 w-8 items-center justify-center rounded-sm border border-border-strong text-text-secondary hover:bg-card hover:text-ink"
            >
              <Info className="h-4 w-4" strokeWidth={1.5} />
            </button>
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
          {/* G10:<lg sessions drawer 觸發(內容 = PersonaPanel 嘅對話紀錄部分) */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="打開對話紀錄"
            title="對話紀錄"
            className="press ml-auto flex shrink-0 items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-caption text-text-secondary transition-colors duration-150 hover:bg-card"
          >
            <History className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            紀錄
          </button>
        </div>

        {/* Sections 2–3 — 訊息流(滾動區) */}
        <div ref={scrollRef} data-lenis-prevent className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[720px] px-6 pb-12">
            {messages.length === 0 && !showPending ? (
              /* Empty State — 導師宣傳 spotlight card + 佢嘅 4 條建議問題,
                 好似導師邀請你入嚟傾,而唔係一張空白表格 */
              <div className="flex flex-col items-center pt-10 sm:pt-16">
                <SpotlightCard
                  key={`${persona.key}-spotlight`}
                  persona={persona}
                  onOpenProfile={() => setPopupOpen(true)}
                />
                <motion.p
                  key={`${persona.key}-invite`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25, delay: reduced ? 0.1 : 0.24 }}
                  className="mt-6 text-body-sm text-text-secondary"
                >
                  {persona.greetingTitle}
                </motion.p>
                {/* G9:greetingBody(personas.ts 已定義)— 分身開場白,唔好浪費 */}
                <motion.p
                  key={`${persona.key}-greeting-body`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25, delay: reduced ? 0.12 : 0.3 }}
                  className="mt-2 max-w-lg text-center text-body-sm text-text-muted"
                >
                  {persona.greetingBody}
                </motion.p>
                <div className="mt-4 flex max-w-lg flex-wrap justify-center gap-2">
                  {persona.suggestions.map((s, i) => (
                    <motion.button
                      key={s}
                      type="button"
                      initial={
                        reduced
                          ? { opacity: 0 }
                          : { opacity: 0, transform: "translateY(12px)" }
                      }
                      animate={{ opacity: 1, transform: "translateY(0px)" }}
                      transition={{
                        duration: reduced ? 0.2 : 0.3,
                        delay: 0.28 + i * 0.06,
                        ease: EASE_OUT_STRONG,
                      }}
                      onClick={() => send(s)}
                      disabled={exhausted || pendingLlm !== null}
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
                    /* 用戶氣泡 pop-in:scale 0.97 + fade,origin 右(對齊氣泡側) */
                    <motion.div
                      key={m.id}
                      initial={
                        reduced
                          ? { opacity: 0 }
                          : { opacity: 0, transform: "scale(0.97)" }
                      }
                      animate={{ opacity: 1, transform: "scale(1)" }}
                      transition={{ duration: 0.25, ease: EASE_OUT_STRONG }}
                      className="flex origin-right justify-end"
                    >
                      <div className="max-w-[80%] whitespace-pre-wrap rounded-lg bg-card px-5 py-4 text-body text-text-primary">
                        {m.text}
                      </div>
                    </motion.div>
                  ) : (
                    /* AI 氣泡 rise-in:translateY 10px + fade */
                    <motion.div
                      key={m.id}
                      initial={
                        reduced
                          ? { opacity: 0 }
                          : { opacity: 0, transform: "translateY(10px)" }
                      }
                      animate={{ opacity: 1, transform: "translateY(0px)" }}
                      transition={{ duration: 0.25, ease: EASE_OUT_STRONG }}
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
                            onFollowUp={send}
                          />
                        )}
                      </div>
                    </motion.div>
                  )
                )}

                {/* LLM fallback pending — 用戶氣泡 + thinking bars,等 API resolve;
                    入 store 後由正常訊息路徑接手(typewriter) */}
                {pendingLlm && pendingLlm.personaKey === persona.key && (
                  <>
                    <div className="flex justify-end">
                      <div className="max-w-[80%] whitespace-pre-wrap rounded-lg bg-card px-5 py-4 text-body text-text-primary">
                        {pendingLlm.question}
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="w-full">
                        <div
                          className={cn(
                            "w-full rounded-lg bg-ink-soft px-6 py-5",
                            persona.kind === "expert" && "border-l-2"
                          )}
                          style={
                            persona.kind === "expert"
                              ? { borderLeftColor: persona.accent }
                              : undefined
                          }
                        >
                          <ThinkingBars />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* 訪客捕捉卡 — 第 3 條訊息後一次性 inline 出現(非 modal) */}
                <AnimatePresence>
                  {showCapture && (
                    <motion.div
                      key="signup-capture"
                      initial={{ opacity: 0, transform: "translateY(12px)" }}
                      animate={{ opacity: 1, transform: "translateY(0px)" }}
                      exit={{ opacity: 0, transform: "translateY(8px)" }}
                      transition={{ duration: 0.3 }}
                      className="rounded-md border border-border-strong bg-surface p-6"
                    >
                      <p className="text-overline uppercase tracking-[0.12em] text-ink">
                        AIGRO Club
                      </p>
                      <h4 className="mt-2 font-display text-h4 text-text-primary">
                        想留住對話紀錄?
                      </h4>
                      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                        {CAPTURE_BENEFITS.map((b) => (
                          <li
                            key={b}
                            className="flex items-center gap-1.5 text-body-sm text-text-secondary"
                          >
                            <Check className="h-3.5 w-3.5 shrink-0 text-ink" strokeWidth={2} />
                            {b}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-caption text-text-muted">
                        免費註冊即享 — 對話會自動同步返你嘅帳號。
                      </p>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <label htmlFor="capture-email" className="sr-only">
                          Email
                        </label>
                        <input
                          id="capture-email"
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          value={captureEmail}
                          aria-invalid={captureError ? true : undefined}
                          onChange={(e) => {
                            setCaptureEmail(e.target.value);
                            if (captureError) setCaptureError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                              e.preventDefault();
                              captureSignup();
                            }
                          }}
                          className={cn(
                            "h-11 flex-1 rounded-md border bg-surface px-4 text-body-sm text-text-primary transition-[border-color,box-shadow] duration-150 placeholder:text-text-muted focus:outline-none focus:ring-2",
                            captureError
                              ? "border-error focus:border-error focus:ring-error/20"
                              : "border-border-strong focus:border-ink focus:ring-ink-soft"
                          )}
                        />
                        <button
                          type="button"
                          onClick={captureSignup}
                          className="press inline-flex h-11 shrink-0 items-center justify-center rounded-md bg-lime px-5 text-label text-on-accent hover:bg-lime-hover"
                        >
                          免費加入
                        </button>
                      </div>
                      {captureError && (
                        <p role="alert" className="mt-2 text-caption text-error">
                          {captureError}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={dismissCapture}
                        className="press mt-3 text-caption text-text-muted underline decoration-text-muted/60 underline-offset-4 hover:text-ink"
                      >
                        而家唔使
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                      disabled={!input.trim() || pendingLlm !== null}
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

      {/* ---------- 右欄(≥lg):分身背景 & 引用 ----------
          首次 mount slide-in(x +12px,250ms,一次性;reduced-motion → 純 fade) */}
      <motion.div
        initial={
          reduced
            ? { opacity: 0 }
            : { opacity: 0, transform: "translateX(12px)" }
        }
        animate={{ opacity: 1, transform: "translateX(0px)" }}
        transition={{ duration: 0.25, ease: EASE_OUT_STRONG }}
        className="hidden h-full lg:block"
      >
        <ContextPanel
          persona={persona}
          citations={citations}
          onSuggestion={send}
          suggestionsDisabled={exhausted || pendingLlm !== null}
        />
      </motion.div>

      {/* G10:<lg sessions drawer — 由分身切換條「紀錄」觸發,內容 = PersonaPanel 嘅對話紀錄部分 */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-ink-solid/30 lg:hidden"
              aria-hidden="true"
            />
            <motion.div
              key="drawer-panel"
              role="dialog"
              aria-label="對話紀錄"
              initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "translateX(-16px)" }}
              animate={{ opacity: 1, transform: "translateX(0px)" }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, transform: "translateX(-16px)" }}
              transition={{ duration: 0.25, ease: EASE_OUT_STRONG }}
              className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-surface px-4 pb-3 pt-4 lg:hidden"
            >
              <div className="mb-2 flex shrink-0 items-center justify-between">
                <p className="text-label text-text-primary">{persona.name}</p>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="關閉對話紀錄"
                  className="press flex h-8 w-8 items-center justify-center rounded-sm border border-border-strong text-text-secondary hover:bg-card hover:text-ink"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
                <SessionsList
                  sessions={sessions}
                  activeSessionId={activeSessionId}
                  activePersona={persona}
                  onSelectSession={(id) => {
                    selectSession(id);
                    setDrawerOpen(false);
                  }}
                  onNewSession={() => {
                    newSession();
                    setDrawerOpen(false);
                  }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 「關於佢」persona popup — MasterClass 式導師宣傳卡(Esc / backdrop 關閉) */}
      <PersonaPopup
        open={popupOpen}
        persona={persona}
        onClose={() => setPopupOpen(false)}
      />

      {/* G5:Club 優先預約 inline capture — 低信心 CTA / 預約意圖觸發 */}
      <AnimatePresence>
        {clubCaptureOpen && persona.kind === "expert" && (
          <motion.div
            key="club-capture"
            role="dialog"
            aria-label="Club 優先預約登記"
            initial={{ opacity: 0, transform: "translate(-50%, 12px)" }}
            animate={{ opacity: 1, transform: "translate(-50%, 0px)" }}
            exit={{ opacity: 0, transform: "translate(-50%, 12px)" }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-24 left-1/2 z-50 w-[min(360px,calc(100vw-2rem))] rounded-md border bg-surface p-4"
          >
            <button
              type="button"
              onClick={() => setClubCaptureOpen(false)}
              aria-label="關閉"
              className="press absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-sm text-text-muted hover:text-ink"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
            <ClubBookingCapture
              persona={persona}
              idPrefix="ask-club"
              onSubmitted={() => {
                setClubCaptureOpen(false);
                showToast("已記低 — Club 預約開放即通知你。");
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

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
