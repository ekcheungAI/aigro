import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useInView } from "framer-motion";
import type { CaseStudy } from "@/data/cases";
import { cn } from "@/lib/utils";

/** Split "-37%" / "+2.4×" / "24/7" into sign, number, suffix for count-up */
function parseMetric(value: string): { sign: string; num: number; suffix: string; decimals: number } | null {
  const m = value.match(/^([+-]?)(\d+(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  const num = parseFloat(m[2]);
  if (Number.isNaN(num)) return null;
  const decimals = m[2].includes(".") ? m[2].split(".")[1].length : 0;
  return { sign: m[1], num, suffix: m[3], decimals };
}

/**
 * Metric count-up (design.md §5.1: 800ms ease-out, first viewport entry only,
 * integers — decimals kept only when source value has them, e.g. 2.4×).
 */
function CountUpMetric({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [display, setDisplay] = useState(() => {
    const p = parseMetric(value);
    return p ? `${p.sign}0${p.suffix}` : value;
  });

  useEffect(() => {
    const parsed = parseMetric(value);
    if (!inView || !parsed) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const duration = 800;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const current = parsed.num * eased;
      setDisplay(
        `${parsed.sign}${current.toFixed(parsed.decimals)}${parsed.suffix}`
      );
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return (
    <span ref={ref} className="font-mono text-metric text-ink">
      {display}
    </span>
  );
}

interface CaseCardProps {
  caseStudy: CaseStudy;
  className?: string;
}

/**
 * Case Card 案例卡 (design.md §6.6):
 * industry tag + tool tag → h4 title → metric strip (card-color inset well,
 * 16px padding, 1–3 Plex Mono 36px ink metrics + caption labels)
 * → one-line method summary → source caption row.
 * 無量化成果的案例不得上首頁。
 */
export default function CaseCard({ caseStudy, className }: CaseCardProps) {
  return (
    <Link
      to={`/cases/${caseStudy.slug}`}
      className={cn(
        "card-hover group flex h-full flex-col rounded-md border bg-surface p-6 shadow-card dark:shadow-none",
        className
      )}
    >
      {/* Tags */}
      <div className="flex items-center gap-2">
        <span className="rounded-sm bg-ink-soft px-3 py-1.5 text-overline font-sans text-ink">
          {caseStudy.industry}
        </span>
        <span className="rounded-sm bg-card px-3 py-1.5 text-overline font-sans text-text-secondary">
          {caseStudy.tag}
        </span>
      </div>

      {/* Title — h4 卡片標題用無襯線 (design.md §3.2) */}
      <h4 className="mt-4 font-sans text-h4 text-text-primary transition-colors duration-150 group-hover:text-ink">
        {caseStudy.title}
      </h4>

      {/* Metric strip — card-color inset well */}
      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-4 rounded-md bg-card p-4">
        {caseStudy.metrics.map((metric) => (
          <div key={metric.label} className="flex flex-col gap-1">
            <CountUpMetric value={metric.value} />
            <span className="text-caption text-text-muted">{metric.label}</span>
          </div>
        ))}
      </div>

      {/* Method */}
      <p className="mt-4 line-clamp-2 text-body-sm text-text-secondary">
        {caseStudy.method}
      </p>

      {/* Source row */}
      <p className="mt-auto pt-4 text-caption text-text-muted">
        來源：{caseStudy.source}
      </p>
    </Link>
  );
}
