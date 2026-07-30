import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Check,
  ExternalLink,
  Handshake,
  MessagesSquare,
  Rss,
  Workflow,
} from "lucide-react";
import Reveal from "@/components/Reveal";
import { appendInterest, PARTNER_INTEREST_KEY } from "@/lib/interest";

/* ================= 資料 ================= */

type SourceType = "RSS" | "官方 API" | "合作渠道";

interface SourceItem {
  name: string;
  type: SourceType;
  /** 一句「佢俾咩我哋」 */
  gives: string;
  url: string;
}

interface SourceGroup {
  title: string;
  note: string;
  items: SourceItem[];
}

const SOURCE_GROUPS: SourceGroup[] = [
  {
    title: "官方來源",
    note: "模型廠商原廠直送 — 發佈第一時間,唔經二手轉述。",
    items: [
      {
        name: "OpenAI Blog",
        type: "RSS",
        gives: "OpenAI 官方發佈第一時間",
        url: "https://openai.com/blog",
      },
      {
        name: "Anthropic",
        type: "RSS",
        gives: "Claude 更新同安全研究,原廠直送",
        url: "https://www.anthropic.com/news",
      },
      {
        name: "Google DeepMind",
        type: "RSS",
        gives: "Gemini 同前沿研究嘅官方口徑",
        url: "https://deepmind.google/discover/blog",
      },
      {
        name: "HuggingFace",
        type: "官方 API",
        gives: "開源模型榜單同 trending papers",
        url: "https://huggingface.co/blog",
      },
    ],
  },
  {
    title: "媒體與社群",
    note: "全球 AI 圈嘅雷達 — 新聞、討論、意見領袖實時動態。",
    items: [
      {
        name: "TechCrunch",
        type: "RSS",
        gives: "全球 AI 創投同產品新聞",
        url: "https://techcrunch.com/category/artificial-intelligence/",
      },
      {
        name: "The Decoder",
        type: "RSS",
        gives: "歐洲視角嘅 AI 研究速報",
        url: "https://the-decoder.com",
      },
      {
        name: "Hacker News",
        type: "官方 API",
        gives: "builder 社群最前線嘅討論",
        url: "https://news.ycombinator.com",
      },
      {
        name: "X 精選",
        type: "合作渠道",
        gives: "AI 圈意見領袖實時動態,人手策展",
        url: "https://x.com",
      },
    ],
  },
  {
    title: "中文精選",
    note: "中文世界最值得追嘅 AI 聲音 — 快訊、深度、個人觀察。",
    items: [
      {
        name: "36氪",
        type: "RSS",
        gives: "內地 AI 創業同融資快訊",
        url: "https://36kr.com",
      },
      {
        name: "量子位",
        type: "RSS",
        gives: "技術拆解同行業深度報道",
        url: "https://www.qbitai.com",
      },
      {
        name: "IT之家",
        type: "RSS",
        gives: "即時科技快訊,全年無休",
        url: "https://www.ithome.com",
      },
      {
        name: "數字生命卡茲克",
        type: "合作渠道",
        gives: "中文 AI 圈最強個人觀察",
        url: "https://www.zhihu.com/people/Khazix",
      },
    ],
  },
];

const FLOW = [
  {
    step: "01",
    title: "來源",
    body: "以上渠道,全部公開、有名有姓 — 只接公開同有授權嘅資訊,唔爬灰色地帶。",
  },
  {
    step: "02",
    title: "抓取去重",
    body: "管道定時抓取,同一單新聞多個來源自動合併 — 你睇到嘅係一件事,唔係十次轉載。",
  },
  {
    step: "03",
    title: "蒸餾評分",
    body: "LLM 摘要 + 繁體中文 + 香港視角評分 — 邊啲資訊對香港 builder 真係有用,先出街。",
  },
  {
    step: "04",
    title: "三種輸出",
    body: "Insights 情報 · Daily 日報 · Ask 問答 — 同一條蒸餾線,三種用法,仲有 MCP 俾 agent 直接飲。",
  },
];

const FREE_USE: {
  icon: typeof BookOpen;
  title: string;
  body: string;
}[] = [
  {
    icon: BookOpen,
    title: "讀",
    body: "全站情報免費讀,無需帳號 — Insights、Daily、Cases 全部打開,唔使登入唔使俾錢。",
  },
  {
    icon: MessagesSquare,
    title: "問",
    body: "AI 編輯部免費無限問答,每個答案都附來源 — 你可以隨時撳返原文核實。",
  },
  {
    icon: Workflow,
    title: "接",
    body: "MCP / API 免費額度 6,551 tokens/日 — 你嘅 agent 都可以飲,唔使自己再砌 scraper。",
  },
];

/* ================= 來源伙伴 interest form =================
 * 同 DataPartnership 嘅 PartnerInterestForm 同一 pattern —
 * 寫 localStorage `aigro-partner-interest`(kind='source';Supabase swap
 * note 見 src/lib/interest.ts)。 */
function SourceInterestForm() {
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    appendInterest(PARTNER_INTEREST_KEY, {
      kind: "source",
      name: name.trim(),
      email: email.trim(),
      url: url.trim(),
    });
    setDone(true);
  };

  if (done) {
    return (
      <p
        role="status"
        className="mt-6 inline-flex w-fit items-center gap-2 rounded-md border border-ink px-4 py-2.5 text-label text-ink"
      >
        <Check className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        已記低 — 編輯部會親自覆你
      </p>
    );
  }

  const inputCls =
    "h-10 w-full rounded-md border bg-surface px-3 text-body-sm text-text-primary placeholder:text-text-muted focus:border-ink focus:outline-none";

  return (
    <form
      onSubmit={submit}
      className="mt-6 grid w-full max-w-[420px] grid-cols-1 gap-2.5"
    >
      <label className="sr-only" htmlFor="source-interest-name">
        姓名 / 媒體名
      </label>
      <input
        id="source-interest-name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="姓名 / 媒體名"
        className={inputCls}
      />
      <label className="sr-only" htmlFor="source-interest-email">
        Email
      </label>
      <input
        id="source-interest-email"
        required
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className={inputCls}
      />
      <label className="sr-only" htmlFor="source-interest-url">
        網站 URL
      </label>
      <input
        id="source-interest-url"
        required
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="網站 URL(blog / 公眾號 / 頻道)"
        className={inputCls}
      />
      <button
        type="submit"
        className="press inline-flex h-10 items-center justify-center rounded-md bg-ink-solid px-4 text-label text-on-accent hover:bg-ink-hover"
      >
        申請成為來源
      </button>
    </form>
  );
}

/* ================= Page ================= */

export default function Sources() {
  return (
    <>
      {/* Hero — dark band:sources-band 媒體報頭疊影背景層
          (opacity-45 + 實色 band overlay,同 insights-hero/skills-band 做法;
          深淺色主題皆為 dark band) */}
      <section className="relative isolate overflow-hidden border-b border-band-border bg-band-bg">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 select-none"
        >
          <img
            src="/editorial/sources-band.png"
            alt=""
            loading="lazy"
            className="h-full w-full object-cover opacity-45"
          />
          <span className="absolute inset-0 bg-band-bg/60" />
        </div>
        <div className="mx-auto max-w-container px-6 pb-16 pt-24 max-md:pt-16">
          <Reveal>
            <p className="flex items-center gap-3 text-overline font-sans uppercase text-band-text-muted">
              <span
                className="inline-block h-px w-6 bg-band-border-strong"
                aria-hidden="true"
              />
              AIGRO Sources
            </p>
            <h1 className="mt-3 max-w-[760px] font-display text-display text-band-text">
              情報渠道,公開透明
            </h1>
            <p className="mt-6 max-w-[680px] text-body-lg text-band-text-secondary">
              每一條情報都有名有姓嘅來源。我哋將渠道公開 —
              因為可信賴嘅情報,由可信賴嘅來源開始。
            </p>
          </Reveal>
        </div>
      </section>

      {/* 渠道牆 — grouped source wall */}
      <section className="mx-auto max-w-container px-6 pb-24 max-md:pb-16">
        <Reveal>
          <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
            <span
              className="inline-block h-px w-6 bg-border-strong"
              aria-hidden="true"
            />
            渠道牆
          </p>
          <h2 className="mt-3 font-display text-h2 text-text-primary">
            我哋每日追蹤嘅來源,全部列晒出嚟
          </h2>
        </Reveal>

        {SOURCE_GROUPS.map((group, gi) => (
          <div key={group.title} className="mt-12">
            <Reveal>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-h3 text-text-primary">
                  {group.title}
                </h3>
                <p className="text-caption text-text-muted">{group.note}</p>
              </div>
            </Reveal>
            {/* gap-px hairline grid — 1px gaps let bg-border show through as rules */}
            <div className="mt-5 grid gap-px border-y bg-border md:grid-cols-2 lg:grid-cols-4">
              {group.items.map((s, i) => (
                <Reveal
                  key={s.name}
                  delay={gi * 0.04 + i * 0.06}
                  className="bg-bg"
                >
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group flex h-full flex-col p-6"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-label text-text-primary transition-colors duration-150 group-hover:text-ink">
                        {s.name}
                      </p>
                      <ExternalLink
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted transition-colors duration-150 group-hover:text-ink"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    </div>
                    <span className="mt-3 inline-flex w-fit items-center rounded-md bg-ink-soft px-2 py-0.5 font-mono text-caption text-ink">
                      {s.type}
                    </span>
                    <p className="mt-3 text-body-sm text-text-secondary">
                      {s.gives}
                    </p>
                  </a>
                </Reveal>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* 數據點樣流 — 4-step hairline pipeline */}
      <section className="mx-auto max-w-container px-6 pb-24 max-md:pb-16">
        <Reveal>
          <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
            <span
              className="inline-block h-px w-6 bg-border-strong"
              aria-hidden="true"
            />
            數據點樣流
          </p>
          <h2 className="mt-3 font-display text-h2 text-text-primary">
            由來源到你眼前,四步,冇黑盒
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-px border-y bg-border md:grid-cols-2 lg:grid-cols-4">
          {FLOW.map((p, i) => (
            <Reveal key={p.step} delay={i * 0.08} className="bg-bg p-8">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-caption text-text-muted">
                    {p.step}
                  </span>
                  {i < FLOW.length - 1 && (
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

      {/* 免費任用 — free to use */}
      <section className="mx-auto max-w-container px-6 pb-24 max-md:pb-16">
        <Reveal>
          <p className="flex items-center gap-3 text-overline font-sans uppercase text-text-muted">
            <span
              className="inline-block h-px w-6 bg-border-strong"
              aria-hidden="true"
            />
            免費任用
          </p>
          <h2 className="mt-3 font-display text-h2 text-text-primary">
            情報係砌出嚟俾人用嘅
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-px border-y bg-border md:grid-cols-3">
          {FREE_USE.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08} className="bg-bg p-8">
              <div className="flex h-full flex-col">
                <f.icon
                  className="h-5 w-5 text-ink"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h3 className="mt-4 font-display text-h3 text-text-primary">
                  {f.title}
                </h3>
                <p className="mt-3 flex-1 text-body-sm text-text-secondary">
                  {f.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.12}>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to="/developers"
              className="press inline-flex h-12 items-center rounded-md bg-ink-solid px-8 text-label text-on-accent hover:bg-ink-hover"
            >
              登記 MCP 優先名單
              <ArrowRight
                className="ml-2 h-4 w-4"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </Link>
            <p className="max-w-[520px] text-caption text-text-muted">
              內容經 AI 摘要 + 編輯整理,重要資料請以原文為準 —
              每條情報都附原文連結。原文版權歸各來源所有;來源方如需更正、
              下架或調整展示方式,歡迎隨時聯絡。
            </p>
          </div>
        </Reveal>
      </section>

      {/* 成為來源 — source partner pitch */}
      <section className="mx-auto max-w-container px-6 pb-24 max-md:pb-16">
        <Reveal>
          <div className="rounded-md border bg-surface p-8 shadow-card dark:shadow-none md:p-10">
            <Handshake
              className="h-6 w-6 text-ink"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <h2 className="mt-4 font-display text-h2 text-text-primary">
              你嘅內容值得被聽見
            </h2>
            <p className="mt-4 max-w-[640px] text-body text-text-secondary">
              你寫嘅嘢夠好,就應該出現喺全港 builder 嘅雷達上。授權我哋引用,
              來源連結導流返你 — 你嘅內容會出現喺全港 agent
              嘅答案入面,有名有姓。
            </p>
            <SourceInterestForm />
            <p className="mt-4 flex items-center gap-2 font-mono text-caption text-text-muted">
              <Rss className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              hello@aigro.hk · 或者直接留低聯絡,編輯部親自覆
            </p>
          </div>
        </Reveal>
      </section>
    </>
  );
}
