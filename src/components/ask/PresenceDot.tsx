import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PresenceDotProps {
  /** Diameter in px (default 10) */
  size?: number;
  className?: string;
}

/**
 * 在線 presence dot — lime 軟脈衝(private-call 感)。
 * Perpetual loop 獨立成 micro-component + memo,父層 re-render 唔會重置動畫;
 * transform/opacity GPU-only;reduced-motion → 靜態圓點。
 */
const PresenceDot = memo(function PresenceDot({
  size = 10,
  className,
}: PresenceDotProps) {
  const reduced = useReducedMotion();
  return (
    <span
      role="status"
      aria-label="AI 分身 · 隨時可問"
      title="AI 分身 · 隨時可問"
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {!reduced && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-lime"
          initial={{ opacity: 0.55, transform: "scale(1)" }}
          animate={{ opacity: 0, transform: "scale(2)" }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <span
        aria-hidden="true"
        className="relative inline-flex rounded-full bg-lime"
        style={{
          width: size,
          height: size,
          boxShadow: "inset 0 0 0 1.5px hsl(var(--surface))",
        }}
      />
    </span>
  );
});

export default PresenceDot;
