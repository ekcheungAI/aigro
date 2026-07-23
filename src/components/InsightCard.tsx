import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { INSIGHT_CATEGORY_ICONS, type Insight } from "@/data/insights";
import { cn } from "@/lib/utils";

interface InsightCardProps {
  insight: Insight;
  className?: string;
}

/**
 * Insight Card 情報卡 (design.md §6.5):
 * overline row (chip + category icon + read time) → h4 title (2-line clamp)
 * → AI summary (3-line clamp) → 香港視角 block (2px ink left border)
 * → footer row (source + external-link, timestamp, mono score).
 * surface bg, 1px border, radius-md, 24px padding. Hover per §5.2.
 */
export default function InsightCard({ insight, className }: InsightCardProps) {
  const CategoryIcon = INSIGHT_CATEGORY_ICONS[insight.category];
  const editorPick = insight.score >= 90;
  return (
    <Link
      to={`/insights/${insight.slug}`}
      className={cn(
        "card-hover group relative flex h-full flex-col rounded-md border bg-surface p-6 shadow-card dark:shadow-none",
        className
      )}
    >
      {/* Hairline gold corner tick — editor's pick (score ≥ 90) */}
      {editorPick && (
        <span aria-hidden="true" className="pointer-events-none absolute right-3 top-3">
          <span className="absolute right-0 top-0 h-px w-4 bg-gold" />
          <span className="absolute right-0 top-0 h-4 w-px bg-gold" />
        </span>
      )}
      {editorPick && <span className="sr-only">編輯精選・高分情報</span>}

      {/* Overline row */}
      <div className="flex items-center gap-2">
        <span className="rounded-sm bg-ink-soft px-3 py-1.5 text-overline font-sans uppercase text-ink">
          {insight.category}
        </span>
        <CategoryIcon className="h-4 w-4 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
        <span className="ml-auto text-caption text-text-muted">
          {insight.readMinutes} 分鐘閱讀
        </span>
      </div>

      {/* Title */}
      <h4 className="mt-4 line-clamp-2 font-display text-h4 text-text-primary transition-colors duration-150 group-hover:text-ink">
        {insight.title}
      </h4>

      {/* AI summary */}
      <p className="mt-2 line-clamp-3 text-body-sm text-text-secondary">
        {insight.summary}
      </p>

      {/* 香港視角 HK ANGLE — 差異化核心 */}
      <div className="mt-4 border-l-2 border-ink pl-3">
        <p className="text-overline font-sans uppercase text-ink">
          香港視角 HK Angle
        </p>
        <p className="mt-1 line-clamp-3 text-body-sm text-text-secondary">
          {insight.hkAngle}
        </p>
      </div>

      {/* Footer row */}
      <div className="mt-auto flex items-center gap-2 pt-4 text-caption text-text-muted">
        <span className="inline-flex items-center gap-1">
          {insight.source}
          <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
        </span>
        <span aria-hidden="true">·</span>
        <span>{insight.timeAgo}</span>
        <span className="ml-auto font-mono text-caption text-ink">
          {insight.score}
        </span>
      </div>
    </Link>
  );
}
