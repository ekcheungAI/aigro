import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { ArrowRight, AudioLines, CalendarClock, Check, ExternalLink, ShieldCheck } from "lucide-react";
import Reveal, { REVEAL_EASE } from "@/components/Reveal";
import ExpertStyleSections from "@/components/expert/ExpertStyleSections";
import ExpertIpHero from "@/components/experts/ExpertIpHero";
import ExpertStatsBand from "@/components/experts/ExpertStatsBand";
import ExpertSocialWall from "@/components/experts/ExpertSocialWall";
import ExpertTopInsights from "@/components/experts/ExpertTopInsights";
import {
  expertFirstName,
  expertFullName,
  experts,
  type Expert,
} from "@/data/experts";
import {
  fetchExpertLiveStats,
  fetchExpertProfile,
  fetchExpertTopInsights,
  type ExpertInsight,
  type ExpertLiveStats,
  type ExpertProfileRow,
  type ExpertProfileSocial,
} from "@/lib/expertProfiles";
import usePageMeta from "@/hooks/usePageMeta";

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
          initial={{ opacity: 0, transform: "translateX(-50%) translateY(12px)" }}
          animate={{ opacity: 1, transform: "translateX(-50%) translateY(0px)" }}
          exit={{ opacity: 0, transform: "translateX(-50%) translateY(8px)" }}
          transition={{ duration: 0.2, ease: REVEAL_EASE }}
        >
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================= 成就佐證 chip（數字 count-up 600ms） ================= */

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
      {/* 媒體報道 chip 暫無公開連結 — 用 div 而非 dead anchor（href="#" 係
          broken control）；有真實 URL 時先恢復 <a> */}
      <div className="group rounded-md border bg-surface px-5 py-4">{inner}</div>
    </motion.div>
  );
}

/* ================= Verified 專家 — Expert IP 主頁 ================= */

function VerifiedProfile({ expert }: { expert: Expert }) {
  const toast = useMiniToast();
  const firstName = expertFirstName(expert);
  const viewpoints = expert.viewpoints ?? [];
  const shown = viewpoints.slice(0, 6);
  const remaining = viewpoints.length - shown.length;
  const askHref = `/ask?expert=${expert.slug}`;

  /* expert_profiles 表(v3 SQL)runtime 數據層:
     profile(headline/bio/stats/socials/featured_ids)+ 真實動態統計 + top 3 精選情報。
     全部真查 Supabase;失敗/空 → 回落 experts.ts 已核實靜態資料,唔虛構。 */
  const [profile, setProfile] = useState<ExpertProfileRow | null>(null);
  const [liveStats, setLiveStats] = useState<ExpertLiveStats | null>(null);
  const [topInsights, setTopInsights] = useState<ExpertInsight[] | null>(null);

  /* VerifiedProfile 以 key={expert.slug} 掛載(見頁尾),slug 轉換時整棵樹
     remount,state 天然重置 — effect 入面唔使同步 setState */
  useEffect(() => {
    let alive = true;
    void (async () => {
      const p = await fetchExpertProfile(expert.slug);
      if (!alive) return;
      setProfile(p);
      const [stats, insights] = await Promise.all([
        fetchExpertLiveStats(expert.slug),
        fetchExpertTopInsights(expert.slug, p?.featuredIds ?? []),
      ]);
      if (!alive) return;
      setLiveStats(stats);
      setTopInsights(insights);
    })();
    return () => {
      alive = false;
    };
  }, [expert.slug]);

  /* 合併數據:expert_profiles 優先,空 → experts.ts 靜態真實資料 */
  const headline = profile?.headline ?? expert.quote ?? null;
  const bio = profile?.bio ?? expert.bio ?? null;
  const socials: ExpertProfileSocial[] =
    profile && profile.socials.length > 0
      ? profile.socials
      : (expert.socials ?? []);

  return (
    <div>
      {/* Section 1 — Cinematic hero(dark band):姓名 / headline / bio / 分身 CTA */}
      <ExpertIpHero
        expert={expert}
        headline={headline}
        bio={bio}
        askHref={askHref}
      />

      {/* Section 2 — Key stats band(dark strip):自訂 stats + 真實動態統計 */}
      <ExpertStatsBand custom={profile?.stats ?? []} live={liveStats} />

      {/* Section 3 — 成就佐證 Strip(experts.ts 真實身份 chips) */}
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

      {/* Section 4 — Social IP 牆(expert_profiles.socials 驅動,fallback experts.ts) */}
      <ExpertSocialWall socials={socials} firstName={firstName} />

      {/* Section 5 — Top 3 精選情報(items 真查;零 published → 誠實空態) */}
      <ExpertTopInsights
        insights={topInsights}
        firstName={firstName}
        askHref={askHref}
      />

      {/* Sections B–E — 風格雷達 / 核心特質 / 工作風格 / 決策原則
          （保留現有 perskill-grade 深度檔案,僅 verified 專家有數據） */}
      <ExpertStyleSections expert={expert} />

      {/* Section 6 — 核心觀點 Grid(保留現有 10 觀點內容) */}
      <section className="mx-auto max-w-container px-6 pt-24 max-md:pt-16">
        <Reveal>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 className="font-display text-h3 text-text-primary">
              {viewpoints.length} 個核心觀點
            </h2>
            <p className="text-caption text-text-muted">蒸餾自公開分享與授權內容</p>
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
                    className="h-4 w-4 transition-transform duration-150 nudge-x"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </motion.div>
          )}
        </div>
      </section>

      {/* Section 7 — 授權透明度（強制置於對話入口之上） */}
      <section className="mx-auto max-w-[720px] px-6 pt-24 max-md:pt-16">
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

      {/* Section 8 — AI 分身入口 Band */}
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
            {/* Primary — 電光綠實心 + near-black 字(on-accent);專家色僅留
                hero monogram 面板一處 */}
            <Link
              to={askHref}
              className="inline-flex h-11 items-center gap-1.5 rounded-md bg-ink-solid px-6 text-label text-on-accent press hover:bg-ink-hover"
            >
              與 AI 分身對話
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </Link>
            {/* Ghost 鎖定態 — 語音對話 VIP */}
            <button
              type="button"
              aria-disabled="true"
              onClick={() =>
                toast.show("語音對話即將開放 — 開放時 Club 會員優先收到通知")
              }
              className="inline-flex h-11 items-center gap-2 rounded-md px-4 text-label text-ink opacity-60 transition-opacity duration-150 hover:opacity-80"
            >
              <AudioLines className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              語音對話
              <span className="text-caption text-gold">VIP</span>
            </button>
            {/* Ghost 鎖定態 — 真人預約隨 Club 會員制開放(Phase 4,唔承諾而家) */}
            <button
              type="button"
              aria-disabled="true"
              onClick={() =>
                toast.show("Club 優先預約即將開放 — 開放時 Club 會員優先收到通知")
              }
              className="inline-flex h-11 items-center gap-2 rounded-md px-4 text-label text-ink opacity-60 transition-opacity duration-150 hover:opacity-80"
            >
              <CalendarClock className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              Club 優先預約
              <span className="text-caption text-text-muted">即將開放</span>
            </button>
          </motion.div>
          <Reveal delay={0.2}>
            <p className="mt-6 text-caption text-text-muted">
              免費無限對話 · 限時開放
            </p>
          </Reveal>
        </div>
      </section>

      <MiniToast msg={toast.msg} />
    </div>
  );
}

/* ================= 待用態變體(pending 專家 — 維持現有「敬請期待」體驗) ================= */

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
            <img
              src="/editorial/optimized/pending-expert.jpg"
              alt={`${expertFullName(expert)} — 即將加盟領航專家剪影`}
              width={120}
              height={180}
              className="aspect-[2/3] w-[120px] rounded-md border-2 border-dashed border-border-strong object-cover"
            />
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
              {expertFullName(expert)}
            </motion.h1>
            <motion.p
              className="mt-3 text-caption text-text-muted"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: REVEAL_EASE }}
            >
              由 Jimmy 與 Elvin 親自邀請中・敬請期待
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
              領航認證進行中 In Preparation
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
              新領航專家上線通知
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mx-auto mt-4 max-w-[520px] text-body-sm text-text-secondary">
              完成領航認證與授權審核後，第一時間通知你。
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
                    className="h-12 shrink-0 rounded-md bg-ink-solid px-6 text-label text-on-accent press hover:bg-ink-hover"
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

  /* F9:per-expert OG — canonical + og:type profile;真實肖像先至做 og:image */
  usePageMeta(
    expert ? expertFullName(expert) : undefined,
    expert ? `${expert.title}${expert.quote ? ` — ${expert.quote}` : ""}` : undefined,
    {
      canonical: expert ? `/experts/${expert.slug}` : undefined,
      ogType: "profile",
      ogImage: expert?.image.startsWith("/") ? expert.image : undefined,
    }
  );

  if (!expert) {
    return (
      <section className="mx-auto max-w-container px-6 py-24 text-center">
        <p className="text-overline font-sans uppercase text-ink">Expert Profile</p>
        <h1 className="mt-4 font-display text-display text-text-primary">
          找不到這位領航專家
        </h1>
        <p className="mx-auto mt-6 max-w-[480px] text-body-lg text-text-secondary">
          此領航檔案不存在或已移除。
        </p>
        <Link
          to="/experts"
          className="mt-8 inline-flex h-11 items-center rounded-md bg-ink-solid px-6 text-label text-on-accent press hover:bg-ink-hover"
        >
          返回領航專家總覽
        </Link>
      </section>
    );
  }

  return (
    <div
      style={
        {
          /* 專家專屬色（design.md §2.5）— 頁面級 CSS var */
          "--expert-accent": expert.brandColor ?? "transparent",
        } as CSSProperties
      }
    >
      {expert.verified ? (
        <VerifiedProfile key={expert.slug} expert={expert} />
      ) : (
        <PendingProfile key={expert.slug} expert={expert} />
      )}
    </div>
  );
}
