import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { tokenizeTypewriter, delayAfterUnit } from "./typewriter";
import type { TypeUnit } from "./typewriter";
import { cn } from "@/lib/utils";

interface TypewriterTextProps {
  text: string;
  /** Start typing when true (parent gates the "waiting for first token" phase) */
  active: boolean;
  /** Fired after each unit is revealed (parent uses it for auto-scroll) */
  onProgress?: () => void;
  /** Fired once when the full text has been revealed */
  onComplete?: () => void;
  className?: string;
}

/**
 * Typewriter reveal (design.md §5.3): 24 chars/s, per CJK char / Latin word,
 * punctuation +120ms, paragraph +260ms, ±20ms jitter, `▍` ink cursor with
 * 530ms blink, removed 400ms after completion.
 * Reduced motion (§5.4): instant full render, cursor hidden.
 */
export default function TypewriterText({
  text,
  active,
  onProgress,
  onComplete,
  className,
}: TypewriterTextProps) {
  const reduced = useReducedMotion();
  const units = useMemo(() => tokenizeTypewriter(text), [text]);
  const [count, setCount] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(false);
  const done = count >= units.length;
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    if (!active) return;
    if (reduced) {
      // §5.4: instant render, no cursor
      setCount(units.length);
      return;
    }
    let i = 0;
    let timer = 0;
    setCursorVisible(true);
    const step = () => {
      i += 1;
      setCount(i);
      onProgressRef.current?.();
      if (i < units.length) {
        timer = window.setTimeout(step, delayAfterUnit(units[i - 1], units[i]));
      }
    };
    timer = window.setTimeout(step, 1000 / 24);
    return () => window.clearTimeout(timer);
  }, [active, reduced, units]);

  // Completion: notify parent; cursor lingers 400ms then disappears (§5.3)
  useEffect(() => {
    if (!done || completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current?.();
    if (reduced) return;
    const t = window.setTimeout(() => setCursorVisible(false), 400);
    return () => window.clearTimeout(t);
  }, [done, reduced]);

  // Group revealed units by paragraph
  const shown = units.slice(0, count);
  const paragraphs: TypeUnit[][] = [];
  for (const u of shown) {
    (paragraphs[u.paragraph] ??= []).push(u);
  }
  const currentParagraph = shown.length > 0 ? shown[shown.length - 1].paragraph : -1;

  return (
    <div className={className} aria-label={text}>
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
          {cursorVisible && pi === currentParagraph && (
            <span aria-hidden="true" className="animate-caret-blink text-ink">
              ▍
            </span>
          )}
        </p>
      ))}
    </div>
  );
}
