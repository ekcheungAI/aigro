# AIGRO — Architecture (one page)

Frontend-only prototype: React 19 SPA, no backend. All content is either typed mock
data or a committed AIHOT snapshot. Deployed as a static build on Vercel with SPA rewrites.

## Route Map

All routes are children of `<Route element={<Layout/>}>` in `src/App.tsx`
(Layout renders `<Outlet/>` + Navbar/Footer). `RouteMeta` sets per-page title/meta.

| Route | Page file | Purpose |
| --- | --- | --- |
| `/` | `src/pages/Home.tsx` | Hero + today picks + insights wall + cases + expert avatar wall + Ask CTA + newsletter |
| `/insights` | `src/pages/Insights.tsx` | Insights feed: category filter, sort, library tab |
| `/insights/daily` | `src/pages/Daily.tsx` | 每日精選日報 (newspaper masthead layout) |
| `/insights/:slug` | `src/pages/InsightDetail.tsx` | AI summary + 香港視角長評 + source links + related |
| `/library` | → redirect | `<Navigate to="/insights?tab=library" replace/>` |
| `/cases` | `src/pages/Cases.tsx` | HK case-study library with metric strips |
| `/cases/:slug` | `src/pages/CaseDetail.tsx` | Case deep-dive: 背景 → 方法 → 成果 → 可複製步驟 |
| `/experts` | `src/pages/Experts.tsx` | Verified mentor wall (+ coming-soon slots) |
| `/experts/:slug` | `src/pages/ExpertProfile.tsx` | Expert brand page (per-mentor accent, transparency, avatar entry) |
| `/ask` | `src/pages/Ask.tsx` | AI 編輯部 chat: personas, typewriter, citations, quota meter |
| `/pricing` | `src/pages/Pricing.tsx` | 免費/進階/VIP tiers + monthly/annual toggle + FAQ |
| `/developers` | `src/pages/Developers.tsx` | AIGRO MCP Network + waitlist signup |
| `*` | `src/pages/Placeholder.tsx` | 404 |

## Data Flow

```
                        ┌─────────────────────────────────────────────┐
                        │ AIHOT public API                            │
                        │ https://aihot.virxact.com/api/public        │
                        │ (no key; custom UA required; rate-polite)   │
                        └───────────────┬─────────────────────────────┘
                                        │  npm run fetch:aihot
                                        ▼
                        scripts/fetch-aihot.mjs
                        • endpoints: items(selected/all), daily, hot-topics
                        • OpenCC cn→hk (繁體香港) at write time
                        • strips emoji (taste policy)
                                        │
                                        ▼
                        src/data/aihot-snapshot.json   (committed → build self-contained)
                                        │
                                        ▼
                        src/data/aihot.ts
                        • typed loaders (AihotRawItem → Insight etc.)
                        • runtime clean() strips stray emoji only
                        • carries attribution { source, canonical }
                                        │
                                        ▼
        UI: Insights / Daily / InsightDetail / home HotTopicsTicker / LiveStats

Parallel mock layer (typed, hand-authored, in src/data/):
  insights.ts · cases.ts · experts.ts · personas.ts · demoPersonas.ts · tools.ts
        │
        ▼
  Cases / Experts / Ask personas / Library — no network calls anywhere
```

Rules: no fetching inside components; AIHOT content must render with attribution +
canonical link; `opencc-js` is dev-only (fetch script), never a runtime import.

## Component Inventory

| Area | Files | Notes |
| --- | --- | --- |
| Chrome | `Layout.tsx`, `Navbar.tsx`, `Footer.tsx` | sticky 64px navbar; class-based theme toggle |
| Motion | `Reveal.tsx` | scroll reveal wrapper; exports `EASE_OUT_STRONG` / `EASE_IN_OUT_STRONG` |
| Cards | `InsightCard.tsx`, `CaseCard.tsx`, `CategoryChip.tsx` | editorial card specs (design-system.md §6.5–6.7) |
| Identity | `VerifiedBadge.tsx`, `MonogramAvatar.tsx` | lime-ring verified seal; monogram fallback avatars |
| Marketing | `Newsletter.tsx` | shared subscribe band |
| Ask | `ask/AiMessage.tsx`, `ask/TypewriterText.tsx`, `ask/ThinkingBars.tsx`, `ask/PersonaPanel.tsx`, `ask/ContextPanel.tsx`, `ask/QuotaMeter.tsx`, `ask/sessions.ts`, `ask/typewriter.ts` | chat UI + client-side session/quota state |
| Home | `home/HotTopicsTicker.tsx`, `home/LiveStats.tsx`, `home/AskPreview.tsx`, `home/HowToUse.tsx` | live-data home sections |
| Experts | `expert/ExpertStyleSections.tsx` | per-mentor accent theming blocks |
| Primitives | `ui/*` | shadcn/ui — do not modify unless in active use |
| Hooks | `hooks/useTheme.ts`, `hooks/usePageMeta.ts`, `hooks/use-mobile.ts` | |

## Where Things Live

| Concern | Location |
| --- | --- |
| Routes + page meta | `src/App.tsx` |
| Design tokens (colors/fonts/easing) | `src/index.css` (`:root` + `.dark`) |
| Tailwind token mapping | `tailwind.config.*` |
| Vite config (`base: '/'`, `@` alias, port 3000) | `vite.config.ts` |
| SPA rewrites | `vercel.json` |
| AIHOT fetch script | `scripts/fetch-aihot.mjs` |
| AIHOT typed loaders | `src/data/aihot.ts` + `aihot-snapshot.json` |
| Mock content | `src/data/{insights,cases,experts,personas,demoPersonas,tools}.ts` |
| Static assets (brand, expert/case imagery, og, favicon) | `public/` |
| SEO files | `public/robots.txt`, `public/sitemap.xml` |
| Brand spec | `docs/design-system.md` |
| Motion/interaction standards | `docs/taste-rules.md` |
| Agent operating manual | `AGENTS.md` |
