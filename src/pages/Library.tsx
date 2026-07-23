import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Copy, Languages } from "lucide-react";
import CategoryChip from "@/components/CategoryChip";
import Reveal, { REVEAL_EASE } from "@/components/Reveal";
import {
  TOOL_CATEGORIES,
  templates,
  tools,
  type Template,
  type Tool,
  type ToolCategory,
} from "@/data/tools";
import { cn } from "@/lib/utils";

type TabKey = "tools" | "templates";
type CategoryFilter = ToolCategory | "全部";

/* ================= Section 3A — 工具評測卡 ================= */

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <article className="card-hover flex h-full flex-col rounded-md border bg-surface p-6 shadow-card dark:shadow-none">
      {/* 頂行：工具名 + 分類 chip + 總分 */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-display text-h4 text-text-primary">{tool.name}</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {tool.categories.map((c) => (
              <span
                key={c}
                className="rounded-sm bg-ink-soft px-2.5 py-1 text-overline font-sans text-ink"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
        <p className="shrink-0 text-right">
          <span className="font-mono text-[24px] leading-none text-ink">
            {tool.score.toFixed(1)}
          </span>
          <span className="text-caption text-text-muted"> /10</span>
        </p>
      </div>

      {/* 一句定位 */}
      <p className="mt-3 line-clamp-2 text-body-sm text-text-secondary">
        {tool.tagline}
      </p>

      {/* 繁中支援指標行（本地化差異點） */}
      <div className="mt-4 flex items-center gap-2">
        <Languages
          className="h-4 w-4 shrink-0 text-text-muted"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <span className="shrink-0 text-caption text-text-muted">繁體中文支援</span>
        <span
          className="flex items-center gap-1"
          role="img"
          aria-label={`繁體中文支援 ${tool.tcSupport}/5：${tool.tcNote}`}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <motion.span
              key={i}
              className={cn(
                "h-1 w-3 rounded-[1px]",
                i < tool.tcSupport ? "bg-ink" : "bg-card"
              )}
              initial={{ opacity: 0.2 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.2, delay: i * 0.04, ease: REVEAL_EASE }}
            />
          ))}
        </span>
        <span className="text-caption text-text-secondary">{tool.tcNote}</span>
      </div>

      {/* 底部行：價格 · 私隱 · 完整評測 */}
      <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-4 text-caption text-text-muted">
        <span className="font-mono">{tool.price}</span>
        <span aria-hidden="true">·</span>
        <span>私隱：{tool.privacy}</span>
        <button
          type="button"
          className="group ml-auto inline-flex items-center gap-1 text-caption text-ink"
        >
          完整評測
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform duration-150 nudge-x"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </button>
      </div>
    </article>
  );
}

/* ================= Section 3B — 模板卡 ================= */

function TemplateCard({ template }: { template: Template }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(template.content);
    } catch {
      // Fallback for environments without clipboard API
      const ta = document.createElement("textarea");
      ta.value = template.content;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
  };

  return (
    <article className="card-hover flex h-full flex-col rounded-md border bg-surface p-6 shadow-card dark:shadow-none">
      {/* 頂行：模板名 + 分類 chip + 來自案例 */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-display text-h4 text-text-primary">
            {template.name}
          </h4>
          <span className="mt-2 inline-block rounded-sm bg-ink-soft px-2.5 py-1 text-overline font-sans text-ink">
            {template.category}
          </span>
        </div>
        <span className="shrink-0 text-caption text-text-muted">
          來自案例：{template.fromCase}
        </span>
      </div>

      {/* 描述 */}
      <p className="mt-3 line-clamp-2 text-body-sm text-text-secondary">
        {template.description}
      </p>

      {/* 預覽 accordion — 高度 250ms + 內容 fade-in 150ms */}
      <AnimatePresence initial={false}>
        {previewOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: {
                height: { duration: 0.25, ease: "easeOut" },
                opacity: { duration: 0.15, delay: 0.1 },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { duration: 0.25, ease: "easeOut" },
                opacity: { duration: 0.15 },
              },
            }}
            className="overflow-hidden"
          >
            <pre className="mt-4 max-h-[320px] overflow-y-auto whitespace-pre-wrap rounded-md bg-card p-4 font-mono text-caption text-text-secondary">
              {template.content}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部：預覽 + 複製 */}
      <div className="mt-auto flex items-center gap-3 pt-4">
        <button
          type="button"
          onClick={() => setPreviewOpen((v) => !v)}
          aria-expanded={previewOpen}
          className="group inline-flex items-center gap-1 text-caption text-ink"
        >
          {previewOpen ? "收起" : "預覽"}
          <ArrowRight
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-150",
              previewOpen ? "rotate-90" : "nudge-x"
            )}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          onClick={copyTemplate}
          aria-live="polite"
          className={cn(
            "ml-auto inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-label press",
            copied
              ? "border-success text-success"
              : "border-border-strong text-ink hover:bg-ink-soft"
          )}
        >
          <span className="relative flex h-3.5 w-3.5 items-center justify-center">
            <Copy
              className={cn(
                "absolute h-3.5 w-3.5 transition-opacity duration-150",
                copied ? "opacity-0" : "opacity-100"
              )}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <Check
              className={cn(
                "absolute h-3.5 w-3.5 transition-opacity duration-150",
                copied ? "opacity-100" : "opacity-0"
              )}
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </span>
          {copied ? "已複製" : "複製"}
        </button>
      </div>
    </article>
  );
}

/* ================= Section 2 + 3 — Tabs / Chips / 內容卡格 ================= */

const TABS: { key: TabKey; label: string }[] = [
  { key: "tools", label: "工具評測" },
  { key: "templates", label: "Prompt 與工作流模板" },
];

function LibraryContent() {
  const [tab, setTab] = useState<TabKey>("tools");
  const [category, setCategory] = useState<CategoryFilter>("全部");

  const filteredTools =
    category === "全部"
      ? tools
      : tools.filter((t) => t.categories.includes(category));
  const filteredTemplates =
    category === "全部"
      ? templates
      : templates.filter((t) => t.category === category);

  return (
    <section className="mx-auto max-w-container px-6 pb-24 pt-12 max-md:pb-16">
      {/* 大 Tab — 底線式：active 2px ink 下劃線 + ink 文字（layoutId slide 200ms） */}
      <div className="flex gap-6 border-b" role="tablist" aria-label="資源類型">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "relative pb-3 text-label transition-colors duration-150",
              tab === t.key
                ? "text-ink"
                : "text-text-secondary hover:text-ink"
            )}
          >
            {t.label}
            {tab === t.key && (
              <motion.span
                layoutId="library-tab-underline"
                className="absolute inset-x-0 -bottom-px h-[2px] bg-ink"
                transition={{ duration: 0.2, ease: REVEAL_EASE }}
              />
            )}
          </button>
        ))}
      </div>

      {/* 分類 chips */}
      <div className="mt-6 flex flex-wrap gap-2">
        {(["全部", ...TOOL_CATEGORIES] as CategoryFilter[]).map((c, i) => (
          <Reveal key={c} delay={i * 0.06} y={12} duration={0.3}>
            <CategoryChip
              label={c}
              active={category === c}
              onClick={() => setCategory(c)}
            />
          </Reveal>
        ))}
      </div>

      {/* 內容 cross-fade 200ms + stagger 60ms */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${tab}-${category}`}
          className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: REVEAL_EASE }}
        >
          {tab === "tools"
            ? filteredTools.map((tool, i) => (
                <motion.div
                  key={tool.name}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{
                    duration: 0.45,
                    delay: Math.min(i, 7) * 0.06,
                    ease: REVEAL_EASE,
                  }}
                >
                  <ToolCard tool={tool} />
                </motion.div>
              ))
            : filteredTemplates.map((template, i) => (
                <motion.div
                  key={template.name}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{
                    duration: 0.45,
                    delay: Math.min(i, 7) * 0.06,
                    ease: REVEAL_EASE,
                  }}
                >
                  <TemplateCard template={template} />
                </motion.div>
              ))}
        </motion.div>
      </AnimatePresence>

      {tab === "tools" && filteredTools.length === 0 && (
        <p className="mt-8 text-body-sm text-text-muted">
          此分類暫無評測，評測陸續新增。
        </p>
      )}
      {tab === "templates" && filteredTemplates.length === 0 && (
        <p className="mt-8 text-body-sm text-text-muted">
          此分類暫無模板，模板陸續新增。
        </p>
      )}
    </section>
  );
}

/* ================= Section 4 — 繁中評估方法說明帶 ================= */

function MethodologyBand() {
  return (
    <section className="border-y bg-surface">
      <Reveal
        y={16}
        duration={0.4}
        className="mx-auto max-w-[720px] px-6 py-16 text-center"
      >
        <p className="text-overline font-sans uppercase text-text-muted">
          評測方法
        </p>
        <h4 className="mt-3 font-display text-h4 text-text-primary">
          我哋點樣評分？
        </h4>
        <p className="mx-auto mt-3 max-w-[600px] text-body-sm text-text-secondary">
          每個工具以固定繁體中文測試集（廣東話口語、書面語、中英夾雜、香港專有名詞）實測，價格以香港用戶實付為準，私隱評級參考香港《個人資料（私隱）條例》要求。每季複測一次。
        </p>
      </Reveal>
    </section>
  );
}

/* ================= Page ================= */

/**
 * 資源庫嵌入內容（v1.6）— 作為「資訊中心」的資源庫 tab：
 * 精簡引言 + 工具評測/模板 sub-toggle（沿用原 LibraryContent）+ 評測方法帶。
 */
export function LibraryEmbed() {
  return (
    <>
      <section className="mx-auto max-w-container px-6 pt-16 max-md:pt-12">
        <Reveal y={16} duration={0.4}>
          <p className="flex items-center gap-3 text-overline font-sans uppercase text-ink">
            <span className="inline-block h-[1.5px] w-6 bg-ink" aria-hidden="true" />
            Tools & Playbooks
          </p>
          <h2 className="mt-4 font-display text-h2 text-text-primary">
            資源庫 Library
          </h2>
          <p className="mt-3 max-w-[640px] text-body-sm text-text-secondary">
            工具評測以香港團隊視角實測 —
            繁體中文支援、價格、私隱合規逐項評分。模板全部來自案例庫實戰，可直接複製使用。
          </p>
        </Reveal>
      </section>
      <LibraryContent />
      <MethodologyBand />
    </>
  );
}

/**
 * 獨立路由 /library（v1.6 起）— 資源庫已併入資訊中心 tab，
 * 直接重定向，保留舊連結不失效。
 */
export default function Library() {
  return <Navigate to="/insights?tab=library" replace />;
}
