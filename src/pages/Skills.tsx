import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Layers,
  Radar,
  ShieldCheck,
  Swords,
} from "lucide-react";
import Reveal from "@/components/Reveal";

/* ================= 資料 ================= */

type Tag = "情報" | "設計" | "分身";

interface SkillCard {
  name: string;
  value: string; // 一句價值
  detail: string; // 幾時用
  tags: Tag[];
  repo: string; // owner/repo
  url: string; // source link
  note?: string;
}

const CURATED: SkillCard[] = [
  {
    name: "Perskill Persona Skills",
    value: "俾你嘅 agent 裝上專業分身 — 唔同場景,唔同人設,輸出即刻啱 tone。",
    detail: "想要 agent 分飾唔同角色(marketer / 分析師 / 客服)而唔使自己重寫 system prompt 嗰陣用。",
    tags: ["分身"],
    repo: "ekcheungAI/perskill",
    url: "https://github.com/ekcheungAI/perskill",
  },
  {
    name: "Impeccable Design",
    value: "將高級設計判斷寫成 agent 讀得明嘅規則 — 由 layout 到細節都有準則。",
    detail: "叫 agent 整 UI / landing page,想佢好似資深 designer 咁諗,而唔係齋砌 Tailwind class。",
    tags: ["設計"],
    repo: "pbakaus/impeccable",
    url: "https://github.com/pbakaus/impeccable",
  },
  {
    name: "Taste Skill",
    value: "taste 都可以裝 — 令 agent 嘅審美決策有跡可尋,唔再靠運氣。",
    detail: "覺得 agent 出嚟嘅嘢「似樣但冇 taste」,想要一套可以複用嘅審美框架嗰陣用。",
    tags: ["設計"],
    repo: "Leonxlnx/taste-skill",
    url: "https://github.com/Leonxlnx/taste-skill",
  },
  {
    name: "Emil Kowalski Design Skills",
    value: "動效大師 Emil 嘅設計詞彙同判斷 — animation vocabulary、Apple 式 interaction。",
    detail: "想精準描述 motion 效果、做 interruptible gesture / spring 動畫嗰陣用。",
    tags: ["設計"],
    repo: "emilkowalski/skills",
    url: "https://github.com/emilkowalski/skills",
  },
];

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

/* ================= Copy snippet(mono block + copy button) ================= */

function InstallSnippet({ repo }: { repo: string }) {
  const [copied, setCopied] = useState(false);
  const cmd = `npx skills add ${repo}`;

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
    <div className="mt-5 flex items-center justify-between gap-3 rounded-md border bg-card px-4 py-3">
      <code className="min-w-0 truncate font-mono text-[12px] leading-6 text-text-secondary">
        {cmd}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? `已複製 ${cmd}` : `複製安裝指令 ${cmd}`}
        className="press inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-border-strong px-2.5 text-caption text-ink hover:border-ink"
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

function TagChips({ tags }: { tags: Tag[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center rounded-sm bg-ink-soft px-3 py-1.5 text-overline font-sans uppercase text-ink"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

/* ================= Page ================= */

export default function Skills() {
  return (
    <>
      {/* Header — 標準頁首 pattern */}
      <section className="mx-auto max-w-container px-6 pb-16 pt-24 max-md:pt-16">
        <Reveal>
          <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
            <span
              className="inline-block h-px w-6 bg-border-strong"
              aria-hidden="true"
            />
            AIGRO Skills
          </p>
          <h1 className="mt-3 max-w-[760px] font-display text-display text-text-primary">
            俾你嘅 AI agent 裝上專業能力
          </h1>
          <p className="mt-6 max-w-[680px] text-body-lg text-text-secondary">
            Skill 係可以裝入任何 agent 嘅專業能力包 — 一條指令,你嘅 agent
            即刻識行業情報、識設計判斷、識分飾唔同角色。以下係 AIGRO 自己整、
            同埋我哋親自用過真心推薦嘅精選。
          </p>
        </Reveal>
      </section>

      {/* Featured — AIGRO 情報 Skill(自家) */}
      <section className="mx-auto max-w-container px-6 pb-16 max-md:pb-12">
        <Reveal>
          <div className="rounded-md border border-border-strong bg-surface p-8 shadow-card dark:shadow-none md:p-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-sm bg-ink-solid px-3 py-1.5 text-overline font-sans uppercase text-on-accent">
                AIGRO 自家
              </span>
              <span className="inline-flex items-center rounded-sm border border-border-strong px-3 py-1.5 text-overline font-sans uppercase text-text-muted">
                優先名單開放中
              </span>
            </div>
            <h2 className="mt-5 font-display text-h2 text-text-primary">
              AIGRO 情報 Skill
            </h2>
            <p className="mt-4 max-w-[680px] text-body text-text-secondary">
              教你嘅 agent 正確讀取 AIGRO 情報:引用規則、來源標註、
              禁憑記憶回答 — 每則結論都要講得出處,唔會「聽落似啱」就當事實。
            </p>
            <div className="mt-5 max-w-[520px]">
              <InstallSnippet repo="aigro-hk/intel" />
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                to="/developers"
                className="inline-flex h-11 items-center rounded-md bg-ink-solid px-6 text-label text-on-accent press hover:bg-ink-hover"
              >
                加入優先名單
                <ArrowRight className="ml-1 h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </Link>
              <p className="text-caption text-text-muted">
                Skill 正式發布前,優先名單會第一批收到安裝方法。
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Curated — 我哋用緊嘅 skills */}
      <section className="mx-auto max-w-container px-6 pb-24 max-md:pb-16">
        <Reveal>
          <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
            <span
              className="inline-block h-px w-6 bg-border-strong"
              aria-hidden="true"
            />
            Club 精選
          </p>
          <h2 className="mt-3 font-display text-h2 text-text-primary">
            我哋日日用緊嘅 skills
          </h2>
        </Reveal>
        {/* gap-px hairline grid — 1px gaps let bg-border show through as rules */}
        <div className="mt-10 grid gap-px border-y bg-border md:grid-cols-2">
          {CURATED.map((s, i) => (
            <Reveal key={s.repo} delay={i * 0.08} className="bg-bg p-8">
              <div className="flex h-full flex-col">
                <TagChips tags={s.tags} />
                <h3 className="mt-4 font-display text-h3 text-text-primary">
                  {s.name}
                </h3>
                <p className="mt-3 text-body-sm text-text-secondary">{s.value}</p>
                <p className="mt-2 text-caption text-text-muted">
                  幾時用:{s.detail}
                </p>
                <InstallSnippet repo={s.repo} />
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group mt-4 inline-flex items-center gap-1.5 text-label text-ink link-underline"
                >
                  睇來源
                  <ExternalLink
                    className="h-3.5 w-3.5"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </a>
              </div>
            </Reveal>
          ))}
        </div>
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
              話我哋知,編輯團隊試用後會更新精選。
            </span>
          </p>
        </Reveal>
      </section>
    </>
  );
}
