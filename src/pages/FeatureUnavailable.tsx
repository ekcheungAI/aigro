import { Link } from "react-router-dom";
import { ArrowRight, LockKeyhole, Newspaper } from "lucide-react";

interface FeatureUnavailableProps {
  eyebrow: string;
  title: string;
  description: string;
  screenshotSrc: string;
  screenshotAlt: string;
  screenshotPosition?: string;
}

/** Temporary public gate for product areas that are not ready to launch. */
export default function FeatureUnavailable({
  eyebrow,
  title,
  description,
  screenshotSrc,
  screenshotAlt,
  screenshotPosition = "center top",
}: FeatureUnavailableProps) {
  return (
    <section className="mx-auto max-w-container px-6 py-12 md:py-20">
      <div className="relative min-h-[620px] overflow-hidden rounded-lg border border-border-strong bg-card md:min-h-[680px]">
        <img
          src={screenshotSrc}
          alt={screenshotAlt}
          width={1440}
          height={1000}
          className="absolute inset-0 h-full w-full object-cover opacity-70 saturate-[0.72] dark:opacity-45"
          style={{ objectPosition: screenshotPosition }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-bg/25 dark:bg-bg/45" />

        <div className="relative flex min-h-[620px] items-end p-4 sm:p-8 md:min-h-[680px] md:items-center md:justify-center">
          <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-border-strong bg-surface shadow-card dark:shadow-none">
            <div className="h-2 bg-lime" aria-hidden="true" />
            <div className="p-7 sm:p-10 md:p-12">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-lime-soft text-lime-text">
                  <LockKeyhole className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <p className="font-mono text-overline uppercase tracking-[0.12em] text-lime-text">
                  {eyebrow}
                </p>
              </div>
              <h1 className="mt-6 max-w-xl font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight text-text-primary">
                {title}
              </h1>
              <p className="mt-4 max-w-xl text-body-lg text-text-secondary">
                {description}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/join"
                  className="press inline-flex h-11 items-center gap-2 rounded-md bg-lime px-5 text-label text-on-accent hover:bg-lime-hover"
                >
                  加入 Club
                  <ArrowRight className="h-4 w-4 nudge-x" strokeWidth={1.5} aria-hidden="true" />
                </Link>
                <Link
                  to="/insights"
                  className="press inline-flex h-11 items-center gap-2 rounded-md border border-border-strong px-5 text-label text-lime-text hover:bg-lime-soft"
                >
                  <Newspaper className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  瀏覽最新情報
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
