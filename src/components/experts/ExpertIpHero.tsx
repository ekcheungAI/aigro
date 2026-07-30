import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { REVEAL_EASE } from "@/components/Reveal";
import VerifiedBadge from "@/components/VerifiedBadge";
import {
  expertFirstName,
  expertFullName,
  expertHasPhoto,
  type Expert,
} from "@/data/experts";

/** 領航專家 monogram 字母(data 無此欄位,由 slug 映射) */
const EXPERT_INITIALS: Record<string, string> = {
  "jimmy-lau": "JL",
  "elvin-cheung": "EC",
};

/**
 * 未有真實肖像嘅領航專家 — editorial 品牌肖像畫板(public/editorial,
 * matte black + 電光綠,由 slug 映射)。有畫板就取代 monogram 面板;
 * Experts 列表頁同步用(冇濾鏡,唔改圖片色調)。
 */
export const EXPERT_EDITORIAL_PANEL: Record<string, string> = {
  "jimmy-lau": "/editorial/jimmy-panel.png",
};

interface ExpertIpHeroProps {
  expert: Expert;
  /** expert_profiles.headline(無 → consumer 傳 expert.quote) */
  headline: string | null;
  /** expert_profiles.bio(無 → consumer 傳 expert.bio) */
  bio: string | null;
  askHref: string;
}

/**
 * Expert IP cinematic hero — MasterClass 級編排:
 * 全寬 deep navy band(#02122C)+ brand green accent、超大 Fraunces 姓名、
 * 2:3 肖像卡(真實肖像 / brand monogram 面板)、分身 CTA。
 * Band tokens(theme-independent)同 Home hero / Footer 一致;
 * 無 -mt-16(Navbar overHero 透明模式只限首頁,其他頁係實心 sticky)。
 */
export default function ExpertIpHero({
  expert,
  headline,
  bio,
  askHref,
}: ExpertIpHeroProps) {
  const accent = expert.brandColor ?? "#42CAAC";
  const firstName = expertFirstName(expert);
  const fullName = expertFullName(expert);
  const initials = EXPERT_INITIALS[expert.slug] ?? "·";
  const editorialPanel = EXPERT_EDITORIAL_PANEL[expert.slug] ?? null;

  return (
    <section className="relative isolate overflow-hidden bg-band-bg">
      {/* 品牌肌理 — 同 Home hero 嘅 print-masthead 系統:超大 Fraunces
          monogram 水印(~5% band-text)出血右緣 + 幼 hairline rules */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 select-none"
      >
        <span className="absolute right-[0.02em] top-1/2 -translate-y-1/2 whitespace-nowrap font-display text-[clamp(18rem,30vw,32rem)] leading-none tracking-[-0.03em] text-band-text/[0.05]">
          {initials}
          <span className="-ml-[0.14em] text-band-ink/[0.10]">.</span>
        </span>
        <span className="absolute inset-x-0 top-0 h-px bg-band-border-strong/50" />
        <span className="absolute inset-y-0 right-[16%] hidden w-px bg-band-border/40 lg:block" />
      </div>

      <div className="mx-auto max-w-container px-6 pb-20 pt-20 max-md:pb-14 max-md:pt-14 lg:pb-24 lg:pt-24">
        <div className="flex items-center gap-14 max-lg:gap-10 max-md:flex-col max-md:items-start">
          {/* 2:3 cinematic 肖像卡 — 真實肖像(subtle saturate → hover 全彩)
              或 brand-color monogram 面板;認證印 40px 右下角 */}
          <motion.div
            className="relative w-[264px] shrink-0 max-md:w-[208px]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: REVEAL_EASE }}
          >
            {expertHasPhoto(expert) ? (
              <div className="group aspect-[2/3] overflow-hidden rounded-md border border-band-border-strong">
                <img
                  src={expert.portrait ?? expert.image}
                  alt={fullName}
                  className="h-full w-full object-cover saturate-[0.85] transition-[filter] duration-250 group-hover:saturate-100"
                />
              </div>
            ) : editorialPanel ? (
              /* editorial 品牌肖像畫板(hero 位,唔 lazy)— 幾何剪影 + lime rim light,
                 原色呈現唔加濾鏡 */
              <div className="aspect-[2/3] overflow-hidden rounded-md border border-band-border-strong">
                <img
                  src={editorialPanel}
                  alt={`${fullName} — editorial 品牌肖像畫板`}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div
                className="flex aspect-[2/3] items-center justify-center rounded-md border"
                style={{
                  backgroundColor: `${accent}2E` /* brand tint 18% */,
                  borderColor: `${accent}66` /* brand hairline 40% */,
                }}
              >
                <span
                  aria-hidden="true"
                  className="font-display select-none"
                  style={{
                    color: `color-mix(in srgb, ${accent} 62%, hsl(var(--band-text)))`,
                    fontSize: 96,
                    fontWeight: 550,
                    letterSpacing: "0.02em",
                    lineHeight: 1,
                  }}
                >
                  {initials}
                </span>
              </div>
            )}
            <VerifiedBadge
              size={40}
              ambient
              className="absolute -bottom-2 -right-2"
            />
          </motion.div>

          <div className="min-w-0 flex-1">
            {/* Overline — lime hairline rule + credential eyebrow */}
            <motion.p
              className="flex items-center gap-3 text-overline font-sans uppercase tracking-[0.2em] text-band-text-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.05, ease: REVEAL_EASE }}
            >
              <span className="inline-block h-px w-10 bg-band-gold" aria-hidden="true" />
              {expert.credential ?? expert.title}
            </motion.p>

            {/* 姓名 — MasterClass-scale Fraunces */}
            <motion.h1
              className="mt-6 font-display text-[44px] leading-[1.08] tracking-[-0.01em] text-band-text md:text-display-hero"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12, ease: REVEAL_EASE }}
            >
              {fullName}
            </motion.h1>

            {/* 姓名下劃線:2px × 64px 電光綠,scaleX 0→1 由左 300ms */}
            <motion.span
              aria-hidden="true"
              className="mt-4 block h-[2px] w-16 origin-left bg-band-ink"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.3, delay: 0.4, ease: REVEAL_EASE }}
            />

            {/* 認證行 */}
            <motion.div
              className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: REVEAL_EASE }}
            >
              <VerifiedBadge size={16} />
              <span className="text-caption text-band-ink">
                領航專家認證 Leading Expert
              </span>
              {expert.verifiedDate && (
                <span className="text-caption text-band-text-muted">
                  認證日期 {expert.verifiedDate}
                </span>
              )}
            </motion.div>

            {/* Headline — expert_profiles.headline 優先,回落 expert.quote(真實靜態) */}
            {headline && (
              <motion.p
                className="mt-6 max-w-[640px] font-display text-[22px] leading-[1.35] text-band-text max-md:text-[19px]"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.38, ease: REVEAL_EASE }}
              >
                {headline}
              </motion.p>
            )}

            {/* Bio — expert_profiles.bio 優先,回落 experts.ts 已核實 bio */}
            {bio && (
              <motion.p
                className="mt-4 max-w-[560px] text-body-sm text-band-text-secondary"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.46, ease: REVEAL_EASE }}
              >
                {bio}
              </motion.p>
            )}

            {/* 分身檔案 meta(perskill 格式)— mono caption,不喧賓奪主 */}
            {expert.promptVersion && (
              <motion.p
                className="mt-4 font-mono text-caption text-band-text-muted"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.52, ease: REVEAL_EASE }}
              >
                Prompt {expert.promptVersion} · 公開分享 + 授權內容 · 更新於{" "}
                {expert.kbUpdated}
              </motion.p>
            )}

            {/* CTA 行 — primary 電光綠實心(band 版 ink-solid) */}
            <motion.div
              className="mt-8 flex flex-wrap items-center gap-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.58, ease: REVEAL_EASE }}
            >
              <Link
                to={askHref}
                className="inline-flex h-12 items-center gap-2 rounded-md bg-band-ink-solid px-7 text-label text-on-accent press hover:bg-band-ink-hover"
              >
                同 {firstName} 嘅 AI 分身傾計
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </Link>
              <a
                href="#top-insights"
                className="inline-flex h-12 items-center rounded-md border border-band-border-strong px-6 text-label text-band-text-secondary transition-colors duration-150 hover:border-band-text-muted hover:text-band-text"
              >
                睇精選情報
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
