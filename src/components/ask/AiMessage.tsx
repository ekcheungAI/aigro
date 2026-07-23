import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import TypewriterText from "./TypewriterText";
import ThinkingBars from "./ThinkingBars";
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
}

type Phase = "waiting" | "typing" | "done";

/**
 * AI 回答群組：ink-soft 氣泡（design.md §2.3 唯一染色卡片例外）+
 * 打字機 + citation chips（文字完成後 fade-in，stagger 60ms）+ 信心行。
 * Chips hover：文字 → ink + 下劃線 120ms，不位移（§5.2 — chips 必須穩定可信）。
 */
export default function AiMessage({ reply, expertBorderColor, onTyped }: AiMessageProps) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("waiting");

  // Simulate waiting for the first token (ThinkingBars); reduced motion skips the wait
  useEffect(() => {
    if (reduced) {
      setPhase("typing");
      return;
    }
    const t = window.setTimeout(() => setPhase("typing"), 900);
    return () => window.clearTimeout(t);
  }, [reduced]);

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
        {phase === "waiting" ? (
          <ThinkingBars />
        ) : (
          <TypewriterText
            text={reply.text}
            active
            onProgress={onTyped}
            onComplete={() => setPhase("done")}
          />
        )}
      </div>

      {/* Citation chips — fade-in 120ms, stagger 60ms, only after text completes */}
      {phase === "done" && reply.citations.length > 0 && (
        <motion.div
          className="mt-3 flex flex-wrap gap-2"
          initial="hidden"
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12, delay: reply.citations.length * 0.06 }}
          className={cn(
            "mt-2 text-caption",
            lowConfidence ? "text-warning" : "text-text-muted"
          )}
        >
          信心分數 {reply.confidence.toFixed(2)}・回答僅供參考
          {lowConfidence && (
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
