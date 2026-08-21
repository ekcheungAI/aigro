# AIGRO Design System

Portable brand and interface contract for AIGRO, the Hong Kong AI, growth, and
business intelligence platform.

- Status: current working specification
- Updated: 2026-08-22
- Runtime source: `src/index.css`
- Brand guide: `/branding`

This file is intentionally short enough to use in a brief, a design review, or
an AI coding session. When implementation and this document disagree, update
both together and run the release checklist at the end.

## 1. Product direction

AIGRO should feel trusted, editorial, useful, and ready to move. The interface
helps a Hong Kong reader understand what matters, why it matters, and what to
do next.

### Design principles

1. Editorial hierarchy comes before decoration.
2. Evidence and source attribution earn trust.
3. One product accent keeps actions easy to recognise.
4. Whitespace, hairlines, and clear grouping create calm density.
5. Light and dark themes are both first-class experiences.

## 2. Typography

Typography is a three-role system. Do not introduce one-off font families in a
component.

| Role | Latin | Traditional Chinese | Use |
| --- | --- | --- | --- |
| Display | Fraunces 400, 500, 600 | Chiron GoRound TC variable 200-900 | H1, H2, H3, hero copy, editorial emphasis |
| UI and body | Inter 400, 500, 600 | Chiron GoRound TC variable 200-900 | Navigation, paragraphs, cards, forms, buttons |
| Data and metadata | IBM Plex Mono 400, 500 | Chiron GoRound TC fallback | Dates, metrics, source IDs, version strings |

### Font variables

```css
--font-cjk: "Chiron GoRound TC WS";
--font-display: "Fraunces", var(--font-cjk), "PingFang TC", "Microsoft JhengHei", serif;
--font-sans: "Inter", var(--font-cjk), "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif;
--font-mono: "IBM Plex Mono", var(--font-cjk), "PingFang TC", "Microsoft JhengHei", monospace;
```

### Font role rules

- H1 and H2 use `font-display`; editorial H3 headings use it by default. Compact
  card headings and auth/product controls may opt into `font-sans` through the
  existing utility when the denser UI treatment is intentional.
- H4, H5, H6, body copy, navigation, form labels, and buttons use `font-sans`.
- Metrics, dates, source names, status metadata, and code use `font-mono`.
- Every Traditional Chinese role uses the same Chiron family. Keep Fraunces,
  Inter, and IBM Plex Mono first in their stacks so Latin retains its assigned
  voice; Chiron includes its own Nunito-based Latin glyphs.
- Use the existing Tailwind utilities `font-display`, `font-sans`, and
  `font-mono`. Do not add an inline `font-family`.
- CJK body text must not be smaller than 13px. Long-form reading content is
  limited to 44rem.
- Use normal CJK spacing. Tracking is reserved for short Latin metadata and
  overlines, not paragraphs.
- Do not use fake bold or fake italic. Chiron provides upright variable weights
  from 200 to 900; it does not ship an italic. The full Unicode-subsetted
  webfont is self-hosted from the pinned npm package.

### Type scale

| Token | Size | Line height | Typical use |
| --- | ---: | ---: | --- |
| `display-hero` | 84px | 1.06 | Rare cinematic hero only |
| `display-xl` | 64px | 1.10 | Page hero |
| `display-lg` | 48px | 1.15 | Feature masthead |
| `display` | 40px | 1.20 | Page H1 |
| `h2` | 32px | 1.25 | Section heading |
| `h3` | 24px | 1.30 | Group heading |
| `h4` | 20px | 1.35 | Card heading |
| `body-lg` | 18px | 1.70 | Introductory copy |
| `body` | 16px | 1.70 | Default reading copy |
| `body-sm` | 15px | 1.65 | Card and supporting copy |
| `label` | 14px | 1.40 | Buttons, navigation, form labels |
| `caption` | 13px | 1.45 | Source, time, helper text |
| `overline` | 13px | 1.30 | Short category label |
| `metric` | 36px | 1.10 | Numeric result |

## 3. Colour

### Product interface tokens

The current product implementation uses a cool paper and deep navy system. The
active product accent is brand green. Existing `lime`, `ink`, and `gold` class
names are compatibility aliases in the codebase. New UI work should use
`lime` or `lime-text` directly.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `bg` | `#F5F7FA` | `#02122C` | Page canvas |
| `surface` | `#FFFFFF` | `#0A1E3C` | Navigation and raised surfaces |
| `card` | `#EDF1F5` | `#0E2547` | Nested surface and wells |
| `text-primary` | `#101C30` | `#EAF0F6` | Headings and primary copy |
| `text-secondary` | `#4A5668` | `#B8C4D0` | Body copy |
| `text-muted` | `#5D6775` | `#8593A5` | Captions and metadata |
| `border` | `#DDE3EA` | `#1C3355` | Hairlines |
| `lime` | `#42CAAC` | `#42CAAC` | Product accent and fills |
| `lime-text` | `#087568` | `#42CAAC` | Text and links |
| `on-accent` | `#02122C` | `#02122C` | Text on green fills |

### Logo source palette

These colours belong to the official three-dot logo and its documentation. They
are not additional product accents.

| Colour | Hex | Use |
| --- | --- | --- |
| Deep Navy | `#0B132B` | Light-background wordmark |
| Off White | `#F6F7F9` | Logo paper and document canvas |
| Tech Green | `#10B981` | Logo growth dot |
| Bright Blue | `#2F6FEB` | Logo knowledge dot |
| Neutral Gray | `#6B7280` | Logo guidance and secondary labels |

### Colour rules

- Product actions, links, active states, and verified states use the one brand
  green system.
- Logo blue and logo green may appear in official artwork, swatches, and
  explanatory diagrams only.
- Use semantic `success`, `warning`, and `error` tokens for status meaning.
- Prefer 1px borders over shadows. Dark mode uses borders and avoids heavy
  shadows.
- Do not add decorative gradients. The approved stripe and chevron patterns
  are hard-stop motifs and must stay restrained.

## 4. Layout and shape

- Container: 1200px maximum width with 24px side gutters.
- Spacing: use the 4, 8, 12, 16, 24, 32, 48, 64, 96, 120 scale.
- Marketing section rhythm: 96px desktop and 64px mobile unless content needs
  a tighter grouping.
- Radius: 4px for chips, 8px for cards and inputs, 12px for drawers and chat
  bubbles. Do not use fully rounded cards.
- Desktop grids use 2 or 3 columns. Mobile layouts collapse to one column below
  768px unless a horizontal scroller is explicitly part of the interaction.
- Navigation stays on one line on desktop and is no taller than 80px.
- Every image has intrinsic dimensions or an aspect ratio to prevent layout shift.

## 5. Branding page plan

The `/branding` page is a working guide. It follows this order:

1. Hero: what the system is for, with the official wordmark.
2. Guide map: jump to the asset or decision the reader needs.
3. Image system: thumbnail ratio, material, light, and exclusions.
4. Brand foundation: promise and visual character.
5. Logo system: variants, clear space, sizes, and correct or incorrect use.
6. Colour balance: separate product tokens from logo source colours.
7. The three dots: explain people, knowledge, and growth.
8. Typography and layout: show the type roles and grid rules.
9. Voice and messages: give copy direction and the approved descriptor.
10. Applications: translate the rules into social, proposals, and print.
11. Release check: confirm the asset before it goes public.

The page provides one download action for this file. Keep the anchor at
`/design.md` stable so people and tools can link to the portable specification.

## 6. Logo rules

- Use the supplied official artwork. Never recreate the wordmark with text.
- Use the navy variant on light backgrounds and the white variant on dark
  backgrounds.
- Keep the three dots in their approved order and colour.
- Define clear space from the smallest dot diameter, called `1x`.
- Minimum digital primary logo width: 160px.
- Minimum digital organization lockup width: 220px.
- Minimum print primary logo width: 32mm, subject to proofing.
- Never stretch, compress, crop, outline, recolour, shadow, or decorate the logo.

Official runtime assets:

```text
/brand/aigro-wordmark-navy-transparent.png
/brand/aigro-wordmark-white-transparent.png
```

## 7. Voice and content

- Public-facing copy uses Traditional Chinese with Hong Kong vocabulary unless
  another language is needed for a product label or official name.
- Be specific, source-aware, and clear about limitations.
- Every section should help the reader judge, compare, or act.
- Avoid hype, generic startup language, unexplained jargon, and unsupported
  precision.
- Visible UI strings do not use emoji.
- AIHOT content must keep its source attribution and canonical link.

## 8. Motion and interaction

- Motion communicates hierarchy, feedback, or a state change. It is not
  decoration.
- UI transitions are 300ms or less. Press feedback uses the shared `.press`
  utility and scales to 0.97.
- Transform-based hover effects are gated to fine pointers.
- Scroll reveal uses the shared `Reveal` component. Do not hand-roll another
  IntersectionObserver for a page section.
- `prefers-reduced-motion: reduce` removes transforms and leaves a gentle
  opacity transition where useful.
- Focus-visible outlines are always visible and use the active accent token.

## 9. Accessibility and QA

Before release, verify:

- Every route has a meaningful title and description.
- Every image has useful alt text or an empty alt when decorative.
- Every form control has a visible or programmatic label.
- Buttons and links have a 44px touch target on mobile.
- Keyboard focus is visible and the order is logical.
- Light and dark themes both pass contrast review.
- Text does not clip or overflow at 390px, 768px, 1280px, and 1440px.
- The page has no horizontal scroll at mobile widths.
- The correct logo variant, clear space, and minimum size are used.
- `/design.md` downloads as `aigro-design.md` in production.

## 10. Implementation map

| Concern | Source |
| --- | --- |
| Global tokens and typography contract | `src/index.css` |
| Font loading | `index.html` |
| Shared shell | `src/components/Layout.tsx`, `Navbar.tsx`, `Footer.tsx` |
| Brand guide UI | `src/pages/Branding.tsx` |
| Logo artwork | `public/brand/` |
| Thumbnail examples | `public/editorial/thumbnails/` |
| Download headers | `vercel.json` |

## Release checklist

1. Run `npm run lint`.
2. Run `npm run build`.
3. Check `/branding` in light and dark mode.
4. Check `/branding` at desktop and mobile widths.
5. Check `/design.md` returns the Markdown file and downloads with the expected
   filename.
6. Recheck logo contrast, type roles, source attribution, and image loading.
