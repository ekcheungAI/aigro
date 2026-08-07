import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Quote } from "lucide-react";
import MonogramAvatar, { PhotoAvatar } from "@/components/MonogramAvatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import PresenceDot from "@/components/ask/PresenceDot";
import PlatformDp from "@/components/ask/PlatformDp";
import { EASE_OUT_STRONG } from "@/components/Reveal";
import { aihotAllInsights } from "@/data/aihot";
import { useLiveItems } from "@/data/liveItems";
import { expertHasPhoto, verifiedExperts } from "@/data/experts";
import type { Persona } from "@/data/personas";
import { personaInitials } from "@/data/personas";

interface SpotlightCardProps {
  persona: Persona;
  /** 打開「關於佢」persona popup(MasterClass 式宣傳卡) */
  onOpenProfile: () => void;
}

interface CredentialChip {
  value: string;
  label: string;
}

/**
 * Speaker spotlight card — 對話開始前嘅「導師宣傳位」(empty state 主角)。
 * 大頭像 + presence dot + persona 名稱 + signature quote +
 * 3 個 credential chips(experts.ts metrics)+ 核心觀點連結 + 授權 trust note。
 * 進場:fade + rise 300ms,children stagger 60ms(GPU-only;reduced-motion → 純 fade)。
 */
export default function SpotlightCard({
  persona,
  onOpenProfile,
}: SpotlightCardProps) {
  const reduced = useReducedMotion();
  const expert = persona.kind === "expert" ? persona.expert : undefined;
  // 平台 chips 用真實情報庫數據(live 優先,未成熟回落 snapshot)
  const liveItems = useLiveItems();
  const itemPool = liveItems ?? aihotAllInsights;
  const sourceCount = new Set(itemPool.map((i) => i.source).filter(Boolean))
    .size;

  // 專家保留可查證 metrics；平台以一行資料範圍交代，避免 dashboard 式數字格。
  const chips: CredentialChip[] = expert?.metrics
    ? expert.metrics.slice(0, 3).map((m) => ({ value: m.value, label: m.label }))
    : [
        {
          value: `${itemPool.length} 則`,
          label: liveItems ? "全站情報庫・即時資料" : "全站情報庫・資料快照",
        },
        { value: `${sourceCount} 個`, label: "情報來源・持續接入" },
        { value: `${verifiedExperts.length} 位`, label: "領航專家授權分身" },
      ];

  const quote = expert?.quote ?? persona.signature;
  const trustNote = expert
    ? `分身由 ${persona.shortName} 嘅授權內容蒸餾・知識庫經本人審核・回答僅代表方法論`
    : "回答經編輯審核流程整理・每個論點附可檢索來源";

  const rise = (delay: number) =>
    reduced
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.2, delay },
        }
      : {
          initial: { opacity: 0, transform: "translateY(16px)" },
          animate: { opacity: 1, transform: "translateY(0px)" },
          transition: { duration: 0.3, delay, ease: EASE_OUT_STRONG },
        };

  return (
    <div className="w-full rounded-md border bg-surface p-6 text-left sm:p-8">
      {/* 頭像 + 「你而家同緊 X 傾計」 */}
      <motion.div {...rise(0)} className="flex items-center gap-4">
        <span className="relative shrink-0">
          {persona.kind === "platform" ? (
            <PlatformDp size={64} />
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
        <div className="min-w-0">
          <p className="text-overline uppercase tracking-[0.12em] text-text-muted">
            AI 分身 · 與你單對單
          </p>
          <h3 className="mt-1 flex items-center gap-1.5 font-display text-h3 text-text-primary">
            <span className="truncate">{persona.name}</span>
            {persona.kind === "expert" && <VerifiedBadge size={24} />}
          </h3>
          <p className="mt-1 text-caption text-text-muted">{persona.domainCaption}</p>
        </div>
      </motion.div>

      {/* Signature quote */}
      <motion.blockquote {...rise(0.06)} className="mt-5 flex gap-2.5">
        <Quote
          className="mt-0.5 h-4 w-4 shrink-0"
          strokeWidth={1.5}
          style={{ color: persona.accent }}
          aria-hidden="true"
        />
        <p className="font-display text-body-lg text-text-primary">{quote}</p>
      </motion.blockquote>

      {/* 3 credential chips */}
      {expert ? (
        <motion.ul {...rise(0.12)} className="mt-5 grid gap-2 sm:grid-cols-3">
          {chips.map((c) => (
            <li key={c.value + c.label} className="border-l border-border-strong pl-3">
              <p className="font-mono text-label text-text-primary">{c.value}</p>
              <p className="mt-0.5 text-caption text-text-muted">{c.label}</p>
            </li>
          ))}
        </motion.ul>
      ) : (
        <motion.p {...rise(0.12)} className="mt-5 border-l border-ink pl-3 text-caption text-text-muted">
          {itemPool.length} 則情報・{sourceCount} 個來源・{verifiedExperts.length} 位已授權領航專家
        </motion.p>
      )}

      {/* 觀點連結 + trust note */}
      <motion.div
        {...rise(0.18)}
        className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            to={persona.aboutLinkHref}
            className="group inline-flex items-center gap-1 text-label text-ink"
          >
            {persona.aboutLinkLabel}
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-150 nudge-x"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </Link>
          <button
            type="button"
            onClick={onOpenProfile}
            className="press inline-flex items-center gap-1 text-label text-text-secondary underline decoration-text-muted/60 underline-offset-4 hover:text-ink"
          >
            關於{persona.kind === "expert" ? "佢" : "編輯部"}
          </button>
        </div>
        <p className="text-caption text-text-muted">{trustNote}</p>
      </motion.div>
    </div>
  );
}
