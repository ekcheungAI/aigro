# Design Critique v1.16 — impeccable refresh

Method: [impeccable] skill (critique → polish → typeset → delight), assessed against
craft-floor bans + the binding brief (`design.md` black + electric-lime system,
`design-taste-rules.md`). Sources reviewed: live site (Home, Insights, Cases, Experts,
ExpertProfile, Ask, Pricing, /developers, /login) in both themes + `detect.mjs` scan.

**Verdict going in:** strong craft floor already (tokens, motion discipline, reduced-motion,
semantic semantic colors all present). Findings were precision issues, not systemic ones.

## Step 1 — Findings (ranked by impact)

1. **[P1 · a11y · craft-floor "States: keyboard focus"]** Focus ring invisible on dark
   bands in light theme. Global `:focus-visible` uses `--ink` = lime-text deep green
   (~1.6:1 on `#0D0D0C`) — keyboard focus effectively vanished on the hero, MCP band,
   page headers, footer, and login panel whenever the light theme was active.
2. **[P1 · craft-floor ban "colored border-left >1px on list items" · detector: side-tab]**
   Ask `PersonaPanel` session-list active item used a 2px persona-accent `border-l-2`.
   (HK Angle's 2px ink left border and Ask expert bubble borders are brief-sanctioned —
   design.md §6.5 / §2.5 — and were kept.)
3. **[P2 · polish: overflow]** `/developers` endpoint mono well clipped
   `GET /api/public/hot-topics` and showed a native horizontal scrollbar inside the card.
4. **[P2 · consistency]** Radius drift: large content cards used `rounded-lg` (12px) —
   Experts cards, Developers panels, Pricing tiers, detail-page CTA panels, AskPreview
   card, Ask exhausted panel — while design.md §4 reserves lg for drawer/modal/chat
   bubbles and md (8px) for cards.
5. **[P2 · craft]** Footer top had a double accent: 1px translucent lime `border-t`
   stacked directly above a 2px solid lime bar — read as an unintentional double rule.
6. **[P2 · brand]** Hero watermark said "AIGRO" without the brand's signature lime
   period — the wordmark everywhere else is「AIGRO.」.
7. **[P2 · delight gap]** Ask persona switch: chat-header identity (avatar + name)
   swapped instantly; only the greeting re-animated. The persona switch is Ask's brand
   moment and deserved a signature transition.
8. **[P3 · a11y]** ExpertProfile media chips were dead anchors (`href="#"` +
   `preventDefault`) — a broken control.
9. **[P3 · accepted]** CategoryChip hit area ~30px < 44px iOS guideline; kept per brand
   spec (design.md §6.7: 6px/12px padding) and above WCAG 2.5.8 24px minimum.
10. **[P3 · false positive]** `detect.mjs` broken-image flag on `MonogramAvatar` —
    `PhotoAvatar` `<img>` has a real src and files exist in `public/experts/`.

## Step 2 — Fixed

| # | Fix | Files |
|---|-----|-------|
| 1 | Band-scoped focus override: `.bg-band-bg :focus-visible` → `outline-color: band-ink` (lime, 13.3:1) | `src/index.css` |
| 2 | Session-list active state → 1px `border-border-strong` + `bg-card` + 6px persona-accent dot | `src/components/ask/PersonaPanel.tsx` |
| 3 | Endpoint well → 12px mono, no nowrap/scrollbar; all three endpoints fit | `src/pages/Developers.tsx` |
| 4 | Cards normalized to `rounded-md` (chat bubbles keep `rounded-lg`) | Experts, Developers, Pricing, InsightDetail, CaseDetail, Ask, AskPreview |
| 5 | Footer: removed translucent `border-t`; single 2px solid lime rule | `src/components/Footer.tsx` |
| 6 | Hero watermark now「AIGRO.」— lime period at 10% alpha, tucked `-ml-[0.14em]`, bleed adjusted so it never clips | `src/pages/Home.tsx` |
| 7 | Persona-switch signature transition: header identity keyed on persona, 250ms rise + cross-fade, `EASE_OUT_STRONG`, reduced-motion → instant | `src/pages/Ask.tsx` |
| 8 | Media chips → plain `div` (no dead link) | `src/pages/ExpertProfile.tsx` |

### Delight (restrained, on-brand)

- **Brand period pulse** — `.brand-period`: the lime「.」in the navbar, mobile drawer,
  and footer wordmarks breathes (opacity 1→0.45→1, 3.6s, 1.2s delay, opacity-only/GPU),
  echoing the Ask typewriter caret. `prefers-reduced-motion` → solid.
- **Hero watermark period** — see #6; static brand echo at 10% alpha.
- **Persona-switch transition** — see #7; ≤300ms, transform+opacity only.

### Verified

- `npm run build` (tsc + vite) clean.
- Visual pass on local build: Home (both themes), Experts, Ask (+ persona switch to
  Jimmy), Developers, footer — endpoint well fits, single footer rule, radius
  consistent, watermark period visible, dark-mode parity holds.
