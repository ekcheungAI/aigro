import { ArrowRight, CalendarDays, Clock3, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";
import Reveal from "@/components/Reveal";

const FEATURED_REVIEW = {
  href: "/guides/100x-ai-growth-marketer",
  image: "/guides/100x-ai-growth-marketer/images/featured/813-webinar-poster.png",
  imageAlt: "100X AI Growth Marketer 直播活動海報",
  date: "2026.08.13",
  duration: "18 章完整筆記",
  eyebrow: "100X AI Growth Marketer",
  title: "由「叫 AI 出文」到建立可重用的 Marketing 做法",
  description:
    "一次過重溫 Level 1 AI Growth Marketer 同 Level 2 Growth Builder：由八段 Campaign 工作流、真人審核，到將公司知識變成可重用嘅增長系統。",
} as const;

export default function ClassReview() {
  return (
    <main className="bg-bg">
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-container gap-10 px-6 py-16 md:grid-cols-[minmax(0,1fr)_220px] md:items-end md:py-24">
          <div>
            <Reveal y={16} duration={0.4}>
              <p className="flex items-center gap-3 font-mono text-overline uppercase text-ink">
                <span className="h-px w-8 bg-ink" aria-hidden="true" />
                AIGRO Member Archive
              </p>
            </Reveal>
            <Reveal y={20} duration={0.45} delay={0.08}>
              <h1 className="mt-6 max-w-4xl font-display text-[clamp(2.75rem,7vw,5.75rem)] leading-[0.96] tracking-[-0.035em] text-text-primary">
                Class Review
                <span className="mt-3 block text-[0.48em] leading-tight tracking-[-0.02em] text-text-secondary">
                  課堂重溫
                </span>
              </h1>
            </Reveal>
            <Reveal y={20} duration={0.45} delay={0.16}>
              <p className="mt-8 max-w-[680px] text-body-lg text-text-secondary">
                將直播、課堂同實戰分享整理成可閱讀、可重做嘅會員筆記。
                每一篇都保留影片、關鍵流程、實作圖解同下一步行動。
              </p>
            </Reveal>
          </div>

          <Reveal y={16} duration={0.4} delay={0.2}>
            <div className="border-l border-border pl-6 md:border-l-0 md:border-t md:pl-0 md:pt-5">
              <p className="font-mono text-overline uppercase text-text-muted">Archive Index</p>
              <p className="mt-2 font-mono text-[2.75rem] leading-none text-ink">01</p>
              <p className="mt-2 text-caption text-text-muted">已整理課堂重溫</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-container px-6 py-16 md:py-24" aria-labelledby="latest-class-review">
        <Reveal y={18} duration={0.4}>
          <div className="mb-8 flex items-end justify-between gap-6 border-b border-border pb-5">
            <div>
              <p className="font-mono text-overline uppercase text-text-muted">Latest Review</p>
              <h2 id="latest-class-review" className="mt-2 font-display text-h2 text-text-primary">
                最新課堂重溫
              </h2>
            </div>
            <span className="hidden font-mono text-caption text-text-muted sm:block">01 / 01</span>
          </div>
        </Reveal>

        <Reveal y={22} duration={0.45} delay={0.08}>
          <article>
            <Link
              to={FEATURED_REVIEW.href}
              className="card-hover group grid overflow-hidden rounded-md border border-border bg-surface lg:grid-cols-[minmax(300px,0.82fr)_minmax(0,1.18fr)]"
            >
              <div className="relative min-h-[360px] overflow-hidden border-b border-border bg-card lg:min-h-[540px] lg:border-b-0 lg:border-r">
                <img
                  src={FEATURED_REVIEW.image}
                  alt={FEATURED_REVIEW.imageAlt}
                  width={1080}
                  height={1350}
                  className="card-image-zoom h-full w-full object-cover transition-transform duration-250"
                />
                <span className="absolute left-5 top-5 rounded-sm bg-lime px-3 py-2 font-mono text-caption font-medium uppercase text-on-accent">
                  First Review
                </span>
              </div>

              <div className="flex min-w-0 flex-col p-7 sm:p-10 lg:p-12">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-caption text-text-muted">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-ink" strokeWidth={1.5} aria-hidden="true" />
                    {FEATURED_REVIEW.date}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-ink" strokeWidth={1.5} aria-hidden="true" />
                    {FEATURED_REVIEW.duration}
                  </span>
                </div>

                <p className="mt-10 font-mono text-overline uppercase text-ink">
                  {FEATURED_REVIEW.eyebrow}
                </p>
                <h3 className="mt-4 max-w-[720px] font-display text-[clamp(2rem,4vw,3.5rem)] leading-[1.08] tracking-[-0.025em] text-text-primary transition-colors duration-150 group-hover:text-ink">
                  {FEATURED_REVIEW.title}
                </h3>
                <p className="mt-6 max-w-[640px] text-body text-text-secondary">
                  {FEATURED_REVIEW.description}
                </p>

                <div className="mt-10 flex flex-wrap gap-2">
                  <span className="rounded-sm border border-border-strong px-3 py-2 text-caption text-text-secondary">
                    DotAI × EK
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-sm border border-border-strong px-3 py-2 text-caption text-text-secondary">
                    <LockKeyhole className="h-3.5 w-3.5 text-ink" strokeWidth={1.5} aria-hidden="true" />
                    會員限定
                  </span>
                </div>

                <div className="mt-auto flex items-center justify-between gap-5 border-t border-border pt-8">
                  <span className="text-label text-ink">閱讀完整重溫</span>
                  <ArrowRight
                    className="nudge-x h-5 w-5 text-ink"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>
              </div>
            </Link>
          </article>
        </Reveal>
      </section>
    </main>
  );
}
