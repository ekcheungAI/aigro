import { Link } from "react-router-dom";
import {
  ArrowRight,
  Database,
  Handshake,
  Mail,
  Rss,
  SlidersHorizontal,
  Vote,
  Workflow,
} from "lucide-react";
import Reveal from "@/components/Reveal";

/* ================= 資料 ================= */

const PIPELINE = [
  {
    step: "01",
    title: "來源接入",
    body: "RSS / 官方 API / 授權來源 — 只接公開同有授權嘅資訊,唔爬灰色地帶。",
  },
  {
    step: "02",
    title: "抓取轉換",
    body: "Firecrawl pipeline 將網頁、文件轉成乾淨結構化資料,去蕪存菁。",
  },
  {
    step: "03",
    title: "蒸餾評分",
    body: "LLM 摘要 + 香港視角評分 — 邊啲資訊對香港 builder 真係有用,先出街。",
  },
  {
    step: "04",
    title: "MCP 分發",
    body: "蒸餾後嘅情報經 MCP 分發 — 你嘅 agent 直接飲,唔使自己再砌 scraper。",
  },
];

const PARTNERSHIPS = [
  {
    icon: Rss,
    title: "來源伙伴",
    body: "你嘅內容想被收錄?授權我哋引用,來源連結導流返你 — 你嘅內容會出現喺全港 agent 嘅答案入面。",
    cta: { label: "申請收錄", href: "mailto:hello@aigro.hk?subject=來源伙伴" },
  },
  {
    icon: Database,
    title: "數據伙伴",
    body: "想用我哋嘅情報做產品?MCP / API 合作 — 將行業雷達接入你嘅 app、agent 或內部工具。",
    cta: { label: "傾 API 合作", href: "mailto:hello@aigro.hk?subject=數據伙伴" },
  },
  {
    icon: Vote,
    title: "行業伙伴",
    body: "提議新行業情報網,Club 投票優先開 — 你話邊個行業香港最需要,我哋排期起管道。",
    cta: { label: "提議行業", href: "mailto:hello@aigro.hk?subject=行業伙伴" },
  },
];

const SECTORS: { name: string; status: string; live?: boolean }[] = [
  { name: "AI", status: "LIVE", live: true },
  { name: "Beauty", status: "Q3" },
  { name: "Technology", status: "Q3" },
  { name: "Finance", status: "Q4" },
  { name: "Property", status: "Q4" },
  { name: "Retail", status: "籌備中" },
];

/* ================= Page ================= */

export default function DataPartnership() {
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
            AIGRO Data
          </p>
          <h1 className="mt-3 max-w-[760px] font-display text-display text-text-primary">
            自己嘅情報管道,自己嘅行業雷達
          </h1>
          <p className="mt-6 max-w-[680px] text-body-lg text-text-secondary">
            我哋正建立自家 scraper 同蒸餾管道,將每個行業嘅公開資訊變成乾淨、
            可引用、可接入嘅情報 — 第一批開放俾合作伙伴。
          </p>
        </Reveal>
      </section>

      {/* Pipeline — 4 hairline steps */}
      <section className="mx-auto max-w-container px-6 pb-24 max-md:pb-16">
        <Reveal>
          <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
            <span
              className="inline-block h-px w-6 bg-border-strong"
              aria-hidden="true"
            />
            情報管道
          </p>
          <h2 className="mt-3 font-display text-h2 text-text-primary">
            由公開資訊,到 agent 直接飲
          </h2>
        </Reveal>
        {/* gap-px hairline grid — 1px gaps let bg-border show through as rules */}
        <div className="mt-10 grid gap-px border-y bg-border md:grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map((p, i) => (
            <Reveal key={p.step} delay={i * 0.08} className="bg-bg p-8">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-caption text-text-muted">
                    {p.step}
                  </span>
                  {i < PIPELINE.length - 1 && (
                    <ArrowRight
                      className="h-4 w-4 text-text-muted"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <h3 className="mt-4 font-display text-h3 text-text-primary">
                  {p.title}
                </h3>
                <p className="mt-3 text-body-sm text-text-secondary">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 合作方式 — 3 cards */}
      <section className="mx-auto max-w-container px-6 pb-24 max-md:pb-16">
        <Reveal>
          <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
            <span
              className="inline-block h-px w-6 bg-border-strong"
              aria-hidden="true"
            />
            合作方式
          </p>
          <h2 className="mt-3 font-display text-h2 text-text-primary">
            三種方式,同我哋一齊砌
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-px border-y bg-border md:grid-cols-3">
          {PARTNERSHIPS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08} className="bg-bg p-8">
              <div className="flex h-full flex-col">
                <p.icon
                  className="h-5 w-5 text-ink"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h3 className="mt-4 font-display text-h3 text-text-primary">
                  {p.title}
                </h3>
                <p className="mt-3 flex-1 text-body-sm text-text-secondary">
                  {p.body}
                </p>
                <a
                  href={p.cta.href}
                  className="press mt-6 inline-flex h-10 w-fit items-center rounded-md border border-border-strong px-4 text-label text-ink hover:border-ink"
                >
                  {p.cta.label}
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Sectors roadmap — mini table */}
      <section className="mx-auto max-w-container px-6 pb-24 max-md:pb-16">
        <Reveal>
          <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
            <span
              className="inline-block h-px w-6 bg-border-strong"
              aria-hidden="true"
            />
            行業時間表
          </p>
          <h2 className="mt-3 font-display text-h2 text-text-primary">
            Sectors roadmap
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="mt-10 overflow-hidden rounded-md border">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-surface">
                  <th className="px-6 py-3 text-overline font-sans uppercase text-text-muted">
                    行業
                  </th>
                  <th className="px-6 py-3 text-overline font-sans uppercase text-text-muted">
                    狀態
                  </th>
                </tr>
              </thead>
              <tbody>
                {SECTORS.map((s) => (
                  <tr key={s.name} className="border-b last:border-b-0">
                    <td className="px-6 py-4 text-label text-text-primary">
                      {s.name}
                    </td>
                    <td className="px-6 py-4">
                      {s.live ? (
                        <span className="inline-flex items-center gap-2 rounded-sm bg-ink-soft px-3 py-1.5 text-overline font-sans uppercase text-ink">
                          <span
                            className="inline-block h-1.5 w-1.5 rounded-full bg-ink"
                            aria-hidden="true"
                          />
                          LIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-sm border border-border-strong px-3 py-1.5 text-overline font-sans uppercase text-text-muted">
                          {s.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mt-4 text-caption text-text-muted">
            時間表按 Club 投票同伙伴需求調整 — 想加快某個行業?做行業伙伴提案。
          </p>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-container px-6 pb-24 max-md:pb-16">
        <Reveal>
          <div className="rounded-md border bg-surface p-8 shadow-card dark:shadow-none md:p-10">
            <Handshake
              className="h-6 w-6 text-ink"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <h2 className="mt-4 font-display text-h2 text-text-primary">
              行業情報基建,同你一齊砌
            </h2>
            <p className="mt-4 max-w-[640px] text-body text-text-secondary">
              無論你係內容方、產品方,定係想提議新行業 — 第一批合作伙伴會參與
              管道設計,優先接入蒸餾後嘅情報。
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <a
                href="mailto:hello@aigro.hk?subject=Data 合作"
                className="inline-flex h-12 items-center rounded-md bg-ink-solid px-8 text-label text-on-accent press hover:bg-ink-hover"
              >
                <Mail className="mr-2 h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                同我哋傾合作
              </a>
              <Link
                to="/developers"
                className="press inline-flex h-12 items-center rounded-md border border-border-strong px-8 text-label text-ink hover:border-ink"
              >
                <Workflow
                  className="mr-2 h-4 w-4"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                MCP Network 優先名單
              </Link>
            </div>
            <p className="mt-4 font-mono text-caption text-text-muted">
              hello@aigro.hk · subject: Data 合作
            </p>
            {/* mono hint — 管道狀態 */}
            <p className="mt-2 flex items-center gap-2 font-mono text-caption text-text-muted">
              <SlidersHorizontal
                className="h-3.5 w-3.5"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              pipeline status: building · first partner cohort onboarding
            </p>
          </div>
        </Reveal>
      </section>
    </>
  );
}
