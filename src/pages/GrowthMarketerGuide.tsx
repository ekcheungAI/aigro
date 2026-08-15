import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  Instagram,
  LockKeyhole,
  LogIn,
  UserPlus,
} from "lucide-react";
import useMember from "@/hooks/useMember";
import replayDocument from "@/data/growth-marketer-replay.html?raw";

const GUIDE_PATH = "/guides/100x-ai-growth-marketer";
const INSTAGRAM_URL = "https://www.instagram.com/aigro.hk/";
const REPLAY_ASSET_PREFIX = `${GUIDE_PATH}/images/`;

function extract(source: string, pattern: RegExp) {
  return source.match(pattern)?.[1] ?? "";
}

const replayStyles = [...replayDocument.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
  .map((match) => match[1] ?? "")
  .join("\n")
  .replaceAll(":root", ":host")
  .replace(/\bhtml\s*\{/g, ":host{")
  .replace(/\bbody\s*\{/g, ":host{");

const replayMarkup = [
  extract(replayDocument, /<main id="top">([\s\S]*?)<\/main>/i),
  extract(replayDocument, /(<div class="lightbox"[\s\S]*?<\/div>)/i),
]
  .join("\n")
  .replace(
    /(src|data-lightbox-src)="images\//g,
    `$1="${REPLAY_ASSET_PREFIX}`
  );

const aigroReplayStyles = String.raw`
  :host {
    --aigro-bg: hsl(var(--bg));
    --aigro-surface: hsl(var(--surface));
    --aigro-card: hsl(var(--card));
    --aigro-text-primary: hsl(var(--text-primary));
    --aigro-text-secondary: hsl(var(--text-secondary));
    --aigro-text-muted: hsl(var(--text-muted));
    --aigro-border: hsl(var(--border));
    --aigro-border-strong: hsl(var(--border-strong));
    --aigro-lime: hsl(var(--lime));
    --aigro-lime-text: hsl(var(--lime-text));
    --aigro-lime-soft: hsl(var(--lime-soft));
    --aigro-on-accent: hsl(var(--on-accent));
    display: block;
    width: 100%;
    padding-bottom: 0;
    background: var(--aigro-bg);
    color: var(--aigro-text-primary);
    font-family: var(--font-sans);
  }

  .aigro-replay-content {
    min-width: 0;
    overflow: hidden;
    background: var(--aigro-bg);
    color: var(--aigro-text-primary);
    font-family: var(--font-sans);
  }

  .aigro-replay-content h1,
  .aigro-replay-content h2,
  .aigro-replay-content h3,
  .aigro-replay-content h4 {
    font-family: var(--font-display);
    font-feature-settings: "palt";
  }

  .aigro-replay-content a {
    color: var(--aigro-lime-text);
    font-weight: 600;
  }

  .aigro-replay-content a:hover {
    color: var(--aigro-lime);
  }

  .aigro-replay-content a:focus-visible,
  .aigro-replay-content button:focus-visible {
    outline: 2px solid var(--aigro-lime);
    outline-offset: 3px;
  }

  .aigro-replay-content .hero {
    background: var(--aigro-bg);
    border-bottom: 1px solid var(--aigro-border);
    color: var(--aigro-text-primary);
    padding: 112px 0 80px;
  }

  .aigro-replay-content .hero::after {
    display: none;
  }

  .aigro-replay-content .hero-inner {
    width: min(1200px, calc(100% - 48px));
    max-width: none;
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);
    column-gap: 72px;
    align-items: start;
  }

  .aigro-replay-content .hero .eyebrow {
    grid-column: 1 / -1;
    margin-bottom: 20px;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.12em;
  }

  .aigro-replay-content .hero h1 {
    grid-column: 1;
    color: var(--aigro-text-primary);
    max-width: 800px;
    margin: 0 0 24px;
    font-size: clamp(3rem, 5.2vw, 4.8rem);
    line-height: 1.03;
    letter-spacing: -0.035em;
  }

  .aigro-replay-content .hero p {
    color: var(--aigro-text-secondary);
  }

  .aigro-replay-content .hero-inner > p:not(.eyebrow):not(.hero-note) {
    grid-column: 1;
    max-width: 700px;
    margin: 0;
    font-size: clamp(1.05rem, 1.5vw, 1.2rem);
    line-height: 1.75;
  }

  .aigro-replay-content .eyebrow,
  .aigro-replay-content .course-sales__eyebrow,
  .aigro-replay-content .course-route-card__label {
    color: var(--aigro-lime-text);
  }

  .aigro-replay-content .hero .hero-note {
    grid-column: 2;
    grid-row: 2 / span 3;
    align-self: stretch;
    margin: 0;
    padding: 20px 22px;
    border-left: 2px solid var(--aigro-lime);
    background: var(--aigro-card);
    color: var(--aigro-text-primary);
    font-size: 0.9rem;
    font-weight: 500;
    line-height: 1.7;
  }

  .aigro-replay-content .hero-note-label {
    display: block;
    margin-bottom: 12px;
    color: var(--aigro-lime-text);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.12em;
  }

  .aigro-replay-content .hero-facts {
    grid-column: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 0;
    max-width: 700px;
    margin: 28px 0 0;
    padding: 16px 0 0;
    border-top: 1px solid var(--aigro-border);
    list-style: none;
  }

  .aigro-replay-content .hero-facts li {
    display: grid;
    gap: 2px;
    min-width: 0;
    padding: 0 20px;
  }

  .aigro-replay-content .hero-facts li:first-child {
    padding-left: 0;
  }

  .aigro-replay-content .hero-facts li + li {
    border-left: 1px solid var(--aigro-border);
  }

  .aigro-replay-content .hero-facts strong {
    color: var(--aigro-text-primary);
    font-family: var(--font-mono);
    font-size: 0.95rem;
    font-weight: 500;
    line-height: 1.4;
  }

  .aigro-replay-content .hero-facts span {
    color: var(--aigro-text-muted);
    font-size: 0.75rem;
    line-height: 1.45;
  }

  .aigro-replay-content .hero-actions {
    grid-column: 1;
    margin-top: 24px;
  }

  .aigro-replay-content .hero-replay-button {
    min-height: 48px;
    padding: 12px 18px;
    border-color: var(--aigro-lime);
    border-radius: 6px;
    background: var(--aigro-lime);
    color: var(--aigro-on-accent);
    font-family: var(--font-sans);
    font-size: 0.9rem;
    font-weight: 600;
    box-shadow: none;
  }

  .aigro-replay-content .hero-replay-button:hover {
    background: hsl(var(--lime-hover));
    color: var(--aigro-on-accent);
  }

  .aigro-replay-content .hero-replay-button span {
    display: none;
  }

  .aigro-replay-content .course-sales {
    border-color: var(--aigro-border);
    border-radius: 8px;
    background: var(--aigro-surface);
    box-shadow: none;
  }

  .aigro-replay-content .course-sales::before {
    height: 2px;
    background: var(--aigro-lime);
  }

  .aigro-replay-content .course-sales--start {
    width: min(1200px, calc(100% - 48px));
    display: grid;
    grid-template-columns: minmax(0, 0.85fr) minmax(440px, 1.15fr);
    gap: 48px;
    align-items: center;
    margin-top: 48px;
    padding: 32px;
  }

  .aigro-replay-content .course-sales--start .course-sales__intro {
    display: block;
    margin: 0;
  }

  .aigro-replay-content .course-sales--start .course-sales__intro > div {
    max-width: 32rem;
  }

  .aigro-replay-content .course-sales--start .course-sales__intro > p:last-child {
    max-width: 34rem;
    margin: 20px 0 0;
    font-size: 0.95rem;
    line-height: 1.7;
  }

  .aigro-replay-content .course-sales--start h2 {
    margin: 8px 0 0;
    font-size: clamp(1.8rem, 3vw, 2.45rem);
    line-height: 1.18;
    letter-spacing: -0.02em;
  }

  .aigro-replay-content .course-sales--start .course-series-hero {
    margin: 0;
  }

  .aigro-replay-content .course-sales--start .course-series-hero img {
    aspect-ratio: 1.92;
  }

  .aigro-replay-content .course-sales--start .course-series-hero span {
    right: 12px;
    bottom: 12px;
    padding: 9px 12px;
    font-family: var(--font-sans);
    font-size: 0.78rem;
    font-weight: 600;
  }

  .aigro-replay-content .course-sales--start .course-route-grid,
  .aigro-replay-content .course-sales--start .course-offer-strip,
  .aigro-replay-content .course-sales--start .course-benefits,
  .aigro-replay-content .course-sales--start .course-sales__note {
    display: none;
  }

  .aigro-replay-content .course-sales--end {
    border-color: var(--aigro-border);
    background: var(--aigro-surface);
    color: var(--aigro-text-primary);
  }

  .aigro-replay-content .course-sales h2,
  .aigro-replay-content .course-sales--end h2 {
    color: var(--aigro-text-primary);
  }

  .aigro-replay-content .course-sales__intro p:last-child,
  .aigro-replay-content .course-sales--end .course-sales__intro p:last-child,
  .aigro-replay-content .course-sales__note,
  .aigro-replay-content .course-sales--end .course-sales__note {
    color: var(--aigro-text-secondary);
  }

  .aigro-replay-content .course-series-hero,
  .aigro-replay-content .course-route-card,
  .aigro-replay-content .toc,
  .aigro-replay-content .media-card,
  .aigro-replay-content .table-wrap,
  .aigro-replay-content .read-next {
    border-color: var(--aigro-border);
    border-radius: 8px;
    background: var(--aigro-surface);
    box-shadow: none;
  }

  .aigro-replay-content .course-series-hero {
    background: var(--aigro-card);
  }

  .aigro-replay-content .course-series-hero span {
    border-radius: 4px;
    background: var(--aigro-lime);
    color: var(--aigro-on-accent);
    box-shadow: none;
  }

  .aigro-replay-content .course-route-card h3,
  .aigro-replay-content .course-route-card p:last-child,
  .aigro-replay-content .course-sales--end .course-route-card p {
    color: var(--aigro-text-primary);
  }

  .aigro-replay-content .course-route-card p:last-child,
  .aigro-replay-content .course-sales--end .course-route-card p,
  .aigro-replay-content .course-price span,
  .aigro-replay-content .course-price del {
    color: var(--aigro-text-secondary);
  }

  .aigro-replay-content .course-route-card li,
  .aigro-replay-content .course-benefits span {
    border-radius: 4px;
    border-color: var(--aigro-border);
    background: var(--aigro-lime-soft);
    color: var(--aigro-lime-text);
  }

  .aigro-replay-content .course-price {
    border-color: var(--aigro-border);
  }

  .aigro-replay-content .course-price strong,
  .aigro-replay-content .course-offer-price strong {
    color: var(--aigro-lime-text);
  }

  .aigro-replay-content .course-card-button,
  .aigro-replay-content .course-offer-strip > a {
    border: 1px solid var(--aigro-lime);
    border-radius: 6px;
    background: var(--aigro-lime);
    color: var(--aigro-on-accent);
  }

  .aigro-replay-content .course-card-button:hover,
  .aigro-replay-content .course-offer-strip > a:hover {
    background: hsl(var(--lime-hover));
    color: var(--aigro-on-accent);
  }

  .aigro-replay-content .course-offer-strip {
    border: 1px solid var(--aigro-border);
    border-radius: 8px;
    background: var(--aigro-lime-soft);
    color: var(--aigro-text-primary);
  }

  .aigro-replay-content .course-offer-strip span,
  .aigro-replay-content .course-offer-price small,
  .aigro-replay-content .course-offer-price del {
    color: var(--aigro-text-secondary);
  }

  .aigro-replay-content .student-route-section {
    margin: 64px 0 76px;
    padding: 28px 0 0;
    border-top: 2px solid var(--aigro-lime);
  }

  .aigro-replay-content .student-route-section > h1 {
    margin: 0 0 16px;
    padding: 0;
    border: 0;
    color: var(--aigro-text-primary);
    font-size: clamp(2rem, 4vw, 3rem);
    line-height: 1.15;
    letter-spacing: -0.03em;
  }

  .aigro-replay-content .student-route-section > p {
    max-width: 44rem;
    color: var(--aigro-text-secondary);
  }

  .aigro-replay-content .student-route-lead {
    margin: 0 0 24px;
    padding: 16px 18px;
    border: 1px solid var(--aigro-border);
    border-left: 2px solid var(--aigro-lime);
    border-radius: 0 8px 8px 0;
    background: var(--aigro-lime-soft);
    color: var(--aigro-text-primary);
  }

  .aigro-replay-content .student-route-lead p {
    margin: 0;
    color: var(--aigro-text-primary);
  }

  .aigro-replay-content .student-route-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    margin: 28px 0 20px;
  }

  .aigro-replay-content .student-route-card {
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--aigro-border);
    border-radius: 8px;
    background: var(--aigro-surface);
    box-shadow: none;
  }

  .aigro-replay-content .student-route-card figure {
    margin: 0;
    border-bottom: 1px solid var(--aigro-border);
    background: var(--aigro-card);
  }

  .aigro-replay-content .student-route-card figure img {
    width: 100%;
    aspect-ratio: 1.78;
    object-fit: cover;
  }

  .aigro-replay-content .student-route-card figure figcaption {
    padding: 9px 12px;
    color: var(--aigro-text-muted);
    font-size: 0.75rem;
    line-height: 1.5;
  }

  .aigro-replay-content .student-route-card__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 18px;
  }

  .aigro-replay-content .student-route-card__step {
    margin: 0;
    color: var(--aigro-lime-text);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.08em;
  }

  .aigro-replay-content .student-route-card h2 {
    margin: 8px 0 10px;
    color: var(--aigro-text-primary);
    font-size: 1.18rem;
    line-height: 1.35;
    letter-spacing: -0.015em;
  }

  .aigro-replay-content .student-route-card p,
  .aigro-replay-content .student-route-card ul {
    color: var(--aigro-text-secondary);
    font-size: 0.86rem;
  }

  .aigro-replay-content .student-route-card figure > a {
    display: block;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
  }

  .aigro-replay-content .student-route-card figure > a:hover {
    background: transparent;
  }

  .aigro-replay-content .student-route-card__body > a {
    margin-top: auto;
    padding: 10px 12px;
    border: 1px solid var(--aigro-lime);
    border-radius: 6px;
    background: var(--aigro-lime);
    color: var(--aigro-on-accent);
    font-family: var(--font-sans);
    font-size: 0.8rem;
    font-weight: 600;
  }

  .aigro-replay-content .student-route-card__body > a:hover {
    border-color: hsl(var(--lime-hover));
    background: hsl(var(--lime-hover));
    color: var(--aigro-on-accent);
  }

  .aigro-replay-content .student-route-note {
    margin: 18px 0 0;
    padding: 14px 16px;
    border: 1px solid var(--aigro-border);
    border-radius: 8px;
    background: var(--aigro-card);
    color: var(--aigro-text-secondary);
    font-size: 0.87rem;
  }

  .aigro-replay-content .advoo-section {
    margin: 40px 0 36px;
    padding: 28px;
    border: 1px solid var(--aigro-border);
    border-radius: 8px;
    background: var(--aigro-surface);
    box-shadow: none;
  }

  .aigro-replay-content .advoo-section h2 {
    margin: 0 0 12px;
    color: var(--aigro-text-primary);
    font-size: clamp(1.55rem, 3vw, 2.2rem);
  }

  .aigro-replay-content .advoo-section > p {
    color: var(--aigro-text-secondary);
  }

  .aigro-replay-content .advoo-section__eyebrow {
    margin: 0 0 6px;
    color: var(--aigro-lime-text);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.1em;
  }

  .aigro-replay-content .advoo-section__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin: 22px 0;
  }

  .aigro-replay-content .advoo-section .media-card {
    margin: 0;
    border-color: var(--aigro-border);
    background: var(--aigro-card);
    box-shadow: none;
  }

  .aigro-replay-content .advoo-section .media-card figcaption {
    background: var(--aigro-surface);
    color: var(--aigro-text-muted);
  }

  .aigro-replay-content .advoo-section__links {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 18px;
  }

  .aigro-replay-content .advoo-section__links a {
    padding: 9px 13px;
    border: 1px solid var(--aigro-border-strong);
    border-radius: 6px;
    background: var(--aigro-surface);
    color: var(--aigro-text-primary);
    font-size: 0.82rem;
    font-weight: 600;
  }

  .aigro-replay-content .advoo-section__links a:first-child {
    border-color: var(--aigro-lime);
    background: var(--aigro-lime);
    color: var(--aigro-on-accent);
  }

  .aigro-replay-content .advoo-section__links a:hover {
    border-color: var(--aigro-lime-text);
    color: var(--aigro-lime-text);
  }

  .aigro-replay-content .advoo-section__links a:first-child:hover {
    border-color: hsl(var(--lime-hover));
    background: hsl(var(--lime-hover));
    color: var(--aigro-on-accent);
  }

  .aigro-replay-content .toc a {
    border-color: var(--aigro-border);
    color: var(--aigro-text-secondary);
  }

  .aigro-replay-content .toc a:hover {
    color: var(--aigro-lime-text);
  }

  .aigro-replay-content .article > h1,
  .aigro-replay-content .article h2 {
    color: var(--aigro-text-primary);
  }

  .aigro-replay-content .article > h1 {
    border-top: 2px solid var(--aigro-lime);
  }

  .aigro-replay-content .article h3,
  .aigro-replay-content .article strong {
    color: var(--aigro-text-primary);
  }

  .aigro-replay-content .article p,
  .aigro-replay-content .article li,
  .aigro-replay-content .article td {
    color: var(--aigro-text-secondary);
  }

  .aigro-replay-content .media-card figcaption,
  .aigro-replay-content .guide-source-note,
  .aigro-replay-content .read-next p {
    color: var(--aigro-text-muted);
  }

  .aigro-replay-content .image-button {
    background: var(--aigro-card);
  }

  .aigro-replay-content .image-button span {
    background: var(--aigro-on-accent);
    color: var(--aigro-lime);
  }

  .aigro-replay-content .callout {
    border-left-color: var(--aigro-lime);
    background: var(--aigro-lime-soft);
    color: var(--aigro-text-primary);
  }

  .aigro-replay-content .steps-list li::marker,
  .aigro-replay-content .bullet-list li::marker {
    color: var(--aigro-lime-text);
  }

  .aigro-replay-content .table-wrap,
  .aigro-replay-content .table-wrap th,
  .aigro-replay-content .table-wrap td,
  .aigro-replay-content .guide-source-note,
  .aigro-replay-content .article hr {
    border-color: var(--aigro-border);
  }

  .aigro-replay-content th {
    background: var(--aigro-card);
    color: var(--aigro-text-primary);
  }

  .aigro-replay-content .read-next {
    background: var(--aigro-lime-soft);
  }

  .aigro-replay-content .read-next h2,
  .aigro-replay-content .read-next a {
    color: var(--aigro-text-primary);
  }

  .aigro-replay-content .lightbox {
    background: hsl(var(--on-accent) / 0.94);
  }

  .aigro-replay-content .lightbox button {
    border-color: var(--aigro-lime);
    background: transparent;
    color: var(--aigro-lime);
  }

  .aigro-replay-content .footer {
    border-color: var(--aigro-border);
    background: var(--aigro-bg);
    color: var(--aigro-text-secondary);
  }

  @media (max-width: 1000px) {
    .aigro-replay-content .hero-inner {
      grid-template-columns: minmax(0, 1fr) minmax(220px, 280px);
      column-gap: 40px;
    }

    .aigro-replay-content .course-sales--start {
      grid-template-columns: 1fr;
      gap: 28px;
    }

    .aigro-replay-content .student-route-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 760px) {
    .aigro-replay-content .hero {
      padding: 64px 0 48px;
    }

    .aigro-replay-content .hero-inner {
      width: calc(100% - 24px);
      display: flex;
      flex-direction: column;
    }

    .aigro-replay-content .hero .eyebrow {
      order: 1;
      margin-bottom: 14px;
    }

    .aigro-replay-content .hero h1 {
      order: 2;
      margin-bottom: 18px;
      font-size: clamp(2.35rem, 11vw, 3.15rem);
      line-height: 1.06;
      letter-spacing: -0.025em;
    }

    .aigro-replay-content .hero-inner > p:not(.eyebrow):not(.hero-note) {
      order: 3;
    }

    .aigro-replay-content .hero-facts {
      order: 4;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      width: 100%;
      margin-top: 24px;
    }

    .aigro-replay-content .hero-facts li {
      padding: 0 10px;
    }

    .aigro-replay-content .hero-facts strong {
      font-size: 0.85rem;
    }

    .aigro-replay-content .hero-facts span {
      font-size: 0.7rem;
    }

    .aigro-replay-content .hero .hero-note {
      order: 6;
      margin-top: 20px;
      padding: 16px 18px;
    }

    .aigro-replay-content .hero-actions {
      order: 5;
      margin-top: 20px;
    }

    .aigro-replay-content .hero-replay-button {
      width: 100%;
    }

    .aigro-replay-content .course-sales--start {
      width: calc(100% - 24px);
      margin-top: 24px;
      padding: 22px 16px 16px;
    }

    .aigro-replay-content .course-sales--start h2 {
      font-size: 1.75rem;
    }

    .aigro-replay-content .course-sales--start .course-series-hero span {
      padding: 10px 12px;
    }

    .aigro-replay-content .student-route-section {
      margin: 48px 0 58px;
      padding-top: 22px;
    }

    .aigro-replay-content .student-route-card figure img {
      aspect-ratio: 1.9;
    }

    .aigro-replay-content .advoo-section {
      margin-top: 28px;
      padding: 20px 14px;
    }

    .aigro-replay-content .advoo-section__grid {
      grid-template-columns: 1fr;
    }

    .aigro-replay-content .advoo-section__links a {
      flex: 1 1 100%;
      text-align: center;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .aigro-replay-content *,
    .aigro-replay-content *::before,
    .aigro-replay-content *::after {
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

function ReplayNotesContent() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    shadow.replaceChildren();

    const style = document.createElement("style");
    style.textContent = `${replayStyles}\n${aigroReplayStyles}`;
    shadow.appendChild(style);

    const content = document.createElement("div");
    content.className = "aigro-replay-content";
    content.innerHTML = replayMarkup;

    const heroNote = content.querySelector<HTMLElement>(".hero-note");
    if (heroNote) {
      const noteLabel = document.createElement("span");
      noteLabel.className = "hero-note-label";
      noteLabel.textContent = "閱讀路線";
      heroNote.prepend(noteLabel);
    }

    const heroActions = content.querySelector<HTMLElement>(".hero-actions");
    if (heroActions) {
      const facts = document.createElement("ul");
      facts.className = "hero-facts";
      facts.setAttribute("aria-label", "攻略內容重點");

      const factItems = [
        ["18 章", "完整筆記"],
        ["8 段", "Campaign 工作流"],
        ["Level 1 → 2", "實作路線"],
      ];

      for (const [value, label] of factItems) {
        const item = document.createElement("li");
        const valueElement = document.createElement("strong");
        const labelElement = document.createElement("span");
        valueElement.textContent = value;
        labelElement.textContent = label;
        item.append(valueElement, labelElement);
        facts.appendChild(item);
      }

      heroActions.before(facts);
    }

    shadow.appendChild(content);

    const lightbox = shadow.querySelector<HTMLElement>("#lightbox");
    const lightboxImage = lightbox?.querySelector<HTMLImageElement>("img");
    const lightboxCaption = lightbox?.querySelector<HTMLElement>("figcaption");
    const lightboxClose = lightbox?.querySelector<HTMLButtonElement>("button");
    const previousOverflow = document.body.style.overflow;

    const closeLightbox = () => {
      if (!lightbox) return;
      lightbox.hidden = true;
      lightboxImage?.removeAttribute("src");
      document.body.style.overflow = previousOverflow;
    };

    const handleClick = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest<HTMLAnchorElement>("a[href^='#']");
      if (anchor) {
        const id = anchor.getAttribute("href")?.slice(1);
        const destination = id
          ? shadow.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
          : null;
        if (destination) {
          event.preventDefault();
          destination.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }

      const imageButton = target.closest<HTMLButtonElement>("[data-lightbox-src]");
      if (imageButton && lightbox && lightboxImage && lightboxCaption) {
        const source = imageButton.dataset.lightboxSrc;
        if (!source) return;
        const figure = imageButton.closest("figure");
        lightboxImage.src = source;
        lightboxImage.alt = imageButton.dataset.lightboxAlt ?? "放大圖片";
        lightboxCaption.textContent = figure?.querySelector("figcaption")?.textContent ?? "";
        lightbox.hidden = false;
        document.body.style.overflow = "hidden";
        lightboxClose?.focus();
        return;
      }

      if (target === lightbox || target === lightboxClose) closeLightbox();
    };

    const handleKeyDown = (event: Event) => {
      if (!(event instanceof KeyboardEvent)) return;
      if (event.key === "Escape" && lightbox && !lightbox.hidden) {
        event.preventDefault();
        closeLightbox();
      }
    };

    shadow.addEventListener("click", handleClick);
    shadow.addEventListener("keydown", handleKeyDown);

    return () => {
      shadow.removeEventListener("click", handleClick);
      shadow.removeEventListener("keydown", handleKeyDown);
      closeLightbox();
      shadow.replaceChildren();
    };
  }, []);

  return <div ref={hostRef} style={{ display: "block", width: "100%" }} />;
}

function GuideAccessGate({ loading = false }: { loading?: boolean }) {
  const next = encodeURIComponent(GUIDE_PATH);

  return (
    <div className="course-access-page">
      <section className="course-access-card" aria-busy={loading || undefined}>
        <div className="course-access-copy">
          <span className="course-access-icon" aria-hidden="true">
            <LockKeyhole strokeWidth={1.5} />
          </span>
          <p className="course-guide-kicker">AIGRO MEMBER REPLAY · 會員限定</p>
          <h1>登入會員，解鎖 8.13 直播重溫攻略</h1>
          <p className="course-access-lead">
            {loading
              ? "正在確認你嘅會員狀態，請稍候。"
              : "直播重溫影片、18 章完整筆記同實作圖解，只限已註冊 AIGRO 會員查看。免費加入後即可解鎖。"}
          </p>
          {!loading && (
            <div className="course-guide-actions">
              <Link
                to={`?auth=join&next=${next}`}
                className="guide-button guide-button-primary press"
              >
                <UserPlus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                免費註冊睇重溫
              </Link>
              <Link
                to={`?auth=login&next=${next}`}
                className="guide-button guide-button-secondary press"
              >
                <LogIn className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                已有帳號？登入
              </Link>
            </div>
          )}
        </div>

        {!loading && (
          <aside className="course-access-aside" aria-label="AIGRO Instagram 更新">
            <Instagram className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
            <p className="notes-eyebrow">FOLLOW AIGRO</p>
            <h2>緊貼下一場直播</h2>
            <p>Follow @aigro.hk，第一時間收到直播、課堂重溫同會員內容更新。</p>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="guide-button guide-button-secondary press"
            >
              Follow @aigro.hk
              <ExternalLink className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </a>
          </aside>
        )}
      </section>
    </div>
  );
}

export default function GrowthMarketerGuide() {
  const { member, loading } = useMember();

  if (loading) return <GuideAccessGate loading />;
  if (!member) return <GuideAccessGate />;

  return <ReplayNotesContent />;
}
