import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUp, Sparkles } from "lucide-react";
import AiMessage from "@/components/ask/AiMessage";
import type { AiReply } from "@/components/ask/AiMessage";
import VerifiedBadge from "@/components/VerifiedBadge";
import { experts } from "@/data/experts";
import { cn } from "@/lib/utils";

const DAILY_QUOTA = 5;
const QUOTA_STORAGE_KEY = "aigro-ask-quota-used";

const SUGGESTIONS = [
  "今日 AI 有咩大事？",
  "香港邊啲行業最用得著 AI？",
  "點樣用 AI 做內容營銷？",
  "預算有限應該買邊個工具？",
] as const;

/* ---------- Scripted replies（ask.md §3 + 互動備註：按關鍵字 2–3 套回答） ---------- */

const CONTENT_MARKETING_REPLY: AiReply = {
  text: `根據本平台案例庫同最新情報，香港團隊常見嘅做法係咁：
第一，內容產出用 GPT-5 或 Claude 起草，但**觀點同本地案例必須人手注入** — 同質化係香港細市場最快被懲罰嘅問題。
第二，建立『一次生產、多平台分發』嘅工作流：一篇長文拆做 LinkedIn post、IG caption 同 WhatsApp 廣播稿。
第三，參考補習社案例，用 AI 做咗 2.4 倍內容產出嘅同時，將慳返嘅時間投放喺客戶訪談 — 真實洞察先係差異化。
想我針對你嘅行業具體拆解，可以話我知你嘅業務類型。`,
  citations: [
    { title: "補習社 AI 批改案例", href: "/cases/tutorial-centre-ai-grading" },
    { title: "AI 內容工場的三條紅線", href: "/insights/ai-content-red-lines" },
    { title: "GPT-5 發佈情報", href: "/insights/openai-gpt-5-launch" },
  ],
  confidence: 0.82,
};

const DAILY_NEWS_REPLY: AiReply = {
  text: `今日編輯部精選三件大事：
第一，OpenAI 發佈 GPT-5，統一推理與生成，API 價格下調 40%，中小企接入成本大降。
第二，MiniMax M2 開源，2,300 億參數 MoE，推理成本僅及 Claude 8%，適合私隱敏感行業本地部署。
第三，Perplexity 推出 Comet 瀏覽器 Agent 模式，直接挑戰傳統搜尋廣告模式。
想深入了解邊一單？我可以詳細拆解。`,
  citations: [
    { title: "OpenAI 發佈 GPT-5", href: "/insights/openai-gpt-5-unified" },
    { title: "MiniMax M2 開源", href: "/insights/minimax-m2-open-source" },
    { title: "Perplexity Comet Agent 模式", href: "/insights/perplexity-comet-agent-mode" },
  ],
  confidence: 0.84,
};

const INDUSTRY_REPLY: AiReply = {
  text: `以香港案例嚟講，而家落地最快嘅係三類行業：
第一，金融同保險 — 金管局生成式 AI 沙盒 2.0 已經有 20 家機構參與，合規路線明朗化。
第二，教育同補習 — 本地補習社用 AI 批改功課，內容產出提升 2.4 倍。
第三，零售同電商 — 客服同商品文案自動化，回本週期最短。
你嘅行業係邊類？我可以搵對應嘅香港案例俾你參考。`,
  citations: [
    { title: "金管局 AI 沙盒 2.0", href: "/insights/hkma-genai-sandbox-2" },
    { title: "補習社 AI 批改案例", href: "/cases/tutorial-centre-ai-grading" },
  ],
  confidence: 0.76,
};

const TOOLS_REPLY: AiReply = {
  text: `預算有限嘅話，我會咁樣排優先：
第一，寫作同研究用免費額度已經夠起步 — GPT-5 API 價格下調 40%，按用量付費比訂閱更慳。
第二，需要本地部署或者處理敏感資料，可以睇 MiniMax M2，開源兼推理成本只係 Claude 嘅 8%。
第三，開發團隊先考慮 Cursor 2.0，多 Agent 並行等於一人團隊有三倍產能。
話我知你嘅團隊人數同主要用途，我可以再收窄建議。`,
  citations: [
    { title: "GPT-5 發佈情報", href: "/insights/openai-gpt-5-unified" },
    { title: "MiniMax M2 開源", href: "/insights/minimax-m2-open-source" },
    { title: "Cursor 2.0 多 Agent 開發", href: "/insights/cursor-2-multi-agent" },
  ],
  confidence: 0.79,
};

/** no chip, no claim — 無可檢索來源必須明言（ask.md 規則） */
const FALLBACK_REPLY: AiReply = {
  text: `呢個問題暫時超出我可以可靠引用嘅範圍 — 編輯部原則係冇來源就唔會亂噏。
你可以試下換個問法，或者瀏覽 Insights 情報庫搵相關主題。如果想深入傾，認證導師可以一對一幫你。`,
  citations: [],
  confidence: 0.55,
};

function pickReply(question: string): AiReply {
  if (/內容|營銷|content/i.test(question)) return CONTENT_MARKETING_REPLY;
  if (/今日|大事|新聞|頭條/.test(question)) return DAILY_NEWS_REPLY;
  if (/行業|用得著|邊啲/.test(question)) return INDUSTRY_REPLY;
  if (/工具|預算|買|邊個/.test(question)) return TOOLS_REPLY;
  return FALLBACK_REPLY;
}

/* ---------- Chat message model ---------- */

interface ChatMessage {
  id: number;
  role: "user" | "ai";
  text?: string;
  reply?: AiReply;
}

function readInitialUsed(): number {
  try {
    const raw = window.localStorage.getItem(QUOTA_STORAGE_KEY);
    const n = raw === null ? NaN : Number.parseInt(raw, 10);
    if (Number.isNaN(n)) return 2; // 預設演示態：今日剩餘 3/5 次
    return Math.min(DAILY_QUOTA, Math.max(0, n));
  } catch {
    return 2;
  }
}

let messageId = 0;
const nextId = () => ++messageId;

/**
 * Ask `/ask` — AI 編輯部對話（ask.md）。
 * 全高 flex 欄（100dvh − navbar 64px）：Chat header → 訊息流（720px 滾動區）→ 輸入 dock。
 * 專家變體：`/ask?expert=marcus-chan`。
 */
export default function Ask() {
  const [searchParams] = useSearchParams();
  const expert =
    experts.find((e) => e.verified && e.slug === searchParams.get("expert")) ?? null;

  const reduced = useReducedMotion();
  const [used, setUsed] = useState<number>(readInitialUsed);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const remaining = Math.max(0, DAILY_QUOTA - used);
  const exhausted = remaining <= 0;

  // 額度計數遞減（localStorage mock，ask.md 互動備註）
  useEffect(() => {
    try {
      window.localStorage.setItem(QUOTA_STORAGE_KEY, String(used));
    } catch {
      /* localStorage unavailable — mock state only */
    }
  }, [used]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
    }
  }, [reduced]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const send = useCallback(
    (raw: string) => {
      const question = raw.trim();
      if (!question || exhausted) return;
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", text: question },
        { id: nextId(), role: "ai", reply: pickReply(question) },
      ]);
      setUsed((u) => Math.min(DAILY_QUOTA, u + 1));
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    },
    [exhausted]
  );

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`; // 1–4 行
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col bg-bg">
      {/* ---------- Section 1 — Chat Header ---------- */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex h-16 shrink-0 items-center gap-3 border-b bg-surface px-4 sm:px-6"
      >
        {expert ? (
          /* 專家分身變體（ask.md §1） */
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative shrink-0">
              <img
                src={expert.image}
                alt={expert.nameZh}
                className="h-8 w-8 rounded-full object-cover"
              />
              <span className="absolute -bottom-0.5 -right-0.5">
                <VerifiedBadge size={16} />
              </span>
            </span>
            <div className="min-w-0">
              <p className="truncate text-label text-text-primary">
                {expert.nameZh}嘅 AI 分身
              </p>
              <p className="hidden text-caption text-text-muted sm:block">
                基於授權知識庫回答
              </p>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ink-soft">
              <Sparkles className="h-4 w-4 text-ink" strokeWidth={1.5} />
            </span>
            <div className="min-w-0">
              <p className="text-label text-text-primary">平台編輯部 AI</p>
              <p className="hidden text-caption text-text-muted sm:block">
                基於 Insights / Cases 內容庫回答
              </p>
            </div>
          </div>
        )}

        {/* 免費額度條 */}
        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-caption",
                remaining === 1
                  ? "text-warning"
                  : remaining === 0
                    ? "text-error"
                    : "text-text-muted"
              )}
            >
              今日剩餘 {remaining}/{DAILY_QUOTA} 次
            </span>
            <span className="flex items-center gap-[3px]" aria-hidden="true">
              {Array.from({ length: DAILY_QUOTA }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 w-2 rounded-[1px] transition-colors duration-300",
                    i < used
                      ? i === DAILY_QUOTA - 1
                        ? "bg-warning" // 額度 ≥80% 告警（design.md §2.4，琥珀非金）
                        : "bg-ink"
                      : "border border-border bg-card"
                  )}
                />
              ))}
            </span>
          </div>
          {/* 演示切換（ask.md §5）：點擊切換 0/5 額度用盡態 */}
          <button
            type="button"
            onClick={() => setUsed(exhausted ? DAILY_QUOTA - 3 : DAILY_QUOTA)}
            className="hidden text-caption text-text-muted underline-offset-2 transition-colors duration-150 hover:text-ink hover:underline md:inline"
          >
            {exhausted ? "重設 3/5" : "演示 0/5"}
          </button>
          <Link
            to="/pricing"
            className="group inline-flex items-center gap-1 text-label text-ink"
          >
            升級
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-1"
              strokeWidth={1.5}
            />
          </Link>
        </div>
      </motion.header>

      {/* ---------- Sections 2–3 — 訊息流（滾動區） ---------- */}
      <div ref={scrollRef} data-lenis-prevent className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-6 pb-12">
          {messages.length === 0 ? (
            /* Empty State（ask.md §2） */
            <div className="flex flex-col items-center pt-24 text-center">
              <motion.h3
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="font-display text-h3 text-text-primary"
              >
                有咩想知？
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08 }}
                className="mt-3 max-w-md text-body-sm text-text-secondary"
              >
                問 AI 編輯部任何 AI、增長、營銷問題 — 每個論點附來源引用，無引用唔會亂噏。
              </motion.p>
              <div className="mt-8 flex max-w-lg flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={s}
                    type="button"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.16 + i * 0.08 }}
                    onClick={() => send(s)}
                    disabled={exhausted}
                    className="rounded-sm border bg-surface px-4 py-2.5 text-body-sm text-text-secondary transition-colors duration-150 hover:border-ink hover:text-ink disabled:pointer-events-none disabled:opacity-40"
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
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
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
                          expertBorderColor={expert?.brandColor}
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

      {/* ---------- Sections 4–5 — 輸入 Dock / 額度用盡態 ---------- */}
      <div className="shrink-0 border-t border-border-strong bg-overlay/95 backdrop-blur">
        <div className="mx-auto max-w-[720px] px-6 pb-5 pt-4">
          <AnimatePresence mode="wait" initial={false}>
            {exhausted ? (
              <motion.div
                key="quota-exhausted"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="rounded-lg border bg-surface p-8 text-center"
              >
                <h4 className="font-display text-h4 text-text-primary">
                  今日免費額度已用完
                </h4>
                <p className="mx-auto mt-2 max-w-md text-body-sm text-text-secondary">
                  升級進階會員，無限對話 + 專家分身通行。或者聽日再嚟。
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                  <Link
                    to="/pricing"
                    className="inline-flex h-11 items-center rounded-md bg-ink-solid px-6 text-label text-white transition-colors duration-120 hover:bg-ink-hover active:scale-[0.98]"
                  >
                    升級會員 →
                  </Link>
                  <Link
                    to="/experts"
                    className="group inline-flex items-center gap-1 text-label text-ink"
                  >
                    了解真人導師預約
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1"
                      strokeWidth={1.5}
                    />
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="input-dock"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex items-end gap-3">
                  <label htmlFor="ask-input" className="sr-only">
                    問下 AI 編輯部
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
                    placeholder="問下 AI 編輯部…"
                    className="max-h-[132px] min-h-[48px] flex-1 resize-none overflow-y-auto rounded-md border border-border-strong bg-surface px-4 py-3 text-body text-text-primary transition-[border-color,box-shadow] duration-150 placeholder:text-text-muted focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink-soft"
                  />
                  <button
                    type="button"
                    onClick={() => send(input)}
                    disabled={!input.trim()}
                    aria-label="送出問題"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-ink-solid text-white transition-[background-color,transform,opacity] duration-120 hover:bg-ink-hover active:scale-[0.94] disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ArrowUp className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                </div>
                <p className="mt-2 text-caption text-text-muted">
                  Shift+Enter 換行・AI 回答僅供參考・免費會員每日 5 次
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
