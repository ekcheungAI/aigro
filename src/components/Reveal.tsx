import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

/** Strong ease-out (Emil standard) — hover/micro-interactions MUST use this, not REVEAL_EASE */
export const EASE_OUT_STRONG: [number, number, number, number] = [0.23, 1, 0.32, 1];
/** Strong ease-in-out — for elements moving/morphing on screen */
export const EASE_IN_OUT_STRONG: [number, number, number, number] = [0.77, 0, 0.175, 1];

interface RevealProps {
  children: ReactNode;
  /** Stagger / sequencing delay in seconds (group stagger = 80ms/item, design.md §5.1) */
  delay?: number;
  /** Entrance distance in px (default 24 per §5.1; hero lines use 32) */
  y?: number;
  /** Duration in seconds (default 0.45) */
  duration?: number;
  className?: string;
  /** Render as different element via framer-motion */
  as?: "div" | "section" | "span" | "li";
}

/**
 * Scroll reveal wrapper (design.md §5.1):
 * opacity 0→1 + translateY(24px)→0, 450ms, cubic-bezier(0.4,0,0.2,1),
 * triggers once when element is 20% into the viewport.
 * Reduced motion (§5.4 + Emil a11y): transforms off, gentle opacity-only
 * fade kept (reduced motion means gentler, not zero).
 */
export default function Reveal({
  children,
  delay = 0,
  y = 24,
  duration = 0.45,
  className,
}: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <motion.div
        className={className}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.2, delay, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export { EASE as REVEAL_EASE };
