import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/Reveal";

interface Step {
  num: string;
  title: string;
  desc: string;
  cta: string;
  to: string;
}

const STEPS: Step[] = [
  {
    num: "01",
    title: "讀情報",
    desc: "精選全球 AI 動態，AI 摘要加香港視角 — 一頁掌握目前重點，唔使再追十幾個來源。",
    cta: "去情報牆",
    to: "/insights",
  },
  {
    num: "02",
    title: "問分身",
    desc: "領航專家嘅 AI 分身即時回答業務問題；命中已批准知識時附來源，覆蓋不足可以預約真人。",
    cta: "問 AI 編輯部",
    to: "/ask",
  },
  {
    num: "03",
    title: "查來源",
    desc: "每條情報保留出處同原文連結；想核實背景，可以直接返回官方或原始渠道。",
    cta: "查看情報渠道",
    to: "/sources",
  },
];

/**
 * 「點樣用 AIGRO」3-step explainer — 首次訪客嘅理解錨點。
 * Plex Mono 編號 + 襯線標題 + 兩行白話說明 + ghost CTA;
 * hairline 分隔,desktop 3 欄 / mobile 單欄,Reveal stagger 80ms。
 */
export default function HowToUse() {
  return (
    <section className="mx-auto max-w-container px-6 py-24 max-md:py-16">
      <Reveal>
        <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
          <span
            className="inline-block h-px w-6 bg-border-strong"
            aria-hidden="true"
          />
          How It Works
        </p>
        <h2 className="mt-3 font-display text-h2 text-text-primary">
          點樣用 AIGRO
        </h2>
      </Reveal>

      <div className="mt-10 grid divide-y border-y md:grid-cols-3 md:divide-x md:divide-y-0">
        {STEPS.map((step, i) => (
          <Reveal
            key={step.num}
            delay={i * 0.08}
            className="py-8 md:px-8 md:py-10 md:first:pl-0 md:last:pr-0"
          >
            <div className="flex h-full flex-col">
              <span
                className="font-mono text-h3 text-ink"
                aria-hidden="true"
              >
                {step.num}
              </span>
              <h3 className="mt-3 font-display text-h3 text-text-primary">
                {step.title}
              </h3>
              <p className="mt-2 text-body-sm text-text-secondary">
                {step.desc}
              </p>
              <Link
                to={step.to}
                className="group mt-4 inline-flex items-center gap-1 pt-1 text-label text-ink"
              >
                {step.cta}
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-150 nudge-x"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </Link>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
