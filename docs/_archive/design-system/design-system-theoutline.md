# Design System Extract — The Outline (verified)

> **Source:** theoutline.com homepage CSS, scraped 2026-05-14 (production CSS at `/css/section_front.71401fe3f321ef57af9c.css`).
>
> **Important context:** The Outline shut down editorial operations in March 2020 (acquired by Bustle Digital Group). The site remains accessible as a working archive — the CSS scraped here is the original production stack. This makes The Outline a **historical reference**, but the design system is intact and influential.
>
> **Use case:** drag-drop this file into Claude Design / Open Design when you want a generated page to feel like The Outline's **art-directed-per-story, color-pair, Instagram-Stories-vertical** aesthetic. RADICALLY different from Tablet — both are valid editorial references, opposite ends of the spectrum.

---

## Aesthetic in one line

**Art-directed magazine on the web** — each story gets a unique two-color palette (the "color filter" system), section backgrounds in saturated solid colors, vertical Instagram-Stories-style story cards, mixed serif + sans + condensed for explicit art-direction tension, deeply opinionated editorial voice.

## Tone keywords

opinionated · art-directed · vibrant · saturated · vertical · Instagram-Stories · per-story-color-system · editorial-irreverent · bold · post-2015-magazine

## What makes it distinctive (single most important pattern)

**The color-pair system.** Every story is tagged with a two-color filter from a fixed library of ~22 named pairs. The filter determines:
- Background tint of that story's card or section
- Image color-treatment overlay (duotone-style)
- Accent color for text/lines/SVG borders
- Per-section block backgrounds

This per-story art direction is unmatched in editorial web design. It's why The Outline still gets cited as a reference 6 years after closing.

---

## Color tokens (verified from production CSS)

### Core neutrals

| Token | Hex | Usage |
|---|---|---|
| white | #fff | Text on dark sections (104 uses — most common) |
| light grey | #dcdcdc | Secondary text / borders (64 uses) |
| black | #000 | Black sections, text on light (51 uses) |
| signature red | **#f33** (also written as `#ff3333`) | THE Outline red — used as a fixed accent across the system |

### The color filter palette (22 named pairs)

Each pair is a two-color art-direction system. Listed below with inferred component colors (from `--color-` CSS rules + svg URL hex codes):

| Pair name | Inferred colors |
|---|---|
| `berryblue-seafoam` | Cobalt #4745d1 + Mint #a3e9de |
| `black-white` | Black #000 + White #fff (high-contrast monochrome) |
| `blue-mint` | Blue #4745d1 + Mint #afffcc |
| `blue-red-saturated` | Blue #4745d1 + Red #f33 / #ff3333 |
| `colddarkgray-eggshellwhite` | Dark grey + Eggshell #fafff6 |
| `coral-blue` | Coral #fb6754 + Blue #4745d1 |
| `coral-purple` | Coral #fb6754 + Eggplant #661f4f |
| `darkteal-piggypink` | Dark teal #005746 + Pink #ffd8d1 |
| `eggplant-lightlime` | Eggplant #661f4f + Light yellow #ffffb3 |
| `green-pink-saturated` | Green #00ff7e + Pink #ffc6ff |
| `lightpink-acidblue` | Light pink + Acid blue |
| `maroon-yellow-saturated` | Maroon #881910 + Yellow #ff0 |
| `mint-coral` | Mint + Coral |
| `pineblue-beige` | Pine blue + Beige |
| `pink-mint` | Pink + Mint |
| `pink-purple` | Pink + Purple |
| `purple-lime-saturated` | Purple #3d00c2 + Lime #00ff7e |
| `red-black` | Red #f33 + Black #000 |
| `red-blue` | Red #f33 + Blue #4745d1 |
| `suedeblue-peach` | Suede blue + Peach #ffe7d1 |
| `yellow-blue` | Yellow #ffe600 + Blue #4745d1 |
| `yellow-purple` | Yellow #ffe600 + Purple #3d00c2 |

### Full available palette (saturation-heavy)

| Hex | Name | Vibe |
|---|---|---|
| #f33 | Outline red | THE accent — signature |
| #ff3333 | Red saturated | Same color, longhand |
| #ffe600 | Saturated yellow | Vivid |
| #ff0 / #ffff00 | Pure yellow | |
| #00ff7e | Electric green | Hi-vis |
| #fb6754 | Coral red | Warm pop |
| #ff6b68 | Salmon-red | Softer warm |
| #4745d1 | Cobalt blue | Saturated mid blue |
| #3d00c2 | Deep purple | Saturated |
| #e93592 | Hot pink | Magenta |
| #a3e9de | Mint | Soft cool |
| #afffcc | Light green | Pastel |
| #ffb59b | Salmon pastel | Soft warm |
| #ffd8d1 | Piggy pink | Pastel pink |
| #ffe7d1 | Peach | Soft warm |
| #ffffb3 | Pale yellow | Soft warm |
| #ffc6ff | Pink-purple | Pastel cool |
| #fafff6 | Eggshell white | Off-white cool |
| #fdefed | Ivory pink | Off-white warm |
| #005746 | Dark teal | Deep cool |
| #661f4f | Eggplant / plum | Deep warm |
| #881910 | Maroon | Deep warm |
| #04284a | Navy | Deep cool |
| #402952, #374171, #251a51 | Dark purples | Section bgs |

**Light mode only.** The Outline never had dark mode. The dark sections (black/navy) are art direction choices per-story, not a global theme.

---

## Typography (verified)

10+ font families, **all paid/custom**. The Outline used typography as **explicit art direction** — mixing styles within a single page is the point.

| Role | Outline font | What it is | Free alternative |
|---|---|---|---|
| Display sans (signature) | **Maria** | Letters from Sweden, geometric distinctive sans — used in the giant section headers ("VERY ONLINE", "POWER", "CULTURE") | **Space Grotesk** (Google, free), **General Sans** (free) |
| Body sans | **Fakt** | Ourtype/Christian Schwartz, neutral workhorse sans | **Inter** (Google, free), **IBM Plex Sans** (free) |
| Display serif | **Portrait** | Commercial Type / Berton Hasebe, distinctive editorial serif | **Fraunces** (Google, free) at heavy weights, **Recoleta** (free) |
| Editorial serif | **Cushing (ITC)** | Classic transitional serif | **Fraunces** or **Newsreader** (Google, free) |
| Display serif (distinctive) | **Eksell** | Letters from Sweden, characterful display serif | **Cormorant Garamond** (Google), **Saol Display** (paid) |
| Condensed display | **AlternateGothic** | Berthold/Linotype classic condensed sans | **Anton** (Google, free), **Saira Condensed** (Google, free) |
| Bold display | **Funkford** | Distinctive — likely bespoke | **Bagnard** or **Authentic Sans** (free for personal) |
| Brutalist sans | **SEGrotCom, SENardA, SESputnikA, SEDaMarcellinoA** | Custom commissions (proprietary) | **Inter Display** or **Bricolage Grotesque** as approximation |
| Classic serif | **News701** | Bitstream historical serif | **Source Serif Pro** (free), **PT Serif** (Google) |
| Icons | **TO-Icons** | Custom icon font | **PrimeIcons** or **Lucide** |

### Type scale (verified)

Mix of px-based + em-based, distinctive scale:

| Use | Value | Notes |
|---|---|---|
| Hero / section header | 100px | "VERY ONLINE", "MUST READS" — display-poster scale |
| Display | 60-50px | |
| H1 | 40-36px | |
| H2 | 30px (17 uses) | |
| H3 | 26-28px | |
| Headline card | 24-22px | |
| Body large | 20px (17 uses) | |
| Body | 16px | |
| Small | 14-13px | |
| Caption | 12px | |

Em-based mostly inside relative-sized components: `1em`, `1.1em`, `.8em`, `.6em`, `.5em` (each 32+ uses).

---

## Layout / grid (verified)

### Breakpoints (limited — desktop-leaning)

Only 4 breakpoints in the CSS:
- 360px (small mobile)
- 760px (tablet)
- 960px (desktop — main)
- 1280px (large desktop)

**Far fewer breakpoints than modern responsive design.** The Outline was designed roughly mobile + tablet + desktop, not granular.

### Container widths

```
560px   // narrow content
640px   // medium
960px   // wide (max)
100%    // full-bleed
```

Multiple `max-width` values seen: 360, 560, 640, 680, 759, 960px.

### Spacing

Element margins: 35px, 55px (two main scale tiers — less granular than modern systems).

### Section-block backgrounds

THE distinctive layout pattern: each story / section gets a **full-bleed solid color background** that runs edge-to-edge. Scrolling the homepage feels like scrolling through colored chapters. This is the most visually striking aspect of The Outline.

---

## Component patterns

### Story card (Instagram Stories-style)

The signature card type. Vertical, image-dominant:

- **Vertical aspect** (taller than wide — 9:16 or 4:5 ratio)
- Image takes upper 60-70% of card
- Image often duotone-treated (color filter applied — one of the 22 pairs)
- Text overlay on image (bottom portion) OR text in colored block below
- Headline in distinctive serif or condensed display (Portrait / Eksell / AlternateGothic)
- Section label small caps at top in accent color
- Cards arranged in horizontal scroll strips on desktop OR vertical stack on mobile

### Massive section header

Each homepage section has a **giant headline** (~100px):
- Font: Maria geometric sans
- Color: high-contrast against section background (white on dark; black on light)
- Set vertical, occupying significant height
- Examples: "VERY ONLINE", "MUST READS", "POWER", "CULTURE", "GOOD ADVICE"

### Section-as-color-block

Each major content cluster:
- Full-bleed background color (one of the saturated palette colors)
- Section title + 3-6 story cards arranged within
- Color of section informs the entire experience for that scroll segment

### Quote / commentary card

Smaller cards with just a pull-quote + author byline, on solid background, designed to function as standalone embeddable units.

### Hero / lead card (Cardicle Lead Card)

CSS class `cardicle-lead-card` suggests their featured story uses a more elaborate layout — likely full-bleed image + overlay headline + sub-section navigation arrows.

---

## Distinctive motifs (lift these specifically)

1. **Color-pair system per-story** — this is THE signature. Each piece of content tagged with a two-color filter that informs its visual treatment.
2. **Full-bleed solid-color section backgrounds** — each section is its own colored chapter.
3. **Massive sans-serif section headers** (100px) in distinctive face.
4. **Vertical Instagram-Stories-style cards** with image dominant + overlaid text.
5. **Duotone image treatment** — photos rendered with two-color color filter overlays (high-contrast art direction).
6. **Mixed type system** — serif + sans + condensed deliberately combined for editorial tension.
7. **Em-based relative typography** — the Outline used relative units far more than modern px-everywhere systems. Gives flexible scale.
8. **Limited breakpoint set** (360/760/960/1280) — focused on 3-4 viewport sizes rather than granular response.

## What to AVOID lifting (anti-patterns for Sintezaur)

- **No dark mode** — pattern is fundamentally light-with-color-blocks.
- **Color chaos for a marketplace** — Bazar listings need predictable visual hierarchy. Per-listing color filters would chaos. NOT applicable.
- **Per-story art direction at scale** — labor-intensive editorial pattern. Worked for The Outline's 1-2 stories/day output. Doesn't work for a marketplace with 100s of listings/day.
- **Paid font dependency (10+)** — The Outline licensed many premium typefaces. Free replacements lose ~50% of typographic character.
- **Massive 100px headers** — works in editorial art-direction context; would feel aggressive on Bazar/Forum.

---

## How this might inspire Sintezaur (limited adaptation)

The Outline aesthetic **doesn't fit most of Sintezaur** (marketplace + forum + encyclopedia need calm functional consistency). But specific patterns COULD lift for Revista-only and only for special features:

### Where it could apply

- **Revista feature articles** (long-form deep-dive): apply per-story color pair to article hero + accent throughout
- **Revista section landing pages** (per pillar): "Recenzii" section with one color, "Tutoriale" with another — pillar-as-color
- **Revista archive grid** with art-directed thumbnails (each article gets a color-filtered cover)
- **Special features**: "Synth of the Year", annual issue, retrospectives — full Outline-style treatment
- **NOT for**: Tezaur catalog (needs photo-accurate gear), Bazar (needs predictable hierarchy), Forum (needs reading focus)

### Specific patterns to consider

- **Color-pair per article** (limited to ~6-8 Sintezaur-specific pairs, not 22): would give Revista a distinctive editorial register
- **Full-bleed section colors** on Revista landing (pillar tabs as colored chapters)
- **Vertical card with image+text overlay** for some Revista cards (e.g., Tutorials index)
- **Massive condensed display headlines** (Saira Condensed / Anton) on Revista feature articles
- **Duotone treatment** on Revista hero images — gives editorial character to even basic press photos

### What to keep from Sintezaur's existing direction

- Dark mode primary (Outline is light-only, but Sintezaur shouldn't ditch dark)
- Amber-gold accent (Outline uses red; Sintezaur amber is its identity)
- Calm consistency across non-Revista sections

---

## Prompt template if you want to test this aesthetic

For **Revista features only** (do NOT use for Bazar/Forum/Tezaur):

```
Generate the Sintezaur Revista FEATURE ARTICLE page in the style of The Outline 
(see attached design-system-theoutline.md).

VISUAL CONSTRAINTS (Outline-inspired, adapted to Sintezaur):
- Full-bleed colored section backgrounds (pick one Outline-palette color pair for 
  this article — e.g., yellow-purple: #ffe600 + #3d00c2)
- Massive condensed display headline (Saira Condensed or Anton free alt for Outline's 
  AlternateGothic / Maria)
- Duotone image treatment on hero photo (using the article's color pair)
- Body in Fraunces serif (Free alternative to Portrait/Cushing)
- Mixed serif + sans deliberately
- Vertical card pattern for related-articles strip
- Light mode only for this experiment (Outline aesthetic doesn't translate to dark)

CONTENT (from pages.md §Revista — detail, OR paste below):
[paste page content]

OUTPUT: 1 desktop composition (960-1272px wide) + 1 mobile (375px).
NOTE: this is a one-off art-directed feature treatment, not a standard article template.
Most Revista articles will use a simpler, dark-mode-compatible layout.
```

---

End of extract. Verified 2026-05-14 against theoutline.com production CSS.
