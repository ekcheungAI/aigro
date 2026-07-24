import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Code, Compass, ExternalLink } from "lucide-react";
import Reveal, { REVEAL_EASE } from "@/components/Reveal";
import MonogramAvatar, { PhotoAvatar } from "@/components/MonogramAvatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import {
  expertFullName,
  expertHasPhoto,
  pendingExperts,
  verifiedExperts,
  type Expert,
} from "@/data/experts";
import { demoPersonas, type DemoPersona } from "@/data/demoPersonas";

/** 領航專家 monogram 字母(data 無此欄位,由 slug 映射) */
const EXPERT_INITIALS: Record<string, string> = {
  "jimmy-lau": "JL",
  "elvin-cheung": "EC",
};

/* ================= Local toast(頁面級原型提示) ================= */

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

/* ================= Section 1 — Page Header(Club framing) ================= */

function PageHeader() {
  return (
    /* Cinematic dark band — editorial image layer (opacity-45 saturate-[0.85])
       + solid band overlay (no gradients), band text tokens, both themes */
    <section className="relative isolate overflow-hidden border-b border-band-border bg-band-bg">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 select-none"
      >
        <img
          src="/editorial/club.jpg"
          alt=""
          className="h-full w-full object-cover opacity-45 saturate-[0.85]"
        />
        <span className="absolute inset-0 bg-band-bg/60" />
      </div>
      <div className="mx-auto flex min-h-[320px] max-w-container flex-col items-center justify-center px-6 py-16 text-center max-md:min-h-[280px] max-md:py-12">
        <motion.p
          className="flex items-center justify-center gap-3 text-overline font-sans uppercase text-band-text-muted"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: REVEAL_EASE }}
        >
          <span className="inline-block h-px w-6 bg-band-border-strong" aria-hidden="true" />
          Leading Experts
          <span className="inline-block h-px w-6 bg-band-border-strong" aria-hidden="true" />
        </motion.p>
        <motion.h1
          className="mt-4 font-display text-display text-band-text"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: REVEAL_EASE }}
        >
          領航專家 Leading Experts
        </motion.h1>
        <motion.p
          className="mx-auto mt-6 max-w-[640px] text-body-lg text-band-text-secondary"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2, ease: REVEAL_EASE }}
        >
          AIGRO 係一個 growth hacking club — 兩位認證領航專家嘅 AI
          分身基於授權內容蒸餾,隨時等你問,等會員跟住 playbook 做實驗。
        </motion.p>
        <motion.p
          className="mt-5 text-caption text-band-text-muted"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.28, ease: REVEAL_EASE }}
        >
          Club 會員制即將開放 —{" "}
          <Link
            to="/pricing"
            className="text-band-ink underline-offset-2 transition-colors duration-150 hover:underline"
          >
            了解會員方案
          </Link>
        </motion.p>
      </div>
    </section>
  );
}

/* ================= Section 2 — 領航專家大卡 ================= */

function VerifiedExpertCard({
  expert,
  index,
  showVerifiedCaption,
}: {
  expert: Expert;
  index: number;
  showVerifiedCaption: boolean;
}) {
  return (
    <motion.article
      className="group card-hover rounded-md border bg-surface p-10 shadow-card dark:shadow-none max-md:p-8"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: index * 0.12, ease: REVEAL_EASE }}
    >
      <div className="flex gap-8 max-md:flex-col max-md:gap-6">
        {/* 96px 頭像(真實肖像或 monogram):1.5px 金環 + Badge 24px 右上角 */}
        <div className="relative shrink-0">
          {expertHasPhoto(expert) ? (
            <PhotoAvatar
              src={expert.image}
              alt={expertFullName(expert)}
              size={96}
              verified
            />
          ) : (
            <MonogramAvatar
              initials={EXPERT_INITIALS[expert.slug] ?? "·"}
              color={expert.brandColor ?? "#466A5E"}
              size={96}
              verified
            />
          )}
          <VerifiedBadge
            size={24}
            ambient
            sheenDelaySec={index * 0.2}
            className="absolute -right-0.5 -top-0.5"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-display text-h3 text-text-primary">
              {expertFullName(expert)}
            </h2>
            {/* 「領航專家認證 Leading Expert」— 首次出現頁面級一次即可 */}
            {showVerifiedCaption && (
              <span className="text-caption text-gold">
                領航專家認證 Leading Expert
              </span>
            )}
          </div>
          <p className="mt-1 text-overline font-sans text-text-muted">
            {expert.title}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {expert.specialties.map((s) => (
              <span
                key={s}
                className="rounded-sm bg-ink-soft px-3 py-1.5 text-overline font-sans text-ink"
              >
                {s}
              </span>
            ))}
          </div>

          <p className="mt-4 line-clamp-2 text-body-sm text-text-secondary">
            「{expert.quote}」
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
            <p className="font-mono text-caption text-text-muted">
              {expert.achievements}
            </p>
            <Link
              to={`/experts/${expert.slug}`}
              className="group/btn ml-auto inline-flex h-11 items-center gap-1.5 rounded-md bg-ink-solid px-6 text-label text-white press hover:bg-ink-hover"
            >
              查看領航檔案
              <ArrowRight
                className="h-4 w-4 transition-transform duration-150 group-hover/btn:translate-x-1"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

/* ================= Section 3 — 敬請期待(通用領航席,無虛構人名/相片) ================= */

function PendingExpertCard({ expert, index }: { expert: Expert; index: number }) {
  const [formOpen, setFormOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  return (
    <motion.article
      className="rounded-md border border-dashed border-border-strong bg-surface p-8"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay: index * 0.1, ease: REVEAL_EASE }}
    >
      {/* 待用內容 60% 不透明度,唯 CTA 正常 */}
      <div className="opacity-60">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-dashed border-border-strong">
          <Compass
            className="h-6 w-6 text-text-muted"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>
        <h3 className="mt-4 text-h4 font-sans text-text-primary">
          {expert.nameZh}
        </h3>
        <p className="mt-1 text-caption text-text-muted">{expert.title}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {expert.specialties.map((s) => (
            <span
              key={s}
              className="rounded-sm bg-card px-3 py-1.5 text-overline font-sans text-text-secondary"
            >
              {s}
            </span>
          ))}
        </div>
        <p className="mt-4 text-caption uppercase tracking-[0.12em] text-text-muted">
          敬請期待 Coming Soon
        </p>
      </div>

      {/* CTA — 上線通知捕獲 */}
      <div className="mt-6">
        {subscribed ? (
          <p className="flex items-center gap-2 text-label text-success">
            <Check className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            已登記,上線即通知你
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setFormOpen((v) => !v)}
              aria-expanded={formOpen}
              className="inline-flex h-11 items-center rounded-md border border-border-strong px-6 text-label text-ink press hover:bg-ink-soft"
            >
              上線通知我
            </button>
            <AnimatePresence initial={false}>
              {formOpen && (
                <motion.div
                  className="overflow-hidden"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: REVEAL_EASE }}
                >
                  <form
                    className="mt-4 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSubscribed(true);
                    }}
                  >
                    <label htmlFor={`notify-${expert.slug}`} className="sr-only">
                      上線通知 email
                    </label>
                    <input
                      id={`notify-${expert.slug}`}
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="你的 email"
                      className="h-11 min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-3 text-caption text-text-primary placeholder:text-text-muted"
                    />
                    <button
                      type="submit"
                      className="h-11 shrink-0 rounded-md bg-ink-solid px-4 text-label text-white press hover:bg-ink-hover"
                    >
                      通知我
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.article>
  );
}

/* ================= Section 3.5 — 示範分身 Perskill Demo(DEMO,唔係領航專家) ================= */

/**
 * Perskill 歷史人物示範分身 — muted treatment:
 * 冇金、冇 VerifiedBadge、冇 brand color,hover 只加深 border(唔抬升),
 * 視覺層級明確低過兩位真領航專家。
 */
function DemoPersonaCard({
  persona,
  index,
}: {
  persona: DemoPersona;
  index: number;
}) {
  return (
    <motion.article
      className="rounded-md border bg-surface p-6 transition-colors duration-150 hover:border-border-strong"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: REVEAL_EASE }}
    >
      <div className="flex items-center gap-4">
        <MonogramAvatar initials={persona.initials} size={48} muted />
        <div className="min-w-0">
          <h3 className="font-display text-h4 text-text-primary">
            {persona.nameEn}
          </h3>
          <p className="text-caption text-text-muted">{persona.nameZh}</p>
        </div>
      </div>
      <p className="mt-4 text-body-sm text-text-secondary">
        {persona.essence}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4">
        <a
          href={persona.perskillUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-caption text-ink transition-colors duration-150 hover:underline hover:underline-offset-2"
        >
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          Perskill 分身
        </a>
        <a
          href={persona.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-caption text-ink transition-colors duration-150 hover:underline hover:underline-offset-2"
        >
          <Code className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          GitHub Skill
        </a>
      </div>
    </motion.article>
  );
}

function DemoPersonasSection() {
  return (
    <section className="mx-auto max-w-container px-6 pt-24 max-md:pt-16">
      <Reveal>
        <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
          <span className="inline-block h-px w-6 bg-border-strong" aria-hidden="true" />
          Perskill Demo
        </p>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 className="mt-3 font-display text-h3 text-text-primary">
          示範分身 — 分身可以點玩?
        </h2>
      </Reveal>
      <Reveal delay={0.16}>
        <p className="mt-3 max-w-[640px] text-body-sm text-text-secondary">
          以下係 Perskill(ekcheungAI 嘅歷史人物分身庫)嘅示範 —
          同一套蒸餾方法,放喺歷史大師身上會係咁。AIGRO
          領航專家分身都係用呢個標準整。
        </p>
      </Reveal>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {demoPersonas.map((persona, i) => (
          <DemoPersonaCard key={persona.nameEn} persona={persona} index={i} />
        ))}
      </div>
      <Reveal delay={0.1}>
        <p className="mt-6 text-caption text-text-muted">
          示範分身由 Perskill 提供 · 想睇點整一個分身?睇 GitHub 嘅 skill 檔案。
        </p>
      </Reveal>
    </section>
  );
}

/* ================= Section 4 — 領航專家邀請制(本頁唯一金色區塊) ================= */

/** Badge Direction C — 細線金色月桂環繞 Badge A(僅此處,40px) */
function LaurelBadge() {
  // 月桂葉沿左右兩弧排列(下方開口),每側 7 葉
  const leaves: { cx: number; cy: number; rotate: number }[] = [];
  const R = 27;
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < 7; i++) {
      // 角度:左弧 215°→325°(由下往上),右弧鏡像
      const t = i / 6;
      const deg = side === 0 ? 215 + t * 110 : 325 - t * 110;
      const rad = (deg * Math.PI) / 180;
      leaves.push({
        cx: 32 + R * Math.cos(rad),
        cy: 32 + R * Math.sin(rad),
        rotate: deg + 90 + (side === 0 ? -18 : 18),
      });
    }
  }
  return (
    <span className="relative inline-flex h-16 w-16 items-center justify-center">
      <svg
        width={64}
        height={64}
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className="absolute inset-0"
      >
        {leaves.map((leaf, i) => (
          <ellipse
            key={i}
            cx={leaf.cx}
            cy={leaf.cy}
            rx={1.6}
            ry={4.2}
            transform={`rotate(${leaf.rotate} ${leaf.cx} ${leaf.cy})`}
            stroke="hsl(var(--gold))"
            strokeWidth={1}
          />
        ))}
      </svg>
      <VerifiedBadge size={40} />
    </span>
  );
}

function InviteSection({ onApply }: { onApply: () => void }) {
  return (
    <section className="mx-auto max-w-container px-6 py-24 max-md:py-16">
      <div className="rounded-md bg-gold-soft p-12 text-center max-md:p-8">
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: REVEAL_EASE }}
        >
          <LaurelBadge />
        </motion.div>
        <Reveal delay={0.08}>
          <p className="mt-6 text-overline font-sans uppercase text-gold">
            Invite-Only・邀請制
          </p>
        </Reveal>
        <Reveal delay={0.16}>
          <h2 className="mt-3 font-display text-h3 text-text-primary">
            領航專家邀請制
          </h2>
        </Reveal>
        <Reveal delay={0.24}>
          <p className="mx-auto mt-4 max-w-[520px] text-body-sm text-text-secondary">
            AIGRO 領航專家不設公開申請 — 由 Jimmy 與 Elvin
            親自邀請有可查證實績、願意授權知識庫嘅香港 AI ×
            增長實戰者,一齊帶住個 club 向前行。下一席,敬請期待。
          </p>
        </Reveal>
        <Reveal delay={0.32}>
          <button
            type="button"
            onClick={onApply}
            className="group mt-8 inline-flex h-11 items-center gap-1.5 rounded-md bg-ink-solid px-6 text-label text-white press hover:bg-ink-hover"
          >
            邀請制・暫不開放申請
            <ArrowRight
              className="h-4 w-4 transition-transform duration-150 nudge-x"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </button>
        </Reveal>
      </div>
    </section>
  );
}

/* ================= Page ================= */

export default function Experts() {
  const toast = useMiniToast();

  return (
    <div>
      <PageHeader />

      {/* Section 2 — 領航專家大卡 */}
      <section className="mx-auto max-w-container px-6 pt-16 max-md:pt-12">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {verifiedExperts.map((expert, i) => (
            <VerifiedExpertCard
              key={expert.slug}
              expert={expert}
              index={i}
              showVerifiedCaption={i === 0}
            />
          ))}
        </div>
      </section>

      {/* Section 3 — 敬請期待 */}
      <section className="mx-auto max-w-container px-6 pt-24 max-md:pt-16">
        <Reveal>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 className="font-display text-h3 text-text-primary">
              邀請中・敬請期待
            </h2>
            <p className="text-caption text-text-muted">
              下一席領航專家,由 Jimmy 與 Elvin 親自邀請
            </p>
          </div>
        </Reveal>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pendingExperts.map((expert, i) => (
            <PendingExpertCard key={expert.slug} expert={expert} index={i} />
          ))}
        </div>
      </section>

      {/* Section 3.5 — 示範分身 Perskill Demo */}
      <DemoPersonasSection />

      <InviteSection
        onApply={() =>
          toast.show("領航專家採邀請制,由 Jimmy 與 Elvin 親自邀請")
        }
      />

      <MiniToast msg={toast.msg} />
    </div>
  );
}
