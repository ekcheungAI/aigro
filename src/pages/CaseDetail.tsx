import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import CaseCard from "@/components/CaseCard";
import Reveal, { REVEAL_EASE } from "@/components/Reveal";
import { getCaseBySlug, relatedCases, type CaseStudy } from "@/data/cases";

/* ---------- Metric count-up（design.md §5.1：800ms ease-out，首次進入 viewport） ---------- */

function parseMetric(value: string): { sign: string; num: number; suffix: string; decimals: number } | null {
  const m = value.match(/^([+-]?)(\d+(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  const num = parseFloat(m[2]);
  if (Number.isNaN(num)) return null;
  const decimals = m[2].includes(".") ? m[2].split(".")[1].length : 0;
  return { sign: m[1], num, suffix: m[3], decimals };
}

function CountUpMetric({ value, delay = 0, className }: { value: string; delay?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [display, setDisplay] = useState(() => {
    const p = parseMetric(value);
    return p ? `${p.sign}0${p.suffix}` : value;
  });

  useEffect(() => {
    const parsed = parseMetric(value);
    if (!inView || !parsed) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const duration = 800;
    let start = 0;
    let raf = 0;
    const timeout = window.setTimeout(() => {
      start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(
          `${parsed.sign}${(parsed.num * eased).toFixed(parsed.decimals)}${parsed.suffix}`
        );
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [inView, value, delay]);

  return (
    <span ref={ref} className={className ?? "font-mono text-metric text-ink"}>
      {display}
    </span>
  );
}

/* ================= Section 1 — 案例頭部 ================= */

function CaseHeader({ caseStudy }: { caseStudy: CaseStudy }) {
  const { detail } = caseStudy;
  return (
    <section className="mx-auto max-w-container px-6 pt-24 max-md:pt-16">
      <div className="grid gap-12 lg:grid-cols-12">
        {/* 左欄 8/12 */}
        <div className="lg:col-span-8">
          {/* 麵包屑 */}
          <motion.nav
            aria-label="麵包屑"
            className="text-caption text-text-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: REVEAL_EASE }}
          >
            <Link to="/cases" className="transition-colors duration-150 hover:text-ink">
              案例 Cases
            </Link>
            <span aria-hidden="true"> / </span>
            <span>{caseStudy.industry}</span>
          </motion.nav>

          {/* Overline 行：行業 chip + 工具 chip */}
          <motion.div
            className="mt-6 flex items-center gap-2"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: REVEAL_EASE }}
          >
            <span className="rounded-sm bg-ink-soft px-3 py-1.5 text-overline font-sans text-ink">
              {caseStudy.industry}
            </span>
            <span className="rounded-sm bg-card px-3 py-1.5 text-overline font-sans text-text-secondary">
              {caseStudy.tag}
            </span>
          </motion.div>

          {/* H1 + 導言 — 行級 reveal stagger 100ms */}
          <span className="mt-4 block overflow-hidden">
            <motion.h1
              className="font-display text-display text-text-primary max-md:text-h2"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.2, ease: REVEAL_EASE }}
            >
              {caseStudy.title}
            </motion.h1>
          </span>
          <span className="block overflow-hidden">
            <motion.p
              className="mt-4 max-w-[640px] text-body-lg text-text-secondary"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.3, ease: REVEAL_EASE }}
            >
              {detail.lede}
            </motion.p>
          </span>

          {/* Meta 行 */}
          <motion.p
            className="mt-6 text-caption text-text-muted"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.4, ease: REVEAL_EASE }}
          >
            企業規模：{detail.scale}
            <span aria-hidden="true"> · </span>
            實施週期：{detail.duration}
            <span aria-hidden="true"> · </span>
            來源：{caseStudy.source}（當事人授權刊登）
            <span aria-hidden="true"> · </span>
            <span className="font-mono">{detail.date}</span>
          </motion.p>
        </div>

        {/* 右欄 4/12 — 成果速覽卡（translateX(24px)+opacity, 500ms, 延遲 200ms） */}
        <motion.aside
          className="lg:col-span-4"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: REVEAL_EASE }}
        >
          <div className="rounded-md border bg-surface p-6 shadow-card dark:shadow-none">
            <p className="text-overline font-sans uppercase text-text-muted">
              成果速覽 Results
            </p>
            <div className="mt-6 flex flex-col gap-6">
              {caseStudy.metrics.map((metric) => (
                <div key={metric.label} className="flex flex-col gap-1">
                  <CountUpMetric value={metric.value} delay={500} />
                  <span className="text-caption text-text-muted">
                    {metric.label}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-6 border-t pt-4 text-caption text-text-muted">
              {detail.resultsNote}
            </p>
          </div>
        </motion.aside>
      </div>
    </section>
  );
}

/* ================= Section 1b — 紀實照片 hero（header 之下，3:2） ================= */

function CaseHeroImage({ caseStudy }: { caseStudy: CaseStudy }) {
  return (
    <section className="mx-auto max-w-container px-6 pt-12">
      <Reveal y={20} duration={0.45}>
        <div className="aspect-[3/2] max-h-[480px] w-full overflow-hidden rounded-md border">
          <img
            src={caseStudy.image}
            alt={`${caseStudy.title} — 案例紀實照片`}
            className="h-full w-full object-cover saturate-[0.85]"
          />
        </div>
      </Reveal>
    </section>
  );
}

/* ================= Section 2 — 正文拆解（720px 容器，四章節） ================= */

interface SectionBlockProps {
  number: string;
  title: string;
  children: ReactNode;
}

function SectionBlock({ number, title, children }: SectionBlockProps) {
  return (
    <Reveal y={16} duration={0.4}>
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-overline text-ink">{number}</span>
        <h3 className="font-display text-h3 text-text-primary">{title}</h3>
      </div>
      <div className="mt-4">{children}</div>
    </Reveal>
  );
}

function CaseBody({ caseStudy }: { caseStudy: CaseStudy }) {
  const { detail } = caseStudy;
  return (
    <section className="mx-auto max-w-[720px] space-y-16 px-6 pt-24 max-md:pt-16">
      {/* 01 背景 */}
      <SectionBlock number="01" title="背景 Background">
        {detail.background.map((p, i) => (
          <Reveal key={i} delay={i * 0.06} y={16} duration={0.4}>
            <p className="text-body text-text-secondary">{p}</p>
          </Reveal>
        ))}
      </SectionBlock>

      {/* 02 工具與方法 */}
      <SectionBlock number="02" title="工具與方法 Tools & Method">
        <div className="mb-4 flex flex-wrap gap-2">
          {detail.toolStack.map((tool) => (
            <span
              key={tool}
              className="rounded-sm bg-ink-soft px-3 py-1.5 text-overline font-sans text-ink"
            >
              {tool}
            </span>
          ))}
        </div>
        {detail.methodParagraphs.map((p, i) => (
          <Reveal key={i} delay={i * 0.06} y={16} duration={0.4}>
            <p className="text-body text-text-secondary">{p}</p>
          </Reveal>
        ))}
      </SectionBlock>

      {/* 03 成果數據 — metric strip 內嵌 well（橫排） */}
      <SectionBlock number="03" title="成果數據 Results">
        <div className="mb-6 flex flex-wrap gap-x-10 gap-y-4 rounded-md bg-card p-6">
          {caseStudy.metrics.map((metric) => (
            <div key={metric.label} className="flex flex-col gap-1">
              <CountUpMetric value={metric.value} />
              <span className="text-caption text-text-muted">{metric.label}</span>
            </div>
          ))}
        </div>
        {detail.resultsParagraphs.map((p, i) => (
          <Reveal key={i} delay={i * 0.06} y={16} duration={0.4}>
            <p className="text-body text-text-secondary">{p}</p>
          </Reveal>
        ))}
      </SectionBlock>

      {/* 04 可複製拆解 — 編號列表，Plex Mono 編號 */}
      <SectionBlock number="04" title="可複製拆解 Playbook">
        <p className="mb-4 text-body text-text-secondary">
          編輯部將此案例提煉為五步可複製清單：
        </p>
        <ol className="space-y-3">
          {detail.playbook.map((step, i) => (
            <motion.li
              key={i}
              className="flex items-baseline gap-4"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: REVEAL_EASE }}
            >
              <span className="shrink-0 font-mono text-caption text-ink">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-body text-text-secondary">{step}</span>
            </motion.li>
          ))}
        </ol>
      </SectionBlock>
    </section>
  );
}

/* ================= Section 3 — 引用區塊 ================= */

function QuoteBlock({ caseStudy }: { caseStudy: CaseStudy }) {
  return (
    <section className="mx-auto max-w-[720px] px-6 pt-16">
      <Reveal y={16} duration={0.4}>
        <figure className="relative rounded-md bg-card p-8">
          {/* 左 3px ink 邊框 — scaleY(0→1) 由上至下 300ms */}
          <motion.span
            aria-hidden="true"
            className="absolute bottom-8 left-0 top-8 w-[3px] origin-top rounded-sm bg-ink"
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.3, ease: REVEAL_EASE }}
          />
          <blockquote className="font-display text-body-lg text-text-primary">
            「{caseStudy.detail.quote}」
          </blockquote>
          <figcaption className="mt-4 text-caption text-text-muted">
            {caseStudy.detail.quoteByline}
          </figcaption>
        </figure>
      </Reveal>
    </section>
  );
}

/* ================= Section 4 — Ask CTA 卡 ================= */

function AskCta() {
  return (
    <section className="mx-auto max-w-[720px] px-6 pt-16">
      <Reveal y={20} duration={0.45}>
        <div className="rounded-md bg-ink-soft p-8">
          <h4 className="font-display text-h4 text-text-primary">
            你嘅行業都做到？
          </h4>
          <p className="mt-3 text-body-sm text-text-secondary">
            話畀 AI 編輯部知你嘅行業同規模，佢會參考全站案例庫，畀你一個可執行嘅起步建議。
          </p>
          <Link
            to="/ask"
            className="mt-6 inline-flex h-11 items-center gap-1 rounded-md bg-ink-solid px-6 text-label text-white press hover:bg-ink-hover"
          >
            問 AI 編輯部
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

/* ================= Section 5 — 相關案例 ================= */

function RelatedCases({ caseStudy }: { caseStudy: CaseStudy }) {
  const related = relatedCases(caseStudy.slug, 3);
  return (
    <section className="mx-auto max-w-container px-6 py-24 max-md:py-16">
      <Reveal>
        <h3 className="font-display text-h3 text-text-primary">相關案例</h3>
      </Reveal>
      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {related.map((c, i) => (
          <Reveal key={c.slug} delay={i * 0.08}>
            <CaseCard caseStudy={c} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ================= Page ================= */

export default function CaseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const caseStudy = slug ? getCaseBySlug(slug) : undefined;

  if (!caseStudy) {
    return (
      <section className="mx-auto max-w-[720px] px-6 py-24 text-center">
        <p className="text-overline font-sans uppercase text-text-muted">404</p>
        <h1 className="mt-4 font-display text-h2 text-text-primary">
          找不到此案例
        </h1>
        <p className="mt-4 text-body-sm text-text-secondary">
          此案例不存在或已移除。
        </p>
        <Link
          to="/cases"
          className="group mt-8 inline-flex items-center gap-1 text-label text-ink"
        >
          返回案例庫
          <ArrowRight
            className="h-4 w-4 transition-transform duration-150 nudge-x"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </Link>
      </section>
    );
  }

  return (
    <>
      <CaseHeader caseStudy={caseStudy} />
      <CaseHeroImage caseStudy={caseStudy} />
      <CaseBody caseStudy={caseStudy} />
      <QuoteBlock caseStudy={caseStudy} />
      <AskCta />
      <RelatedCases caseStudy={caseStudy} />
    </>
  );
}
