import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Check, LockKeyhole, Newspaper } from "lucide-react";

interface FeatureUnavailableProps {
  eyebrow: string;
  title: string;
  description: string;
  betaMessage?: string;
  screenshotSrc: string;
  screenshotAlt: string;
  screenshotPosition?: string;
}

/** Temporary public gate for product areas that are not ready to launch. */
export default function FeatureUnavailable({
  eyebrow,
  title,
  description,
  betaMessage,
  screenshotSrc,
  screenshotAlt,
  screenshotPosition = "center top",
}: FeatureUnavailableProps) {
  const { pathname } = useLocation();
  const authHref = (mode: "join" | "login") =>
    `${pathname}?auth=${mode}&next=${encodeURIComponent(pathname)}`;

  return (
    <section className="mx-auto max-w-container px-6 py-10 md:py-14">
      <div className="relative min-h-[580px] overflow-hidden rounded-lg border border-border-strong bg-card md:min-h-[620px]">
        <img
          src={screenshotSrc}
          alt={screenshotAlt}
          width={1440}
          height={1000}
          className="absolute inset-0 h-full w-full object-cover opacity-45 saturate-[0.6] dark:opacity-30"
          style={{ objectPosition: screenshotPosition }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-bg/50 dark:bg-bg/65"
        />

        <div className="relative flex min-h-[580px] items-center justify-center p-4 sm:p-7 md:min-h-[620px] md:p-10">
          <div
            data-ui="feature-access-panel"
            className="grid w-full max-w-[920px] overflow-hidden rounded-lg border border-border-strong bg-surface shadow-card dark:shadow-none md:grid-cols-[270px_minmax(0,1fr)]"
          >
            <aside className="flex flex-col justify-between border-b border-logo-paper/10 bg-logo-navy p-6 text-logo-paper md:min-h-[470px] md:border-b-0 md:border-r md:p-8">
              <div>
                <img
                  src="/brand/aigro-wordmark-white-transparent.png"
                  alt="AIGRO"
                  width={1267}
                  height={636}
                  className="h-7 w-auto"
                />
                <p className="mt-8 font-mono text-overline uppercase tracking-[0.12em] text-lime">
                  Member Preview
                </p>
                <h2 className="mt-3 whitespace-nowrap font-sans text-h4 font-semibold leading-snug text-logo-paper">
                  免費會員優先開放
                </h2>
                <p className="mt-3 text-body-sm text-logo-paper/65">
                  登記一次，產品準備好就直接通知你。
                </p>
              </div>

              <ul className="mt-7 grid gap-3" aria-label="免費會員預覽權益">
                {["產品開放通知", "首批測試邀請", "會員情報更新"].map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3 text-body-sm text-logo-paper/75">
                    <Check className="h-4 w-4 shrink-0 text-lime" strokeWidth={1.5} aria-hidden="true" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </aside>

            <div className="p-7 sm:p-9 md:p-10">
              <div className="flex items-center gap-3 text-lime-text">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-lime-soft">
                  <LockKeyhole className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <p className="font-mono text-overline uppercase tracking-[0.12em]">
                  {eyebrow}
                </p>
              </div>

              <h1 className="mt-6 max-w-xl font-display text-[clamp(2rem,5vw,2.75rem)] leading-tight text-text-primary">
                {title}
              </h1>
              <p className="mt-4 max-w-xl text-body text-text-secondary">
                {description}
              </p>

              <div className="mt-6 border-y border-border py-4">
                <p className="text-label text-text-primary">加入免費會員名單</p>
                <p className="mt-1 text-body-sm text-text-secondary">
                  {betaMessage ?? "功能完成測試後，我哋會按登記次序發出試用邀請。"}
                </p>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  to={authHref("join")}
                  className="press inline-flex h-11 items-center gap-2 rounded-md bg-lime px-5 text-label text-on-accent hover:bg-lime-hover"
                >
                  免費加入 AIGRO
                  <ArrowRight className="h-4 w-4 nudge-x" strokeWidth={1.5} aria-hidden="true" />
                </Link>
                <Link
                  to={authHref("login")}
                  className="press inline-flex h-11 items-center rounded-md border border-border-strong px-5 text-label text-text-primary hover:bg-card"
                >
                  已有帳號？登入
                </Link>
              </div>

              <Link
                to="/insights"
                className="nudge-x mt-5 inline-flex items-center gap-2 text-caption text-lime-text"
              >
                <Newspaper className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                先瀏覽最新情報
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
