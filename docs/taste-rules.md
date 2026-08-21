# AIGRO Design-Taste Rules (adopted permanent standards)

Distilled from Emil Kowalski's animation standards and the taste-skill anti-slop
framework, filtered through AIGRO's brand system (`/mnt/agents/output/design/design.md`).
**Brand rules win on any conflict**: no gradients, gold only for Verified/VIP, ink accent,
Fraunces for Latin display + Chiron GoRound TC for all Traditional Chinese, warm neutrals.

Sources:
- Emil animation standards: https://github.com/ek-or-re/ek-skills (`skills/review-animations/STANDARDS.md`, local: `/mnt/agents/output/ek-skills/`)
- Anti-slop framework: local `/mnt/agents/output/taste-skill/skills/taste-skill/SKILL.md`

## 1. Easing (tokens, both themes)

- `--ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1)` — REQUIRED for hover / press /
  micro-interaction transforms. Defined in `src/index.css :root`; JS twin
  `EASE_OUT_STRONG` exported from `src/components/Reveal.tsx`.
- `--ease-in-out-strong: cubic-bezier(0.77, 0, 0.175, 1)` — elements moving/morphing
  on screen. JS twin `EASE_IN_OUT_STRONG`.
- Hover color changes use `ease` (base layer already applies it).
- `REVEAL_EASE` (`cubic-bezier(0.4,0,0.2,1)`) stays for marketing/scroll reveals only
  (brand spec design.md §5.1). Never `ease-in` on UI.

## 2. Duration caps

- UI hover/press/enter transitions: **≤ 300ms**. Press feedback 160ms, chips/links
  120–180ms, popovers 150–200ms, drawers ≤ 500ms.
- Marketing hero / explanatory reveals may exceed this (design.md §5.1 stays).
- Perpetual loops (caret blink, ThinkingBars, badge sheen) are constant-motion and exempt.

## 3. Press feedback (all pressables)

- Standard: `transform: scale(0.97)`, 160ms, strong ease-out on transform, `ease` on colors.
- Implemented as the `.press` utility class in `index.css` — apply to every button,
  chip, and icon button. Cards that navigate get `.card-hover:active { scale(0.97) }`.
- Never use `scale(0.94–0.96)` snaps or untransitioned `active:scale-*` utilities.

## 4. Hover gating (touch safety)

- All transform-based hover effects live inside
  `@media (hover: hover) and (pointer: fine)` in `index.css`:
  `.card-hover:hover`, `.nudge-x/.nudge-x-neg/.nudge-y`, `.hover-lift-sm`,
  `.badge-sheen:hover::after`.
- Do NOT use Tailwind `group-hover:translate-*` / `hover:-translate-*` for motion;
  use the gated classes above. Color-only hovers are ungated (harmless on touch).

## 5. Reduced motion

- Transforms off, opacity/color transitions stay (gentler, not zero).
- `Reveal` renders an opacity-only 200ms fade under `prefers-reduced-motion`.
- Card lift degrades to border-color change; press scale disabled; sheen loop gated
  behind `prefers-reduced-motion: no-preference`.

## 6. Framer Motion performance

- `x:` / `y:` / `scale:` shorthand props are NOT hardware-accelerated. On hot paths
  (chat messages, toasts, filter re-entries, popovers, navbar drawer) use full
  transform strings: `initial={{ opacity: 0, transform: "translateY(12px)" }}`.
- Preserve existing centering in the string (`translateX(-50%)`) — inline `transform`
  overrides Tailwind translate classes.
- One-time page/section reveals (`whileInView`, hero) may keep shorthands.
- Never `scale(0)` entrances; start at 0.9–0.97 + opacity 0.
- No `window.scrollY`-driven React state for animation (Navbar's passive scroll
  listener only toggles a boolean at a 24px threshold — allowed).

## 7. Icons

- lucide-react only (project dependency; one family per project).
- `strokeWidth={1.5}` globally on all icons.
- No hand-rolled SVG icons. Exceptions (brand marks, not icons): `VerifiedBadge`
  gold-ring check and `LaurelBadge` wreath — design.md §6.4, gold-only-Verified rule.
- Replace decorative text arrows in CTAs with `<ArrowRight>` + `.nudge-x`.

## 8. Emoji policy

- No emoji in visible UI strings. Cantonese copy (e.g. 金印「認」) is text, not emoji.
- Upstream data (AIHOT snapshot) is sanitized at the data layer
  (`clean()` in `src/data/aihot.ts`) — never render raw emoji from feeds.

## 9. Bundle discipline

- `opencc-js` is a devDependency used only by `scripts/fetch-aihot.mjs`; the committed
  snapshot is pre-converted to 繁體. Never import it from runtime code.
- Watch `npm run build` chunk size when adding deps; lazy-load heavy leaf components.

## 10. Scope guard for future passes

- Quality passes must not change layout, colors, copy, or the brand token set.
- shadcn `src/components/ui/*` primitives are untouched unless in active use.
