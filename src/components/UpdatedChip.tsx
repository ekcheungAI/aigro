import useDataFreshness from "@/hooks/useDataFreshness";
import { cn } from "@/lib/utils";

/**
 * Source-aware freshness chip. Runtime data may state its sync cadence;
 * the resilient build-time fallback is always labelled as a snapshot.
 */
export default function UpdatedChip({ className }: { className?: string }) {
  const { isLive, isArchive, isResolved, fetchedAt, ago } = useDataFreshness();
  if (!ago) return null;
  const snapshotDate = fetchedAt.slice(0, 10);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-caption text-text-muted",
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isLive ? "bg-success" : "bg-warning"
        )}
        aria-hidden="true"
      />
      {!isResolved && !isLive
        ? `資料快照 · 截至 ${snapshotDate}`
        : isLive
        ? `更新於 ${ago} · 每 30 分鐘同步`
        : isArchive
          ? `歷史快照 · 截至 ${ago}`
          : `資料快照 · 更新於 ${ago}`}
    </span>
  );
}
