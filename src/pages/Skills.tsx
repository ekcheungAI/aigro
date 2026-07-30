import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Layers,
  Radar,
  Search,
  ShieldCheck,
  Swords,
} from "lucide-react";
import Reveal from "@/components/Reveal";
import { cn } from "@/lib/utils";
import { SKILL_TAGS, skills } from "@/data/skills";
import type { SkillEntry, SkillStatus, SkillTag } from "@/data/skills";

type TagFilter = SkillTag | "全部";
const TAG_FILTERS: TagFilter[] = ["全部", ...SKILL_TAGS];

const VALUE_PROPS = [
  {
    icon: Layers,
    title: "一次安裝,全平台通用",
    body: "Skills 係開放格式 — Claude Code、Cursor、任何支援嘅 agent 一裝即用,唔使每個工具重新教一次。",
  },
  {
    icon: ShieldCheck,
    title: "開源可審",
    body: "每個 skill 都係公開 repo,你可以逐行睇佢教咗 agent 啲乜 — 冇黑盒,冇隱藏指令。",
  },
  {
    icon: Swords,
    title: "由實戰者寫",
    body: "我哋 curate 嘅 skill 全部出自每日真係用 agent 做嘢嘅人 — 係實戰筆記,唔係理論文件。",
  },
];

/* ================= 小組件 ================= */

function statusChipClass(status: SkillStatus) {
  if (status === "自家") return "bg-ink-solid text-on-accent";
  if (status === "優先名單") return "bg-lime-soft text-lime-text";
  return "border border-border-strong text-text-muted";
}

function StatusChip({ status }: { status: SkillStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2.5 py-1 text-overline font-sans uppercase",
        statusChipClass(status)
      )}
    >
      {status}
    </span>
  );
}

function TagChips({ tags }: { tags: SkillTag[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center rounded-sm bg-ink-soft px-2.5 py-1 text-overline font-sans uppercase text-ink"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

/* Copy snippet(mono block + copy button) */
function InstallSnippet({ cmd }: { cmd: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard 被拒時靜默失敗 */
    }
  };

  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2.5">
      <code className="min-w-0 truncate font-mono text-[12px] leading-6 text-text-secondary">
        {cmd}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? `已複製 ${cmd}` : `複製安裝指令 ${cmd}`}
        className="press inline-flex h-7 shrink-0 items-center gap-1.5 rounded-sm border border-border-strong px-2 text-caption text-ink hover:border-ink"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            已複製
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            複製
          </>
        )}
      </button>
    </div>
  );
}

function SkillCard({ s }: { s: SkillEntry }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={s.status} />
        <TagChips tags={s.tags} />
      </div>
      <h3 className="mt-3 font-display text-h3 text-text-primary">{s.name}</h3>
      <p className="mt-2 text-body-sm text-text-secondary">{s.value}</p>
      <p className="mt-2 text-caption text-text-muted">幾時用:{s.detail}</p>
      <div className="mt-auto">
        {/* 安裝指令只對有真 repo url 嘅 skill 顯示;優先名單(waitlist)未發佈,唔顯示 */}
        {s.url ? <InstallSnippet cmd={s.install} /> : null}
        {s.waitlist ? (
          <Link
            to="/developers"
            className="group mt-3 inline-flex items-center gap-1.5 text-label text-ink link-underline"
          >
            加入優先名單
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          </Link>
        ) : (
          <a
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="group mt-3 inline-flex items-center gap-1.5 text-label text-ink link-underline"
          >
            睇來源
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}

/* ================= Page ================= */

export default function Skills() {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<TagFilter>("全部");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills.filter((s) => {
      if (tag !== "全部" && !s.tags.includes(tag)) return false;
      if (!q) return true;
      const haystack = [s.name, s.value, s.detail, ...s.tags]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, tag]);

  return (
    <>
      {/* Header — 目錄頁首 dark band:skills-band 幾何方塊背景層
          (opacity-45 + 實色 band overlay,同 insights-hero 做法;深淺色主題皆為 dark band) */}
      <section className="relative isolate overflow-hidden border-b border-band-border bg-band-bg">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 select-none"
        >
          <img
            src="/editorial/skills-band.png"
            alt=""
            loading="lazy"
            className="h-full w-full object-cover opacity-45"
          />
          <span className="absolute inset-0 bg-band-bg/60" />
        </div>
        <div className="mx-auto max-w-container px-6 pb-10 pt-24 max-md:pt-16">
          <Reveal>
            <p className="flex items-center gap-3 text-overline font-sans uppercase text-band-text-muted">
              <span
                className="inline-block h-px w-6 bg-band-border-strong"
                aria-hidden="true"
              />
              AIGRO Directory
            </p>
            <h1 className="mt-3 max-w-[760px] font-display text-display text-band-text">
              Skills 技能庫
            </h1>
            <p className="mt-6 max-w-[680px] text-body-lg text-band-text-secondary">
              俾你嘅 AI agent 裝上專業能力 — 由 AIGRO 策劃嘅開源技能目錄。
            </p>
          </Reveal>
        </div>
      </section>

      {/* Directory toolbar — search + tag chips + count */}
      <section className="mx-auto max-w-container px-6 pb-8">
        <Reveal>
          <div className="flex flex-wrap items-center gap-3 border-y py-4">
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜尋技能名稱、描述、標籤…"
                aria-label="搜尋技能"
                className="h-10 w-full rounded-md border border-border-strong bg-surface pl-9 pr-3 text-body-sm text-text-primary placeholder:text-text-muted focus:border-ink focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="按標籤篩選">
              {TAG_FILTERS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  aria-pressed={tag === t}
                  className={cn(
                    "press inline-flex h-9 items-center rounded-md px-3.5 text-label transition-colors",
                    tag === t
                      ? "bg-ink-solid text-on-accent"
                      : "border border-border-strong text-text-secondary hover:border-ink hover:text-ink"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="ml-auto font-mono text-[12px] uppercase tracking-wider text-text-muted">
              {filtered.length} 個技能
            </p>
          </div>
        </Reveal>
      </section>

      {/* Directory grid — 2-3 col hairline grid */}
      <section className="mx-auto max-w-container px-6 pb-24 max-md:pb-16">
        {filtered.length > 0 ? (
          <div className="grid gap-px border-y bg-border md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s, i) => (
              <Reveal key={s.id} delay={(i % 3) * 0.08} className="bg-bg p-6">
                <SkillCard s={s} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="border-y py-16 text-center">
            <p className="font-mono text-[12px] uppercase tracking-wider text-text-muted">
              0 個技能
            </p>
            <p className="mt-3 text-body text-text-secondary">
              搵唔到相關技能 — 試下其他關鍵字,或者清除篩選。
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setTag("全部");
              }}
              className="press mt-5 inline-flex h-10 items-center rounded-md border border-border-strong px-5 text-label text-ink hover:border-ink"
            >
              清除篩選
            </button>
          </div>
        )}
      </section>

      {/* 點解 Skills 重要 — 3 value props hairline grid */}
      <section className="mx-auto max-w-container px-6 pb-24 max-md:pb-16">
        <Reveal>
          <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
            <span
              className="inline-block h-px w-6 bg-border-strong"
              aria-hidden="true"
            />
            點解重要
          </p>
          <h2 className="mt-3 font-display text-h2 text-text-primary">
            點解 Skills 重要
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-px border-y bg-border md:grid-cols-3">
          {VALUE_PROPS.map((v, i) => (
            <Reveal key={v.title} delay={i * 0.08} className="bg-bg p-8">
              <v.icon
                className="h-5 w-5 text-ink"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <h3 className="mt-4 font-display text-h3 text-text-primary">
                {v.title}
              </h3>
              <p className="mt-3 text-body-sm text-text-secondary">{v.body}</p>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.16}>
          <p className="mt-6 flex items-center gap-2 text-caption text-text-muted">
            <Radar className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <span>
              想推薦 skill 俾 Club?去
              <Link to="/ask" className="mx-1 text-ink link-underline">
                Ask 問答
              </Link>
              話我哋知,編輯團隊試用後會更新目錄。
            </span>
          </p>
        </Reveal>
      </section>
    </>
  );
}
