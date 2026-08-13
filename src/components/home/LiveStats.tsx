import { useEffect, useMemo, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import {
  aihotAllInsights,
  aihotFetchedAt,
  aihotInsights,
} from "@/data/aihot";
import { useLiveFetchedAt, useLiveItems } from "@/data/liveItems";
import { verifiedExperts } from "@/data/experts";
import { supabase } from "@/lib/supabase";

/* 統計以數據時鐘(live fetchedAt,未成熟時用 snapshot 嘅 aihotFetchedAt)為基準 —
   數字永遠同頁面展示嘅情報吻合,唔會因為數據日期同訪客「今日」有落差而顯示 0。 */
const SNAPSHOT_FETCH_TIME = new Date(aihotFetchedAt).getTime();

function countWithinHours(
  items: { publishedAt: string }[],
  clock: number,
  hours: number
): number {
  if (Number.isNaN(clock)) return 0;
  return items.filter((i) => {
    const t = new Date(i.publishedAt).getTime();
    return !Number.isNaN(t) && t > clock - hours * 3_600_000;
  }).length;
}

function countSources(items: { source: string }[]): number {
  return new Set(items.map((i) => i.source).filter(Boolean)).size;
}

interface Stat {
  prefix: string;
  value: number;
  suffix: string;
}

/** snapshot fallback — live 未成熟時維持真實 snapshot 數字 */
const SNAPSHOT_STATS: Stat[] = [
  {
    prefix: "今日",
    value: countWithinHours(aihotInsights, SNAPSHOT_FETCH_TIME, 24),
    suffix: "則情報",
  },
  {
    prefix: "情報庫",
    value: aihotAllInsights.length,
    suffix: "則",
  },
  { prefix: "", value: countSources(aihotAllInsights), suffix: "個來源" },
  { prefix: "", value: verifiedExperts.length, suffix: "位領航專家" },
];

/** 800ms ease-out count-up(整數)— design.md §5.1;reduced-motion → 即時顯示 */
function CountUp({
  value,
  delay,
  className = "font-mono text-label text-band-text",
}: {
  value: number;
  delay: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) return;
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t + delay * 1000;
      const p = Math.min(1, Math.max(0, (t - start) / 800));
      const eased = 1 - Math.pow(1 - p, 3); // ease-out
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, delay, reduced]);

  const visibleDisplay = reduced && inView ? value : display;

  return (
    <span ref={ref} className={className}>
      {visibleDisplay}
    </span>
  );
}

/**
 * Hero live stat strip — mono 數字 + caption 標籤,hairline 分隔。
 * v1.27:Supabase live items 成熟時用 live 數字(總數 / 今日 / 來源數),
 * 未成熟回落 snapshot 時鐘。Mobile:flex-wrap 自然換行,唔會撐爆版。
 */
export default function LiveStats() {
  const liveItems = useLiveItems();
  const liveFetchedAt = useLiveFetchedAt();
  const [memberCount, setMemberCount] = useState<number | null | undefined>(() =>
    supabase ? undefined : null,
  );

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.rpc("get_public_member_count").then(({ data, error }) => {
      const count = typeof data === "number" ? data : Number(data);
      if (!active) return;
      setMemberCount(
        !error && Number.isSafeInteger(count) && count >= 0 ? count : null,
      );
    });
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo<Stat[]>(() => {
    if (!liveItems) return SNAPSHOT_STATS;
    const clock = new Date(
      liveFetchedAt ?? liveItems[0]?.publishedAt ?? ""
    ).getTime();
    return [
      {
        prefix: "今日",
        value: countWithinHours(liveItems, clock, 24),
        suffix: "則情報",
      },
      { prefix: "情報庫", value: liveItems.length, suffix: "則" },
      { prefix: "", value: countSources(liveItems), suffix: "個來源" },
      { prefix: "", value: verifiedExperts.length, suffix: "位領航專家" },
    ];
  }, [liveItems, liveFetchedAt]);

  return (
    <div>
      <dl className="border-t border-band-border pt-5">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
          <dt className="pb-1 text-label text-band-text-muted">會員總數</dt>
          <dd className="flex items-baseline gap-2" aria-live="polite">
            {memberCount === undefined ? (
              <span className="font-sans text-label text-band-text-muted">讀取中</span>
            ) : memberCount === null ? (
              <span className="font-sans text-label text-band-text-muted">暫未能讀取</span>
            ) : (
              <>
                <CountUp
                  value={memberCount}
                  delay={0}
                  className="font-display text-h2 leading-none text-band-text"
                />
                <span className="font-sans text-caption text-band-text-muted">位已註冊會員</span>
              </>
            )}
          </dd>
        </div>
      </dl>
      <dl className="mt-4 flex flex-wrap items-center gap-y-2">
        {stats.map((stat, i) => (
          <div
            key={`${stat.prefix}${stat.suffix}`}
            className="ml-4 flex items-baseline gap-1.5 border-l border-band-border pl-4 first:ml-0 first:border-l-0 first:pl-0"
          >
            {stat.prefix && (
              <dt className="text-caption text-band-text-muted">{stat.prefix}</dt>
            )}
            <dd className="contents">
              <CountUp value={stat.value} delay={i * 0.08} />
              <span className="text-caption text-band-text-muted">
                {stat.suffix}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
