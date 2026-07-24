# AIGRO — Roadmap (condensed)

Condensed from the full 5-phase × 24-epic execution plan. North star: trusted
AI・growth・business intelligence for Hong Kong → Verified expert AI avatars →
human booking marketplace → open MCP/API ecosystem.

## Status: what's done

**Frontend prototype (this repo) — shipped.** All 11 routes live with the full
black+lime brand system, dark mode parity, real AIHOT data (insights feed, daily
日報, hot topics), Ask chat UX (personas, typewriter, citations, quota meter),
expert/case/mock content layers, MCP waitlist page, SEO basics (per-page meta,
robots.txt, sitemap). No backend yet — auth, persistence, and payments are mocked.

## The 5 Phases

| Phase | Name | Weeks | What it delivers | Status |
| --- | --- | --- | --- | --- |
| 1 | 內容基建期 Content Infrastructure | 1–6 | Supabase schema (sources/items/usage/quota…), 3–5 sources, fetch→dedupe→score pipeline, content pillars MVP, admin modules, daily cadence + SEO baseline | **Frontend done** (against AIHOT instead of self-hosted pipeline); backend pending |
| 2 | 互動驗證期 Interaction Validation | 7–10 | Ask editor-AI with RAG + citations over platform content, free-quota gate, behavior tracking, conversation quality hardening | **UI done**; RAG backend pending |
| 3 | 專家蒸餾期 Expert Distillation | 11–16 | 3–5 invite-only Verified mentors, authorization → Firecrawl distillation → knowledge base → expert approval gate, brand pages + text avatars | **Brand pages done (mock)**; distillation pipeline pending |
| 4 | 預約變現期 Booking Monetization | 17–24 | VIP voice avatars (MiniMax Speech), human booking system, payments + 40–60% platform fee, repeat-booking loop | Not started |
| 5 | 生態開放期 Ecosystem Opening | 25+ | Public REST API (6 endpoints), free quota 6551 tokens/day, **MCP server + agent skill**, conversational API, vertical expansion + B2B/data products | **Waitlist page live** (`/developers`); server pending |

## What's next (immediate priorities)

1. **Supabase backend** — project + migrations; auth and member tiers
   (免費/進階/VIP); conversation + message persistence for Ask; content tables to
   gradually replace mock data. Env placeholders ready in `.env.example`.
2. **MCP server** — wrap the intelligence API as an MCP server (one-click install
   for Claude Code / Cursor / Codex) + SKILL.md agent instructions; honor the
   `/developers` waitlist.
3. **Daily cron** — scheduled refresh of the AIHOT snapshot (today: manual
   `npm run fetch:aihot` + commit); later, the full fetch→dedupe→score pipeline
   with `usage_logs` cost control.

## KPI gates (per phase, from source plan)

1. Daily-visit return rate + steady SEO growth
2. AI conversation completion rate; free-quota exhaustion → signup conversion
3. Avatar satisfactorily answers >80% of questions; 20% booking-intent conversion
4. Human booking completion + repeat booking rates
5. Third-party API call volume; monthly-active supply utilization >40%

## Standing risks (top 4)

- **R1** Third-party API cost overrun → `api_quota_settings` hard caps, 80% alert,
  100% auto-disable, every call in `usage_logs`.
- **R3** Content copyright → public RSS/API sources only, summaries + deep links,
  never full-text mirroring (applies to AIHOT usage today: attribution required).
- **R4** Avatar ships without consent → written authorization +
  `approved_by_expert = true` gate + instant revocation path.
- **R8** Supply flooding dilutes trust → invite-only curation, quality density over
  breadth, scarcity narrative.

Full detail (epics, tasks, acceptance criteria, week-1/2 action list) lives in the
source plan `plan/11-phases-and-epics.md` of the hk-ai-platform planning repo.
