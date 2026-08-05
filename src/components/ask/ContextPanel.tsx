import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Quote } from "lucide-react";
import AboutPersonaCard from "@/components/ask/AboutPersonaCard";
import type { Citation } from "@/components/ask/AiMessage";
import { citationDomain } from "@/components/ask/sessions";
import { aihotAllInsights, aihotFetchedAt } from "@/data/aihot";
import { useLiveFetchedAt, useLiveItems } from "@/data/liveItems";
import type { Persona } from "@/data/personas";
import { cn } from "@/lib/utils";

interface ContextPanelProps {
  persona: Persona;
  /** 當前對話所有引用(已去重) */
  citations: Citation[];
  onSuggestion: (question: string) => void;
  suggestionsDisabled: boolean;
}

/**
 * Ask 右欄(≥lg)— 關於此分身 / 引用來源 / 建議問題。
 * Section header hairline 用分身 accent 色;建議 chips hover 染 accent。
 */
export default function ContextPanel({
  persona,
  citations,
  onSuggestion,
  suggestionsDisabled,
}: ContextPanelProps) {
  // 「分身資料與限制」— 按分身切換:平台用真實情報庫 count(live 優先,
  // 未成熟回落 snapshot)+ 數據時間;專家用授權內容說明 + 觀點數 + Prompt 版本。
  const isPlatform = persona.kind === "platform";
  const reduced = useReducedMotion();
  const liveItems = useLiveItems();
  const liveFetchedAt = useLiveFetchedAt();
  const itemCount = liveItems?.length ?? aihotAllInsights.length;
  const knowledgeSource = isPlatform
    ? liveItems
      ? `全站情報庫 ${itemCount} 則 · 自家管道每 30 分鐘更新`
      : `全站情報庫 ${itemCount} 則 · 目前顯示資料快照`
    : `公開分享 + 授權內容 · ${persona.expert?.viewpoints?.length ?? 10} 個核心觀點 · Prompt v1.0`;
  const updatedDate = isPlatform
    ? (liveFetchedAt ?? aihotFetchedAt).slice(0, 10)
    : "2026-07";
  const usageLimits = [
    "免費無限對話 · 限時開放",
    isPlatform
      ? "回答僅代表編輯整理,唔係即時意見"
      : "回答僅代表方法論,唔係即時意見",
    "低信心時會建議你睇來源或等 Club 預約",
    "唔提供投資/法律/醫療建議",
  ];

  return (
    <aside
      className="flex h-full w-[280px] shrink-0 flex-col gap-6 overflow-y-auto border-l border-border bg-surface px-5 py-5"
      data-lenis-prevent
      style={{ "--ask-accent": persona.accent } as React.CSSProperties}
    >
      {/* 分身切換:panel 內容 cross-fade(200ms opacity,GPU-only) */}
      <motion.div
        key={persona.key}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduced ? 0.12 : 0.2 }}
        className="flex flex-col gap-6"
      >
      {/* 關於此分身 */}
      <section>
        <div className="flex items-center justify-between">
          <p className="text-overline text-text-muted">關於此分身</p>
          <span
            aria-hidden="true"
            className="h-px w-10"
            style={{ backgroundColor: persona.accent }}
          />
        </div>
        {/* v1.21 premium speaker card:專家 = key visual + DP + socials + CRM CTAs;
            平台 = 知識庫 counts + 瀏覽情報庫 CTA(精簡 variant) */}
        <AboutPersonaCard persona={persona} />
      </section>

      {/* 分身資料與限制 — 知識庫來源 / 更新日期 / 使用限制(hairline 分隔,mono label) */}
      <section>
        <div className="flex items-center justify-between">
          <p className="text-overline text-text-muted">分身資料與限制</p>
          <span
            aria-hidden="true"
            className="h-px w-10"
            style={{ backgroundColor: persona.accent }}
          />
        </div>
        <div className="mt-3 rounded-md border bg-bg px-4">
          <div className="border-b border-border py-3">
            <p className="font-mono text-caption text-text-muted">知識庫來源</p>
            <p className="mt-1 text-caption text-text-secondary">{knowledgeSource}</p>
          </div>
          <div className="border-b border-border py-3">
            <p className="font-mono text-caption text-text-muted">更新日期</p>
            <p className="mt-1 text-caption text-text-secondary">{updatedDate}</p>
          </div>
          <div className="py-3">
            <p className="font-mono text-caption text-text-muted">使用限制</p>
            <ul className="mt-1 flex flex-col gap-1">
              {usageLimits.map((l) => (
                <li key={l} className="text-caption text-text-secondary">
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 引用來源 */}
      <section>
        <div className="flex items-center justify-between">
          <p className="text-overline text-text-muted">引用來源</p>
          <span
            aria-hidden="true"
            className="h-px w-10"
            style={{ backgroundColor: persona.accent }}
          />
        </div>
        {citations.length === 0 ? (
          <p className="mt-3 text-caption text-text-muted">
            對話出現引用之後,所有來源會喺呢度集合。
          </p>
        ) : (
          <>
            <p className="mt-3 text-caption text-text-secondary">
              呢段對話引用咗 {citations.length} 個來源
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {citations.map((c) => (
                <li key={c.href}>
                  <Link
                    to={c.href}
                    className="group flex items-center gap-2 rounded-sm border bg-bg px-2.5 py-2 transition-colors duration-120 hover:border-[var(--ask-accent)]"
                  >
                    <Quote
                      className="h-3.5 w-3.5 shrink-0 text-text-muted"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-caption text-text-primary transition-colors duration-120 group-hover:text-[var(--ask-accent)] group-hover:underline">
                        {c.title}
                      </span>
                      <span className="block text-caption text-text-muted">
                        {citationDomain(c.href)}
                      </span>
                    </span>
                    <ArrowUpRight
                      className="h-3 w-3 shrink-0 text-text-muted"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* 建議問題 */}
      <section>
        <div className="flex items-center justify-between">
          <p className="text-overline text-text-muted">建議問題</p>
          <span
            aria-hidden="true"
            className="h-px w-10"
            style={{ backgroundColor: persona.accent }}
          />
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {persona.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSuggestion(s)}
              disabled={suggestionsDisabled}
              className={cn(
                "press w-full rounded-sm border bg-bg px-3 py-2 text-left text-body-sm text-text-secondary transition-colors duration-150",
                "hover:border-[var(--ask-accent)] hover:text-[var(--ask-accent)]",
                "disabled:pointer-events-none disabled:opacity-40"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </section>
      </motion.div>
    </aside>
  );
}
