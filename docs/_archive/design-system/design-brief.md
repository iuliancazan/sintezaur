# Sintezaur — Design Brief

> **Compact brand & token constraints.** Pair with `pages.md` to generate any page.
>
> Drag-drop this file + relevant page section from `pages.md` into Claude Design / Open Design. Keep prompts short — let the tool make the layout decisions within these constraints.

---

## Brand in one line

Sintezaur is a Romanian-language music-tech platform for synth enthusiasts. Encyclopedia + marketplace + magazine + forum, under one calm, editorial, **dark-default** visual system.

## 3 reference sites — visual register

Look at these IN BROWSER for the calm-editorial-with-character feel. Don't copy — match the register.

1. **Resident Advisor** — https://ra.co — mixed-content feed, calm typography, single accent
2. **Hearing Things** — https://hearingthings.co — modern music editorial, system-respecting dark/light
3. **Bloomberg Businessweek** — https://www.bloomberg.com/businessweek — editorial typography executed seriously

## 5 non-negotiable principles

1. **Mobile-first** — every page designed at 375px wide, then expanded.
2. **Dark mode = default**, light mode = alternative. Both polished, not auto-inverted.
3. **One accent: amber-gold #E8B53C** — for CTAs, active states, brand mark. Never for floods.
4. **Editorial scale, not brutalist** — body 18-21px desktop, hero 48-80px desktop. Never 200px display.
5. **Generous whitespace** — 24-96px between sections. Don't cram.

## Color tokens (WCAG AA verified)

### Dark mode (primary)

| Token | Value | Contrast vs bg |
|---|---|---|
| `--bg-base` | #0E0F12 | — |
| `--bg-raised` | #16181D | cards (subtle separation) |
| `--bg-elevated` | #1E2127 | modals, dropdowns |
| `--text-primary` | #F0F2F5 | 18:1 (AAA) |
| `--text-secondary` | #9CA0A8 | 7:1 (AAA) |
| `--text-muted` | #7E828A | 4.7:1 (AA) — placeholders, captions only |
| `--border-subtle` | #2A2D33 | dividers |
| `--border-strong` | #3A3E45 | inputs |
| `--accent` | #E8B53C | gold |
| `--accent-hover` | #F0C861 | hover on dark |
| `--success` | #4FC373 | confirmation |
| `--warning` | #F0A93F | warning |
| `--error` | #E25A6E | errors |

### Light mode (alternative)

| Token | Value | Contrast vs bg |
|---|---|---|
| `--bg-base` | #F2F3F5 | warm grey, separates from white cards |
| `--bg-raised` | #FFFFFF | cards (white + border + shadow) |
| `--bg-elevated` | #FFFFFF | modals (white + stronger shadow) |
| `--text-primary` | #0B0C0F | 19:1 (AAA) |
| `--text-secondary` | #44474E | 9:1 (AAA) |
| `--text-muted` | #5E626B | 5:1 (AA) |
| `--border-subtle` | #DEE0E3 | card borders |
| `--border-strong` | #B8BCC2 | inputs |
| `--accent` | #E8B53C | same gold |
| `--accent-hover` | #C9961F | hover on light |
| `--success` | #2E9D55 | |
| `--warning` | #C77F2E | |
| `--error` | #C8425A | |

### Critical light-mode rules

- **Cards on light mode REQUIRE: `border-subtle` 1px + small shadow** (the bg color difference alone isn't enough separation)
- Modal overlay backdrop: `rgba(15, 17, 22, 0.55)`
- Never `#000` for text — feels harsh; use `#0B0C0F`
- Never use `text-muted` for body content — only captions, placeholders, disabled labels

## Typography

5 fonts, all free, all Romanian-glyph-verified (`ț` `ș` with bottom-comma, not Turkish cedilla):

| Use | Font | Weights | When |
|---|---|---|---|
| Display | **Bricolage Grotesque** | 500, 600, 700 | Hero, magazine covers, page titles (≥36px) |
| Body sans | **Inter** | 400, 500, 600, 700 | UI, H1-H3, buttons, body |
| Body serif | **Spectral** | 400, 500, 600 | Revista long-form articles only |
| Mono code | **JetBrains Mono** | 400, 500 | Code, prices on cards, spec values |
| Mono accent | **Departure Mono** | 400 | Synth-vintage callouts only (~3-5% mono usage). NOT for body, NOT for prices in CTAs. |

### Type scale (mobile / desktop)

| Token | Size | Font | Weight | Line-height |
|---|---|---|---|---|
| `display-xl` | 48 / 80px | Bricolage Grotesque | 700 | 1.05 |
| `display-l` | 36 / 64px | Bricolage Grotesque | 700 | 1.10 |
| `display-m` | 28 / 48px | Bricolage Grotesque | 600 | 1.15 |
| `h1` | 24 / 40px | Inter | 600 | 1.20 |
| `h2` | 20 / 28px | Inter | 600 | 1.30 |
| `h3` | 18 / 22px | Inter | 600 | 1.35 |
| `body-l` | 18 / 21px | Inter | 400 | 1.60 |
| `body-l-serif` | 20 / 21px | Spectral | 400 | 1.65 (Revista only) |
| `body-m` | 16 / 17px | Inter | 400 | 1.55 |
| `body-s` | 14 / 14px | Inter | 400 | 1.50 |
| `caption` | 12 / 12px | Inter | 500 | 1.45 (letter-spacing 0.02em) |
| `mono-code` | 14 / 15px | JetBrains Mono | 400 | 1.45 |
| `mono-accent` | 14 / 16px | Departure Mono | 400 | 1.40 (letter-spacing 0.02em) |

Max reading measure for body text: **~70ch** (≈ 720px).

## Spacing & shape

- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128px (stay on this grid)
- Border radii: 6 (chip), 10 (button), 14 (card), 20 (modal/bottom-sheet), 999 (pill/avatar)
- Touch targets **≥44×44px** always

## Layout grids

- Mobile (375-767px): 1 column, 16-20px outer padding
- Tablet (768-1023px): 8 cols, 32-40px padding, gutter 16-24px
- Desktop (1024-1439px): 12 cols, 48-64px padding, gutter 24px, max content 1200px
- Long-form reading max: 720px (centered)

## Mobile-first patterns

- **Bottom nav (mobile)**: 5 icons (Acasă, Tezaur, Bazar, Revistă, Forum), 64px + safe-area
- **Bottom sheets** for: filters, chat, reply editor, photo upload, pickers
- **Sticky bottom CTAs** for: send message, reply, submit, confirm
- Pull-to-refresh on lists
- Swipe gestures on galleries and inbox
- Respect `safe-area-inset-*` (iPhone notch + bottom indicator)
- Input `font-size: 16px` minimum (prevents iOS zoom on focus)

## Motion

Restrained, 120-350ms, `ease-out`. Hover lift on cards (subtle translateY -2px + shadow). Modal/sheet entry slide+fade 300ms. **Respect `prefers-reduced-motion`.**

NO: parallax, autoplay, scroll-jacking, bouncy overshoots.

## Icons

PrimeIcons, outline style, 20px mobile / 24px desktop. Tap area ≥44px around even if icon is smaller.

## Photography

Real Romanian-scene photos > stock. Manufacturer press photos OK initially for Tezaur. NEVER generic Shutterstock synth images.

## Don'ts (short list)

- ❌ Light mode as default
- ❌ Marketing landing treatment for Home (it's an active content feed, see `pages.md` § Home)
- ❌ Rotating banner ads, pop-ups, cookie modals shoved in face
- ❌ Parallax, autoplay, scroll-jacking
- ❌ Five-color brand palette (ONE accent only)
- ❌ 200px brutalist display
- ❌ Dense desktop layouts that fail on mobile
- ❌ Stock photos of synthesizers
- ❌ reCAPTCHA / captcha modals

## Prompting pattern

When generating a page, use this exactly:

```
Generate the [PAGE NAME] page for Sintezaur, a Romanian music-tech platform.

Constraints (attached: design-brief.md):
- Mobile-first (375px baseline). Show mobile AND desktop versions.
- Dark mode primary. Light mode secondary. Both polished.
- Use the design tokens, fonts, and patterns exactly.
- Romanian UI labels (use the Romanian text from page content below).
- NOT a marketing landing — this is an active platform page.

Page content (attached: pages.md, section [PAGE NAME]):
[paste the relevant section from pages.md OR attach the whole file]

Reference for visual register (do not copy): [pick one URL from the 3 above].

Output: 1 mobile composition + 1 desktop composition, in BOTH modes if possible.
```

End of brief.
