import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE_OUT_STRONG } from "@/components/Reveal";
import { aihotHotTopics } from "@/data/aihot";

/**
 * Hero 熱門話題 ticker — 單行垂直輪轉,每 4s 換一條 aihotHotTopics。
 * 300ms strong ease-out(transform + opacity);hover/focus 暫停;
 * reduced-motion → 靜態顯示第一條,唔輪轉。
 * LIVE 圓點用 warning amber(band-warning)— 金色只屬於 Verified。
 */
export default function HotTopicsTicker() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduced || paused || aihotHotTopics.length < 2) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % aihotHotTopics.length),
      4000
    );
    return () => window.clearInterval(id);
  }, [reduced, paused]);

  const topic = aihotHotTopics[reduced ? 0 : index];
  if (!topic) return null;

  return (
    <div
      className="flex items-center gap-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* LIVE dot — amber,柔和脈衝(reduced-motion → 靜態) */}
      <span className="flex shrink-0 items-center gap-2">
        <motion.span
          className="block h-1.5 w-1.5 rounded-full bg-band-warning"
          aria-hidden="true"
          animate={reduced ? undefined : { opacity: [1, 0.35, 1] }}
          transition={
            reduced ? undefined : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
          }
        />
        <span className="text-overline font-sans uppercase text-band-text-muted">
          Live
        </span>
      </span>

      {/* 單行窗口 — fixed height + overflow hidden,absolute 條目上下輪轉 */}
      <div className="relative h-6 min-w-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.a
            key={topic.id}
            href="/insights?tab=topics"
            target="_blank"
            rel="noreferrer"
            className="absolute inset-0 flex items-center font-mono text-caption text-band-text-secondary transition-colors duration-150 hover:text-band-ink"
            initial={
              reduced
                ? false
                : { opacity: 0, transform: "translateY(12px)" }
            }
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, transform: "translateY(-12px)" }
            }
            transition={{ duration: 0.3, ease: EASE_OUT_STRONG }}
          >
            <span className="truncate">
              熱門: {topic.title} · {topic.sourceCount} 個來源熱議
            </span>
          </motion.a>
        </AnimatePresence>
      </div>
    </div>
  );
}
