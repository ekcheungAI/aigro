import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  AtSign,
  CalendarClock,
  Check,
  Globe,
  Instagram,
  Linkedin,
  MessageCircle,
  Send,
  Twitter,
  Youtube,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import MonogramAvatar, { PhotoAvatar } from "@/components/MonogramAvatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import PresenceDot from "@/components/ask/PresenceDot";
import PlatformDp from "@/components/ask/PlatformDp";
import Toast, { useToast } from "@/components/auth/Toast";
import { aihotAllInsights } from "@/data/aihot";
import { useLiveItems } from "@/data/liveItems";
import { expertHasPhoto } from "@/data/experts";
import type { Expert } from "@/data/experts";
import type { Persona } from "@/data/personas";
import { personaInitials } from "@/data/personas";
import {
  DEFAULT_NOTIFICATIONS,
  loadMember,
  saveMember,
  validEmail,
} from "@/components/auth/member";
import type { AigroMember } from "@/components/auth/member";
import { captureWaitlist } from "@/lib/waitlist";
import ClubBookingCapture from "@/components/ask/ClubBookingCapture";
import { lastUserQuestion } from "@/components/ask/sessions";

/**
 * 「關於此分身」卡 — v1.21 premium speaker card。
 * 專家版:16:9 key visual + DP 疊角 + signature quote + credential chips +
 * socials + CRM CTA stack(問問題 / 完整檔案 / 匿名 email capture / Club 預約)。
 * 平台版:精簡 variant(知識庫 counts + 瀏覽情報庫 CTA)。
 * 兩版都保留授權 transparency line;brand = lime hairlines,no gradients。
 */

/** 專家 key visual:Elvin 用真實橫幅相片,Jimmy 用 salon 氛圍圖 */
function keyVisualFor(expert: Expert): string {
  return expert.slug === "elvin-cheung"
    ? "/experts/elvin-cheung-wide.jpg"
    : "/editorial/club.jpg";
}

/** social label → lucide icon(Threads 無官方 icon,用 AtSign;個人網站用 Globe) */
function socialIcon(label: string): LucideIcon {
  const l = label.toLowerCase();
  if (l.includes("youtube")) return Youtube;
  if (l.includes("instagram") || l === "ig") return Instagram;
  if (l.includes("linkedin")) return Linkedin;
  if (l === "x" || l.includes("twitter")) return Twitter;
  if (l.includes("threads")) return AtSign;
  return Globe;
}

/** 由 email 建立免費會員(同 Login.tsx 示範模式一致;已有紀錄 → 保留) */
function registerFreeMember(email: string): AigroMember {
  const clean = email.trim();
  const existing = loadMember();
  if (existing && existing.email === clean) return existing;
  const member: AigroMember = {
    name: clean.split("@")[0] || "會員",
    email: clean,
    interests: [],
    persona: null,
    role: "free",
    tier: "free",
    joinedAt: Date.now(),
    notifications: { ...DEFAULT_NOTIFICATIONS },
  };
  saveMember(member);
  return member;
}

/* ---------------- 匿名 capture strip / 已登入確認 ---------------- */

function CaptureStrip({
  persona,
  onToast,
}: {
  persona: Persona;
  onToast: (msg: string) => void;
}) {
  const [member, setMember] = useState<AigroMember | null>(() => loadMember());
  const [email, setEmail] = useState("");
  const [justRegistered, setJustRegistered] = useState(false);

  // 已登入:quiet confirmation — 對話計入專家線索
  if (member && !justRegistered) {
    return (
      <p className="flex items-center gap-1.5 rounded-sm border bg-surface px-3 py-2 text-caption text-text-muted">
        <Check
          className="h-3.5 w-3.5 shrink-0 text-lime-text"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        已登入 — 你嘅對話會計入專家線索
      </p>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!validEmail(email)) {
      onToast("請輸入有效 email,先可以幫你登記。");
      return;
    }
    setMember(registerFreeMember(email));
    // 真實收集:寫入 Supabase waitlist(無 env / 離線 → 靜默)
    // G6:vertical = 分身 key,note = 最後一條用戶問題節錄 — 專家跟進有上下文
    const question = lastUserQuestion(persona.key);
    void captureWaitlist({
      email: email.trim(),
      kind: "newsletter",
      source: "about-persona-capture",
      vertical: persona.key,
      note: question ? `對話 capture — 最近問題:「${question}」` : "對話 capture",
    });
    setJustRegistered(true);
    onToast("登記成功 — 專家而家可以跟進你嘅對話。");
  };

  // 匿名(或啱啱登記):capture strip
  return (
    <div className="rounded-sm border bg-surface px-3 py-2.5">
      {justRegistered ? (
        <p className="flex items-center gap-1.5 text-caption text-lime-text">
          <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
          已登記 · 專家會見到你嘅足跡
        </p>
      ) : (
        <>
          <p className="text-caption font-medium text-text-primary">
            想{persona.shortName}睇到你嘅問題?
          </p>
          <p className="mt-0.5 text-caption text-text-muted">
            免費登記,專家可以跟進你嘅對話
          </p>
          <form onSubmit={submit} className="mt-2 flex gap-1.5">
            <label htmlFor="about-capture-email" className="sr-only">
              Email
            </label>
            <input
              id="about-capture-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-8 min-w-0 flex-1 rounded-sm border border-border-strong bg-bg px-2 text-caption text-text-primary transition-[border-color,box-shadow] duration-150 placeholder:text-text-muted focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink-soft"
            />
            <button
              type="submit"
              aria-label="免費登記"
              className="press inline-flex h-8 shrink-0 items-center gap-1 rounded-sm bg-ink-solid px-2.5 text-caption text-white hover:bg-ink-hover"
            >
              <Send className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
              登記
            </button>
          </form>
        </>
      )}
    </div>
  );
}

/* ---------------- 專家版 premium speaker card ---------------- */

function ExpertAboutCard({ persona }: { persona: Persona }) {
  const expert = persona.expert;
  const { toast, showToast } = useToast();
  // G5:Club 優先預約 — 點擊展開 inline email capture(唔再係空 toast)
  const [clubOpen, setClubOpen] = useState(false);
  if (!expert) return null;

  const hasPhoto = expertHasPhoto(expert);
  const quote = expert.quote ?? persona.signature;
  const credentials = (expert.metrics ?? []).slice(0, 3);
  const socials = expert.socials ?? [];

  /** Primary CTA:聚焦 ask 輸入框(Ask.tsx 嘅 chat textarea) */
  const focusChatInput = () => {
    const textarea = document.querySelector<HTMLTextAreaElement>(
      "main textarea, form textarea, textarea"
    );
    textarea?.focus();
    textarea?.scrollIntoView({ block: "nearest" });
  };

  return (
    <div className="mt-3 overflow-hidden rounded-md border bg-bg">
      {/* Key visual — 16:9 band,saturate-[0.85] + solid band-bg/40 overlay */}
      <div className="relative aspect-video">
        <img
          src={keyVisualFor(expert)}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover saturate-[0.85]"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-band-bg/40" />
        {/* DP 疊喺 band 底左,56px,lime verified ring + VerifiedBadge */}
        <div className="absolute bottom-0 left-4 translate-y-1/2">
          <span
            className="relative inline-flex rounded-full"
            style={{ boxShadow: "0 0 0 2px hsl(var(--bg))" }}
          >
            {hasPhoto ? (
              <PhotoAvatar src={expert.image} alt={persona.name} size={56} verified />
            ) : (
              <MonogramAvatar
                initials={personaInitials(persona)}
                color={persona.accent}
                size={56}
                verified
              />
            )}
            <VerifiedBadge size={16} className="absolute -bottom-0.5 -right-0.5" />
          </span>
        </div>
      </div>

      <div className="px-4 pb-4 pt-9">
        {/* Name + role + presence */}
        <p className="truncate text-label text-text-primary">{persona.name}</p>
        <p className="mt-0.5 line-clamp-2 text-caption text-text-muted">
          {expert.title}
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-caption text-text-secondary">
          <PresenceDot size={8} />
          AI 分身 · 隨時可問
        </p>

        {/* Signature quote — serif,expert accent left border */}
        {quote && (
          <blockquote
            className="mt-3 border-l-2 pl-3"
            style={{ borderColor: persona.accent }}
          >
            <p className="font-display text-body-sm leading-relaxed text-text-primary">
              {quote}
            </p>
          </blockquote>
        )}

        {/* Credential chips(top 3,mono) */}
        {credentials.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {credentials.map((m) => (
              <span
                key={`${m.value}-${m.label}`}
                className="inline-flex items-baseline gap-1.5 rounded-sm border bg-surface px-2 py-1"
              >
                <span className="font-mono text-caption text-text-primary">
                  {m.value}
                </span>
                <span className="text-caption text-text-muted">{m.label}</span>
              </span>
            ))}
          </div>
        )}

        {/* Socials row — 真實 external links,icon + label chips */}
        {socials.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {socials.map((s) => {
              const Icon = socialIcon(s.label);
              return (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-sm border bg-bg px-2 py-1 text-caption text-text-muted transition-colors duration-150 hover:border-border-strong hover:text-ink"
                >
                  <Icon className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                  {s.label}
                </a>
              );
            })}
          </div>
        )}

        {/* CTA stack — CRM loop drivers */}
        <div className="mt-4 flex flex-col gap-2">
          {/* 1. Primary:問佢一條問題 → focus chat input(lime solid) */}
          <button
            type="button"
            onClick={focusChatInput}
            className="press inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-lime px-4 text-label text-on-accent hover:bg-lime-hover"
          >
            <MessageCircle className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            問佢一條問題
          </button>
          {/* 2. 查看完整檔案(outline)→ /experts/:slug */}
          <Link
            to={`/experts/${expert.slug}`}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border bg-bg px-4 text-label text-ink transition-colors duration-150 hover:border-border-strong"
          >
            查看完整檔案
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          </Link>
          {/* 3. 匿名 → email capture strip;已登入 → 線索確認 */}
          <CaptureStrip persona={persona} onToast={showToast} />
          {/* 4. Club 優先預約 — 展開 inline email capture(G5,唔再係空 toast) */}
          {clubOpen ? (
            <ClubBookingCapture
              persona={persona}
              idPrefix={`club-${persona.key}`}
              onSubmitted={() => showToast("已記低 — Club 預約開放即通知你。")}
            />
          ) : (
            <button
              type="button"
              aria-expanded={clubOpen}
              onClick={() => setClubOpen(true)}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-caption text-text-muted transition-colors duration-150 hover:text-ink"
            >
              <CalendarClock className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              Club 優先預約 — 即將開放
            </button>
          )}
        </div>

        {/* 授權 transparency line(keep) */}
        <p className="mt-4 border-t border-border pt-3 text-caption text-text-muted">
          {persona.aboutTransparency}
        </p>
      </div>
      <Toast message={toast} />
    </div>
  );
}

/* ---------------- 平台版(精簡) ---------------- */

function PlatformAboutCard({ persona }: { persona: Persona }) {
  // 知識庫 counts — 真實情報庫數據(live 優先,未成熟回落 snapshot)
  const liveItems = useLiveItems();
  const itemPool = liveItems ?? aihotAllInsights;
  const sourceCount = new Set(itemPool.map((i) => i.source).filter(Boolean))
    .size;
  return (
    <div className="mt-3 rounded-md border bg-bg p-4">
      <div className="flex items-center gap-2.5">
        <PlatformDp size={32} />
        <div className="min-w-0">
          <p className="truncate text-label text-text-primary">{persona.name}</p>
          <p className="truncate text-caption text-text-muted">
            {persona.domainCaption}
          </p>
        </div>
      </div>
      <p className="mt-3 line-clamp-3 text-body-sm text-text-secondary">
        {persona.aboutBio}
      </p>
      {/* 知識庫 counts(mono chips) */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="inline-flex items-baseline gap-1.5 rounded-sm border bg-surface px-2 py-1">
          <span className="font-mono text-caption text-text-primary">
            {itemPool.length}
          </span>
          <span className="text-caption text-text-muted">則情報</span>
        </span>
        <span className="inline-flex items-baseline gap-1.5 rounded-sm border bg-surface px-2 py-1">
          <span className="font-mono text-caption text-text-primary">
            {sourceCount}
          </span>
          <span className="text-caption text-text-muted">個來源</span>
        </span>
      </div>
      {/* 瀏覽情報庫 CTA */}
      <Link
        to={persona.aboutLinkHref}
        className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-md border bg-bg px-3 text-label text-ink transition-colors duration-150 hover:border-border-strong"
      >
        {persona.aboutLinkLabel}
        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
      </Link>
      <p className="mt-3 border-t border-border pt-3 text-caption text-text-muted">
        {persona.aboutTransparency}
      </p>
    </div>
  );
}

export default function AboutPersonaCard({ persona }: { persona: Persona }) {
  return persona.kind === "expert" ? (
    <ExpertAboutCard persona={persona} />
  ) : (
    <PlatformAboutCard persona={persona} />
  );
}
