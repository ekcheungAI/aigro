import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpenText,
  MessageSquareText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import Reveal from "@/components/Reveal";

interface Step {
  num: string;
  title: string;
  desc: string;
  cta: string;
  to: string;
  icon: LucideIcon;
  action: string;
  outcome: string;
}

const STEPS: Step[] = [
  {
    num: "01",
    title: "讀情報",
    desc: "精選全球 AI 動態，AI 摘要加香港視角 — 一頁掌握目前重點，唔使再追十幾個來源。",
    cta: "去情報牆",
    to: "/insights",
    icon: BookOpenText,
    action: "READ",
    outcome: "一頁掌握重點",
  },
  {
    num: "02",
    title: "問分身",
    desc: "領航專家嘅 AI 分身即時回答業務問題；命中已批准知識時附來源，覆蓋不足可以預約真人。",
    cta: "問 AI 編輯部",
    to: "/ask",
    icon: MessageSquareText,
    action: "ASK",
    outcome: "回答保留依據",
  },
  {
    num: "03",
    title: "查來源",
    desc: "每條情報保留出處同原文連結；想核實背景，可以直接返回官方或原始渠道。",
    cta: "查看情報渠道",
    to: "/sources",
    icon: ShieldCheck,
    action: "VERIFY",
    outcome: "返回原始渠道",
  },
];

/**
 * 「點樣用 AIGRO」3-step explainer — 首次訪客嘅理解錨點。
 * Plex Mono 編號 + display 標題 + 兩行白話說明 + ghost CTA;
 * hairline 分隔,desktop 3 欄 / mobile 單欄,Reveal stagger 80ms。
 */
export default function HowToUse() {
  return (
    <section className="mx-auto max-w-container px-6 py-24 max-md:py-16">
      <Reveal>
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] md:items-end">
          <div>
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
          </div>
          <p className="max-w-[420px] text-body-sm text-text-secondary md:justify-self-end">
            由資訊發現，到專家判斷，再返回來源核實；三步將 AI 動態變成可以採取嘅下一步。
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.06}>
        <div className="relative mt-10 grid grid-cols-3 rounded-md border bg-surface">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.action}
                className="flex min-w-0 flex-col items-center px-3 py-5 text-center md:flex-row md:gap-4 md:px-6 md:text-left"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-ink-soft text-ink">
                  <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span className="mt-3 min-w-0 md:mt-0">
                  <span className="block font-mono text-overline text-ink">{step.action}</span>
                  <span className="mt-1 block text-caption text-text-secondary">{step.outcome}</span>
                </span>
                {index < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 hidden h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-surface text-text-muted md:flex"
                    style={{ left: `${((index + 1) / STEPS.length) * 100}%` }}
                  >
                    <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Reveal>

      <div className="mt-8 grid divide-y border-y md:grid-cols-3 md:divide-x md:divide-y-0">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <Reveal
              key={step.num}
              delay={i * 0.08}
              className="py-8 md:px-8 md:py-10 md:first:pl-0 md:last:pr-0"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-h3 text-ink" aria-hidden="true">
                    {step.num}
                  </span>
                  <Icon className="h-5 w-5 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <h3 className="mt-3 font-display text-h3 text-text-primary">{step.title}</h3>
                <p className="mt-2 text-body-sm text-text-secondary">{step.desc}</p>
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
          );
        })}
      </div>
    </section>
  );
}
