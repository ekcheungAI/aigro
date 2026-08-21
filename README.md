# AIGRO

**香港最值得信賴的 AI・增長・商業情報平台。**
Trusted AI × growth × business intelligence, from a Hong Kong angle — editorial-grade
insights, verified experts, and an AI 編輯部 you can ask anything.

- Live: **https://aigro-blue.vercel.app**
- Stack: React 19 · Vite 7 · TypeScript · Tailwind CSS v3 · shadcn/ui · framer-motion · react-router v7
- Deploy: Vercel (project `aigro`)

> Working on this repo? Read **[AGENTS.md](AGENTS.md)** first — it's the continuation
> manual for AI coding agents and contributors.

## Features

- **Insights 情報 feed** — real AI/industry news pulled from the AIHOT public API,
  pre-converted to 繁體中文（香港）, every card with AI summary + 香港視角 commentary +
  source attribution.
- **Daily 日報** (`/insights/daily`) — newspaper-masthead daily digest, 5 條必讀精選.
- **Ask 問答** (`/ask`) — AI 編輯部 chat with personas, typewriter reveal, citation
  chips, and a free-quota meter.
- **Experts 專家** (`/experts`) — Verified mentor wall and per-expert brand pages with
  per-mentor accent colors and authorization transparency.
- **Cases 案例** (`/cases`) — Hong Kong AI adoption case studies with quantified
  metric strips and replicable breakdowns.
- **MCP waitlist** (`/developers`) — AIGRO MCP Network: industry-intelligence MCP
  server, priority list open for builders.
- **Light/dark themes** — both first-class, tuned per the brand token system.
- Editorial admin / review pipeline: planned backend module (see
  [docs/ROADMAP.md](docs/ROADMAP.md)).

## Quickstart

```bash
git clone https://github.com/ekcheungAI/aigro.git
cd aigro
npm install
npm run dev          # http://localhost:3000
```

Refresh the intelligence snapshot (optional — a snapshot is committed):

```bash
npm run fetch:aihot  # pulls AIHOT public API → src/data/aihot-snapshot.json
```

Build for production:

```bash
npm run build        # tsc -b && vite build
npm run preview
```

No environment variables are required for the current frontend-only build; see
[.env.example](.env.example) for the placeholders the upcoming backend will use.

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | React 19 + TypeScript, Vite 7 (`base: '/'`, port 3000) |
| Styling | Tailwind CSS v3 + shadcn/ui (CSS-variables mode), custom black+lime token system |
| Motion | framer-motion, lenis smooth scroll, custom Reveal primitives |
| Routing | react-router-dom v7 (nested Layout/Outlet, SPA rewrites on Vercel) |
| Data | AIHOT public API → `scripts/fetch-aihot.mjs` (OpenCC s2hk) → typed snapshot loaders; typed mock content for experts/cases/personas |
| Fonts | Chiron GoRound TC (all Traditional Chinese), Fraunces (Latin display), Inter (Latin UI), IBM Plex Mono (Latin data) |
| Hosting | Vercel, project `aigro`, alias `aigro-blue.vercel.app` |

## Docs

| Doc | Contents |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Continuation manual: commands, architecture, hard brand rules, gotchas, roadmap |
| [docs/design-system.md](docs/design-system.md) | Global design system — color tokens, typography, motion, components (constraint-level spec) |
| [public/design.md](public/design.md) | Portable design contract served at `/design.md` and downloadable from `/branding` |
| [docs/taste-rules.md](docs/taste-rules.md) | Adopted animation/interaction standards (easing, durations, hover gating, reduced motion) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Route map, data flow, component inventory, where-things-live table |
| [docs/ROADMAP.md](docs/ROADMAP.md) | 5-phase plan: what's done (frontend prototype), what's next (Supabase, MCP, cron) |

## Deployment

Hosted on **Vercel** (project `aigro`, alias `aigro-blue.vercel.app`). Push to `main`,
then trigger a manual deploy from the Vercel dashboard (auto-deploy is not wired yet).
`vercel.json` carries the SPA rewrite to `/index.html` — keep it.

## License

TBD — private repository, all rights reserved for now.
