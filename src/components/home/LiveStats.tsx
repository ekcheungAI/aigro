import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

interface LiveStatsProps {
  memberCount: number;
}

interface ScaleStat {
  value: number;
  label: string;
  note: string;
  showPlus?: boolean;
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

/** Live platform proof, grouped through spacing and type hierarchy. */
export default function LiveStats({ memberCount }: LiveStatsProps) {
  const stats: ScaleStat[] = [
    {
      value: memberCount,
      label: "位會員",
      note: "110 位社群基數 + 實際登記會員",
      showPlus: true,
    },
    { value: 2, label: "位領航專家已上線", note: "8 位蒸餾中" },
    { value: 1, label: "個 AI MCP 公開 Beta", note: "可即時接入" },
  ];

  return (
    <dl className="grid max-w-[980px] gap-x-10 gap-y-6 py-3 sm:grid-cols-[1.15fr_1fr_1fr] sm:py-4">
      {stats.map((stat, index) => (
        <div key={stat.label}>
          <dt className="flex flex-wrap items-baseline gap-x-2">
            <span className="sr-only">{`${stat.value}${stat.showPlus ? "+" : ""} ${stat.label}`}</span>
            <span aria-hidden="true" className="contents">
              <span className="inline-flex items-baseline">
                <CountUp value={stat.value} delay={index * 0.08} />
                {stat.showPlus && (
                  <span className="font-display text-h2 leading-none text-band-ink">+</span>
                )}
              </span>
              <span className="font-sans text-label text-band-text">{stat.label}</span>
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
