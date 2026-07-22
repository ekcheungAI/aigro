import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";

const BAR_WIDTHS = ["68%", "86%", "44%"];

/**
 * Waiting-for-first-token indicator (design.md §5.3 / ask.md §3):
 * 3 pulse bars in `card` color, opacity 0.6↔1 over 1.2s — NO shimmer gradients.
 * Isolated + memoized so the infinite loop never re-renders the chat tree.
 */
export default memo(function ThinkingBars() {
  const reduced = useReducedMotion();
  return (
    <div className="flex flex-col gap-2.5 py-1" role="status" aria-label="AI 正在整理回答">
      {BAR_WIDTHS.map((w, i) => (
        <motion.span
          key={i}
          className="block h-3.5 rounded-sm bg-card"
          style={{ width: w }}
          animate={reduced ? undefined : { opacity: [0.6, 1, 0.6] }}
          transition={
            reduced
              ? undefined
              : { duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }
          }
        />
      ))}
    </div>
  );
});
