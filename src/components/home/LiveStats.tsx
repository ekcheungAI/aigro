import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import {
  aihotAllInsights,
  aihotFetchedAt,
  aihotHotTopics,
  aihotInsights,
} from "@/data/aihot";
import { verifiedExperts } from "@/data/experts";

/* 統計以 snapshot 數據時鐘 (aihotFetchedAt) 為基準 — 數字永遠同頁面展示的
   情報吻合,唔會因為 snapshot 日期同訪客「今日」有落差而顯示 0。 */
const fetchTime = new Date(aihotFetchedAt).getTime();

function withinHours(iso: string, hours: number): boolean {
  const t = new Date(iso).getTime();
  return (
    !Number.isNaN(t) &&
    !Number.isNaN(fetchTime) &&
    t > fetchTime - hours * 3_600_000
  );
}

interface Stat {
  prefix: string;
  value: number;
  suffix: string;
}

const STATS: Stat[] = [
  {
    prefix: "今日",
    value: aihotInsights.filter((i) => withinHours(i.publishedAt, 24)).length,
    suffix: "則情報",
  },
  {
    prefix: "本週",
    value: aihotAllInsights.filter((i) => withinHours(i.publishedAt, 24 * 7))
      .length,
    suffix: "則動態",
  },
  { prefix: "", value: aihotHotTopics.length, suffix: "個熱門主題" },
  { prefix: "", value: verifiedExperts.length, suffix: "位領航專家" },
];

/** 800ms ease-out count-up(整數)— design.md §5.1;reduced-motion → 即時顯示 */
function CountUp({ value, delay }: { value: number; delay: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setDisplay(value);
      return;
    }
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

  return (
    <span ref={ref} className="font-mono text-label text-band-text">
      {display}
    </span>
  );
}

/**
 * Hero live stat strip — mono 數字 + caption 標籤,hairline 分隔。
 * Mobile:flex-wrap 自然換行,唔會撐爆版。
 */
export default function LiveStats() {
  return (
    <dl className="flex flex-wrap items-center gap-y-2">
      {STATS.map((stat, i) => (
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
  );
}
