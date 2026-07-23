import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuotaMeterProps {
  used: number;
  total: number;
  /** panel = 左欄底部直排版本;預設 header 橫排 */
  variant?: "inline" | "panel";
}

/**
 * 免費額度 5 段式 meter(ask.md §1):已用 = ink 填滿,最後一段 warning,
 * 剩餘 = card 空段;剩 1 次計數轉 warning,0 次轉 error。
 */
export default function QuotaMeter({ used, total, variant = "inline" }: QuotaMeterProps) {
  const remaining = Math.max(0, total - used);
  const meter = (
    <>
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
        今日剩餘 {remaining}/{total} 次
      </span>
      <span className="flex items-center gap-[3px]" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 w-2 rounded-[1px] transition-colors duration-300",
              i < used
                ? i === total - 1
                  ? "bg-warning" // 額度 ≥80% 告警(design.md §2.4,琥珀非金)
                  : "bg-ink"
                : "border border-border bg-card"
            )}
          />
        ))}
      </span>
    </>
  );

  if (variant === "panel") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-overline text-text-muted">免費額度</p>
        <div className="flex items-center gap-2">{meter}</div>
        <Link
          to="/pricing"
          className="group inline-flex items-center gap-1 text-caption text-ink"
        >
          升級進階會員,無限對話
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
