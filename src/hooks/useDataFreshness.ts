import { aihotFetchedAt, timeAgo } from "@/data/aihot";
import { useLiveFetchedAt } from "@/data/liveItems";
import { useEffect, useState } from "react";

const SNAPSHOT_FETCHED_AT_MS = new Date(aihotFetchedAt).getTime();
const HK_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Hong_Kong",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

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
  useEffect(() => {
    // Schedule the read after the effect turn. Besides avoiding a cascading
    // effect render, this keeps the server snapshot and first client pass
    // identical for React hydration.
    const timer = window.setTimeout(() => setNow(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const fetchedAt = liveFetchedAt ?? aihotFetchedAt;
  const renderNow = now ?? (liveFetchedAt ? new Date(fetchedAt).getTime() : SNAPSHOT_FETCHED_AT_MS);
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
    todayDate: HK_DATE.format(new Date(renderNow)),
    // Never read the wall clock during render.  The first SSR/client pass must
    // use a stable anchor; the effect above refreshes it immediately after
    // hydration when live data is available.
    ago: timeAgo(
      fetchedAt,
      renderNow,
    ),
  };
}
