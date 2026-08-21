import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Database,
  Handshake,
  Mail,
  Rss,
  SlidersHorizontal,
  Vote,
  Workflow,
} from "lucide-react";
import Reveal from "@/components/Reveal";
import {
  appendInterest,
  PARTNER_INTEREST_KEY,
  type InterestSaveMode,
} from "@/lib/interest";

/* ================= 資料 ================= */

const PIPELINE = [
  {
    step: "01",
    title: "來源接入",
    body: "RSS / 官方 API / 授權來源 — 只接公開同有授權嘅資訊，唔爬灰色地帶。",
  },
  {
    step: "02",
    title: "抓取轉換",
    body: "Firecrawl pipeline 將網頁、文件轉成乾淨結構化資料，去蕪存菁。",
  },
  {
    step: "03",
    title: "蒸餾評分",
    body: "LLM 摘要 + 香港視角評分 — 邊啲資訊對香港 builder 真係有用，先出街。",
  },
  {
    step: "04",
    title: "公開接入",
    body: "通過品質閘門嘅香港繁體 AI 情報，會同步到公開只讀 MCP；新資料來源先經審核再加入。",
  },
];

/** 伙伴類型 — 寫入 localStorage `aigro-partner-interest` 時按 kind 分 */
type PartnerKind = "source" | "data" | "industry" | "general";

const PARTNERSHIPS: {
  icon: typeof Rss;
  title: string;
  body: string;
  kind: Exclude<PartnerKind, "general">;
  ctaLabel: string;
}[] = [
  {
    icon: Rss,
    title: "來源伙伴",
    body: "你嘅內容想被收錄？授權我哋引用，來源連結導流返你 — 通過審核後會進入 AIGRO 情報庫。",
    kind: "source",
    ctaLabel: "申請收錄",
  },
  {
    icon: Database,
    title: "數據伙伴",
    body: "想用我哋嘅情報做產品？先登記 MCP / API 合作需求，介面確認後再安排接入。",
    kind: "data",
    ctaLabel: "傾 API 合作",
  },
  {
    icon: Vote,
    title: "行業伙伴",
    body: "提議新行業情報網 — 你話邊個行業香港最需要，幫我哋整理需求次序。",
    kind: "industry",
    ctaLabel: "提議行業",
  },
];

const SECTORS: { name: string; status: string; live?: boolean }[] = [
  { name: "AI", status: "網站已開放", live: true },
  { name: "Beauty", status: "需求研究" },
  { name: "Technology", status: "需求研究" },
  { name: "Finance", status: "需求研究" },
  { name: "Property", status: "需求研究" },
  { name: "Retail", status: "需求研究" },
];

/* ================= F4:伙伴 interest form =================
 * mailto 會漏數據 — 改做 inline form,寫 localStorage
 * `aigro-partner-interest`(按 kind 分;Supabase swap note 見 src/lib/interest.ts)。 */
function PartnerInterestForm({
  kind,
  label,
  variant = "outline",
}: {
  kind: PartnerKind;
  label: string;
  variant?: "outline" | "solid";
}) {
  const [open, setOpen] = useState(false);
  const [savedMode, setSavedMode] = useState<InterestSaveMode | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    const mode = await appendInterest(PARTNER_INTEREST_KEY, {
      kind,
      name: name.trim(),
      email: email.trim(),
      note: note.trim(),
    });
    setSubmitting(false);
    if (mode) setSavedMode(mode);
    else setError("暫時未能記錄，請稍後再試。");
  };

  if (savedMode) {
    return (
      <p
        role="status"
        className="mt-6 inline-flex w-fit items-center gap-2 rounded-md border border-ink px-4 py-2.5 text-label text-ink"
      >
        <Check className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        {savedMode === "server"
          ? "已記低 — 我哋會親自覆你"
          : "已儲存在此裝置 — 連線後請再登記"}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "solid"
            ? "press inline-flex h-12 items-center rounded-md bg-ink-solid px-8 text-label text-on-accent hover:bg-ink-hover"
            : "press mt-6 inline-flex h-10 w-fit items-center rounded-md border border-border-strong px-4 text-label text-ink hover:border-ink"
        }
      >
        {variant === "solid" && (
          <Mail className="mr-2 h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        )}
        {label}
      </button>
    );
  }

  const inputCls =
    "h-10 w-full rounded-md border bg-surface px-3 text-body-sm text-text-primary placeholder:text-text-muted focus:border-ink focus:outline-none";

  return (
    <form onSubmit={submit} className="mt-6 grid w-full grid-cols-1 gap-2.5">
      <label className="sr-only" htmlFor={`partner-${kind}-name`}>
        姓名 / 公司
      </label>
      <input
        id={`partner-${kind}-name`}
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="姓名 / 公司"
        className={inputCls}
      />
      <label className="sr-only" htmlFor={`partner-${kind}-email`}>
        Email
      </label>
      <input
        id={`partner-${kind}-email`}
        required
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className={inputCls}
      />
      <label className="sr-only" htmlFor={`partner-${kind}-note`}>
        一句話講下想點合作
      </label>
      <textarea
        id={`partner-${kind}-note`}
        required
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="一句話講下想點合作"
        className="w-full rounded-md border bg-surface px-3 py-2.5 text-body-sm text-text-primary placeholder:text-text-muted focus:border-ink focus:outline-none"
      />
      <button
        type="submit"
        disabled={submitting}
        className="press inline-flex h-10 items-center justify-center rounded-md bg-ink-solid px-4 text-label text-on-accent hover:bg-ink-hover"
      >
        {submitting ? "記錄中" : "送出・我哋親自覆"}
      </button>
      {error && (
        <p role="alert" className="text-caption text-error">
          {error}
        </p>
      )}
    </form>
  );
}

/* ================= Page ================= */

export default function DataPartnership({ embedded = false }: { embedded?: boolean }) {
  const TitleTag = embedded ? "h2" : "h1";

  return (
    <>
      {/* Header — 標準頁首 pattern */}
      <section
        className={
          embedded
            ? "mx-auto max-w-container px-6 pb-16 pt-16 max-md:pt-12"
            : "mx-auto max-w-container px-6 pb-16 pt-24 max-md:pt-16"
        }
      >
        <Reveal>
          <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
            <span
              className="inline-block h-px w-6 bg-border-strong"
              aria-hidden="true"
            />
            AIGRO Data
          </p>
          <TitleTag className="mt-3 max-w-[760px] font-display text-display text-text-primary">
            自己嘅情報管道，自己嘅行業雷達
          </TitleTag>
          <p className="mt-6 max-w-[680px] text-body-lg text-text-secondary">
            我哋正建立自家 scraper 同蒸餾管道，將每個行業嘅公開資訊變成乾淨、
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
            由公開資訊，到 agent 直接飲
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
            三種方式，同我哋一齊砌
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
                <PartnerInterestForm kind={p.kind} label={p.ctaLabel} />
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
            時間表按 Club 投票同伙伴需求調整 — 想加快某個行業？做行業伙伴提案。
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
              行業情報基建，同你一齊砌
            </h2>
            <p className="mt-4 max-w-[640px] text-body text-text-secondary">
              無論你係內容方、產品方，定係想提議新行業 — 第一批合作伙伴會參與
              管道設計，優先接入蒸餾後嘅情報。
            </p>
            <div className="mt-6 flex flex-wrap items-start gap-4">
              <div className="w-full max-w-[320px]">
                <PartnerInterestForm
                  kind="general"
                  label="同我哋傾合作"
                  variant="solid"
                />
              </div>
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
              hello@aigro.hk · 或者直接留低聯絡，我哋親自覆
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
