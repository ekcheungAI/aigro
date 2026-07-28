import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { BookOpen, FileText, MessagesSquare } from "lucide-react";
import { REVEAL_EASE } from "@/components/Reveal";
import type { ExpertLiveStats, ExpertProfileStat } from "@/lib/expertProfiles";

interface ExpertStatsBandProps {
  /** expert_profiles.stats 自訂關鍵數據(無 → 只顯示動態統計) */
  custom: ExpertProfileStat[];
  /** 真實動態統計;null = 查詢進行中(顯示 —,唔虛構) */
  live: ExpertLiveStats | null;
}

/** 純數字(含前後綴,如「200+」「US$40M」)進入 viewport 時 count-up 600ms */
function BandNumber({ value, active }: { value: string; active: boolean }) {
  const match = /^([^\d]*)(\d+)(.*)$/.exec(value);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!active || !match) {
      setDisplay(value);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const target = parseInt(match[2], 10);
    const start = performance.now();
    const duration = 600;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(`${match[1]}${Math.round(target * eased)}${match[3]}`);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setDisplay(`${match[1]}0${match[3]}`);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, value]);

  return <>{match ? display : value}</>;
}

/**
 * Key stats band — 緊貼 cinematic hero 嘅 dark strip:
 * 自訂 stats(expert_profiles.stats,如有)+ 真實動態統計
 * (分身對話 / 已發佈情報 / 知識條目,Supabase count 真查),
 * mono 大數字 + count-up;載入中顯示「—」,唔會出現假數字。
 */
export default function ExpertStatsBand({ custom, live }: ExpertStatsBandProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  const dynamicStats: { icon: typeof MessagesSquare; label: string; value: number | null }[] = [
    { icon: MessagesSquare, label: "分身對話", value: live?.conversations ?? null },
    { icon: FileText, label: "已發佈情報", value: live?.insights ?? null },
    { icon: BookOpen, label: "知識條目", value: live?.knowledge ?? null },
  ];

  return (
    <section className="border-y border-band-border bg-band-bg">
      <div
        ref={ref}
        className="mx-auto max-w-container px-6 py-10 max-md:py-8"
      >
        <p className="text-overline font-sans uppercase tracking-[0.2em] text-band-text-muted">
          Key Stats 關鍵數據
        </p>
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {custom.map((s, i) => (
            <motion.div
              key={`custom-${s.label}`}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35, delay: i * 0.06, ease: REVEAL_EASE }}
            >
              <span className="block font-mono text-[28px] leading-[1.1] text-band-ink max-md:text-[24px]">
                <BandNumber value={s.value} active={inView} />
              </span>
              <span className="mt-1.5 block text-caption text-band-text-muted">
                {s.label}
              </span>
            </motion.div>
          ))}
          {dynamicStats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.35,
                delay: (custom.length + i) * 0.06,
                ease: REVEAL_EASE,
              }}
            >
              <span className="flex items-center gap-2 font-mono text-[28px] leading-[1.1] text-band-ink max-md:text-[24px]">
                {s.value === null ? (
                  <span className="text-band-text-muted">—</span>
                ) : (
                  <BandNumber value={String(s.value)} active={inView} />
                )}
                <s.icon
                  className="h-4 w-4 text-band-text-muted"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </span>
              <span className="mt-1.5 block text-caption text-band-text-muted">
                {s.label}
              </span>
            </motion.div>
          ))}
        </div>
        <p className="mt-6 text-caption text-band-text-muted">
          動態數據為平台真實統計,實時更新
        </p>
      </div>
    </section>
  );
}
