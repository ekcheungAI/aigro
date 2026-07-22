import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Calendar, ExternalLink } from "lucide-react";
import Reveal, { REVEAL_EASE } from "@/components/Reveal";
import { todayInfo, recentIssues } from "@/lib/daily";
import type { InsightCategory } from "@/data/insights";
import { cn } from "@/lib/utils";

/** 日報 — 日期、星期、期號按今日動態生成 (src/lib/daily.ts) */
const ISSUE = {
  ...todayInfo(),
  sources: 23,
  picks: 5,
};

const LEAD = {
  slug: "openai-gpt-5-launch",
  category: "模型發布" as InsightCategory,
  title: "OpenAI 發佈 GPT-5：統一推理與生成，API 價格下調 40%",
  summary:
    "OpenAI 正式發佈 GPT-5，將 o 系列推理能力與 GPT 系列生成能力合併為單一系統，根據任務自動調節思考深度。基準測試全面超越前代：SWE-bench 74.9%、GPQA 88.4%。API 定價較 GPT-4o 下調 40%，並開放三檔推理強度供開發者按成本取捨。",
  hkAngle:
    "API 降價四成，意味香港中小企過去因成本卻步的客服自動化、文案生成場景，回本週期由數月縮短至數週。三檔推理強度讓企業可按場景精細控制開支 — 簡單查詢用最低檔，合約分析才動用深度推理。建議本週內重新測算現有 AI 專案的單次成本。",
  source: "OpenAI Blog",
  time: "今日 06:30",
  score: 96,
};

interface DailyItem {
  slug: string;
  num: string;
  category: InsightCategory;
  title: string;
  summary: string;
  source: string;
}

const DAILY_ITEMS: DailyItem[] = [
  {
    slug: "minimax-m2-open-source",
    num: "02",
    category: "模型發布",
    title: "MiniMax M2 開源：2,300 億參數 MoE，推理成本僅及 Claude 8%",
    summary:
      "主打 Agent 場景與極低成本，支援本地部署，繁中表現在同級開源模型中領先。",
    source: "MiniMax",
  },
  {
    slug: "hkma-genai-sandbox-2",
    num: "03",
    category: "行業動態",
    title: "香港金管局生成式 AI 沙盒 2.0 啟動，20 家機構參與",
    summary:
      "聚焦風險管理與反詐騙，監管明朗化為金融業 AI 導入掃除不確定性。",
    source: "HKMA",
  },
  {
    slug: "cursor-2-multi-agent",
    num: "04",
    category: "產品發布",
    title: "Cursor 2.0：多 Agent 並行開發成標配",
    summary:
      "最多 8 個 agent 並行作業，內建瀏覽器自動測試，一人團隊產能倍增。",
    source: "Cursor Blog",
  },
  {
    slug: "traditional-chinese-rag-guide",
    num: "05",
    category: "觀點與技巧",
    title: "善用繁體中文 RAG：香港企業知識庫落地的三個關鍵",
    summary: "分詞、embedding 選型、混合檢索 — 繁中 RAG 的成敗細節全拆解。",
    source: "AIGRO 編輯部",
  },
];

/** 近 7 日（原型：全部導向同一期 mock） */
const RECENT_ISSUES = recentIssues(7).map((d) => ({
  date: d.date,
  issue: `第 ${d.number} 期`,
  current: d.current,
}));

/**
 * Daily 日報 (daily.md): 報紙刊頭版式 — Masthead（雙髮絲線）→ 頭條 Lead
 * → 編號列表 02–05 → 日期導航列（popover 近 7 日）→ Ask CTA 細帶。
 */
export default function Daily() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

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
      {/* Section 1 — Masthead 刊頭 (置中, 上方 padding 96px) */}
      <section className="mx-auto max-w-container px-6 pt-24 text-center max-md:pt-16">
        <motion.p
          className="font-mono text-caption text-text-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: REVEAL_EASE }}
        >
          {ISSUE.date}・{ISSUE.weekday}・第 {ISSUE.number} 期 Issue {ISSUE.number}
        </motion.p>
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
          編輯部從 {ISSUE.sources} 個來源選出今日 {ISSUE.picks} 條必讀 — 3
          分鐘，掌握全球 AI 脈搏的香港意義。
        </motion.p>

        {/* 雙髮絲線分隔：1px border-strong + 3px 間隙 + 1px border，由中心展開 */}
        <motion.div
          className="mt-10"
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
              <div className="mt-6 border-l-2 border-ink pl-4">
                <p className="text-overline font-sans uppercase text-ink">
                  香港視角 HK Angle
                </p>
                <p className="mt-2 max-w-prose text-body text-text-secondary">
                  {LEAD.hkAngle}
                </p>
              </div>
            </Reveal>
            <Reveal y={16} duration={0.4} delay={0.4}>
              <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-3 text-caption text-text-muted">
                <a
                  href="#"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 transition-colors duration-150 hover:text-ink"
                >
                  {LEAD.source}
                  <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                </a>
                <span aria-hidden="true">·</span>
                <span>{LEAD.time}</span>
                <span className="font-mono text-ink">{LEAD.score}</span>
                <Link
                  to={`/insights/${LEAD.slug}`}
                  className="group ml-auto inline-flex items-center gap-1.5 text-label text-ink"
                >
                  閱讀完整分析
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </Reveal>
          </article>
        </Reveal>
      </section>

      {/* Section 3 — 編號列表 02–05 (2 欄 ≥1024px / 單欄 mobile) */}
      <section className="mx-auto max-w-container px-6 pt-12">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {DAILY_ITEMS.map((item, i) => (
            <Reveal key={item.num} y={20} duration={0.4} delay={i * 0.1}>
              <Link
                to={`/insights/${item.slug}`}
                className="card-hover group flex h-full gap-6 rounded-md border bg-surface p-6"
              >
                <span
                  className="font-mono text-[28px] leading-none text-ink"
                  aria-hidden="true"
                >
                  {item.num}
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
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Section 4 — 日期導航列 (三欄 flex, 上下 1px border 包夾) */}
      <section className="mx-auto max-w-container px-6 pt-16">
        <Reveal duration={0.3}>
          <div className="flex items-center justify-between gap-4 border-y py-6">
            {/* 左：前一日（原型循環展示同一期） */}
            <Link
              to="/insights/daily"
              className="group inline-flex items-center gap-1.5 text-label text-ink"
            >
              <ArrowLeft
                className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-1"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              前一日
              <span className="ml-1 hidden font-mono text-caption text-text-muted sm:inline">
                第 041 期
              </span>
            </Link>

            {/* 中：日期選擇按鈕 + popover（近 7 日，全部導向同一期 mock） */}
            <div className="relative" ref={pickerRef}>
              <button
                type="button"
                onClick={() => setPickerOpen((open) => !open)}
                aria-expanded={pickerOpen}
                aria-haspopup="listbox"
                className="inline-flex h-11 items-center gap-2 rounded-md border border-border-strong px-4 text-ink transition-colors duration-150 hover:bg-ink-soft"
              >
                <Calendar className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                <span className="font-mono text-label">{ISSUE.date}</span>
              </button>
              <AnimatePresence>
                {pickerOpen && (
                  <motion.ul
                    role="listbox"
                    aria-label="選擇日期"
                    className="absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 rounded-md border bg-surface p-1"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: REVEAL_EASE }}
                  >
                    {RECENT_ISSUES.map((issue) => (
                      <li key={issue.date} role="option" aria-selected={issue.current}>
                        <button
                          type="button"
                          onClick={() => setPickerOpen(false)}
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
          </div>
        </Reveal>
      </section>

      {/* Section 5 — Ask CTA 細帶 (card 色 well, 置中) */}
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
                className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1"
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
