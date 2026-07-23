import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import CaseCard from "@/components/CaseCard";
import CategoryChip from "@/components/CategoryChip";
import Reveal, { REVEAL_EASE } from "@/components/Reveal";
import { CASE_INDUSTRIES, cases, type CaseIndustry } from "@/data/cases";

type IndustryFilter = CaseIndustry | "全部";

/* ================= Section 1 — Page Header ================= */

function PageHeader() {
  return (
    <section className="mx-auto max-w-container px-6 pt-24 max-md:pt-16">
      <motion.p
        className="flex items-center gap-3 text-overline font-sans uppercase text-ink"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: REVEAL_EASE }}
      >
        <span className="inline-block h-[1.5px] w-6 bg-ink" aria-hidden="true" />
        Field-Tested in Hong Kong
      </motion.p>

      {/* 行級 reveal — stagger 100ms, 450ms */}
      <span className="mt-6 block overflow-hidden">
        <motion.h1
          className="font-display text-display text-text-primary"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.1, ease: REVEAL_EASE }}
        >
          實戰案例 Cases
        </motion.h1>
      </span>
      <span className="block overflow-hidden">
        <motion.p
          className="mt-4 max-w-[640px] text-body-lg text-text-secondary"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.2, ease: REVEAL_EASE }}
        >
          香港企業用 AI 的真實成果 —
          每個案例附量化數據、所用工具與可複製拆解。無數據，不上架。
        </motion.p>
      </span>
    </section>
  );
}

/* ================= Sections 2–3 — 篩選 + 案例卡格 ================= */

function CaseGrid() {
  const [industry, setIndustry] = useState<IndustryFilter>("全部");

  const filtered =
    industry === "全部"
      ? cases
      : cases.filter((c) => c.industry === industry);

  return (
    <section className="mx-auto max-w-container px-6 pb-24 pt-12 max-md:pb-16">
      {/* 行業篩選 chips 列 */}
      <div className="flex flex-wrap items-center gap-2">
        {(["全部", ...CASE_INDUSTRIES] as IndustryFilter[]).map((c, i) => (
          <Reveal key={c} delay={i * 0.06} y={12} duration={0.3}>
            <CategoryChip
              label={c}
              active={industry === c}
              onClick={() => setIndustry(c)}
            />
          </Reveal>
        ))}
        <span className="ml-auto text-caption text-text-muted">
          {filtered.length} 個案例
        </span>
      </div>

      {/* 卡格 cross-fade 200ms + stagger 60ms 重新進場 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={industry}
          className="mt-8 grid gap-6 md:grid-cols-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: REVEAL_EASE }}
        >
          {filtered.map((c, i) => (
            <motion.div
              key={c.slug}
              initial={{ opacity: 0, transform: "translateY(24px)" }}
              whileInView={{ opacity: 1, transform: "translateY(0px)" }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.45,
                delay: Math.min(i, 4) * 0.06,
                ease: REVEAL_EASE,
              }}
            >
              <CaseCard caseStudy={c} />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

/* ================= Section 4 — 投稿/授權說明帶 ================= */

function SubmitBand() {
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (!toastVisible) return;
    const t = window.setTimeout(() => setToastVisible(false), 2200);
    return () => window.clearTimeout(t);
  }, [toastVisible]);

  return (
    <section className="border-y bg-surface">
      <Reveal y={16} duration={0.4} className="mx-auto max-w-container px-6 py-16 text-center">
        <h4 className="font-display text-h4 text-text-primary">
          你都有實戰成果？
        </h4>
        <p className="mx-auto mt-3 max-w-[520px] text-body-sm text-text-secondary">
          我們歡迎有量化數據的香港 AI 落地案例，經核實後署名刊登。
        </p>
        <button
          type="button"
          onClick={() => setToastVisible(true)}
          className="mt-6 inline-flex h-11 items-center gap-1 rounded-md border border-border-strong px-6 text-label text-ink press hover:bg-ink-soft"
        >
          提交案例
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </Reveal>

      {/* Toast（原型） */}
      <AnimatePresence>
        {toastVisible && (
          <motion.div
            role="status"
            className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-md border bg-surface px-5 py-3 text-label text-text-primary shadow-card dark:shadow-none"
            initial={{ opacity: 0, transform: "translateX(-50%) translateY(16px)" }}
            animate={{ opacity: 1, transform: "translateX(-50%) translateY(0px)" }}
            exit={{ opacity: 0, transform: "translateX(-50%) translateY(8px)" }}
            transition={{ duration: 0.2, ease: REVEAL_EASE }}
          >
            投稿通道即將開放
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ================= Page ================= */

export default function Cases() {
  return (
    <>
      <PageHeader />
      <CaseGrid />
      <SubmitBand />
    </>
  );
}
