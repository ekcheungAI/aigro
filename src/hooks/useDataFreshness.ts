import { aihotFetchedAt, timeAgo } from "@/data/aihot";
import { useLiveFetchedAt } from "@/data/liveItems";

const SNAPSHOT_FETCHED_AT_MS = new Date(aihotFetchedAt).getTime();
const SNAPSHOT_IS_ARCHIVE =
  Number.isNaN(SNAPSHOT_FETCHED_AT_MS) ||
  Date.now() - SNAPSHOT_FETCHED_AT_MS > 24 * 3_600_000;

/**
 * Keeps freshness copy honest: runtime data may be live, while the resilient
 * fallback is a committed snapshot. Consumers must never describe the latter
 * as continuously synchronised.
 */
export default function useDataFreshness() {
  const liveFetchedAt = useLiveFetchedAt();
  const fetchedAt = liveFetchedAt ?? aihotFetchedAt;
  const status = liveFetchedAt
    ? "live"
    : SNAPSHOT_IS_ARCHIVE
      ? "archive"
      : "current-snapshot";

  return {
    isLive: Boolean(liveFetchedAt),
    isArchive: status === "archive",
    status,
    fetchedAt,
    ago: timeAgo(fetchedAt),
  };
}
