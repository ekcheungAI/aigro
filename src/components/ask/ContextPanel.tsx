import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Quote, Sparkles } from "lucide-react";
import MonogramAvatar from "@/components/MonogramAvatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import type { Citation } from "@/components/ask/AiMessage";
import { citationDomain } from "@/components/ask/sessions";
import type { Persona } from "@/data/personas";
import { personaInitials } from "@/data/personas";
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
  return (
    <aside
      className="flex h-full w-[280px] shrink-0 flex-col gap-6 overflow-y-auto border-l border-border bg-surface px-5 py-5"
      data-lenis-prevent
      style={{ "--ask-accent": persona.accent } as React.CSSProperties}
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
        <div className="mt-3 rounded-md border bg-bg p-4">
          <div className="flex items-center gap-2.5">
            {persona.kind === "platform" ? (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ink-soft">
                <Sparkles className="h-4 w-4 text-ink" strokeWidth={1.5} />
              </span>
            ) : (
              <MonogramAvatar
                initials={personaInitials(persona)}
                color={persona.accent}
                size={32}
              />
            )}
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-label text-text-primary">
                <span className="truncate">{persona.name}</span>
                {persona.kind === "expert" && <VerifiedBadge size={16} />}
              </p>
              <p className="truncate text-caption text-text-muted">{persona.domainCaption}</p>
            </div>
          </div>
          <p className="mt-3 line-clamp-4 text-body-sm text-text-secondary">{persona.aboutBio}</p>
          <Link
            to={persona.aboutLinkHref}
            className="group mt-3 inline-flex items-center gap-1 text-label text-ink"
          >
            {persona.aboutLinkLabel}
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-150 nudge-x"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </Link>
          <p className="mt-3 border-t border-border pt-3 text-caption text-text-muted">
            {persona.aboutTransparency}
          </p>
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
    </aside>
  );
}
