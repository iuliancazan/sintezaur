# Design System — The Pudding style

> Drag-drop this file + `pages.md` into Open Design / Claude Design as a new project.
>
> Tokens verified from production CSS (pudding.cool, 2026-05-14). Built with Svelte/SvelteKit.

---

## Aesthetic in one line

**Minimalist data-journalism framework** — neutral greyscale system as the foundation, sequential numbered story tiles, slight tilt/rotation as visual signature, three-typeface mix (Atlas Grotesk sans + Gooper/Tiempos serif + Atlas Typewriter mono), restrained accent palette, **dual mode (light + dark)**.

## Distinctive features

1. **Per-story design freedom** — homepage is a tile grid where each story can have its own custom mini-design world. The framework is minimal so individual stories pop.
2. **Tilt-rotation device** (`-2°`, `-4°`, `+2°`, `+4°`) — story cards / headlines slightly rotated, gives playful editorial feel without being silly.
3. **Three-typeface system** — sans for UI, serif (display + body) for editorial, mono (typewriter) for code/numbers/metadata. Each role distinct.
4. **Sequential story numbering** — every story gets a number (#001, #002...). Archive completeness signal.
5. **True dual mode** — fully designed light + dark from the design system level (not retrofit).
6. **Restrained accent palette** — 4 named accents (green/red/purple/blue) used sparingly, mainly for focus states and per-story highlights. Greyscale otherwise.
7. **Adaptive spacing via `clamp()`** — padding scales fluidly with viewport rather than at breakpoints only.
8. **Small border-radii (2-6px)** — almost square corners. Editorial, not modern-SaaS-rounded.

---

## Color tokens (verified)

### Greyscale ramp (the foundation — 11 stops)

| Token | Value | Use |
|---|---|---|
| `--color-gray-50` | rgb(247, 247, 247) | Lightest surface |
| `--color-gray-100` | rgb(239, 239, 239) | Light surface / button bg light mode |
| `--color-gray-200` | rgb(223, 223, 223) | Subtle separator |
| `--color-gray-300` | rgb(202, 202, 202) | Border light mode / button hover |
| `--color-gray-400` | rgb(168, 168, 168) | Placeholder light / link hover dark |
| `--color-gray-500` | rgb(135, 135, 135) | Mid grey / placeholder dark |
| `--color-gray-600` | rgb(109, 109, 109) | Secondary text light |
| `--color-gray-700` | rgb(78, 78, 78) | Border dark / button hover dark |
| `--color-gray-800` | rgb(55, 55, 55) | Default story bg dark |
| `--color-gray-900` | rgb(38, 38, 38) | Button bg dark / input bg dark |
| `--color-gray-1000` | rgb(25, 25, 25) | Darkest (page bg dark mode) |
| `--color-white` | #ffffff | Page bg light mode |
| `--color-black` | #000000 | Pure black (rare) |

### Accent colors (used sparingly)

| Token | Value | Use |
|---|---|---|
| `--color-electric-green` (also `--color-green`) | **#3AE660** | Focus rings, hover states (the iconic Pudding green) |
| `--color-red` | #ff533d | Errors, accent |
| `--color-purple` | #a239ca | Per-story accent option |
| `--color-blue` | #4717f6 | Per-story accent option |
| `--color-mark` | yellow (token reference) | Text highlight (`<mark>` element) |

### Dual-mode semantic tokens (the magic)

Every semantic token is defined TWICE — once for light mode, once for dark:

| Token | Light mode | Dark mode |
|---|---|---|
| `--color-bg` | white | gray-1000 (rgb 25, 25, 25) |
| `--color-fg` | gray-900 | gray-100 |
| `--color-primary` | black | gray-1000 |
| `--color-link` | black | gray-100 |
| `--color-link-hover` | gray-600 | gray-400 |
| `--color-border` | gray-300 | gray-700 |
| `--color-button-bg` | gray-100 | gray-900 |
| `--color-button-fg` | gray-900 | gray-100 |
| `--color-button-hover` | gray-300 | gray-700 |
| `--color-input-bg` | gray-50 | gray-900 |
| `--color-input-fg` | gray-900 | gray-50 |
| `--color-placeholder` | gray-400 | gray-500 |
| `--color-secondary-gray` | gray-400 | gray-600 |
| `--color-selection` | gray-300 | gray-700 |
| `--color-default-story-bg` | gray-100 | gray-800 |
| `--color-focus` | electric-green (#3AE660) | electric-green (same in both) |

**The Pudding ships dark mode as first-class** — via `prefers-color-scheme` system detection.

---

## Typography (verified)

5 font families. All **paid premium** (Commercial Type + Klim Type Foundry).

| Role | Pudding font | What it is | Free alternative |
|---|---|---|---|
| **Sans (UI)** | **Atlas Grotesk** (Commercial Type, Christian Schwartz) — Regular + Bold | Neutral workhorse grotesque | **Inter** (Google, free), **General Sans** (free) |
| **Serif (display)** | **Gooper SemiCondensed** (Klim, Kris Sowersby) | Distinctive editorial display serif | **Fraunces** (Google, free) at semi-condensed widths, **Cooper BT** (rare free), or **Cormorant SemiCondensed** (Google) |
| **Serif (body)** | **Tiempos Text** (Klim) — Regular + Bold | Designed for screen body reading | **Source Serif Pro** (free), **Newsreader** (Google, free), **PT Serif** (Google) |
| **Mono (typewriter)** | **Atlas Typewriter** (Commercial Type) — Medium | Typewriter-style mono | **JetBrains Mono** (free), **Roboto Mono** (free) |
| Fallback sans | `-apple-system`, Helvetica, Arial | System | n/a |
| Fallback serif | Iowan Old Style, Times New Roman | System | n/a |
| Fallback mono | Menlo, Consolas, Monaco | System | n/a |

### Font-family CSS variables (the way they wire it)

```css
--sans: "Atlas Grotesk", -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif;
--serif: "Gooper SemiCondensed", "Iowan Old Style", "Times New Roman", Times, serif;
--mono: "Atlas Typewriter", Menlo, Consolas, Monaco, monospace;
```

### Font weights

| Weight token | Value |
|---|---|
| `--font-weight-thin` | 100 |
| `--font-weight-normal` | 400 |

(Bold weights pulled from font-face files directly: Atlas Grotesk Bold, Tiempos Text Bold.)

### Romanian glyph note

All four paid fonts are top-tier and have proper Romanian glyphs. For the free alternatives:
- **Inter** — excellent RO
- **Fraunces** — excellent RO
- **Source Serif Pro / Newsreader** — excellent RO
- **JetBrains Mono / Roboto Mono** — good RO

---

## Layout & grid (verified)

### Breakpoints (mobile-first)

| Width | Use |
|---|---|
| 300px | Very small mobile |
| 400px | Standard mobile |
| 600px | Tablet portrait |
| **720px** | Tablet landscape — main second breakpoint |
| **960px** | Desktop — main third breakpoint |

### Column widths

| Token | Value |
|---|---|
| `--width-column-regular` | **720px** (body reading width) |
| `--width-column-wide` | **1280px** (full-width content) |
| `--width-padded` | 80vw (with side margins desktop) |
| `--width-padded-mobile` | 90vw (mobile) |
| `--margin-left` | 10vw (desktop) |
| `--margin-left-mobile` | 5vw (mobile) |

### Adaptive spacing (signature pattern)

The Pudding uses `clamp()` for fluid padding:

```css
--padding: clamp(16px, 12vw, 36px);   /* small */
--padding: clamp(16px, 12vw, 48px);   /* medium */
--padding: clamp(16px, 6vw, 48px);    /* medium-2 */
--padding: clamp(24px, 4vw, 56px);    /* large */
```

This scales smoothly with viewport instead of jumping at breakpoints — more modern, more graceful.

### Tilt rotation (the visual signature)

```css
--left-tilt: -2deg;
--left-tilt-double: -4deg;
--right-tilt: 2deg;
--right-tilt-double: 4deg;
```

Story tiles and elements get a slight `transform: rotate(-2deg)` or `rotate(2deg)` for playful editorial feel. Never extreme — always subtle.

### Border radii

| Value | Frequency | Use |
|---|---|---|
| **3px** | 4 | Default (`--border-radius: 3px`) |
| 6px | 3 | Slightly larger cards |
| 2px | 2 | Tiny |
| 2em | 1 | Pill button |

**The Pudding prefers near-square corners.** This is editorial, not soft-SaaS.

### Stroke width

`--stroke-width: 1px` — thin, sharp borders everywhere.

### Z-index scale

| Token | Value |
|---|---|
| `--z-bottom` | -100 |
| `--z-middle` | 0 |
| `--z-top` | 100 |
| `--z-overlay` | 1000 |

### Transitions

| Token | Value |
|---|---|
| `--transition-fast` | 0.1s |
| `--transition-medium` | 0.2s |
| `--transition-slow` | 0.5s |
| `--transition-ease` | ease-in |

Restrained, snappy.

---

## Component patterns (homepage anatomy)

### Top nav

- Minimal — logo left, search/filter right
- Compact, sans-serif (Atlas Grotesk)
- May include dark/light toggle

### Story tile (THE component)

The homepage is a grid of story tiles. Each:

- **Sequential number** displayed prominently (e.g., `#247`, `#246` — most recent first)
- **Title** in serif (Gooper SemiCondensed) — bold, condensed display
- Optional **subtitle / dek** in sans (Atlas Grotesk Regular)
- Optional **byline + date** in mono (Atlas Typewriter)
- **Custom thumbnail** — each story has unique imagery
- **Slight tilt** applied randomly (`-2deg`, `+2deg`, `-4deg`, `+4deg`) per tile for playful variation
- Border: thin 1px stroke, `--color-border`
- Border-radius: 3px
- Background: `--color-default-story-bg` (gray-100 light / gray-800 dark)
- Hover: subtle scale up + accent green border

### Filters / category nav

- Pill chips (small border-radius)
- Active state: filled with green accent OR inverted greyscale
- Categories like "Our Faves", "Popular", "Updating", "Your Input"

### Article / story page

- Three-column reading approach
- Body width 720px (`--width-column-regular`)
- Wide images / charts can break out to 1280px (`--width-column-wide`)
- Serif body (Tiempos Text) for prose
- Sans (Atlas Grotesk) for UI elements within stories
- Mono (Atlas Typewriter) for numbers, captions, metadata, code

### Buttons

- Greyscale fill (`--color-button-bg`)
- Sharp corners (3px radius)
- Sans serif (Atlas Grotesk)
- Hover: stage 2 grey
- Focus: electric green outline (`--color-focus`)

### Accent / focus

- Electric green (`#3AE660`) reserved for **focus states only** (keyboard navigation, hover-emphasis)
- Per-story content can use red/purple/blue accents
- Greyscale dominates everywhere else

### Mark / highlight

- Yellow background for `<mark>` text
- Used sparingly

---

## Distinctive motifs to lift

1. **Greyscale-as-foundation + sparse accent** — minimalist palette discipline
2. **Tilt rotation device** (-2°/+2°/-4°/+4°) for story tiles
3. **Sequential story numbering** — archive-completeness signal
4. **Three-typeface system** (sans + serif + mono, each with clear role)
5. **`clamp()` for adaptive spacing** — fluid responsive
6. **Sharp corners (2-6px radii)** — editorial, not soft-SaaS
7. **Electric green focus state** — playful but disciplined accent
8. **Per-story design freedom** within minimal framework — let individual content sing
9. **Dual mode native** (light + dark, both polished)

---

## How to prompt Open Design for a Sintezaur page in this style

```
Generate the [PAGE NAME] page using the attached design system 
(design-system-pudding.md) and content (pages.md, section [PAGE NAME]).

CRITICAL — before generating, quote back to me:
1. The page background hex for light mode AND dark mode (both required)
2. The accent green focus color
3. The three font families and their roles (sans / serif / mono)

Apply EXACTLY:
- DUAL MODE: light bg #ffffff and dark bg rgb(25,25,25). Both polished.
- Greyscale ramp 50-1000 for surfaces/text (11 stops)
- Electric green #3AE660 for focus states ONLY (not flooded)
- Sans: Inter (free alt to Atlas Grotesk) — UI, nav, buttons
- Serif display: Fraunces (free alt to Gooper SemiCondensed) — headlines, story titles
- Serif body: Source Serif Pro or Newsreader (free alt to Tiempos Text) — long-form prose
- Mono: JetBrains Mono (free alt to Atlas Typewriter) — numbers, metadata, code, captions
- Border-radius 3-6px (sharp, editorial)
- 1px borders, --color-border (gray-300 light / gray-700 dark)
- Adaptive spacing via clamp() — fluid responsive, not breakpoint-jump
- Column widths: 720px body, 1280px wide content

DISTINCTIVE PATTERN — TILT ROTATION:
For homepage story tiles / Bazar listing cards / Forum thread cards, apply slight 
random rotation (-2deg, -4deg, +2deg, +4deg) to give playful editorial variation. 
Subtle — never extreme. Never on text-heavy reading surfaces.

DISTINCTIVE PATTERN — SEQUENTIAL NUMBERING:
Number visible items (#247, #246, etc.) when content is archival/serial.

ADAPT for Sintezaur context (music-tech, Romanian):
- Romanian UI labels
- Page content from pages.md
- Music-tech editorial register
- NOT a marketing landing for Home — active platform content feed

Output: 1 desktop (1280px) + 1 mobile (375px). BOTH light mode AND dark mode 
(4 compositions total). Both modes are first-class — not auto-inverted.
```

---

End of design system.
