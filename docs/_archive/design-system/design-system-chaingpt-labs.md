# Design System — ChainGPT Labs style (v3 experiment)

> Drag-drop this file + `pages.md` into Open Design / Claude Design as a new project.
>
> Tokens verified from production CSS (labs.chaingpt.org). Layout patterns from screenshot reference.

---

## Aesthetic in one line

**Web3-startup-magazine** — cream warm background, single vibrant orange accent, RETRO-PIXEL display font at massive sizes for section headers, monospace everything for body, card-grid with thin black borders, light mode only.

## Distinctive features (the things to nail)

1. **Cream warm background everywhere** — `#efefe5`, not white. This is the foundation.
2. **MASSIVE retro-pixel section headers** — 120-200px tall pixel-display font ("BEYOND CAPITAL", "INCUBATION", "PORTFOLIO" style). Often offset / cropped / extending off-screen for dynamic feel.
3. **All body text is monospace** — Roboto Mono, gives "technical documentation" register.
4. **Single orange accent `#ff7120`** — for CTAs, "+" icons, accent dots, key labels. Used confidently but not as flood.
5. **Card grid with thin black borders** + slightly rounded corners (8-14px). Each section is a tiled set of card blocks.
6. **Vertical capsule/glass-tube** visual device — a tall rounded container with a character/object inside, used as visual punctuation between sections (3-4 instances on the homepage).
7. **Asymmetric/modular layout** — sections combine large headers with grid blocks at various widths. Not a rigid 3-column newspaper.
8. **Small decoration elements**: bullet `•` markers, starburst icons, small white-blob/sphere graphics, dotted background patterns.

---

## Color tokens (verified)

| Token | Value | Use |
|---|---|---|
| **Background** | **#efefe5** | Page background (warm cream) |
| **Accent orange** | **#ff7120** | CTAs, borders, "+" icons, key labels, brand mark |
| Accent orange hover | #c15727 | Hover state for orange CTAs |
| Text primary | #0e0e0e | Body text, headings (near-black, warm undertone) |
| Text secondary | #1b1b1b | Secondary dark |
| Text muted dark | #636363 | Captions, metadata |
| Text muted | #9e9e9e | Placeholders, disabled |
| Text light | #848484 | Tertiary |
| Border light | #e4e4e4 | Subtle dividers, card borders on light surfaces |
| Border medium | #bebebe | Stronger borders |
| Card surface | #ffffff | White cards floating on cream bg |
| Card dark | #353539 | Dark cards (used for news / "Latest" section at end) |
| Text on dark | #ffffff | White text on #353539 cards |
| Error | #ea384c | Red for errors |
| Info blue | #0082f3 | Blue for info |

**Light mode only.** No dark mode variant exists.

---

## Typography

| Role | Font | Free use |
|---|---|---|
| **Display (pixel/retro)** | **Departure Mono** (free, Google/GitHub) — closest match to LabsAmiga | Use at 120-200px for section headers |
| Display alternate | VT323 (Google Fonts, free) | Backup pixel font option |
| **Body & UI** | **Roboto Mono** (Google Fonts, free) | Regular 400 + Bold 700 |
| Fallback | Arial, sans-serif | System fallback |

### Font usage rules

- **Section headers**: Departure Mono, 120-200px, weight 400, line-height 0.85-0.95 (tight). Letter-spacing 0 or slightly negative. Often UPPERCASE.
- **H1 (page titles)**: Roboto Mono Bold (700), 40-52px, tight line-height.
- **H2 / H3**: Roboto Mono Bold or Regular, 20-28px.
- **Body**: Roboto Mono 400, 14-18px, line-height 1.4-1.5. Monospace for everything — paragraphs, captions, buttons, navigation.
- **Labels / chips**: Roboto Mono Bold, 12-14px, UPPERCASE, slight letter-spacing.

### Romanian glyph note

Both fonts handle Romanian: Roboto Mono has excellent `ăâîșț` coverage. Departure Mono has pixel-stylized but present glyphs.

---

## Layout & grid

### Breakpoints

- 768px (tablet)
- 1280px (desktop — main)
- 1440px (large)
- 1920px (extra large)

### Spacing

- Sections separated by 80-120px vertical space
- Card padding: 24-32px
- Element gaps: 16-24px

### Border radii

- 8px (most cards, buttons)
- 14-18px (larger feature cards)
- 999px (pill chips, fully rounded buttons)
- 0 (some flat sections)

### Container

- Max content width: ~1280px
- Outer padding: 24-48px depending on viewport

### Backgrounds

- Page: cream `#efefe5`
- Cards: white `#ffffff` with `1px solid #0e0e0e` border (or very dark border)
- "Latest News" / accent cards: dark `#353539` with white text
- Subtle dotted/grid pattern visible in some sections (decoration)

---

## Component patterns

### Top navigation bar

- Cream background, transparent or matching page
- Small dark logo (left)
- Navigation links centered: "Our Program | Portfolio | Media | Reviews | Team | FAQ | Blog" (or similar)
- Right: orange pill CTA "Apply Now" (or "Subscribe", "Get in Touch", etc.)
- Height ~64px
- Minimal — content dominates

### Hero / opening section

- MASSIVE pixel-display word/phrase that breaks the container (e.g., "CKING TOM..." — partial, off-screen left, gives dynamic broken-text feel)
- Below: small label in monospace caps ("BUILDING / TOMORROW")
- Body paragraph 2-4 lines
- Orange CTA pill button
- Right side: vertical capsule with character or branded image
- Decoration: small starburst/✱ icon

### Section header (universal pattern)

```
[Tiny label or "•" marker on left]
GIANT PIXEL DISPLAY WORD       ← Departure Mono 120-200px
[Sub-line in mono]
```

Examples from screenshot: "BEYOND CAPITAL", "INCUBATION", "PORTFOLIO" (split into 2 lines), "MEDIA PRESENCE", "TESTIMONIALS", "OUR TEAM", "FAQ", "LATEST NEWS"

Headers often spans wider than content beneath. Sometimes offset left, sometimes broken across lines for visual drama.

### Standard feature card

- White background (`#ffffff`)
- 1px solid dark border (`#0e0e0e`)
- Border-radius 8-14px
- Padding 24-32px
- Title in Roboto Mono Bold (20-22px)
- Body in Roboto Mono Regular (14-16px)
- Optional small icon top
- Often small "•" or label chip at top

### Stat card

- Compact white card with thin border
- Stat number large (Roboto Mono Bold, 40-60px)
- Stat label below (Roboto Mono Regular, 12-14px caps)
- Examples: "All Projects: 15" or "$2.5M ATH / +708% growth"

### Orange pill CTA button

- Background `#ff7120`
- Text white (or dark if accessibility requires)
- Padding 12px 24px
- Border-radius 999px (full pill) or 8px (rounded rect)
- Font Roboto Mono Bold, ~14px, UPPERCASE
- Examples: "APPLY FOR THE FUNDING", "APPLY FOR THE INCUBATION", "GET IN TOUCH"

### Vertical capsule / glass-tube device

- Tall rounded container (~120-180px wide, 300-500px tall)
- Light grey/white interior
- Character or branded object inside (e.g., robot mascot, but could be a synth, an artifact, etc.)
- Used as visual punctuation between sections
- 3-4 instances per homepage, with different poses/contents inside

### Partner / sponsor logo strip

- Horizontal row of logos
- Logos in muted greyscale (not full color)
- Chevron navigation arrows on right side
- Label "OUR PARTNERS" or similar at top in caps
- White background or transparent

### Portfolio project card

- White card, thin border
- Project name in Roboto Mono Bold
- Type label "Shown" or category
- Stats: "$X.XM" growth, percentage, year
- 3-4 column grid on desktop

### Testimonial card

- White card with avatar circle (placeholder dark grey)
- Name in Roboto Mono Bold
- Role in Roboto Mono Regular muted
- Quote in body
- Border + 14px radius

### Founder photo strip

- 3-4 portraits side by side
- B&W treatment (or close to)
- Name + title below each
- "Built by Founders for Founders" tagline above

### FAQ accordion

- Question rows with orange `+` icon at right
- Click to expand
- Border between rows (subtle)
- Title in Roboto Mono Bold

### News card (dark variant)

- Dark background `#353539`
- White text
- Image at top
- Title + excerpt + date
- Used for "Latest News" section at bottom

### Mega footer wordmark

- HUGE pixel display word filling full container width (e.g., "LABS" at 200-300px)
- Departure Mono, black on cream
- Brand-as-art-object

### Footer

- 3-4 column link grid
- Newsletter signup form
- Small logo + tagline
- Social icons
- Copyright bottom strip

---

## Page anatomy (from screenshot, top-to-bottom)

1. **Top nav** — logo + horizontal links + orange CTA pill
2. **Hero** — massive cropped pixel display + body + CTA + capsule mascot
3. **Partner strip** — "OUR PARTNERS" + logos carousel with chevrons
4. **Feature section 1** — "BEYOND CAPITAL" giant header + small label cards (KI / DeFi / GFi / LIVi) + capsule mascot + right side "Smart Capital" feature cards (Incubation, Investment) + orange CTA
5. **Feature section 2** — "INCUBATION" giant header + "End-and Support" + "Unique Approach" feature cards + capsule mascot + small icon cards (Tools, Treasury) + orange CTA
6. **Portfolio section** — "PORT / FOLIO" header split + "Our Incubations" label + "All Projects: 15" stat + central network/constellation diagram + 4-column project card grid
7. **Media Presence** — "MEDIA PRESENCE" header + decoration ball + 4 media logos with descriptions
8. **Testimonials** — "TESTIMONIALS" header + starburst + "Don't take our word for it" subtitle + 3 testimonial cards
9. **Team** — "OUR TEAM" header + "Built by Founders for Founders" subtitle + founder photo strip
10. **FAQ** — "FAQ" header + decoration ball + "Most Common Questions" subtitle + accordion rows with orange "+" toggles
11. **Latest News** — "LATEST NEWS" header + decoration + dark news cards with images
12. **Footer** — newsletter signup + link grid + MEGA "LABS" wordmark + social + copyright

---

## How to prompt Open Design for a Sintezaur page in this style

```
Generate the [PAGE NAME] page using the attached design system 
(design-system-chaingpt-labs.md) and content (pages.md, section [PAGE NAME]).

CRITICAL — before generating, quote back to me:
1. The exact background hex you'll use
2. The exact accent orange hex
3. The two font families you'll use

Apply these EXACTLY:
- Background #efefe5 (cream warm)
- Accent orange #ff7120
- Departure Mono for section headers (free Google Fonts pixel)
- Roboto Mono for body, navigation, buttons
- Card grid with thin #0e0e0e borders, 8-14px radius
- Massive (120-200px) pixel section headers, often offset
- Orange pill CTAs
- Light mode only
- Page content from pages.md

ADAPT to Sintezaur context (music-tech, Romanian language):
- Romanian UI labels throughout (Conectează-te, Bazar, Tezaur, Revistă, Forum)
- Replace ChainGPT robot mascot in vertical capsule with synth/keyboard/gear imagery 
  (or skip the capsule for non-hero sections)
- Apply this aesthetic to music gear context — listing cards, gear catalog, magazine

NOT a marketing landing — this is an active platform page with content feed.
Editorial register, not crypto-pitch.

Output: 1 desktop (1280px) + 1 mobile (375px). Both light mode.
```

---

End of design system.
