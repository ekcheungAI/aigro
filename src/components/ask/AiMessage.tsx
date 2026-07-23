import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import TypewriterText from "./TypewriterText";
import ThinkingBars from "./ThinkingBars";
import { tokenizeTypewriter } from "./typewriter";
import { cn } from "@/lib/utils";

export interface Citation {
  title: string;
  href: string;
}

export interface AiReply {
  text: string;
  citations: Citation[];
  /** 信心分數 0–1；<0.6 轉 warning 並建議預約真人導師 */
  confidence: number;
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
}: AiMessageProps) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(animate ? "waiting" : "done");

  // Simulate waiting for the first token (ThinkingBars); reduced motion skips the wait.
  // 還原歷史(animate=false)直接 done — 唔經 thinking / 打字機。
  useEffect(() => {
    if (!animate) {
      setPhase("done");
      return;
    }
    if (reduced) {
      setPhase("typing");
      return;
    }
    const t = window.setTimeout(() => setPhase("typing"), 900);
    return () => window.clearTimeout(t);
  }, [reduced, animate]);

  const lowConfidence = reply.confidence < 0.6;

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
        ) : phase === "waiting" ? (
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
      {phase === "done" && reply.citations.length > 0 && (
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
            </motion.span>
          ))}
        </motion.div>
      )}

      {/* 信心行 */}
      {phase === "done" && (
        <motion.p
          initial={animate ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12, delay: reply.citations.length * 0.06 }}
          className={cn(
            "mt-2 text-caption",
            lowConfidence ? "text-warning" : "text-text-muted"
          )}
        >
          信心分數 {reply.confidence.toFixed(2)}・回答僅供參考
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
