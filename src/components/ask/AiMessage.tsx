import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, CornerDownRight, Sparkles } from "lucide-react";
import TypewriterText from "./TypewriterText";
import ThinkingBars from "./ThinkingBars";
import { tokenizeTypewriter } from "./typewriter";
import { cn } from "@/lib/utils";

export interface Citation {
  title: string;
  href: string;
  excerpt?: string;
  revision_id?: string;
  section?: string;
  page?: number;
  start_seconds?: number;
  end_seconds?: number;
}

export interface AiReply {
  text: string;
  citations: Citation[];
  /** 信心分數 0–1；<0.6 轉 warning 並建議預約真人導師 */
  confidence: number;
  /**
   * 追問 chips(v1.19)— 分身口吻邀請深入嘅 2–3 條後續問題，
   * 喺引用 chips 之後渲染；點擊經 onFollowUp 直接送出。
   */
  followUps?: string[];
  /**
   * 回答來源(v1.21):
   * - kb(預設/undefined)= 授權知識庫,正常引用 + 信心行
   * - llm = LLM 一般知識回覆 → 顯示「AI 生成 · 一般知識」chip 取代引用 chips
   * - general = 內建一般知識模板 → 顯示「一般知識回覆」chip
   * - guardrail = 安全 deflect → 唔顯示信心行(deflect 唔係低信心答案)
   * - unavailable = live CMS/RAG 未能完成 → 明確顯示服務未連接，絕不顯示假引用
   */
  source?: "kb" | "llm" | "general" | "guardrail" | "unavailable";
  /**
   * KB 命中類型(G11/G12 信任 copy)— pickReply 回傳後由 Ask 附上:
   * direct/composed → 「授權內容庫回答 · 附來源」;near/continued →「相關話題回答」。
   */
  matched?: "direct" | "composed" | "near" | "continued" | "fallback";
  /** Server-side RAG 回覆帶即時情報引用 → 顯示「附即時情報引用」chip */
  ragUsed?: boolean;
  answerBasis?: "knowledge" | "general";
  coverage?: "high" | "medium" | "none";
}

interface AiMessageProps {
  reply: AiReply;
  /** 專家變體：AI 氣泡左邊框 2px 專家色（design.md §2.5） */
  expertBorderColor?: string;
  /** Auto-scroll callback while typing */
  onTyped?: () => void;
  /**
   * false = 還原歷史訊息：跳過 thinking + 打字機，全文、引用、信心行即刻
   * 完整渲染（無 cursor、無進場動畫）。只有新鮮回答先 animate。
   */
  animate?: boolean;
  /** 打字機完成後觸發（parent 用嚟清除 animating 標記） */
  onAnimationDone?: () => void;
  /**
   * 專家分身：信心 <0.6 時改為「Club 優先預約 — 即將開放」按鈕，
   * 點擊觸發 toast（唔承諾即時真人預約）；未提供時保留預設 /experts 連結。
   */
  lowConfidenceAction?: { label: string; onClick: () => void };
  /** 追問 chip 點擊 — 直接送出該問題（未提供時唔渲染追問 chips） */
  onFollowUp?: (question: string) => void;
}

type Phase = "waiting" | "typing" | "done";

/** 還原歷史訊息嘅靜態全文 — 同 TypewriterText 完成態一致嘅段落 + bold 渲染 */
function StaticReplyText({ text }: { text: string }) {
  const units = useMemo(() => tokenizeTypewriter(text), [text]);
  const paragraphs: { text: string; bold: boolean }[][] = [];
  for (const u of units) {
    (paragraphs[u.paragraph] ??= []).push(u);
  }
  return (
    <div aria-label={text}>
      {paragraphs.map((pUnits, pi) => (
        <p key={pi} className={cn(pi > 0 && "mt-4")}>
          {pUnits.map((u, ui) =>
            u.bold ? (
              <strong key={ui} className="font-semibold">
                {u.text}
              </strong>
            ) : (
              <span key={ui}>{u.text}</span>
            )
          )}
        </p>
      ))}
    </div>
  );
}

/**
 * AI 回答群組：ink-soft 氣泡（design.md §2.3 唯一染色卡片例外）+
 * 打字機 + citation chips（文字完成後 fade-in，stagger 60ms）+ 信心行。
 * Chips hover：文字 → ink + 下劃線 120ms，不位移（§5.2 — chips 必須穩定可信）。
 */
export default function AiMessage({
  reply,
  expertBorderColor,
  onTyped,
  animate = true,
  onAnimationDone,
  lowConfidenceAction,
  onFollowUp,
}: AiMessageProps) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("waiting");

  // Simulate waiting for the first token (ThinkingBars); reduced motion skips the wait.
  // 還原歷史(animate=false)直接 done — 唔經 thinking / 打字機。
  useEffect(() => {
    if (!animate || reduced) return;
    const t = window.setTimeout(() => setPhase("typing"), 900);
    return () => window.clearTimeout(t);
  }, [reduced, animate]);

  const visiblePhase: Phase = !animate
    ? "done"
    : reduced && phase === "waiting"
    ? "typing"
    : phase;

  const lowConfidence = reply.coverage === "none" || reply.confidence < 0.6;
  const followUps = onFollowUp ? (reply.followUps ?? []) : [];

  return (
    <div>
      {/* AI 氣泡 */}
      <div
        className={cn(
          "w-full rounded-lg bg-ink-soft px-6 py-5 text-body-lg text-text-primary",
          expertBorderColor && "border-l-2"
        )}
        style={expertBorderColor ? { borderLeftColor: expertBorderColor } : undefined}
      >
        {!animate ? (
          <StaticReplyText text={reply.text} />
        ) : visiblePhase === "waiting" ? (
          <ThinkingBars />
        ) : (
          <TypewriterText
            text={reply.text}
            active
            onProgress={onTyped}
            onComplete={() => {
              setPhase("done");
              onAnimationDone?.();
            }}
          />
        )}
      </div>

      {/* Citation chips — fade-in 120ms, stagger 60ms, only after text completes
          (還原歷史 animate=false → initial={false} 即刻顯示,無進場動畫) */}
      {visiblePhase === "done" && reply.citations.length > 0 && (
        <motion.div
          className="mt-3 flex flex-wrap gap-2"
          initial={animate ? "hidden" : false}
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        >
          {reply.citations.map((c) => (
            <motion.span
              key={c.href + c.title}
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { duration: 0.12 } },
              }}
            >
              {/* 外鏈(http)→ 原生 <a> 新分頁;站內 → react-router Link */}
              {/^https?:\/\//.test(c.href) ? (
                <a
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex h-6 items-center gap-1.5 rounded-sm border bg-surface px-2 text-caption text-text-secondary"
                >
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-ink" />
                  <span className="max-w-[220px] truncate transition-colors duration-120 group-hover:text-ink group-hover:underline">
                    {c.title}
                  </span>
                  <ArrowUpRight className="h-3 w-3 shrink-0 text-text-muted" strokeWidth={1.5} />
                </a>
              ) : (
                <Link
                  to={c.href}
                  className="group inline-flex h-6 items-center gap-1.5 rounded-sm border bg-surface px-2 text-caption text-text-secondary"
                >
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-ink" />
                  <span className="max-w-[220px] truncate transition-colors duration-120 group-hover:text-ink group-hover:underline">
                    {c.title}
                  </span>
                  <ArrowUpRight className="h-3 w-3 shrink-0 text-text-muted" strokeWidth={1.5} />
                </Link>
              )}
            </motion.span>
          ))}
        </motion.div>
      )}

      {/* 一般知識 chip(v1.21)— LLM / 內建模板回覆冊引用,用呢個 chip 標明性質。
          同引用 chips 一樣文字完成後先 fade-in;還原歷史即刻顯示。 */}
      {visiblePhase === "done" &&
        (reply.source === "llm" ||
          reply.source === "general" ||
          reply.source === "unavailable") && (
          <motion.div
            className="mt-3 flex flex-wrap gap-2"
            initial={animate ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.12 }}
          >
            <span className="inline-flex h-6 items-center gap-1.5 rounded-sm border bg-surface px-2 text-caption text-text-muted">
              <Sparkles className="h-3 w-3 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              {reply.source === "llm"
                ? "AI 生成 · 分身語氣"
                : reply.source === "unavailable"
                  ? "Beta · 服務暫時未連接"
                  : "一般知識回覆"}
            </span>
            {reply.source === "llm" && reply.ragUsed && (
              <span className="inline-flex h-6 items-center gap-1.5 rounded-sm border bg-surface px-2 text-caption text-text-muted">
                附即時情報引用
              </span>
            )}
          </motion.div>
        )}

      {/* 追問 chips — 引用之後,分身口吻邀請深入;點擊直接送出。
          同引用一樣 fade-in stagger 60ms;還原歷史(animate=false)即刻顯示。 */}
      {visiblePhase === "done" && followUps.length > 0 && (
        <motion.div
          className="mt-3 flex flex-wrap items-center gap-2"
          initial={animate ? "hidden" : false}
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.06, delayChildren: reply.citations.length * 0.06 } },
          }}
        >
          <motion.span
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { duration: 0.12 } },
            }}
            className="text-caption text-text-muted"
          >
            追問
          </motion.span>
          {followUps.map((f) => (
            <motion.span
              key={f}
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { duration: 0.12 } },
              }}
            >
              <button
                type="button"
                onClick={() => onFollowUp?.(f)}
                className="press group inline-flex h-7 items-center gap-1.5 rounded-sm border bg-surface px-2.5 text-caption text-text-secondary transition-colors duration-120 hover:border-[var(--ask-accent)] hover:text-[var(--ask-accent)]"
              >
                <CornerDownRight
                  className="h-3 w-3 shrink-0 text-text-muted"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <span className="max-w-[260px] truncate">{f}</span>
              </button>
            </motion.span>
          ))}
        </motion.div>
      )}

      {/* 信任行(G11/G12)— guardrail deflect 唔顯示;
          KB →「授權內容庫回答 · 附來源」,bridge/continued →「相關話題回答」,
          llm →「AI 生成 · 分身語氣」,general →「一般知識回覆」;唔再顯示小數信心分 */}
      {visiblePhase === "done" && reply.source !== "guardrail" && (
        <motion.p
          initial={animate ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.12,
            delay: (reply.citations.length + followUps.length) * 0.06,
          }}
          className={cn(
            "mt-2 text-caption",
            lowConfidence ? "text-warning" : "text-text-muted"
          )}
        >
          {reply.source === "llm"
            ? "AI 生成 · 分身語氣・回答僅供參考"
            : reply.source === "unavailable"
              ? "Beta・AI 導師服務暫時未連接"
            : reply.source === "general"
              ? "一般知識回覆・回答僅供參考"
              : reply.matched === "near" || reply.matched === "continued"
                ? "相關話題回答・回答僅供參考"
                : `授權內容庫回答${reply.citations.length > 0 ? " · 附來源" : ""}・回答僅供參考`}
          {lowConfidence && lowConfidenceAction && (
            <>
              {"・"}
              <button
                type="button"
                onClick={lowConfidenceAction.onClick}
                className="press inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-ink"
              >
                {lowConfidenceAction.label}
              </button>
            </>
          )}
          {lowConfidence && !lowConfidenceAction && (
            <>
              {"・"}
              <Link
                to="/experts"
                className="group inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-ink"
              >
                建議預約真人導師
                <ArrowRight
                  className="h-3 w-3 transition-transform duration-150 nudge-x"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </Link>
            </>
          )}
        </motion.p>
      )}
    </div>
  );
}
