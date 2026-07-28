import { motion } from "framer-motion";
import {
  ArrowUpRight,
  AtSign,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Send,
  Twitter,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import Reveal, { REVEAL_EASE } from "@/components/Reveal";
import type { ExpertProfileSocial } from "@/lib/expertProfiles";

/** 由 label + url 推斷平台 icon(lucide);唔識別 → Globe */
function platformIcon(label: string, url: string): LucideIcon {
  const s = `${label} ${url}`.toLowerCase();
  if (s.includes("youtube") || s.includes("youtu.be")) return Youtube;
  if (s.includes("instagram")) return Instagram;
  if (s.includes("linkedin")) return Linkedin;
  if (s.includes("threads")) return AtSign;
  if (s.includes("twitter") || s.includes("x.com") || label.trim().toLowerCase() === "x")
    return Twitter;
  if (s.includes("facebook")) return Facebook;
  if (s.includes("t.me") || s.includes("telegram")) return Send;
  return Globe;
}

/** 顯示用 hostname(去 www.);URL 唔合法 → 原字串 */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

interface ExpertSocialWallProps {
  /** expert_profiles.socials 優先;空 → consumer 傳 experts.ts 靜態真實連結 */
  socials: ExpertProfileSocial[];
  firstName: string;
}

/**
 * Social IP 牆 — 每個真實 social account 一張卡:
 * 平台 icon(lucide)+ label + hostname + 外鏈。
 * 只渲染真實 URL(lib 層已過濾非 http(s));空陣列 → 成區唔 render(consumer 把關)。
 */
export default function ExpertSocialWall({
  socials,
  firstName,
}: ExpertSocialWallProps) {
  if (socials.length === 0) return null;

  return (
    <section className="mx-auto max-w-container px-6 pt-24 max-md:pt-16">
      <Reveal>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="text-overline font-sans uppercase text-ink">Social IP</p>
          <h2 className="font-display text-h3 text-text-primary">
            追蹤 {firstName} 嘅全平台陣地
          </h2>
        </div>
      </Reveal>
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {socials.map((s, i) => {
          const Icon = platformIcon(s.label, s.url);
          return (
            <motion.a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card-hover group relative rounded-md border bg-surface p-5"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35, delay: i * 0.05, ease: REVEAL_EASE }}
            >
              <ArrowUpRight
                className="absolute right-4 top-4 h-4 w-4 text-text-muted transition-colors duration-150 group-hover:text-ink"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ink-soft text-ink">
                <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              </span>
              <span className="mt-4 block text-label text-text-primary">
                {s.label}
              </span>
              <span className="mt-1 block truncate font-mono text-caption text-text-muted">
                {hostOf(s.url)}
              </span>
            </motion.a>
          );
        })}
      </div>
    </section>
  );
}
