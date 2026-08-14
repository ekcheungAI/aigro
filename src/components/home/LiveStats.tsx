import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

interface LiveStatsProps {
  memberCount: number | null;
}

interface ScaleStat {
  value: number | null;
  label: string;
  note: string;
}

/** 800ms ease-out count-up; reduced motion displays the final value immediately. */
function CountUp({ value, delay }: { value: number; delay: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) return;
    let raf = 0;
    let start = 0;
    const tick = (time: number) => {
      if (!start) start = time + delay * 1000;
      const progress = Math.min(1, Math.max(0, (time - start) / 800));
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, delay, reduced]);

  return (
    <span ref={ref} className="font-display text-display-lg text-band-ink md:text-display-xl">
      {(reduced && inView ? value : display).toLocaleString("zh-HK")}
    </span>
  );
}

/** Live platform proof, separated by hairlines instead of KPI cards. */
export default function LiveStats({ memberCount }: LiveStatsProps) {
  const stats: ScaleStat[] = [
    {
      value: memberCount,
      label: "位會員",
      note: memberCount === null ? "正式連線後顯示實時登記數" : "截至目前完成登記",
    },
    { value: 2, label: "位領航專家已上線", note: "8 位蒸餾中" },
    { value: 1, label: "個 AI MCP 已就緒", note: "更多行業 MCP 籌備中" },
  ];

  return (
    <dl className="grid max-w-[980px] gap-y-6 border-y border-band-border py-6 sm:grid-cols-[1.15fr_1fr_1fr] sm:py-7">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="sm:border-l sm:border-band-border sm:px-6 sm:first:border-l-0 sm:first:pl-0"
        >
          <dt className="flex flex-wrap items-baseline gap-x-2">
            <span className="sr-only">
              {stat.value === null ? "會員總數連接中" : `${stat.value} ${stat.label}`}
            </span>
            <span aria-hidden="true" className="contents">
              {stat.value === null ? (
                <>
                  <span className="font-display text-h2 text-band-text-muted">會員總數</span>
                  <span className="font-sans text-label text-band-text">連接中</span>
                </>
              ) : (
                <>
                  <CountUp value={stat.value} delay={index * 0.08} />
                  <span className="font-sans text-label text-band-text">{stat.label}</span>
                </>
              )}
            </span>
          </dt>
          <dd className="mt-1 font-mono text-caption text-band-text-muted">
            {stat.note}
          </dd>
        </div>
      ))}
    </dl>
  );
}
