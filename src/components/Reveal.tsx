import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

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
 * Reduced motion (§5.4): renders statically — no transform, no fade.
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
    return <div className={className}>{children}</div>;
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
