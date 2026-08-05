import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  ChevronRight,
  Compass,
  History,
  Library,
  Menu,
  MessageSquare,
  Play,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

type View = "discover" | "brief" | "library" | "ask";
type Category = "為你精選" | "AI 趨勢" | "增長策略" | "商業實戰" | "工具評測" | "香港視角";

const VIEWS: { id: View; label: string; icon: typeof Compass }[] = [
  { id: "discover", label: "探索 Discover", icon: Compass },
  { id: "brief", label: "我的情報 My Brief", icon: History },
  { id: "library", label: "收藏庫 Library", icon: Library },
  { id: "ask", label: "問答 Ask", icon: MessageSquare },
];

const CATEGORIES: Category[] = ["為你精選", "AI 趨勢", "增長策略", "商業實戰", "工具評測", "香港視角"];

const PROGRAMMES = [
  {
    category: "AI 趨勢" as Category,
    title: "Agent 唔再只係回答問題：下一步係交付結果",
    instructor: "Elvin Cheung",
    detail: "6 節 · 28 分鐘",
    image: "/editorial/thumbnails/agent-delivery.jpg",
    progress: 42,
  },
  {
    category: "增長策略" as Category,
    title: "將 AI 流量變成第一個可重複增長循環",
    instructor: "AIGRO Growth Desk",
    detail: "4 節 · 19 分鐘",
    image: "/editorial/thumbnails/growth-loop.jpg",
    progress: 0,
  },
  {
    category: "香港視角" as Category,
    title: "香港團隊導入 AI：由一條流程開始",
    instructor: "AIGRO 編輯部",
    detail: "5 節 · 24 分鐘",
    image: "/editorial/thumbnails/hong-kong-adoption.jpg",
    progress: 0,
  },
  {
    category: "工具評測" as Category,
    title: "由 prompt 到 workflow：工具選擇實戰",
    instructor: "AIGRO Lab",
    detail: "7 節 · 34 分鐘",
    image: "/editorial/thumbnails/prompt-workflow.jpg",
    progress: 0,
  },
];

const QUICK_PROMPTS = [
  "今日最值得香港 founder 跟進嘅 AI 變化係咩？",
  "幫我設計一個七日 agent 實驗",
  "比較兩個 AI 工具，講清楚適合邊種團隊",
];

function Logo() {
  return <img src="/brand/aigro-wordmark-navy-transparent.png" alt="AIGRO" className="h-9 w-auto" />;
}

function NavButton({ view, active, onClick, compact = false }: { view: (typeof VIEWS)[number]; active: boolean; onClick: () => void; compact?: boolean }) {
  const Icon = view.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "press relative inline-flex items-center gap-2 text-label transition-colors duration-150",
        compact ? "flex-1 flex-col justify-center gap-1 py-2 text-[10px]" : "h-[68px] px-1",
        active ? "text-band-text" : "text-band-text-muted hover:text-band-text"
      )}
    >
      {compact && <Icon className="h-5 w-5" strokeWidth={1.5} />}
      {compact ? view.label.split(" ")[0] : view.label}
      {!compact && <span className={cn("absolute inset-x-0 bottom-0 h-[2px] bg-band-ink transition-transform duration-180", active ? "scale-x-100" : "scale-x-0")} />}
    </button>
  );
}

function ProgrammeCard({ item, wide = false }: { item: (typeof PROGRAMMES)[number]; wide?: boolean }) {
  return (
    <article className={cn("group min-w-0", wide && "sm:grid sm:grid-cols-[1.15fr_0.85fr]") }>
      <div className="relative overflow-hidden rounded-md bg-band-card">
        <img src={item.image} alt="" aria-hidden="true" className={cn("w-full object-cover transition-transform duration-250", wide ? "aspect-video h-full" : "aspect-[16/10]")} />
        <button type="button" className="press absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-md bg-lime text-on-accent" aria-label={`開始 ${item.title}`}>
          <Play className="ml-0.5 h-4 w-4 fill-current" strokeWidth={1.5} />
        </button>
        {item.progress > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-band-border">
            <div className={cn("h-full bg-lime", item.progress === 42 ? "w-[42%]" : "w-0")} />
          </div>
        )}
      </div>
      <div className={cn("pt-4", wide && "sm:flex sm:flex-col sm:justify-center sm:bg-band-surface sm:px-7 sm:py-6")}>
        <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-band-ink">{item.category}</p>
        <h3 className={cn("mt-2 text-balance font-display text-band-text", wide ? "text-h3" : "text-h4")}>{item.title}</h3>
        <p className="mt-2 text-caption text-band-text-secondary">{item.instructor}</p>
        <p className="mt-1 font-mono text-[10px] text-band-text-muted">{item.detail}</p>
        {wide && (
          <button type="button" className="press mt-6 inline-flex h-10 w-fit items-center gap-2 rounded-md bg-lime px-4 text-label text-on-accent">
            {item.progress > 0 ? "繼續閱讀" : "開始專題"}<ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </article>
  );
}

function CategoryRail({ selected, onSelect }: { selected: Category; onSelect: (category: Category) => void }) {
  return (
    <aside className="hidden w-[196px] shrink-0 border-r border-band-border bg-band-bg px-4 pb-8 pt-5 lg:block">
      <p className="px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-band-text-muted">Browse by topic</p>
      <div className="mt-4 space-y-1">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            aria-pressed={selected === category}
            className={cn(
              "press flex w-full items-center justify-between rounded-sm px-3 py-2.5 text-left text-label",
              selected === category ? "bg-band-card text-band-text" : "text-band-text-muted hover:bg-band-surface hover:text-band-text"
            )}
          >
            {category}
            {selected === category && <span className="h-1.5 w-1.5 rounded-full bg-band-ink" />}
          </button>
        ))}
      </div>
      <div className="mt-8 border-t border-band-border px-3 pt-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-band-text-muted">Your activity</p>
        <div className="mt-4 space-y-3 text-caption text-band-text-secondary">
          <p className="flex items-center justify-between"><span>本週已讀</span><span className="font-mono text-band-ink">07</span></p>
          <p className="flex items-center justify-between"><span>已收藏</span><span className="font-mono">12</span></p>
          <p className="flex items-center justify-between"><span>Ask 對話</span><span className="font-mono">04</span></p>
        </div>
      </div>
    </aside>
  );
}

function MobileCategories({ selected, onSelect }: { selected: Category; onSelect: (category: Category) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto border-b border-band-border bg-band-bg px-4 py-3 lg:hidden">
      {CATEGORIES.map((category) => (
        <button key={category} type="button" onClick={() => onSelect(category)} className={cn("press shrink-0 rounded-sm px-3 py-2 text-caption", selected === category ? "bg-band-card text-band-text" : "text-band-text-muted")}>{category}</button>
      ))}
    </div>
  );
}

function DiscoverView({ category }: { category: Category }) {
  const filtered = useMemo(() => {
    if (category === "為你精選") return PROGRAMMES;
    const matches = PROGRAMMES.filter((item) => item.category === category);
    return matches.length ? matches : PROGRAMMES;
  }, [category]);

  return (
    <>
      <section className="grid overflow-hidden rounded-lg border border-band-border bg-band-surface lg:grid-cols-[0.82fr_1.18fr]">
        <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-12">
          <div className="flex items-center gap-3">
            <span className="rounded-sm bg-band-ink-soft px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-band-ink">Featured briefing</span>
            <span className="font-mono text-[10px] text-band-text-muted">2026.08.04</span>
          </div>
          <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.14em] text-band-text-muted">Elvin Cheung · AIGRO 領航專家</p>
          <h1 className="mt-3 text-balance font-display text-[38px] font-medium leading-[1.08] tracking-[-0.015em] text-band-text sm:text-[52px]">
            將 AI agent 由試玩，變成真正交付結果。
          </h1>
          <p className="mt-5 max-w-[520px] text-body-sm text-band-text-secondary">
            一套俾香港小團隊嘅實戰框架：揀流程、定驗收、保留人工判斷，再用七日證明值唔值得擴大。
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button type="button" className="press inline-flex h-11 items-center gap-2 rounded-md bg-lime px-5 text-label text-on-accent">
              <Play className="h-4 w-4 fill-current" strokeWidth={1.5} />開始專題
            </button>
            <button type="button" className="press flex h-11 w-11 items-center justify-center rounded-md border border-band-border-strong text-band-text" aria-label="收藏專題"><Bookmark className="h-4 w-4" strokeWidth={1.5} /></button>
            <span className="font-mono text-[10px] text-band-text-muted">6 節 · 28 分鐘</span>
          </div>
        </div>
        <div className="relative min-h-[280px] lg:min-h-[430px]">
          <img src="/experts/elvin-cheung-wide.jpg" alt="Elvin Cheung 分享 AI agent 實戰方法" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute bottom-4 left-4 rounded-sm bg-band-bg/90 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-band-text-secondary">AIGRO Original · Hong Kong</div>
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between gap-5">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-band-ink">Continue</p><h2 className="mt-2 font-display text-h2 text-band-text">繼續你嘅情報路線</h2></div>
          <button type="button" className="press hidden items-center gap-1 text-label text-band-text-secondary sm:inline-flex">查看全部 <ChevronRight className="h-4 w-4" strokeWidth={1.5} /></button>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <ProgrammeCard item={PROGRAMMES[0]} wide />
          <div className="grid grid-cols-2 gap-5">
            {PROGRAMMES.slice(1, 3).map((item) => <ProgrammeCard key={item.title} item={item} />)}
          </div>
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-end justify-between gap-5">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-band-ink">Curated for you</p><h2 className="mt-2 font-display text-h2 text-band-text">{category}</h2></div>
          <span className="font-mono text-[10px] text-band-text-muted">根據你收藏嘅主題更新</span>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-4">
          {filtered.map((item) => <ProgrammeCard key={item.title} item={item} />)}
        </div>
      </section>

      <section className="mt-14 grid gap-5 border-t border-band-border pt-10 md:grid-cols-[1fr_1fr]">
        <div className="rounded-lg bg-band-surface p-6 sm:p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-band-ink">Daily brief</p>
          <h2 className="mt-3 text-balance font-display text-h3 text-band-text">今日 5 條，三分鐘知道要跟進咩。</h2>
          <p className="mt-3 text-body-sm text-band-text-secondary">每條情報都有來源、香港視角同可採取下一步。</p>
          <button type="button" className="press mt-6 inline-flex items-center gap-2 text-label text-band-ink">打開今日情報 <ArrowRight className="h-4 w-4" strokeWidth={1.5} /></button>
        </div>
        <div className="rounded-lg border border-band-border p-6 sm:p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-band-text-muted">This week</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {["AI 應用", "增長實驗", "香港商業"].map((item, index) => <div key={item}><span className="font-mono text-[24px] text-band-text">0{index + 3}</span><p className="mt-1 text-caption text-band-text-muted">{item}</p></div>)}
          </div>
        </div>
      </section>
    </>
  );
}

function BriefView() {
  return (
    <div>
      <div className="flex flex-col justify-between gap-5 border-b border-band-border pb-7 sm:flex-row sm:items-end">
        <div><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-band-ink">My Brief</p><h1 className="mt-2 font-display text-display text-band-text">早晨，Elvin。</h1><p className="mt-3 text-body-sm text-band-text-secondary">今日有 5 條新情報，預計 8 分鐘讀完。</p></div>
        <span className="font-mono text-[10px] text-band-text-muted">最後同步 12 分鐘前</span>
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <ProgrammeCard item={PROGRAMMES[0]} wide />
        <div className="rounded-lg border border-band-border bg-band-surface p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-band-ink">Weekly rhythm</p>
          <p className="mt-3 font-display text-h3 text-band-text">今週已掌握 7 條情報</p>
          <div className="mt-6 flex justify-between gap-2">
            {[1, 1, 1, 1, 0, 0, 0].map((done, index) => <div key={index} className="text-center"><span className={cn("block h-8 w-8 rounded-sm border", done ? "border-lime bg-band-ink-soft" : "border-band-border")} /> <span className="mt-2 block font-mono text-[9px] text-band-text-muted">{"一二三四五六日"[index]}</span></div>)}
          </div>
        </div>
      </div>
      <div className="mt-12"><h2 className="font-display text-h2 text-band-text">今日為你揀選</h2><div className="mt-6 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">{PROGRAMMES.slice(1).map((item) => <ProgrammeCard key={item.title} item={item} />)}</div></div>
    </div>
  );
}

function LibraryView({ category }: { category: Category }) {
  return (
    <div>
      <div className="flex flex-col gap-5 border-b border-band-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-band-ink">Library</p><h1 className="mt-2 font-display text-display text-band-text">你嘅情報收藏庫</h1><p className="mt-3 text-body-sm text-band-text-secondary">已收藏 12 個專題，同步你關心嘅主題。</p></div>
        <button type="button" className="press inline-flex h-11 items-center gap-2 rounded-md border border-band-border-strong px-4 text-label text-band-text-secondary"><Bookmark className="h-4 w-4" strokeWidth={1.5} />只顯示收藏</button>
      </div>
      <div className="mt-8 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">{PROGRAMMES.filter((item) => category === "為你精選" || item.category === category).map((item) => <ProgrammeCard key={item.title} item={item} />)}</div>
    </div>
  );
}

function AskView() {
  const [question, setQuestion] = useState(QUICK_PROMPTS[0]);
  const [submitted, setSubmitted] = useState(QUICK_PROMPTS[0]);
  const submit = (event: FormEvent) => { event.preventDefault(); if (question.trim()) setSubmitted(question.trim()); };
  return (
    <div className="mx-auto max-w-[940px]">
      <div className="text-center"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-band-ink">Ask AIGRO</p><h1 className="mt-3 text-balance font-display text-display text-band-text">將情報變成你下一步做得到嘅事。</h1><p className="mx-auto mt-4 max-w-[600px] text-body-sm text-band-text-secondary">問 AI 編輯部，或者選擇已驗證專家。答案會標明授權知識、一般知識同引用來源。</p></div>
      <div className="mt-10 overflow-hidden rounded-lg border border-band-border bg-band-surface">
        <div className="flex items-center justify-between border-b border-band-border px-5 py-4"><div className="flex items-center gap-3"><img src="/editorial/platform-dp.png" alt="AIGRO AI 編輯部" className="h-9 w-9 rounded-sm object-cover" /><div><p className="text-label text-band-text">AIGRO AI 編輯部</p><p className="text-caption text-band-text-muted">平台情報庫 · 每 30 分鐘更新</p></div></div><span className="rounded-sm bg-band-ink-soft px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-band-ink">Live</span></div>
        <div className="p-5 sm:p-8"><p className="text-caption text-band-text-muted">你問</p><p className="mt-2 text-body text-band-text">{submitted}</p><div className="mt-6 rounded-md bg-band-card p-5"><p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-band-ink"><Sparkles className="h-4 w-4" strokeWidth={1.5} />來源感知回答</p><p className="mt-4 text-body-sm text-band-text-secondary">最值得測試嘅唔係另一個聊天介面，而係一條有明確輸入、驗收標準同人工覆核嘅工作流程。先用七日量度節省時間，再決定要唔要擴大。</p><button type="button" className="press mt-5 inline-flex items-center gap-2 text-caption text-band-text-secondary"><BookOpen className="h-4 w-4" strokeWidth={1.5} />查看 3 個引用來源</button></div></div>
        <div className="border-t border-band-border p-4 sm:p-5"><div className="mb-3 flex gap-2 overflow-x-auto">{QUICK_PROMPTS.map((prompt) => <button key={prompt} type="button" onClick={() => { setQuestion(prompt); setSubmitted(prompt); }} className="press shrink-0 rounded-sm border border-band-border px-3 py-2 text-caption text-band-text-secondary">{prompt}</button>)}</div><form onSubmit={submit} className="flex items-end gap-2 rounded-md border border-band-border-strong bg-band-bg p-2"><label className="min-w-0 flex-1"><span className="sr-only">問 AIGRO</span><textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={2} className="block w-full resize-none bg-transparent px-3 py-2 text-body-sm text-band-text outline-none" /></label><button type="submit" className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-lime text-on-accent" aria-label="送出問題"><ArrowRight className="h-4 w-4" strokeWidth={2} /></button></form></div>
      </div>
    </div>
  );
}

export default function UXPreview() {
  const [view, setView] = useState<View>("discover");
  const [category, setCategory] = useState<Category>("為你精選");

  return (
    <div className="aigro-preview-light min-h-[100dvh] bg-band-bg pb-20 text-band-text md:pb-0">
      <a href="#preview-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-lime focus:px-4 focus:py-2 focus:text-on-accent">跳到主要內容</a>
      <div className="border-b border-band-border bg-band-bg">
        <div className="mx-auto flex min-h-8 max-w-[1440px] items-center justify-between gap-3 px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.13em] text-band-text-muted sm:px-6">
          <span>Application direction · Mobbin informed</span>
          <span className="hidden sm:inline">Type · Fraunces / Inter / IBM Plex Mono</span>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-band-border bg-band-surface/95 backdrop-blur-md">
        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-5 px-4 sm:px-6">
          <Logo />
          <label className="hidden h-10 w-full max-w-[360px] items-center gap-3 rounded-md border border-band-border bg-band-bg px-3 xl:flex">
            <Search className="h-4 w-4 text-band-text-muted" strokeWidth={1.5} /><span className="sr-only">搜尋情報、專家與主題</span><input className="min-w-0 flex-1 bg-transparent text-body-sm text-band-text outline-none placeholder:text-band-text-muted" placeholder="搜尋情報、專家與主題" />
          </label>
          <nav className="mx-auto hidden h-full items-center gap-7 md:flex" aria-label="Application navigation">
            {VIEWS.map((item) => <NavButton key={item.id} view={item} active={view === item.id} onClick={() => setView(item.id)} />)}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <button type="button" className="press flex h-10 w-10 items-center justify-center rounded-md text-band-text-muted xl:hidden" aria-label="搜尋"><Search className="h-5 w-5" strokeWidth={1.5} /></button>
            <button type="button" className="press hidden h-10 items-center rounded-md border border-band-border-strong px-4 text-label text-band-text sm:inline-flex">Club</button>
            <button type="button" className="press flex h-9 w-9 items-center justify-center rounded-full bg-band-card text-band-text" aria-label="會員選單"><UserRound className="h-4 w-4" strokeWidth={1.5} /></button>
            <button type="button" className="press flex h-10 w-10 items-center justify-center md:hidden" aria-label="更多選項"><Menu className="h-5 w-5" strokeWidth={1.5} /></button>
          </div>
        </div>
      </header>

      <MobileCategories selected={category} onSelect={setCategory} />

      <div className="mx-auto flex max-w-[1440px]">
        <CategoryRail selected={category} onSelect={setCategory} />
        <main id="preview-main" className="min-w-0 flex-1 px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-8 xl:px-10">
          {view === "discover" && <DiscoverView category={category} />}
          {view === "brief" && <BriefView />}
          {view === "library" && <LibraryView category={category} />}
          {view === "ask" && <AskView />}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-band-border bg-band-surface/95 px-2 backdrop-blur-md md:hidden" aria-label="Mobile application navigation">
        {VIEWS.map((item) => <NavButton key={item.id} view={item} active={view === item.id} onClick={() => setView(item.id)} compact />)}
      </nav>
    </div>
  );
}
