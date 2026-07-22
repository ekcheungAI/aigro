import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { ArrowRight, AudioLines, Check, ExternalLink, ShieldCheck } from "lucide-react";
import Reveal, { REVEAL_EASE } from "@/components/Reveal";
import VerifiedBadge from "@/components/VerifiedBadge";
import { expertFirstName, experts, type Expert } from "@/data/experts";

/* ================= Local toast（頁面級原型提示） ================= */

function useMiniToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = (m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2600);
  };
  return { msg, show };
}

function MiniToast({ msg }: { msg: string | null }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          role="status"
          className="fixed bottom-6 left-1/2 z-[70] rounded-md border bg-surface px-4 py-2.5 text-caption text-text-primary shadow-card dark:shadow-none"
          initial={{ opacity: 0, y: 12, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 8, x: "-50%" }}
          transition={{ duration: 0.2, ease: REVEAL_EASE }}
        >
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================= Section 2 — 成就佐證 chip（數字 count-up 600ms） ================= */

function MetricChip({
  value,
  label,
  isMedia,
  delay,
}: {
  value: string;
  label: string;
  isMedia?: boolean;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  // 純數字（含前後綴，如「US$40M」「40+」）進入 viewport 時 count-up 600ms
  const match = /^([^\d]*)(\d+)(.*)$/.exec(value);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!inView || !match) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const target = parseInt(match[2], 10);
    const start = performance.now();
    const duration = 600;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out
      setDisplay(`${match[1]}${Math.round(target * eased)}${match[3]}`);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setDisplay(`${match[1]}0${match[3]}`);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value]);

  const inner = (
    <>
      <span className="flex items-center gap-1 font-mono text-[24px] leading-[1.1] text-ink">
        {match ? display : value}
        {isMedia && (
          <ExternalLink
            className="h-3 w-3 text-text-muted transition-colors duration-150 group-hover:text-ink"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        )}
      </span>
      <span className="mt-1.5 block text-caption text-text-muted transition-colors duration-150 group-hover:text-ink">
        {label}
      </span>
    </>
  );

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, delay, ease: REVEAL_EASE }}
    >
      {isMedia ? (
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="group block rounded-md border bg-surface px-5 py-4"
        >
          {inner}
        </a>
      ) : (
        <div className="group rounded-md border bg-surface px-5 py-4">{inner}</div>
      )}
    </motion.div>
  );
}

/* ================= Verified 專家 — Section 1 Hero ================= */

function VerifiedHero({ expert }: { expert: Expert }) {
  const accent = expert.brandColor ?? "#466A5E";
  return (
    <section className="relative overflow-hidden">
      {/* 專家色 10% alpha tint 蓋於 bg（純色疊層，非漸層） */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: `${accent}1A` }}
      />
      <div className="relative mx-auto max-w-container px-6 pb-16 pt-24 max-md:pt-16">
        <div className="flex items-start gap-10 max-md:flex-col max-md:gap-8">
          {/* 120px 頭像：1.5px 金環 + Badge A 40px 右下角 */}
          <motion.div
            className="relative shrink-0"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: REVEAL_EASE }}
          >
            <div
              className="h-[120px] w-[120px] overflow-hidden rounded-full"
              style={{ boxShadow: "inset 0 0 0 1.5px hsl(var(--gold))" }}
            >
              <img
                src={expert.image}
                alt={`${expert.nameZh} ${expert.nameEn} 人像`}
                width={120}
                height={120}
                className="h-full w-full object-cover"
              />
            </div>
            <VerifiedBadge
              size={40}
              ambient
              className="absolute -bottom-1 -right-1"
            />
          </motion.div>

          <div className="min-w-0">
            <motion.p
              className="text-overline font-sans uppercase text-text-muted"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: REVEAL_EASE }}
            >
              {expert.credential}
            </motion.p>
            <motion.h1
              className="mt-3 font-display text-display-lg text-text-primary max-md:text-display"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: REVEAL_EASE }}
            >
              {expert.nameZh} {expert.nameEn}
            </motion.h1>
            {/* 姓名下劃線：2px × 64px 專家色，scaleX 0→1 由左 300ms */}
            <motion.span
              aria-hidden="true"
              className="mt-2 block h-[2px] w-16 origin-left"
              style={{ backgroundColor: accent }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.3, delay: 0.35, ease: REVEAL_EASE }}
            />
            <motion.div
              className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: REVEAL_EASE }}
            >
              <VerifiedBadge size={16} />
              <span className="text-caption text-gold">已認證 Verified Mentor</span>
              <span className="text-caption text-text-muted">
                認證日期 {expert.verifiedDate}
              </span>
            </motion.div>
            <motion.p
              className="mt-5 max-w-[560px] text-body-lg text-text-secondary"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4, ease: REVEAL_EASE }}
            >
              {expert.bio}
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================= Verified 專家 — Sections 2–5 ================= */

function VerifiedProfile({ expert }: { expert: Expert }) {
  const toast = useMiniToast();
  const accent = expert.brandColor ?? "#466A5E";
  const firstName = expertFirstName(expert);
  const viewpoints = expert.viewpoints ?? [];
  const shown = viewpoints.slice(0, 6);
  const remaining = viewpoints.length - shown.length;
  const askHref = `/ask?expert=${expert.slug}`;

  return (
    <div>
      <VerifiedHero expert={expert} />

      {/* Section 2 — 成就佐證 Strip */}
      {expert.metrics && expert.metrics.length > 0 && (
        <section className="mx-auto max-w-container px-6 pt-16 max-md:pt-12">
          <div className="flex flex-wrap gap-3">
            {expert.metrics.map((m, i) => (
              <MetricChip
                key={m.label}
                value={m.value}
                label={m.label}
                isMedia={m.isMedia}
                delay={i * 0.06}
              />
            ))}
          </div>
        </section>
      )}

      {/* Section 3 — 授權透明度（強制置於對話入口之上） */}
      <section className="mx-auto max-w-[720px] px-6 pt-16 max-md:pt-12">
        <Reveal y={16} duration={0.4}>
          <div className="rounded-md bg-card p-8">
            <p className="flex items-center gap-2 text-overline font-sans uppercase text-text-muted">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              授權來源說明 Transparency
            </p>
            <p className="mt-4 text-body-sm text-text-secondary">
              {expert.transparency}
            </p>
          </div>
        </Reveal>
      </section>

      {/* Section 4 — 核心觀點 Grid */}
      <section className="mx-auto max-w-container px-6 pt-24 max-md:pt-16">
        <Reveal>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 className="font-display text-h3 text-text-primary">
              {viewpoints.length} 個核心觀點
            </h2>
            <p className="text-caption text-text-muted">蒸餾自原創訪談與著作</p>
          </div>
        </Reveal>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {shown.map((v, i) => (
            <motion.article
              key={v.title}
              className="card-hover rounded-md border bg-surface p-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: i * 0.07, ease: REVEAL_EASE }}
            >
              <p className="font-mono text-caption text-ink">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-2 text-h4 font-sans text-text-primary">
                {v.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-body-sm text-text-secondary">
                {v.summary}
              </p>
            </motion.article>
          ))}
          {/* 收尾卡：虛線邊框，其餘觀點在分身對話中探索 */}
          {remaining > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: shown.length * 0.07, ease: REVEAL_EASE }}
            >
              <Link
                to={askHref}
                className="group flex h-full min-h-[148px] items-center justify-center rounded-md border border-dashed border-border-strong p-6 text-center transition-colors duration-180 hover:border-ink"
              >
                <span className="inline-flex items-center gap-1.5 text-body-sm text-text-secondary transition-colors duration-150 group-hover:text-ink">
                  其餘 {remaining} 個觀點，在分身對話中探索
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </motion.div>
          )}
        </div>
      </section>

      {/* Section 5 — AI 分身入口 Band */}
      <section className="mt-24 border-y bg-surface max-md:mt-16">
        <div className="mx-auto max-w-container px-6 py-16 text-center">
          <Reveal>
            <h2 className="font-display text-h3 text-text-primary">
              與 {firstName} 的 AI 分身對話
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mx-auto mt-4 max-w-[560px] text-body-sm text-text-secondary">
              {expert.askIntro}
            </p>
          </Reveal>
          <motion.div
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.4, delay: 0.15, ease: REVEAL_EASE }}
          >
            {/* Primary — 專家色 tinted 實心按鈕，hover 亮度 -8% */}
            <Link
              to={askHref}
              className="inline-flex h-11 items-center gap-1.5 rounded-md px-6 text-label text-white transition-[filter] duration-120 hover:brightness-[0.92] active:scale-[0.98]"
              style={{ backgroundColor: accent }}
            >
              與 AI 分身對話
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </Link>
            {/* Ghost 鎖定態 — 語音對話 VIP */}
            <button
              type="button"
              aria-disabled="true"
              onClick={() => toast.show("語音對話為 VIP 專享")}
              className="inline-flex h-11 items-center gap-2 rounded-md px-4 text-label text-ink opacity-60 transition-opacity duration-150 hover:opacity-80"
            >
              <AudioLines className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              語音對話
              <span className="text-caption text-gold">VIP</span>
            </button>
          </motion.div>
          <Reveal delay={0.2}>
            <p className="mt-6 text-caption text-text-muted">
              免費 3 次體驗・會員無限對話
            </p>
          </Reveal>
        </div>
      </section>

      <MiniToast msg={toast.msg} />
    </div>
  );
}

/* ================= Section 6 — 待用態變體 ================= */

function PendingProfile({ expert }: { expert: Expert }) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  return (
    <div>
      {/* Hero — 純 bg，無專家色、無徽章、無金色 */}
      <section className="mx-auto max-w-container px-6 pb-16 pt-24 max-md:pt-16">
        <div className="flex items-start gap-10 max-md:flex-col max-md:gap-8">
          <motion.div
            className="relative shrink-0 opacity-60"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{ duration: 0.5, ease: REVEAL_EASE }}
          >
            <div className="h-[120px] w-[120px] overflow-hidden rounded-full border-2 border-dashed border-border-strong">
              <img
                src={expert.image}
                alt={`${expert.nameZh} ${expert.nameEn} 人像`}
                width={120}
                height={120}
                className="h-full w-full object-cover grayscale"
              />
            </div>
          </motion.div>

          <div className="min-w-0">
            <motion.p
              className="text-overline font-sans uppercase text-text-muted"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: REVEAL_EASE }}
            >
              {expert.title}・香港
            </motion.p>
            <motion.h1
              className="mt-3 font-display text-display-lg text-text-primary max-md:text-display"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: REVEAL_EASE }}
            >
              {expert.nameZh} {expert.nameEn}
            </motion.h1>
            <motion.p
              className="mt-3 text-caption text-text-muted"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: REVEAL_EASE }}
            >
              認證進行中・敬請期待
            </motion.p>
            <motion.div
              className="mt-5 flex flex-wrap gap-2"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4, ease: REVEAL_EASE }}
            >
              {expert.specialties.map((s) => (
                <span
                  key={s}
                  className="rounded-sm bg-card px-3 py-1.5 text-overline font-sans text-text-secondary"
                >
                  {s}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* 知識庫籌備中（替換授權透明度區塊） */}
      <section className="mx-auto max-w-[720px] px-6">
        <Reveal y={16} duration={0.4}>
          <div className="rounded-md bg-card p-8">
            <p className="flex items-center gap-2 text-overline font-sans uppercase text-text-muted">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              知識庫籌備中 In Preparation
            </p>
            <p className="mt-4 text-body-sm text-text-secondary">
              {expert.pendingNote}
            </p>
          </div>
        </Reveal>
      </section>

      {/* 上線通知捕獲（替換 AI 分身入口 Band） */}
      <section className="mt-24 border-y bg-surface max-md:mt-16">
        <div className="mx-auto max-w-container px-6 py-16 text-center">
          <Reveal>
            <h2 className="font-display text-h3 text-text-primary">
              {expertFirstName(expert)} 的 AI 分身上線通知
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mx-auto mt-4 max-w-[520px] text-body-sm text-text-secondary">
              完成認證與授權審核後，第一時間通知你。
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mx-auto mt-8 max-w-[440px]">
              {subscribed ? (
                <p className="flex items-center justify-center gap-2 text-label text-success">
                  <Check className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  已登記，上線即通知你
                </p>
              ) : (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSubscribed(true);
                  }}
                >
                  <label htmlFor={`pending-notify-${expert.slug}`} className="sr-only">
                    上線通知 email
                  </label>
                  <input
                    id={`pending-notify-${expert.slug}`}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="你的 email"
                    className="h-12 min-w-0 flex-1 rounded-md border border-border-strong bg-bg px-3 text-label text-text-primary placeholder:text-text-muted"
                  />
                  <button
                    type="submit"
                    className="h-12 shrink-0 rounded-md bg-ink-solid px-6 text-label text-white transition-colors duration-120 hover:bg-ink-hover active:scale-[0.98]"
                  >
                    通知我
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

/* ================= Page ================= */

export default function ExpertProfile() {
  const { slug } = useParams<{ slug: string }>();
  const expert = experts.find((e) => e.slug === slug);

  if (!expert) {
    return (
      <section className="mx-auto max-w-container px-6 py-24 text-center">
        <p className="text-overline font-sans uppercase text-ink">Expert Profile</p>
        <h1 className="mt-4 font-display text-display text-text-primary">
          找不到這位導師
        </h1>
        <p className="mx-auto mt-6 max-w-[480px] text-body-lg text-text-secondary">
          此導師檔案不存在或已移除。
        </p>
        <Link
          to="/experts"
          className="mt-8 inline-flex h-11 items-center rounded-md bg-ink-solid px-6 text-label text-white transition-colors duration-120 hover:bg-ink-hover active:scale-[0.98]"
        >
          返回導師總覽
        </Link>
      </section>
    );
  }

  return (
    <div
      style={
        {
          /* 專家專屬色（design.md §2.5）— 頁面級 CSS var，僅本頁三處使用 */
          "--expert-accent": expert.brandColor ?? "transparent",
        } as CSSProperties
      }
    >
      {expert.verified ? (
        <VerifiedProfile expert={expert} />
      ) : (
        <PendingProfile expert={expert} />
      )}
    </div>
  );
}
