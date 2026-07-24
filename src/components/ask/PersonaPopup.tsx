import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Quote, Sparkles, X } from "lucide-react";
import MonogramAvatar, { PhotoAvatar } from "@/components/MonogramAvatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import PresenceDot from "@/components/ask/PresenceDot";
import { EASE_OUT_STRONG } from "@/components/Reveal";
import { aihotAllInsights } from "@/data/aihot";
import { cases } from "@/data/cases";
import { expertHasPhoto } from "@/data/experts";
import type { Persona } from "@/data/personas";
import { personaInitials } from "@/data/personas";

interface PersonaPopupProps {
  open: boolean;
  persona: Persona;
  onClose: () => void;
}

/**
 * Persona popup — 點 header 頭像 / 「關於佢」打開嘅 MasterClass 式導師宣傳卡。
 * 完整 bio + 成就 grid + 真實 socials + 領航風格雷達(top 3 bar)+ signature quote。
 * Center modal:scale 0.96→1 + fade 200ms(EASE_OUT_STRONG),backdrop fade 150ms;
 * Esc / backdrop click 關閉;reduced-motion → 純 opacity。
 */
export default function PersonaPopup({ open, persona, onClose }: PersonaPopupProps) {
  const reduced = useReducedMotion();
  const expert = persona.kind === "expert" ? persona.expert : undefined;

  // Esc 關閉 + 鎖背景滾動
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // 領航風格雷達 top 3(編輯部評估分,降序)
  const topRadar = expert?.radar
    ? [...expert.radar].sort((a, b) => b.score - a.score).slice(0, 3)
    : [];

  const panelMotion = reduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { opacity: 0, transform: "scale(0.96)" },
        animate: { opacity: 1, transform: "scale(1)" },
        exit: { opacity: 0, transform: "scale(0.96)" },
        transition: { duration: 0.2, ease: EASE_OUT_STRONG },
      };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop — fade 150ms */}
          <motion.button
            type="button"
            aria-label="關閉"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-[#0D0D0C]/50"
          />
          {/* Panel */}
          <motion.div
            {...panelMotion}
            role="dialog"
            aria-modal="true"
            aria-label={`關於${persona.name}`}
            className="relative max-h-[85dvh] w-full max-w-[560px] overflow-y-auto rounded-md border bg-surface"
            data-lenis-prevent
          >
            {/* Header — 大頭像 + 名 + credential */}
            <div className="flex items-start gap-4 border-b border-border p-6">
              <span className="relative shrink-0">
                {persona.kind === "platform" ? (
                  <span className="flex h-16 w-16 items-center justify-center rounded-md bg-ink-soft">
                    <Sparkles className="h-7 w-7 text-ink" strokeWidth={1.5} />
                  </span>
                ) : expert && expertHasPhoto(expert) ? (
                  <PhotoAvatar src={expert.image} alt={persona.name} size={64} verified />
                ) : (
                  <MonogramAvatar
                    initials={personaInitials(persona)}
                    color={persona.accent}
                    size={64}
                    verified={persona.kind === "expert"}
                  />
                )}
                <PresenceDot size={12} className="absolute -bottom-0.5 -right-0.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-overline uppercase tracking-[0.12em] text-text-muted">
                  {persona.kind === "expert" ? "領航專家 · AI 分身" : "平台編輯部 · AI"}
                </p>
                <p className="mt-1 flex items-center gap-1.5 font-display text-h3 text-text-primary">
                  <span className="truncate">{persona.name}</span>
                  {persona.kind === "expert" && <VerifiedBadge size={24} />}
                </p>
                <p className="mt-1 text-caption text-text-muted">
                  {expert?.credential ?? persona.headerCaption}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="關閉"
                autoFocus
                className="press -mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border-strong text-text-secondary hover:bg-card hover:text-ink"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex flex-col gap-6 p-6">
              {/* Signature quote */}
              {(expert?.quote ?? persona.signature) && (
                <blockquote className="flex gap-2.5">
                  <Quote
                    className="mt-0.5 h-4 w-4 shrink-0"
                    strokeWidth={1.5}
                    style={{ color: persona.accent }}
                    aria-hidden="true"
                  />
                  <p className="font-display text-body-lg text-text-primary">
                    {expert?.quote ?? persona.signature}
                  </p>
                </blockquote>
              )}

              {/* Bio */}
              <p className="text-body-sm text-text-secondary">
                {expert?.bio ?? persona.aboutBio}
              </p>

              {/* 成就佐證 grid */}
              {expert?.metrics && expert.metrics.length > 0 && (
                <section>
                  <div className="flex items-center justify-between">
                    <p className="text-overline text-text-muted">成就佐證</p>
                    <span
                      aria-hidden="true"
                      className="h-px w-10"
                      style={{ backgroundColor: persona.accent }}
                    />
                  </div>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {expert.metrics.map((m) => (
                      <li key={m.value + m.label} className="rounded-sm border bg-bg px-3 py-2.5">
                        <p className="font-mono text-label text-text-primary">{m.value}</p>
                        <p className="mt-0.5 text-caption text-text-muted">{m.label}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* 平台版:知識庫規模 */}
              {persona.kind === "platform" && (
                <section>
                  <div className="flex items-center justify-between">
                    <p className="text-overline text-text-muted">知識庫規模</p>
                    <span aria-hidden="true" className="h-px w-10 bg-ink" />
                  </div>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    <li className="rounded-sm border bg-bg px-3 py-2.5">
                      <p className="font-mono text-label text-text-primary">
                        {aihotAllInsights.length} 則
                      </p>
                      <p className="mt-0.5 text-caption text-text-muted">全站情報庫・每日更新</p>
                    </li>
                    <li className="rounded-sm border bg-bg px-3 py-2.5">
                      <p className="font-mono text-label text-text-primary">{cases.length} 篇</p>
                      <p className="mt-0.5 text-caption text-text-muted">香港落地案例庫</p>
                    </li>
                  </ul>
                </section>
              )}

              {/* 領航風格雷達 top 3 — bar 用 scaleX(GPU-only) */}
              {topRadar.length > 0 && (
                <section>
                  <div className="flex items-center justify-between">
                    <p className="text-overline text-text-muted">領航風格 Top 3</p>
                    <span
                      aria-hidden="true"
                      className="h-px w-10"
                      style={{ backgroundColor: persona.accent }}
                    />
                  </div>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {topRadar.map((r, i) => (
                      <li key={r.label}>
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-caption text-text-primary">{r.label}</p>
                          <p className="font-mono text-caption text-text-muted">{r.score}</p>
                        </div>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-ink-soft">
                          <motion.div
                            className="h-full w-full origin-left rounded-full"
                            style={{
                              backgroundColor: persona.accent,
                              // reduced-motion:靜態 bar(純 opacity fade),transform 唔動畫
                              transform: reduced
                                ? `scaleX(${r.score / 100})`
                                : undefined,
                            }}
                            initial={
                              reduced
                                ? { opacity: 0 }
                                : { opacity: 1, transform: "scaleX(0)" }
                            }
                            animate={
                              reduced
                                ? { opacity: 1 }
                                : {
                                    opacity: 1,
                                    transform: `scaleX(${r.score / 100})`,
                                  }
                            }
                            transition={{
                              duration: reduced ? 0.15 : 0.3,
                              delay: reduced ? 0 : 0.1 + i * 0.06,
                              ease: EASE_OUT_STRONG,
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-caption text-text-muted">
                    編輯部風格評估,非精確測量
                  </p>
                </section>
              )}

              {/* Socials — 真實 URL external chips */}
              {expert?.socials && expert.socials.length > 0 && (
                <section>
                  <div className="flex items-center justify-between">
                    <p className="text-overline text-text-muted">追蹤本人</p>
                    <span
                      aria-hidden="true"
                      className="h-px w-10"
                      style={{ backgroundColor: persona.accent }}
                    />
                  </div>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {expert.socials.map((s) => (
                      <li key={s.url}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="press group inline-flex h-7 items-center gap-1.5 rounded-sm border bg-bg px-2.5 text-caption text-text-secondary transition-colors duration-120 hover:border-[var(--ask-accent)] hover:text-[var(--ask-accent)]"
                        >
                          {s.label}
                          <ArrowUpRight
                            className="h-3 w-3 text-text-muted"
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* 完整檔案連結 + 授權透明度 */}
              <div className="border-t border-border pt-4">
                <Link
                  to={persona.aboutLinkHref}
                  onClick={onClose}
                  className="group inline-flex items-center gap-1 text-label text-ink"
                >
                  {persona.aboutLinkLabel}
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-150 nudge-x"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </Link>
                <p className="mt-3 text-caption text-text-muted">
                  {persona.aboutTransparency}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
