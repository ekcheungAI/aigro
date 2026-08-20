import { aihotFetchedAt, timeAgo } from "@/data/aihot";
import { useLiveFetchedAt } from "@/data/liveItems";
import { useEffect, useState } from "react";

const SNAPSHOT_FETCHED_AT_MS = new Date(aihotFetchedAt).getTime();

/**
 * Keeps freshness copy honest: runtime data may be live, while the resilient
 * fallback is a committed snapshot. Consumers must never describe the latter
 * as continuously synchronised.
 */
export default function useDataFreshness() {
  const liveFetchedAt = useLiveFetchedAt();
  // Keep the first SSR/client render deterministic; refresh the wall clock
  // only after hydration so prerendered pages cannot disagree on age/status.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  const fetchedAt = liveFetchedAt ?? aihotFetchedAt;
  const snapshotIsArchive =
    Number.isNaN(SNAPSHOT_FETCHED_AT_MS) ||
    (now !== null && now - SNAPSHOT_FETCHED_AT_MS > 24 * 3_600_000);
  const status = liveFetchedAt
    ? "live"
    : snapshotIsArchive
      ? "archive"
      : "current-snapshot";

  return {
    isLive: Boolean(liveFetchedAt),
    isArchive: status === "archive",
    status,
    fetchedAt,
    ago: timeAgo(fetchedAt, liveFetchedAt ? now ?? Date.now() : now ?? SNAPSHOT_FETCHED_AT_MS),
  };
}
