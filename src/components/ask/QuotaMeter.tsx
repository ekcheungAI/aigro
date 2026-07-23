import { Link } from "react-router-dom";
import { ArrowRight, Infinity as InfinityIcon } from "lucide-react";

interface QuotaMeterProps {
  /** panel = 左欄底部直排版本;預設 header 橫排 */
  variant?: "inline" | "panel";
}

/**
 * 對話額度 meter — 限時開放期間改為無限對話:∞ 圖標 +「無限對話 · 限時開放」,
 * 取代舊 5 段式計數(額度用盡態暫時唔會出現)。
 */
export default function QuotaMeter({ variant = "inline" }: QuotaMeterProps) {
  const meter = (
    <>
      <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-ink-soft" aria-hidden="true">
        <InfinityIcon className="h-3.5 w-3.5 text-ink" strokeWidth={1.5} />
      </span>
      <span className="text-caption text-text-muted">無限對話 · 限時開放</span>
    </>
  );

  if (variant === "panel") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-overline text-text-muted">對話額度</p>
        <div className="flex items-center gap-2">{meter}</div>
        <Link
          to="/pricing"
          className="group inline-flex items-center gap-1 text-caption text-ink"
        >
          升級進階會員,專家分身通行
          <ArrowRight
            className="h-3 w-3 transition-transform duration-150 nudge-x"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </Link>
      </div>
    );
  }

  return <div className="flex items-center gap-2">{meter}</div>;
}
