import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Calendar, ExternalLink } from "lucide-react";
import Reveal, { REVEAL_EASE } from "@/components/Reveal";
import { todayInfo, recentIssues } from "@/lib/daily";
import { aihotDaily } from "@/data/aihot";
import { cn } from "@/lib/utils";

/** 日報 — 日期、星期、期號按今日動態生成 (src/lib/daily.ts)；內容來自 AIHOT 真實日報 */
const LIST_COUNT = 8;
const DAILY_LIST = aihotDaily.items.slice(0, LIST_COUNT);

const ISSUE = {
  ...todayInfo(),
  sources: aihotDaily.itemCount,
  picks: (aihotDaily.lead ? 1 : 0) + DAILY_LIST.length,
};

const LEAD = aihotDaily.lead;

/** 近 7 日（原型：往期未有真實 archive,期號按 src/lib/daily.ts 逐日遞減） */
const RECENT_ISSUES = recentIssues(7).map((d) => ({
  date: d.date,
  issue: `第 ${d.number} 期`,
  current: d.current,
}));

/** 前一日期號（今日期號 - 1） */
const PREV_ISSUE = RECENT_ISSUES[1] ?? RECENT_ISSUES[0];

/**
 * Daily 日報 (daily.md): 報紙刊頭版式 — Masthead（期號行下接 slim 日期導航列,
 * popover 近 7 日）→ 雙髮絲線 → 頭條 Lead → 編號列表 02–05 → Ask CTA 細帶。
 * v1.6: 作為「資訊中心」的每日日報 tab 內容嵌入（embedded 縮減頂距）；
 * 獨立路由 /insights/daily 由下方 default export 重定向至 /insights?tab=daily。
 */
export function DailyContent({ embedded = false }: { embedded?: boolean }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef(0);

  // Toast 自動消失
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 6000);
  }, []);

  // 往期未有真實 archive — 前一日 / 舊期數統一行「整理中」toast,唔留死制
  const showArchiveToast = useCallback(() => {
    setPickerOpen(false);
    showToast("舊期數整理中 — 往期日報即將開放,敬請留意。");
  }, [showToast]);

  // 點擊 popover 外部關閉
  useEffect(() => {
    if (!pickerOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [pickerOpen]);

  return (
    <>
      {/* Section 1 — Masthead 刊頭 (置中; v1.19 收緊期號 nav 行上/下垂直間距) */}
      <section
        className={cn(
          "mx-auto max-w-container px-6 text-center",
          embedded ? "pt-10 max-md:pt-8" : "pt-16 max-md:pt-12"
        )}
      >
        <motion.p
          className="font-mono text-caption text-text-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: REVEAL_EASE }}
        >
          {ISSUE.date}・{ISSUE.weekday}・第 {ISSUE.number} 期 Issue {ISSUE.number}
        </motion.p>

        {/* 日期導航列(slim)— 直接喺期號行之下:前一日(整理中 toast)/ 日期選擇 / 後一日(今日 disabled) */}
        <motion.nav
          aria-label="日報日期導航"
          className="mx-auto mt-4 flex max-w-md items-center justify-between gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15, ease: REVEAL_EASE }}
        >
          {/* 左：前一日（往期整理中 → toast,期號 = 今日 - 1） */}
          <button
            type="button"
            onClick={showArchiveToast}
            className="group inline-flex items-center gap-1.5 text-label text-ink"
          >
            <ArrowLeft
              className="h-4 w-4 transition-transform duration-150 nudge-x-neg"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            前一日
            <span className="ml-1 hidden font-mono text-caption text-text-muted sm:inline">
              {PREV_ISSUE.issue}
            </span>
          </button>

          {/* 中：日期選擇按鈕 + popover（近 7 日；舊期數 → 整理中 toast） */}
          <div className="relative" ref={pickerRef}>
            <button
              type="button"
              onClick={() => setPickerOpen((open) => !open)}
              aria-expanded={pickerOpen}
              aria-haspopup="listbox"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border-strong px-3 text-ink press hover:bg-ink-soft"
            >
              <Calendar className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span className="font-mono text-caption">{ISSUE.date}</span>
            </button>
            <AnimatePresence>
              {pickerOpen && (
                <motion.ul
                  role="listbox"
                  aria-label="選擇日期"
                  className="absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 rounded-md border bg-surface p-1"
                  initial={{ opacity: 0, transform: "translateX(-50%) scale(0.96)" }}
                  animate={{ opacity: 1, transform: "translateX(-50%) scale(1)" }}
                  exit={{ opacity: 0, transform: "translateX(-50%) scale(0.96)" }}
                  transition={{ duration: 0.15, ease: REVEAL_EASE }}
                >
                  {RECENT_ISSUES.map((issue) => (
                    <li key={issue.date} role="option" aria-selected={issue.current}>
                      <button
                        type="button"
                        onClick={() =>
                          issue.current ? setPickerOpen(false) : showArchiveToast()
                        }
                        className={cn(
                          "flex w-full items-center justify-between rounded-sm px-3 py-2 text-left transition-colors duration-150",
                          issue.current
                            ? "bg-ink-soft text-ink"
                            : "text-text-secondary hover:bg-ink-soft hover:text-ink"
                        )}
                      >
                        <span className="font-mono text-caption">{issue.date}</span>
                        <span className="text-caption">{issue.issue}</span>
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          {/* 右：後一日（今日時 disabled） */}
          <span
            className="inline-flex cursor-not-allowed items-center gap-1.5 text-label text-text-muted"
            aria-disabled="true"
          >
            後一日
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </span>
        </motion.nav>

        <motion.h1
          className="mt-4 font-display text-display-lg text-text-primary"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: REVEAL_EASE }}
        >
          每日精選日報
        </motion.h1>
        <motion.p
          className="mx-auto mt-4 max-w-[560px] text-body-sm text-text-secondary"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: REVEAL_EASE }}
        >
          編輯部從 {ISSUE.sources} 條即日情報選出 {ISSUE.picks} 條必讀 — 3
          分鐘，掌握全球 AI 脈搏。
        </motion.p>
        <motion.p
          className="mx-auto mt-3 text-caption text-text-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3, ease: REVEAL_EASE }}
        >
          香港繁體整理 · 編輯部每日更新
        </motion.p>

        {/* 雙髮絲線分隔：1px border-strong + 3px 間隙 + 1px border，由中心展開 */}
        <motion.div
          className="mt-8"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.4, ease: REVEAL_EASE }}
          aria-hidden="true"
        >
          <div className="h-px bg-border-strong" />
          <div className="mt-[3px] h-px bg-border" />
        </motion.div>
      </section>

      {/* Section 2 — Lead Story 頭條 (全寬 surface 卡片, padding 48px) */}
      {LEAD && (
        <section className="mx-auto max-w-container px-6 pt-16">
          <Reveal y={24} duration={0.5}>
            <article className="rounded-md border bg-surface p-12 max-md:p-6">
              <Reveal y={16} duration={0.4} delay={0.08}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-sm bg-ink-soft px-3 py-1.5 text-overline font-sans uppercase text-ink">
                    {LEAD.category}
                  </span>
                  <span className="text-overline font-sans uppercase text-ink">
                    頭條 Lead
                  </span>
                </div>
              </Reveal>
              <Reveal y={16} duration={0.4} delay={0.16}>
                <h2 className="mt-4 font-display text-h2 text-text-primary">
                  {LEAD.title}
                </h2>
              </Reveal>
              <Reveal y={16} duration={0.4} delay={0.24}>
                <p className="mt-4 max-w-prose text-body-lg text-text-secondary">
                  {LEAD.summary}
                </p>
              </Reveal>
              <Reveal y={16} duration={0.4} delay={0.32}>
                <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-3 text-caption text-text-muted">
                  <a
                    href={LEAD.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 transition-colors duration-150 hover:text-ink"
                  >
                    {LEAD.source}
                    <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                  </a>
                  {aihotDaily.date && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{aihotDaily.date}</span>
                    </>
                  )}
                  {LEAD.score !== null && (
                    <span className="font-mono text-ink">{LEAD.score}</span>
                  )}
                  <a
                    href={LEAD.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="group ml-auto inline-flex items-center gap-1.5 text-label text-ink"
                  >
                    閱讀原文
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-150 nudge-x"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </a>
                </div>
              </Reveal>
            </article>
          </Reveal>
        </section>
      )}

      {/* Section 3 — 編號列表 (2 欄 ≥1024px / 單欄 mobile)，每條外鏈至 AIHOT permalink */}
      <section className="mx-auto max-w-container px-6 pt-12">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {DAILY_LIST.map((item, i) => (
            <Reveal key={item.permalink} y={20} duration={0.4} delay={i * 0.1}>
              <a
                href={item.permalink}
                target="_blank"
                rel="noreferrer"
                className="card-hover group flex h-full gap-6 rounded-md border bg-surface p-6"
              >
                <span
                  className="font-mono text-[28px] leading-none text-ink"
                  aria-hidden="true"
                >
                  {String(i + 2).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <span className="inline-block rounded-sm bg-ink-soft px-3 py-1.5 text-overline font-sans uppercase text-ink">
                    {item.category}
                  </span>
                  <h4 className="mt-3 font-display text-h4 text-text-primary transition-colors duration-150 group-hover:text-ink">
                    {item.title}
                  </h4>
                  <p className="mt-2 line-clamp-2 text-body-sm text-text-secondary">
                    {item.summary}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-caption text-text-muted">
                    <span
                      className="h-2 w-2 rounded-full bg-text-muted"
                      aria-hidden="true"
                    />
                    {item.source}
                    <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                  </span>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Section 4 — Ask CTA 細帶 (card 色 well, 置中) */}
      <section className="mx-auto max-w-container px-6 py-16">
        <Reveal y={16} duration={0.4}>
          <div className="flex flex-col items-center gap-3 rounded-md bg-card p-8 text-center">
            <p className="text-body-sm text-text-secondary">對今日日報有疑問？</p>
            <Link
              to="/ask"
              className="group inline-flex items-center gap-1.5 text-label text-ink"
            >
              問 AI 編輯部
              <ArrowRight
                className="h-4 w-4 transition-transform duration-150 nudge-x"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* 往期整理中 toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="daily-toast"
            role="status"
            initial={{ opacity: 0, transform: "translate(-50%, 8px)" }}
            animate={{ opacity: 1, transform: "translate(-50%, 0px)" }}
            exit={{ opacity: 0, transform: "translate(-50%, 8px)" }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 left-1/2 z-50 max-w-[calc(100vw-2rem)] rounded-md border bg-surface px-4 py-3 text-body-sm text-text-primary"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * 獨立路由 /insights/daily（v1.6 起）— 日報已併入資訊中心 tab，
 * 直接重定向，保留舊連結不失效。
 */
export default function Daily() {
  return <Navigate to="/insights?tab=daily" replace />;
}
