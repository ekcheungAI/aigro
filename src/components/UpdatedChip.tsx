import { aihotFetchedAt, timeAgo } from "@/data/aihot";
import { useLiveFetchedAt } from "@/data/liveItems";
import { cn } from "@/lib/utils";

/**
 * Live 時間戳 chip — IBM Plex Mono 細字:「更新於 X 分鐘前 · 每 30 分鐘同步」。
 * 數據時鐘:Supabase live fetchedAt(成熟時),未成熟回落 build-time
 * snapshot 嘅 aihotFetchedAt — 永遠反映頁面真實數據嘅更新時間。
 */
export default function UpdatedChip({ className }: { className?: string }) {
  const liveFetchedAt = useLiveFetchedAt();
  const ago = timeAgo(liveFetchedAt ?? aihotFetchedAt);
  if (!ago) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-caption text-text-muted",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-ink" aria-hidden="true" />
      更新於 {ago} · 每 30 分鐘同步
    </span>
  );
}
