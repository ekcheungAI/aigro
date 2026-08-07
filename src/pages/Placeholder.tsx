import { Link } from "react-router-dom";
import { ArrowLeft, Newspaper } from "lucide-react";
import Reveal from "@/components/Reveal";

interface PlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
}

/** Route stub — page agents replace these with full implementations. */
export default function Placeholder({ eyebrow, title, description }: PlaceholderProps) {
  return (
    <section className="mx-auto max-w-container px-6 py-24 max-md:py-16">
      <Reveal>
        {/* 404 中央插畫 — 即時頁,唔 lazy load */}
        <img
          src="/editorial/optimized/404-tear.jpg"
          alt="404 找不到頁面插畫"
          width={1429}
          height={972}
          className="mx-auto w-full max-w-md rounded-md"
        />
        <p className="mt-8 text-overline font-sans uppercase text-text-muted">{eyebrow}</p>
        <h1 className="mt-2 font-display text-display text-text-primary">{title}</h1>
        <p className="mt-4 max-w-[640px] text-body-lg text-text-secondary">
          {description}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/"
            className="press inline-flex h-11 items-center gap-2 rounded-md bg-ink-solid px-5 text-label text-on-accent hover:bg-ink-hover"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            返回首頁
          </Link>
          <Link
            to="/insights"
            className="press inline-flex h-11 items-center gap-2 rounded-md border border-border-strong px-5 text-label text-ink hover:bg-ink-soft"
          >
            <Newspaper className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            瀏覽最新情報
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
