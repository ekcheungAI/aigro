import { useState } from "react";
import {
  ArrowDownRight,
  BrainCircuit,
  Check,
  Clipboard,
  Copy,
  Download,
  Eye,
  Image as ImageIcon,
  LayoutTemplate,
  MessageSquareText,
  Palette,
  ShieldCheck,
  Sparkles,
  Type,
  UserRound,
  X,
} from "lucide-react";
import Reveal from "@/components/Reveal";
import { cn } from "@/lib/utils";

const PALETTE = [
  {
    name: "Deep Navy",
    zh: "深海軍藍",
    hex: "#0B132B",
    balance: "35-45%",
    role: "權威、主舞台、淺底版本的 wordmark",
    swatch: "bg-logo-navy text-logo-paper",
  },
  {
    name: "Off White",
    zh: "柔白紙色",
    hex: "#F6F7F9",
    balance: "25-35%",
    role: "閱讀留白、文件基底、內容畫布",
    swatch: "bg-logo-paper text-logo-navy ring-1 ring-inset ring-border",
  },
  {
    name: "Tech Green",
    zh: "科技綠",
    hex: "#10B981",
    balance: "10-15%",
    role: "成長、行動、合作與機會",
    swatch: "bg-logo-green text-logo-navy",
  },
  {
    name: "Bright Blue",
    zh: "明亮藍",
    hex: "#2F6FEB",
    balance: "5-8%",
    role: "AI、知識、資訊與專業能力",
    swatch: "bg-logo-blue text-logo-paper",
  },
  {
    name: "Neutral Gray",
    zh: "中性灰",
    hex: "#6B7280",
    balance: "5-10%",
    role: "輔助文字、邊界與次要資訊",
    swatch: "bg-logo-gray text-logo-paper",
  },
] as const;

const LOGO_RULES = [
  "公開對外物料一律優先用完整三點版本。",
  "淺色背景用海軍藍 wordmark 與人物點；藍、綠點保持原色。",
  "深色背景用白色 wordmark 與人物點；藍、綠點保持原色。",
  "以最小圓點直徑作 1x，所有邊緣預留至少 1x 淨空間。",
] as const;

const NEVER_RULES = [
  "不可拉闊、壓扁、裁切、描邊或重排三個圓點。",
  "不可為 logo 加陰影、光暈、立體效果或裝飾性漸層。",
  "不可在複雜相片或低對比底圖上直接放置 logo。",
  "未有正式 icon 資產前，不可把三點組合當 favicon 或 app icon。",
] as const;

const TYPE_ROLES = [
  {
    name: "品牌標誌",
    family: "官方 artwork",
    use: "標誌必須使用正式向量或核准 PNG，絕不以字體重打或近似。",
  },
  {
    name: "Editorial display",
    family: "Fraunces + Noto Serif TC",
    use: "長篇品牌敘事、重點標題與需要權威感的編輯式內容。",
  },
  {
    name: "UI / corporate",
    family: "Inter + Noto Sans TC",
    use: "介面、提案、caption、雙語訊息與日常操作文字。",
  },
  {
    name: "Data / metadata",
    family: "IBM Plex Mono",
    use: "日期、指標、來源、工具名與版本類資訊。",
  },
] as const;

const APPLICATIONS = [
  {
    icon: ImageIcon,
    title: "社交與內容",
    body: "先讓 logo、單一觀點和一個可核實的證據出現。4:5 圖文以深海軍藍或柔白為舞台，CTA 保持清楚直接。",
    className: "bg-card",
  },
  {
    icon: LayoutTemplate,
    title: "簡報與合作提案",
    body: "封面使用組織 lockup，內容以海軍藍標題和柔白畫布建立節奏。圖表要直接標示數據，不只靠顏色表達。",
    className: "bg-lime-soft",
  },
  {
    icon: ShieldCheck,
    title: "印刷與活動",
    body: "使用組織 lockup，保留最小印刷尺寸與淨空間。量產前確認色彩設定、底色、細字可讀性與最終裁切。",
    className: "bg-surface",
  },
] as const;

const THUMBNAILS = [
  {
    src: "/editorial/thumbnails/agent-delivery.jpg",
    label: "AI 趨勢",
    title: "Agent delivery",
  },
  {
    src: "/editorial/thumbnails/growth-loop.jpg",
    label: "增長策略",
    title: "Repeatable growth",
  },
  {
    src: "/editorial/thumbnails/hong-kong-adoption.jpg",
    label: "香港視角",
    title: "Local adoption",
  },
  {
    src: "/editorial/thumbnails/prompt-workflow.jpg",
    label: "工具評測",
    title: "Prompt to workflow",
  },
  {
    src: "/editorial/thumbnails/model-network.jpg",
    label: "模型發布",
    title: "Model network",
  },
  {
    src: "/editorial/thumbnails/product-console.jpg",
    label: "產品發布",
    title: "Product console",
  },
  {
    src: "/editorial/thumbnails/research-evidence.jpg",
    label: "論文研究",
    title: "Research evidence",
  },
  {
    src: "/editorial/thumbnails/market-signals.jpg",
    label: "市場情報",
    title: "Market signals",
  },
] as const;

const THUMBNAIL_RULES = [
  "固定使用 16:10 主比例，構圖同時要能安全裁成 16:9 與 4:3。",
  "以柔白紙色、近黑、炭灰與自然材質為主；每張最多一個細小綠色焦點。",
  "光線來自單一方向，保留真實紙張、金屬或環境質感，避免過度磨皮與高飽和調色。",
  "縮圖本身不放標題、logo 或 CTA；文字由介面層負責，確保可翻譯與可存取。",
] as const;

const THUMBNAIL_NEVER = [
  "藍紫 AI glow、彩虹漸層、霓虹邊框或發光粒子。",
  "機械手、人手觸碰、發光大腦、電路板與漂浮 hologram。",
  "擺拍握手、誇張表情、假 dashboard 或無關的科技 stock photo。",
  "每張圖使用不同濾鏡、不同色溫或多個搶眼 accent。",
] as const;

const GUIDE_SECTIONS = [
  { href: "#brand-foundation", label: "先定方向", detail: "品牌承諾與視覺性格" },
  { href: "#logo-system", label: "使用 Logo", detail: "版本、淨空間與尺寸" },
  { href: "#colour-balance", label: "分配色彩", detail: "產品 token 與 logo 顏色" },
  { href: "#typography-layout", label: "建立層級", detail: "字體角色與版面規格" },
  { href: "#image-system", label: "製作影像", detail: "縮圖比例與影像禁區" },
  { href: "#voice", label: "寫好訊息", detail: "語氣、descriptor 與限制" },
  { href: "#applications", label: "交付資產", detail: "社交、簡報與印刷" },
  { href: "#release-check", label: "發佈前檢查", detail: "最後一輪 brand QA" },
] as const;

function CopyHex({ hex, name }: { hex: string; name: string }) {
  const [copied, setCopied] = useState(false);

  const copyHex = async () => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copyHex}
      className="press mt-6 inline-flex h-9 items-center gap-2 rounded-md border border-current/25 px-3 text-caption font-medium hover:bg-surface/15"
      aria-label={copied ? `已複製 ${name} 色碼 ${hex}` : `複製 ${name} 色碼 ${hex}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
      )}
      <span className="font-mono text-caption">{copied ? "已複製" : hex}</span>
    </button>
  );
}

function RuleList({
  title,
  rules,
  positive,
}: {
  title: string;
  rules: readonly string[];
  positive: boolean;
}) {
  const Icon = positive ? Check : X;
  return (
    <div className={cn("p-6 sm:p-8", positive ? "bg-lime-soft" : "bg-card")}>
      <h3 className="font-display text-h3 text-text-primary">{title}</h3>
      <ul className="mt-6 space-y-4">
        {rules.map((rule) => (
          <li key={rule} className="flex gap-3 text-body-sm text-text-secondary">
            <Icon
              className={cn("mt-1 h-4 w-4 shrink-0", positive ? "text-lime-text" : "text-error")}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span>{rule}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GuideMap() {
  return (
    <section
      id="guide-map"
      aria-labelledby="guide-map-title"
      className="scroll-mt-20 border-b border-border bg-surface"
    >
      <div className="mx-auto grid max-w-container gap-8 px-6 py-14 md:grid-cols-[0.75fr_1.25fr] md:items-start md:gap-12 md:py-16">
        <Reveal>
          <p className="font-mono text-caption uppercase tracking-wider text-lime-text">Start here</p>
          <h2 id="guide-map-title" className="mt-3 font-display text-h2 text-text-primary">
            先由用途開始
          </h2>
          <p className="mt-4 max-w-prose text-body-sm text-text-secondary">
            這頁是工作指南，不是只供瀏覽的 moodboard。先按你要交付的資產選章節，再用最後的 checklist 做一次檢查。
          </p>
        </Reveal>

        <nav aria-label="品牌指南章節" className="grid gap-px border-y border-border bg-border sm:grid-cols-2">
          {GUIDE_SECTIONS.map((section, index) => (
            <Reveal key={section.href} delay={(index % 2) * 0.06}>
              <a
                href={section.href}
                className="press group block h-full bg-card p-5 hover:bg-surface sm:p-6"
              >
                <span className="font-sans text-label font-medium text-text-primary group-hover:text-ink">
                  {section.label}
                </span>
                <span className="mt-1 block text-caption text-text-secondary">{section.detail}</span>
              </a>
            </Reveal>
          ))}
        </nav>
      </div>
    </section>
  );
}

export default function Branding() {
  return (
    <>
      <section
        aria-labelledby="branding-title"
        className="relative isolate overflow-hidden border-b border-band-border bg-band-bg"
      >
        <div aria-hidden="true" className="stripe-block-dark pointer-events-none absolute inset-y-0 right-0 -z-10 w-[34%] opacity-70" />
        <div className="mx-auto grid max-w-container gap-10 px-6 pb-16 pt-20 md:grid-cols-[1.05fr_0.95fr] md:items-end md:pt-24">
          <Reveal>
            <p className="text-label font-medium text-band-ink">Brand identity</p>
            <h1 id="branding-title" className="mt-4 max-w-[700px] font-display text-display-xl text-band-text max-md:text-display">
              AIGRO 品牌識別
            </h1>
            <p className="mt-6 max-w-[610px] text-body-lg text-band-text-secondary">
              一套讓每個 logo、頁面、合作物料都講同一個故事的準則：人、知識與可實現的成長機會。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#guide-map"
                className="press inline-flex min-h-11 items-center gap-2 rounded-md bg-band-ink-solid px-5 text-label text-on-accent hover:bg-band-ink-hover"
              >
                瀏覽指南
                <ArrowDownRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </a>
              <a
                href="/design.md"
                download="aigro-design.md"
                className="press inline-flex min-h-11 items-center gap-2 rounded-md border border-band-border-strong px-5 text-label text-band-text hover:border-band-ink hover:text-band-ink"
              >
                下載 design.md
                <Download className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </a>
            </div>
          </Reveal>

          <Reveal delay={0.08} className="md:pb-1">
            <figure className="border border-band-border bg-band-surface p-7 sm:p-9">
              <img
                src="/brand/aigro-wordmark-navy-transparent.png"
                alt="AIGRO 海軍藍三點 wordmark"
                width={464}
                height={223}
                className="mx-auto h-auto w-full max-w-[390px] dark:hidden"
              />
              <img
                src="/brand/aigro-wordmark-white-transparent.png"
                alt="AIGRO 白色三點 wordmark"
                width={464}
                height={223}
                className="mx-auto hidden h-auto w-full max-w-[390px] dark:block"
              />
              <figcaption className="mt-6 border-t border-band-border pt-4 text-center text-caption text-band-text-secondary">
                AI Growth · Resources · Opportunities
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      <GuideMap />

      <section
        id="image-system"
        aria-labelledby="image-system-title"
        className="scroll-mt-20 border-y border-border bg-surface"
      >
        <div className="mx-auto max-w-container px-6 py-20 max-md:py-14">
          <Reveal>
            <p className="font-mono text-caption uppercase tracking-wider text-lime-text">
              Image system
            </p>
            <h2 id="image-system-title" className="mt-3 font-display text-h2 text-text-primary">
              Editorial thumbnails
            </h2>
            <p className="mt-4 max-w-prose text-body text-text-secondary">
              縮圖不是裝飾，而是讀者判斷內容類型的第一個線索。所有內容圖使用同一套紙張、近黑物件、自然光與克制綠色焦點，建立一致的出版物辨識。
            </p>
          </Reveal>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {THUMBNAILS.map((thumbnail, index) => (
              <Reveal key={thumbnail.src} delay={(index % 2) * 0.06}>
                <figure className="overflow-hidden border border-border bg-card">
                  <img
                    src={thumbnail.src}
                    alt={`${thumbnail.label}縮圖示例：${thumbnail.title}`}
                    width={1586}
                    height={992}
                    loading="lazy"
                    className="aspect-[16/10] w-full object-cover"
                  />
                  <figcaption className="flex items-center justify-between gap-4 border-t border-border bg-surface px-5 py-4">
                    <span className="font-mono text-caption uppercase tracking-wider text-lime-text">
                      {thumbnail.label}
                    </span>
                    <span className="text-caption text-text-muted">{thumbnail.title}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>

          <div className="mt-10 grid gap-px border-y border-border bg-border md:grid-cols-2">
            <Reveal>
              <RuleList title="影像原則" rules={THUMBNAIL_RULES} positive />
            </Reveal>
            <Reveal delay={0.08}>
              <RuleList title="禁止影像語言" rules={THUMBNAIL_NEVER} positive={false} />
            </Reveal>
          </div>
        </div>
      </section>

      <section
        id="brand-foundation"
        aria-labelledby="brand-foundation-title"
        className="scroll-mt-20 mx-auto max-w-container px-6 py-20 max-md:py-14"
      >
        <Reveal>
          <p className="max-w-prose text-body-lg text-text-secondary">
            AIGRO 是香港的 AI、增長與商業情報平台。視覺系統以清晰、可信和前進感為核心，不把技術包裝成距離感，而是讓人知道下一步可以做甚麼。
          </p>
        </Reveal>

        <div className="mt-12 grid border-y border-border md:grid-cols-[1.25fr_0.75fr]">
          <Reveal className="border-b border-border p-7 md:border-b-0 md:border-r md:p-10">
            <h2 id="brand-foundation-title" className="font-display text-h2 text-text-primary">品牌承諾</h2>
            <p className="mt-4 max-w-[560px] text-body text-text-secondary">
              將可信賴的人、相關的 AI 知識和真正有用的資源連接起來，令機會由抽象概念變成可以採取的行動。
            </p>
          </Reveal>
          <Reveal delay={0.08} className="bg-card p-7 md:p-10">
            <p className="font-mono text-caption uppercase tracking-wider text-text-muted">Visual character</p>
            <p className="mt-4 font-display text-h3 text-text-primary">可信、克制、樂觀。</p>
            <p className="mt-3 text-body-sm text-text-secondary">科技必須有人味，商業感必須有根據。</p>
          </Reveal>
        </div>
      </section>

      <section
        id="logo-system"
        aria-labelledby="logo-system-title"
        className="scroll-mt-20 border-y border-border bg-surface"
      >
        <div className="mx-auto max-w-container px-6 py-20 max-md:py-14">
          <Reveal>
            <h2 id="logo-system-title" className="font-display text-h2 text-text-primary">Logo system</h2>
            <p className="mt-4 max-w-prose text-body text-text-secondary">
              三點版本是公開物料的主版本。字標負責辨識，三個圓點則依序說明 AIGRO 的人本、知識與成長邏輯。
            </p>
          </Reveal>

          <div className="mt-10 grid gap-px border border-border bg-border md:grid-cols-2">
            <Reveal className="bg-logo-paper p-7 sm:p-10">
              <img
                src="/brand/aigro-wordmark-navy-transparent.png"
                alt="AIGRO 海軍藍三點 wordmark"
                width={464}
                height={223}
                loading="lazy"
                className="mx-auto h-auto w-full max-w-[410px]"
              />
              <p className="mt-7 text-caption text-logo-gray">淺色背景：海軍藍 wordmark 與人物點，藍色及綠色點保持原色。</p>
            </Reveal>
            <Reveal delay={0.08} className="bg-logo-navy p-7 sm:p-10">
              <img
                src="/brand/aigro-wordmark-white-transparent.png"
                alt="AIGRO 白色三點 wordmark"
                width={464}
                height={223}
                loading="lazy"
                className="mx-auto h-auto w-full max-w-[410px]"
              />
              <p className="mt-7 text-caption text-logo-paper/80">深色背景：白色 wordmark 與人物點，藍色及綠色點保持原色。</p>
            </Reveal>
          </div>

          <div className="mt-12 grid gap-px border-y border-border bg-border md:grid-cols-2">
            <Reveal>
              <figure className="bg-logo-paper p-8 sm:p-12">
                <div className="relative border border-logo-gray/40 p-10 sm:p-14">
                  <span className="absolute left-3 top-3 font-mono text-[11px] text-logo-gray">1x clear space</span>
                  <img
                    src="/brand/aigro-wordmark-navy-transparent.png"
                    alt="AIGRO wordmark 的 1x 淨空間示例"
                    width={464}
                    height={223}
                    loading="lazy"
                    className="mx-auto h-auto w-full max-w-[350px]"
                  />
                </div>
                <figcaption className="mt-5 text-caption text-logo-gray">
                  以最小圓點直徑定義 1x。任何文字、圖像、邊線或合作方標誌都不可侵入這個空間。
                </figcaption>
              </figure>
            </Reveal>
            <Reveal delay={0.08} className="p-7 sm:p-10">
              <h3 className="font-display text-h3 text-text-primary">尺寸與位置</h3>
              <dl className="mt-6 space-y-5 text-body-sm">
                <div>
                  <dt className="font-medium text-text-primary">數碼 primary logo</dt>
                  <dd className="mt-1 text-text-secondary">最少 160 px 寬。</dd>
                </div>
                <div>
                  <dt className="font-medium text-text-primary">數碼 organization lockup</dt>
                  <dd className="mt-1 text-text-secondary">最少 220 px 寬，descriptor 必須清晰可讀。</dd>
                </div>
                <div>
                  <dt className="font-medium text-text-primary">印刷 primary logo</dt>
                  <dd className="mt-1 text-text-secondary">最少 32 mm 寬，生產前做最小尺寸 proof。</dd>
                </div>
                <div>
                  <dt className="font-medium text-text-primary">構圖</dt>
                  <dd className="mt-1 text-text-secondary">對齊版面網格，留足邊距，不可隨意浮在畫面中央。</dd>
                </div>
              </dl>
            </Reveal>
          </div>

          <div className="mt-12 grid gap-px border-y border-border bg-border md:grid-cols-2">
            <Reveal><RuleList title="正確做法" rules={LOGO_RULES} positive /></Reveal>
            <Reveal delay={0.08}><RuleList title="不可這樣做" rules={NEVER_RULES} positive={false} /></Reveal>
          </div>
        </div>
      </section>

      <section
        id="colour-balance"
        aria-labelledby="colour-balance-title"
        className="scroll-mt-20 mx-auto max-w-container px-6 py-20 max-md:py-14"
      >
        <Reveal>
          <h2 id="colour-balance-title" className="font-display text-h2 text-text-primary">Colour balance</h2>
          <p className="mt-4 max-w-prose text-body text-text-secondary">
            色彩比重是整體視覺的重量分配，不代表每個資產都要同時使用五種顏色。海軍藍和柔白承托閱讀，綠和藍各自保留明確意義。
          </p>
          <p className="mt-3 max-w-prose text-caption text-text-muted">
            注意：logo 的藍綠色只屬品牌 artwork 與示意圖。產品介面、按鈕和 active 狀態統一使用 AIGRO brand green token。
          </p>
        </Reveal>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {PALETTE.map((color, index) => (
            <Reveal key={color.hex} delay={(index % 5) * 0.04}>
              <article className={cn("min-h-[230px] p-6", color.swatch)}>
                <p className="font-mono text-[11px] uppercase tracking-wider opacity-75">{color.balance}</p>
                <h3 className="mt-7 text-h4 font-semibold">{color.name}</h3>
                <p className="mt-1 text-caption opacity-80">{color.zh}</p>
                <p className="mt-5 text-body-sm leading-relaxed opacity-90">{color.role}</p>
                <CopyHex hex={color.hex} name={color.name} />
              </article>
            </Reveal>
          ))}
        </div>

        <div className="mt-12 grid gap-px border-y border-border bg-border md:grid-cols-[1fr_1fr]">
          <Reveal className="p-7 sm:p-10">
            <Palette className="h-5 w-5 text-lime-text" strokeWidth={1.5} aria-hidden="true" />
            <h3 className="mt-5 font-display text-h3 text-text-primary">綠色代表前進</h3>
            <p className="mt-3 text-body-sm text-text-secondary">用於成長、完成、行動和機會。在數碼產品中，互動狀態仍以 AIGRO 綠色 token 為唯一主動作色。</p>
          </Reveal>
          <Reveal delay={0.08} className="bg-card p-7 sm:p-10">
            <BrainCircuit className="h-5 w-5 text-logo-blue" strokeWidth={1.5} aria-hidden="true" />
            <h3 className="mt-5 font-display text-h3 text-text-primary">藍色代表知識</h3>
            <p className="mt-3 text-body-sm text-text-secondary">用於 AI、資料、資訊和專業能力的語義提示。它是標誌與品牌內容的知識訊號，不應變成沒有目的的 UI 裝飾。</p>
          </Reveal>
        </div>
      </section>

      <section
        id="three-dots"
        aria-labelledby="three-dots-title"
        className="scroll-mt-20 border-y border-border bg-card"
      >
        <div className="mx-auto max-w-container px-6 py-20 max-md:py-14">
          <Reveal>
            <h2 id="three-dots-title" className="font-display text-h2 text-text-primary">The three dots</h2>
            <p className="mt-4 max-w-prose text-body text-text-secondary">每個圓點都有用途。三點並置時，正好講完 AIGRO 的完整價值鏈。</p>
          </Reveal>

          <div className="mt-10 grid border-y border-border bg-border md:grid-cols-3">
            <Reveal className="bg-card p-7 sm:p-9">
              <UserRound className="h-6 w-6 text-logo-navy" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="mt-7 font-display text-h3 text-text-primary">People / Individual</h3>
              <p className="mt-3 text-body-sm text-text-secondary">深海軍藍或深色底上的白點。代表每一位加入 AIGRO、需要可信引導的人。</p>
            </Reveal>
            <Reveal delay={0.08} className="bg-surface p-7 sm:p-9">
              <BrainCircuit className="h-6 w-6 text-logo-blue" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="mt-7 font-display text-h3 text-text-primary">AI / Knowledge</h3>
              <p className="mt-3 text-body-sm text-text-secondary">明亮藍點代表科技、資訊、工具和專業能力，讓資訊不止停留在新聞層面。</p>
            </Reveal>
            <Reveal delay={0.16} className="bg-lime-soft p-7 sm:p-9">
              <ArrowDownRight className="h-6 w-6 text-logo-green" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="mt-7 font-display text-h3 text-text-primary">Growth / Opportunities</h3>
              <p className="mt-3 text-body-sm text-text-secondary">科技綠點代表成長、資源、合作和可落地的機會。方向必須是可實行，而非空泛的願景。</p>
            </Reveal>
          </div>
        </div>
      </section>

      <section
        id="typography-layout"
        aria-labelledby="typography-layout-title"
        className="scroll-mt-20 mx-auto max-w-container px-6 py-20 max-md:py-14"
      >
        <Reveal>
          <h2 id="typography-layout-title" className="font-display text-h2 text-text-primary">Typography & layout</h2>
          <p className="mt-4 max-w-prose text-body text-text-secondary">排版要讓資訊有份量而不顯得遙遠。襯線只用於有編輯價值的重點，日常閱讀和操作則以清晰的無襯線字體完成。</p>
        </Reveal>

        <div className="mt-12 grid gap-px border-y border-border bg-border lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal className="bg-band-bg p-8 sm:p-12">
            <Type className="h-5 w-5 text-band-ink" strokeWidth={1.5} aria-hidden="true" />
            <p className="mt-10 font-display text-display text-band-text">可靠的資訊，要有清晰的聲音。</p>
            <p className="mt-8 font-mono text-caption text-band-text-muted">Editorial display sample</p>
          </Reveal>
          <Reveal delay={0.08} className="bg-surface p-7 sm:p-10">
            <div className="space-y-6">
              {TYPE_ROLES.map((role) => (
                <div key={role.name} className="grid gap-2 border-b border-border pb-6 last:border-b-0 last:pb-0 sm:grid-cols-[150px_1fr]">
                  <p className="font-medium text-text-primary">{role.name}</p>
                  <div>
                    <p className="font-mono text-caption text-lime-text">{role.family}</p>
                    <p className="mt-1.5 text-body-sm text-text-secondary">{role.use}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <Reveal>
            <h3 className="font-display text-h3 text-text-primary">版面語言</h3>
            <p className="mt-4 max-w-prose text-body-sm text-text-secondary">以編輯式網格、清楚層級和有節制的留白建立信任。卡片只在需要層級時出現，其他情況優先使用邊線、間距與內容次序。</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="border border-border p-5">
                <LayoutTemplate className="h-5 w-5 text-lime-text" strokeWidth={1.5} aria-hidden="true" />
                <p className="mt-4 font-medium text-text-primary">網格優先</p>
                <p className="mt-2 text-caption text-text-secondary">桌面採 1200 px 容器與 24 px gutter；手機收合為單欄。</p>
              </div>
              <div className="border border-border p-5">
                <Eye className="h-5 w-5 text-lime-text" strokeWidth={1.5} aria-hidden="true" />
                <p className="mt-4 font-medium text-text-primary">可讀優先</p>
                <p className="mt-2 text-caption text-text-secondary">中文 body 不低於 13 px，長文行寬不超過 44 rem。</p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="border-l-[3px] border-l-lime bg-lime-soft p-7">
              <Sparkles className="h-5 w-5 text-lime-text" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="mt-5 font-display text-h3 text-text-primary">動態原則</h3>
              <p className="mt-3 text-body-sm text-text-secondary">畫面應像印刷品般穩定。只在閱讀層級、互動回饋或狀態轉換需要時使用短暫動效；減少動態設定下必須保留完整可讀性。</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section
        id="voice"
        aria-labelledby="voice-title"
        className="scroll-mt-20 border-y border-border bg-surface"
      >
        <div className="mx-auto max-w-container px-6 py-20 max-md:py-14">
          <Reveal>
            <h2 id="voice-title" className="font-display text-h2 text-text-primary">Voice & messages</h2>
            <p className="mt-4 max-w-prose text-body text-text-secondary">AIGRO 說話有根據、有下一步，也尊重香港讀者的語境。不是製造焦慮，而是令複雜選項更容易判斷。</p>
          </Reveal>

          <div className="mt-10 grid gap-px border-y border-border bg-border md:grid-cols-2">
            <Reveal className="bg-lime-soft p-7 sm:p-10">
              <MessageSquareText className="h-5 w-5 text-lime-text" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="mt-5 font-display text-h3 text-text-primary">聲音應該是</h3>
              <ul className="mt-6 space-y-3 text-body-sm text-text-secondary">
                <li>可信：具體、有來源、交代限制。</li>
                <li>有用：每段訊息都幫讀者判斷或行動。</li>
                <li>人本：直接、尊重、明白本地脈絡。</li>
                <li>前進：對能力保持樂觀，對成本保持誠實。</li>
              </ul>
            </Reveal>
            <Reveal delay={0.08} className="bg-card p-7 sm:p-10">
              <Clipboard className="h-5 w-5 text-error" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="mt-5 font-display text-h3 text-text-primary">不要變成</h3>
              <ul className="mt-6 space-y-3 text-body-sm text-text-secondary">
                <li>只追 trend 或滿是誇張承諾的 hype。</li>
                <li>可以講白話卻故意賣弄的技術術語。</li>
                <li>冷冰冰的企業黑話或 generic startup 口吻。</li>
                <li>忽略人類判斷與執行成本的 AI 許諾。</li>
              </ul>
            </Reveal>
          </div>

          <Reveal delay={0.12}>
            <div className="mt-10 border-l-[3px] border-l-logo-blue bg-card p-7 sm:p-8">
              <p className="font-mono text-caption uppercase tracking-wider text-logo-blue">Approved descriptor</p>
              <p className="mt-3 font-display text-h3 text-text-primary">AI Growth · Resources · Opportunities</p>
              <p className="mt-3 max-w-prose text-body-sm text-text-secondary">這句英文 descriptor 是正式組織 lockup 的一部分。需要中文說明時，另作輔助 copy，不可重繪或取代正式 lockup。</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section
        id="applications"
        aria-labelledby="applications-title"
        className="scroll-mt-20 mx-auto max-w-container px-6 py-20 max-md:py-14"
      >
        <Reveal>
          <h2 id="applications-title" className="font-display text-h2 text-text-primary">Applications</h2>
          <p className="mt-4 max-w-prose text-body text-text-secondary">每一個對外 touchpoint 都應在一秒內讓人辨認出 AIGRO，然後用一個具體訊息或證據讓人繼續看下去。</p>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {APPLICATIONS.map((application, index) => (
            <Reveal
              key={application.title}
              delay={index * 0.06}
              className={cn(
                "border border-border p-7 sm:p-9",
                application.className,
                index === 0 && "md:col-span-2 md:grid md:grid-cols-[0.8fr_1.2fr] md:items-center md:gap-8"
              )}
            >
              <application.icon className="h-5 w-5 text-lime-text" strokeWidth={1.5} aria-hidden="true" />
              <div className={cn(index === 0 && "md:max-w-[560px]") }>
                <h3 className="mt-6 font-display text-h3 text-text-primary">{application.title}</h3>
                <p className="mt-3 text-body-sm text-text-secondary">{application.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.12}>
          <div className="mt-12 grid gap-px border-y border-border bg-border md:grid-cols-[1fr_1fr]">
            <div className="bg-surface p-7 sm:p-10">
              <h3 className="font-display text-h3 text-text-primary">合作品牌</h3>
              <p className="mt-4 text-body-sm text-text-secondary">以細海軍藍線或「in partnership with」清楚分隔雙方 logo。比對視覺高度，不只比闊度，並為兩方各自保留淨空間。</p>
            </div>
            <div className="bg-card p-7 sm:p-10">
              <h3 className="font-display text-h3 text-text-primary">資產交付</h3>
              <p className="mt-4 text-body-sm text-text-secondary">數碼用 SVG，印刷供應 PDF/EPS，受控 raster placement 才使用 PNG。命名按 variant 和 background，例如 aigro-primary-light。</p>
            </div>
          </div>
        </Reveal>
      </section>

      <section
        id="release-check"
        aria-labelledby="release-check-title"
        className="scroll-mt-20 border-t border-border bg-band-bg"
      >
        <div className="mx-auto grid max-w-container gap-10 px-6 py-16 md:grid-cols-[0.85fr_1.15fr] md:items-start">
          <Reveal>
            <h2 id="release-check-title" className="font-display text-h2 text-band-text">Brand release check</h2>
            <p className="mt-4 max-w-[420px] text-body text-band-text-secondary">公開之前，確認標誌、語氣、對比度和最小尺寸都在同一套標準內。</p>
          </Reveal>
          <Reveal delay={0.08}>
            <ul className="grid gap-x-8 gap-y-4 text-body-sm text-band-text-secondary sm:grid-cols-2">
              {[
                "使用了正確背景的正式三點 logo variant。",
                "保留 1x 淨空間並符合最小尺寸。",
                "海軍藍、柔白、藍、綠的角色清楚不混亂。",
                "訊息具體、有根據，適合目標香港讀者。",
                "中英文的字體、用語和 hierarchy 一致。",
                "最後完成 contrast、裁切和最小尺寸檢查。",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-band-ink" strokeWidth={1.5} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>
    </>
  );
}
