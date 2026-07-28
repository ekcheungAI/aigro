import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Calendar, ExternalLink } from "lucide-react";
import Reveal, { REVEAL_EASE } from "@/components/Reveal";
import UpdatedChip from "@/components/UpdatedChip";
import { todayInfo, recentIssues } from "@/lib/daily";
import { aihotDaily, type AihotDailyEntry } from "@/data/aihot";
import {
  hkDayKey,
  synthesizeDailyForDate,
  useLiveDaily,
  useLiveInsights,
} from "@/data/liveItems";
import { cn } from "@/lib/utils";

/** 日報 — 日期、星期、期號按今日動態生成 (src/lib/daily.ts)；內容來自真實情報 */
const LIST_COUNT = 8;

/** 近 7 日(期號按 src/lib/daily.ts 逐日遞減;有 live 數據嘅日期先可揀) */
const RECENT_ISSUES = recentIssues(7).map((d) => ({
  date: d.date,
  weekday: d.weekday,
  number: d.number,
  issue: `第 ${d.number} 期`,
  current: d.current,
}));

/**
 * Daily 日報 (daily.md): 報紙刊頭版式 — Masthead（期號行下接 slim 日期導航列,
 * popover 近 7 日）→ 雙髮絲線 → 頭條 Lead → 分類小標編號列表 → Ask CTA 細帶。
 * v1.6: 作為「資訊中心」的每日日報 tab 內容嵌入（embedded 縮減頂距）；
 * 獨立路由 /insights/daily 由下方 default export 重定向至 /insights?tab=daily。
 * news-10x: 往期日報由 live 情報按香港日期真實合成(synthesizeDailyForDate),
 * 冇數據嘅日期喺 picker disable — 唔再係假「整理中」toast。
 */
export function DailyContent({ embedded = false }: { embedded?: boolean }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  /** 揀緊嘅往期日期(YYYY-MM-DD);null = 今日/最新一期 */
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  /* Supabase live 成熟時用 placement daily/featured 真數據合成日報
     (邏輯同 fetch-argro.mjs 一致),未成熟回落 build-time snapshot。 */
  const liveDaily = useLiveDaily();
  const liveInsights = useLiveInsights();
  const currentDaily = liveDaily ?? aihotDaily;

  /* 有 live 數據嘅香港日期集 — picker 只開放呢啲日期 */
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    for (const item of liveInsights ?? []) {
      const key = hkDayKey(item.publishedAt);
      if (key) set.add(key);
    }
    return set;
  }, [liveInsights]);

  /* 往期日報:按日合成;冇數據(理論上撳唔到)就回落當期 */
  const pastDaily = useMemo(
    () =>
      selectedDate && liveInsights
        ? synthesizeDailyForDate(liveInsights, selectedDate)
        : null,
    [selectedDate, liveInsights]
  );
  const viewingDate = pastDaily ? selectedDate : null;
  const daily = pastDaily ?? currentDaily;

  const issue = useMemo(() => {
    const info = viewingDate
      ? (RECENT_ISSUES.find((r) => r.date === viewingDate) ?? null)
      : null;
    const base = info
      ? { date: info.date, weekday: info.weekday, number: info.number }
      : todayInfo();
    const listCount = Math.min(daily.items.length, LIST_COUNT);
    return {
      ...base,
      sources: daily.itemCount,
      picks: (daily.lead ? 1 : 0) + listCount,
    };
  }, [daily, viewingDate]);
  const lead = daily.lead;

  /* 編號列表按 section 分組(數據一早已計好) + 全刊連續編號(頭條 = 01)。
     條目分類同 section 對唔上(snapshot 邊緣case)時落入「其他」組,唔會消失。 */
  const sectionGroups = useMemo(() => {
    const list = daily.items.slice(0, LIST_COUNT);
    const covered = new Set(daily.sections.map((s) => s.category));
    let counter = 1;
    const groups = daily.sections
      .map((s) => ({
        ...s,
        entries: list
          .filter((i) => i.category === s.category)
          .map((entry) => ({ entry, num: ++counter })),
      }))
      .filter((g) => g.entries.length > 0);
    const orphans = list.filter((i) => !covered.has(i.category));
    if (orphans.length > 0) {
      groups.push({
        label: "其他",
        category: "行業動態",
        count: orphans.length,
        entries: orphans.map((entry) => ({ entry, num: ++counter })),
      });
    }
    return groups;
  }, [daily]);

  /* 前一日 / 後一日導航 — 喺 RECENT_ISSUES 序列上郁;前一日要有數據先開放 */
  const viewingIndex = viewingDate
    ? Math.max(
        0,
        RECENT_ISSUES.findIndex((r) => r.date === viewingDate)
      )
    : 0;
  const prevIssue = RECENT_ISSUES[viewingIndex + 1] ?? null;
  const nextIssue = viewingIndex > 0 ? RECENT_ISSUES[viewingIndex - 1] : null;
  const prevEnabled = prevIssue !== null && availableDates.has(prevIssue.date);

  const goTo = (date: string | null) => {
    setSelectedDate(date);
    setPickerOpen(false);
  };

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
          {issue.date}・{issue.weekday}・第 {issue.number} 期 Issue {issue.number}
        </motion.p>

        {/* 日期導航列(slim)— 前一日(有數據先開放)/ 日期選擇 / 後一日(今日 disabled) */}
        <motion.nav
          aria-label="日報日期導航"
          className="mx-auto mt-4 flex max-w-md items-center justify-between gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15, ease: REVEAL_EASE }}
        >
          {/* 左：前一日（往期有真數據先可揀;冇就 disabled） */}
          {prevEnabled && prevIssue ? (
            <button
              type="button"
              onClick={() => goTo(prevIssue.date)}
              className="group inline-flex items-center gap-1.5 text-label text-ink"
            >
              <ArrowLeft
                className="h-4 w-4 transition-transform duration-150 nudge-x-neg"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              前一日
              <span className="ml-1 hidden font-mono text-caption text-text-muted sm:inline">
                {prevIssue.issue}
              </span>
            </button>
          ) : (
            <span
              className="inline-flex cursor-not-allowed items-center gap-1.5 text-label text-text-muted"
              aria-disabled="true"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              前一日
            </span>
          )}

          {/* 中：日期選擇按鈕 + popover（近 7 日;冇數據嘅日期 disabled） */}
          <div className="relative" ref={pickerRef}>
            <button
              type="button"
              onClick={() => setPickerOpen((open) => !open)}
              aria-expanded={pickerOpen}
              aria-haspopup="listbox"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border-strong px-3 text-ink press hover:bg-ink-soft"
            >
              <Calendar className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span className="font-mono text-caption">{issue.date}</span>
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
                  {RECENT_ISSUES.map((entry) => {
                    const enabled =
                      entry.current || availableDates.has(entry.date);
                    const active = entry.current
                      ? viewingDate === null
                      : viewingDate === entry.date;
                    return (
                      <li
                        key={entry.date}
                        role="option"
                        aria-selected={active}
                      >
                        <button
                          type="button"
                          disabled={!enabled}
                          onClick={() =>
                            goTo(entry.current ? null : entry.date)
                          }
                          className={cn(
                            "flex w-full items-center justify-between rounded-sm px-3 py-2 text-left transition-colors duration-150",
                            active
                              ? "bg-ink-soft text-ink"
                              : enabled
                                ? "text-text-secondary hover:bg-ink-soft hover:text-ink"
                                : "cursor-not-allowed text-text-muted opacity-50"
                          )}
                        >
                          <span className="font-mono text-caption">
                            {entry.date}
                          </span>
                          <span className="text-caption">
                            {enabled ? entry.issue : "暫無數據"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          {/* 右：後一日（睇緊今日時 disabled） */}
          {nextIssue ? (
            <button
              type="button"
              onClick={() =>
                goTo(nextIssue.current ? null : nextIssue.date)
              }
              className="group inline-flex items-center gap-1.5 text-label text-ink"
            >
              後一日
              <ArrowRight
                className="h-4 w-4 transition-transform duration-150 nudge-x"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </button>
          ) : (
            <span
              className="inline-flex cursor-not-allowed items-center gap-1.5 text-label text-text-muted"
              aria-disabled="true"
            >
              後一日
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </span>
          )}
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
          編輯部從 {issue.sources} 條{viewingDate ? "當日" : "即日"}情報選出{" "}
          {issue.picks} 條必讀 — 3 分鐘，掌握全球 AI 脈搏。
        </motion.p>
        <motion.p
          className="mx-auto mt-3 text-caption text-text-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3, ease: REVEAL_EASE }}
        >
          香港繁體整理 · 每 30 分鐘同步
          {/* 誠實日期:數據日唔係今日就並列「內容截至」 */}
          {daily.date && daily.date !== todayInfo().date && (
            <> · 內容截至 {daily.date}</>
          )}
        </motion.p>
        <motion.div
          className="mt-3 flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.35, ease: REVEAL_EASE }}
        >
          <UpdatedChip />
        </motion.div>

        {/* Masthead 視覺帶 — 印刷機 editorial 圖全寬 cover band(刊頭下方);
            底部漸層保 caption 對比,print-editorial 頭版相片位 */}
        <motion.div
          className="mt-8 overflow-hidden rounded-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.38, ease: REVEAL_EASE }}
        >
          <div className="relative h-[200px] md:h-[280px]">
            <img
              src="/editorial/daily-masthead.png"
              alt="AIGRO 日報刊頭 — 印刷機與飛紙嘅 editorial 視覺"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
            />
            <p className="absolute bottom-3 left-4 font-mono text-caption text-white/85">
              AIGRO DAILY · PRINT EDITION — 編輯部印刷房
            </p>
          </div>
        </motion.div>

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

        {/* Section anchor 列 — 刊頭下,直達各分類小標 */}
        {sectionGroups.length > 1 && (
          <motion.nav
            aria-label="日報分類跳轉"
            className="mt-6 flex flex-wrap justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5, ease: REVEAL_EASE }}
          >
            {sectionGroups.map((g, gi) => (
              <a
                key={g.category}
                href={`#daily-sec-${gi}`}
                className="press rounded-sm border px-3 py-1.5 font-mono text-caption text-text-secondary transition-colors duration-150 hover:border-ink hover:text-ink"
              >
                {g.label} · {g.entries.length}
              </a>
            ))}
          </motion.nav>
        )}
      </section>

      {/* Section 2 — Lead Story 頭條 (全寬 surface 卡片, padding 48px) */}
      {lead && (
        <section className="mx-auto max-w-container px-6 pt-16">
          <Reveal y={24} duration={0.5}>
            <article className="rounded-md border bg-surface p-12 max-md:p-6">
              <Reveal y={16} duration={0.4} delay={0.08}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-sm bg-ink-soft px-3 py-1.5 text-overline font-sans uppercase text-ink">
                    {lead.category}
                  </span>
                  <span className="text-overline font-sans uppercase text-ink">
                    頭條 Lead
                  </span>
                </div>
              </Reveal>
              <Reveal y={16} duration={0.4} delay={0.16}>
                <h2 className="mt-4 font-display text-h2 text-text-primary">
                  {lead.title}
                </h2>
              </Reveal>
              <Reveal y={16} duration={0.4} delay={0.24}>
                <p className="mt-4 max-w-prose text-body-lg text-text-secondary">
                  {lead.summary}
                </p>
              </Reveal>
              <Reveal y={16} duration={0.4} delay={0.32}>
                <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-3 text-caption text-text-muted">
                  <a
                    href={lead.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 transition-colors duration-150 hover:text-ink"
                  >
                    {lead.source}
                    <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                  </a>
                  {daily.date && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{daily.date}</span>
                    </>
                  )}
                  {lead.score !== null && (
                    <span className="font-mono text-ink">{lead.score}</span>
                  )}
                  <a
                    href={lead.permalink}
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

      {/* Section 3 — 編號列表按 section 分組加小標 (2 欄 ≥1024px / 單欄 mobile) */}
      <section className="mx-auto max-w-container px-6 pt-12">
        {sectionGroups.map((g, gi) => (
          <div
            key={g.category}
            id={`daily-sec-${gi}`}
            className="scroll-mt-24 pt-10 first:pt-0"
          >
            <Reveal y={16} duration={0.4}>
              <div className="flex items-baseline gap-4 border-b pb-3">
                <h3 className="font-display text-h3 text-text-primary">
                  {g.label}
                </h3>
                <span className="font-mono text-caption text-text-muted">
                  {g.entries.length} 則
                </span>
              </div>
            </Reveal>
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {g.entries.map(({ entry, num }, i) => (
                <DailyListCard key={entry.permalink} entry={entry} num={num} index={i} />
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Section 4 — Ask CTA 細帶 (card 色 well, 置中) */}
      <section className="mx-auto max-w-container px-6 py-16">
        <Reveal y={16} duration={0.4}>
          <div className="flex flex-col items-center gap-3 rounded-md bg-card p-8 text-center">
            <p className="text-body-sm text-text-secondary">
              對{viewingDate ? "呢期" : "今日"}日報有疑問？
            </p>
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
    </>
  );
}

/** 編號列表卡 — 全刊連續編號(頭條 01,列表 02 起),外鏈原文 */
function DailyListCard({
  entry,
  num,
  index,
}: {
  entry: AihotDailyEntry;
  num: number;
  index: number;
}) {
  return (
    <Reveal y={20} duration={0.4} delay={Math.min(index, 7) * 0.1}>
      <a
        href={entry.permalink}
        target="_blank"
        rel="noreferrer"
        className="card-hover group flex h-full gap-6 rounded-md border bg-surface p-6"
      >
        <span
          className="font-mono text-[28px] leading-none text-ink"
          aria-hidden="true"
        >
          {String(num).padStart(2, "0")}
        </span>
        <div className="min-w-0">
          <span className="inline-block rounded-sm bg-ink-soft px-3 py-1.5 text-overline font-sans uppercase text-ink">
            {entry.category}
          </span>
          <h4 className="mt-3 font-display text-h4 text-text-primary transition-colors duration-150 group-hover:text-ink">
            {entry.title}
          </h4>
          <p className="mt-2 line-clamp-2 text-body-sm text-text-secondary">
            {entry.summary}
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 text-caption text-text-muted">
            <span
              className="h-2 w-2 rounded-full bg-text-muted"
              aria-hidden="true"
            />
            {entry.source}
            <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
          </span>
        </div>
      </a>
    </Reveal>
  );
}

/**
 * 獨立路由 /insights/daily（v1.6 起）— 日報已併入資訊中心 tab，
 * 直接重定向，保留舊連結不失效。
 */
export default function Daily() {
  return <Navigate to="/insights?tab=daily" replace />;
}
