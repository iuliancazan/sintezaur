# Design System Extract — Tablet Magazine (verified)

> **Source:** tabletmag.com homepage CSS, scraped 2026-05-14 (with browser User-Agent — site blocks default fetchers).
>
> **Use case:** drag-drop this file into Claude Design / Open Design when you want a generated page to feel like Tablet's print-magazine-on-web aesthetic.
>
> **Verification:** all colors and font names below are pulled directly from Tablet's production CSS (CSS custom properties + font-family declarations). Sizes and grid columns from production stylesheets. **Not approximations.**

---

## Aesthetic in one line

**Print-magazine-on-web** — newspaper-like grid, cream-beige background, off-black text (#222 not #000), single brand red (#dd3418) used sparingly but confidently, custom serif typography, intellectual editorial gravitas.

## Tone keywords

cultural · print-feel · newspaper · intellectual · confident · dense-but-airy · warm · classical · text-forward · serif-everywhere

## Stack info

- Built with **Next.js** (visible from `/_next/static/` paths)
- Carousels via **slick-carousel** (cdnjs)

---

## Color tokens (verified from production CSS)

| Token name (theirs) | Value | Use |
|---|---|---|
| `--beige` | **#efe9dc** | Main page background (the "cream" feel) |
| `--beige-light` | #f7f7f2 | Lighter beige variant for subtle surfaces |
| `--beige-dark` | #e2dacb | Darker beige for accent / hover |
| `--off-white` | #f7f6f2 | Card / surface white-but-warm |
| `--off-white` (alt) | #f1d5b9 | Sand-pink off-white in some contexts |
| `--black` | **#222** | Body text + general "black" — note NOT pure black |
| `--black-overlay` | #2222224d | 30% alpha for modal scrims |
| `--red` | **#dd3418** | Brand red — used for subscribe CTA, section labels, accent borders |
| `--red` (alt) | #e73f22 | Lighter red variant (hover or secondary) |
| `--sand` | #f1d5b9 | Warm sand — used in featured boxes / accents |
| `--bronze` | #97773b | Premium tier accent / sophisticated highlight |
| `--fiction-blue` | #10387b | Fiction-section themed blue (rare) |
| `--fiction-pink` | #fdefed | Fiction-section themed pink bg |
| `--collection-background-grey` | #e0dfdc | "Collection" pages background |
| `--collection-background-grey-section` | #dad4c6 | Darker collection grey |
| `--gray-darkest` | #444 | Deepest grey for emphasis |
| `--gray-darker` | #666 | Mid grey for secondary text |
| `--gray-dark` | #888 | Tertiary grey |
| `--gray-light` | #9b9b9b | Muted grey |
| `--gray-lighter` | #ccc | Light grey for dividers |
| `--podcast-title-color` | #e6e5e6 | Light text on dark podcast cards |

### Light mode only

Tablet ships **no dark mode**. The aesthetic depends on the warm cream background. If you adapt this to dark mode, the print-paper warmth is lost.

---

## Typography (verified)

5 font families in use. **All paid / custom** — you need free alternatives for non-commercial reproduction.

| Role | Tablet font | What it is | Free alternative |
|---|---|---|---|
| Display serif | **ItcCushing** | ITC Cushing — classic transitional serif | **Recoleta** (free), **Fraunces** (Google Fonts, free), or **Crimson Pro** (Google Fonts, free) |
| Body serif | **BradfordLL** | Lineto Bradford — contemporary editorial serif | **Newsreader** (Google Fonts, free), **Source Serif Pro** (free), **PT Serif** (Google) |
| Body sans | **Graebenbach** | Milieu Grotesque-family contemporary sans | **Inter** (Google, free), **General Sans** (Indian Type Foundry, free), **Geist Sans** (Vercel, free) |
| Condensed all-caps | **Knockout 26–46** (multiple weights/widths) | Hoefler & Co condensed sans — the all-caps label face | **Saira Condensed** (Google, free), **Barlow Condensed** (Google, free), **Oswald** (Google, free) |
| Fallback mono | Consolas, Monaco, monospace | System mono | **JetBrains Mono** (free) |

**Important context on Knockout:** Tablet uses _at least 10 different Knockout cuts_ (Knockout 26, 27, 28, 29, 30, 31, 32, 33, 34, 46). Knockout has both weight variation AND width variation per number — this is what gives Tablet's all-caps labels their compressed-magazine character. A free alternative like Saira Condensed won't have the same density variety; pick 2-3 weights of Saira Condensed and accept the loss of character.

### Type scale (rem-based, 16px root, verified from production)

| Use (inferred) | rem | px equivalent | Frequency in CSS |
|---|---|---|---|
| Display-XL (masthead) | 6rem | 96px | 10 declarations |
| Display-L | 3.75rem | 60px | 28 |
| Display-M | 3rem | 48px | 41 |
| H1 | 2.25rem | 36px | 18 |
| H2 | 1.875rem | 30px | 41 |
| H3 | 1.75rem | 28px | 24 |
| Featured body | 1.5rem | 24px | 44 |
| **Body default** | **1.25rem** | **20px** | **81 (most common!)** |
| Body small | 1.125rem | 18px | 52 |
| UI default | 1rem | 16px | 33 |
| Small / caption | 0.875rem | 14px | 19 |

**Insight:** Tablet's default body text is **20px** (1.25rem) — larger than most editorial sites. This is why it reads "generously" / "print-magazine-y." 1.125rem (18px) is secondary body.

---

## Layout / grid (verified)

### Breakpoints

| Width | Role | Frequency |
|---|---|---|
| 375px | Small mobile baseline | 19 declarations |
| 768px | Tablet | 444 |
| **1080px** | **Main desktop breakpoint** (THE key one) | **500** |
| 1440px | Large desktop | 414 |
| 1728px | Extra large | 104 |

Maximum content widths seen:
- **1272px** — main content max
- 1080px — secondary container
- 690px — likely article body
- 575px — narrow centered (e.g., signup forms)
- 39rem (624px), 42rem (672px), 34rem (544px) — varying article-body widths

### Grid patterns observed

```
grid-template-columns: 1fr                          /* single column */
grid-template-columns: 1fr 1fr                      /* 50/50 split */
grid-template-columns: 2fr 1fr                      /* feature + sidebar */
grid-template-columns: 40% 1fr                      /* cover + content */
grid-template-columns: 1fr 119px 119px 1fr          /* 4-col with central narrow */
grid-template-columns: 1fr 119px auto 119px 1fr     /* 5-col header pattern */
grid-template-columns: 1fr 171px auto 171px 1fr     /* 5-col larger variant */
```

The `1fr [N]px [N]px 1fr` pattern is distinctive — central narrow columns for sidebars/widgets, outer flexible columns. This is the newspaper-grid effect you saw in the screenshot.

### Border radii

| Value | Frequency | Use |
|---|---|---|
| 50% | 14 | Avatars, circles |
| **8px** | 10 | Standard buttons / small boxes (most common) |
| 20px | 4 | Cards / medium surfaces |
| 30px | 2 | Larger rounded |
| 40px | 3 | Tier card tops, large rounded |
| 24px | 1 | Modal-ish |
| 9999px / 1000px | 2 | Pill chips, oval buttons |
| 100% | 2 | Circle elements |

Tablet's "arched tops" on subscription tier cards likely use `border-radius: 40px 40px 0 0` or similar.

### "Dashed red border" feature boxes

Not found as `border:...dashed` in CSS — they may be implemented as:
- SVG background images
- `outline` with dashed style
- Repeated linear-gradient pattern
- Or were on a page state I didn't grab

If you want to replicate, use `border: 2px dashed #dd3418` directly.

---

## Component patterns (from page anatomy)

### Section label (universal across cards)

```
[NEWS & POLITICS]            ← Knockout condensed all-caps, color: #dd3418, letter-spacing positive
Article Title Here           ← BradfordLL serif, weight 600-700, 24-30px
Excerpt paragraph text...   ← BradfordLL serif body, 18-20px
BY AUTHOR NAME              ← Knockout all-caps italic, 12-14px, color: #222 or #444
```

### Standard article card

- Thin black border (1px solid `#222`)
- Image at top (4:3 typical)
- Padding ~24-32px
- Section label (red, all-caps Knockout)
- Title (BradfordLL serif, bold)
- Excerpt (2-4 lines body)
- Byline (italic all-caps)

### Hero feature

- Larger version of standard card
- Title in **ItcCushing** display weight, 32-44px
- Drop cap on first paragraph (visible in screenshot)
- "Continue reading →" link at end

### Featured editorial boxes (dashed-border style)

- Used for "THE SCROLL" and "PRINT EDITIONS" callouts
- Header in red, all-caps, prominent
- Themed content within (carousel, podcast, etc.)
- Replicate with: `border: 2px dashed #dd3418; padding: 24px; background: #f7f7f2;`

### Magazine cover block

- Full-width section
- Cover image (looks dark cosmic with logo)
- "MAY 2026" issue title in ItcCushing display, very large, all-caps or display-cased
- "In this issue" tagline below in Graebenbach sans

### Dark sidebar card ("Listen to Tablet" / podcast)

- Background: `#222` (the `--black`)
- Text: `#e6e5e6` (`--podcast-title-color`) — light grey, not pure white
- Red label at top (`#dd3418`)
- Title in serif (BradfordLL light or italic)

### Subscription tier cards (×4)

- Arched top: `border-radius: 40px 40px 0 0` (approximate)
- Thin black border + subtle shadow
- Tier name in Knockout all-caps top
- Price large, bold
- Feature bullet list
- "Subscribe" CTA bottom
- "MACHER" tier (premium) uses `--bronze: #97773b` accent (NOT gold like I guessed)

### Footer category lists

- Section title in Knockout all-caps + "See All →" link
- 3-5 article titles in BradfordLL serif, smaller (~14-16px)
- Bylines in italic all-caps
- 3 columns on desktop

---

## Distinctive motifs to lift

1. **Cream `#efe9dc` background** + **off-black `#222`** text + **single red `#dd3418`** accent. Lock these three exact values for instant Tablet feel.
2. **Body text at 20px (1.25rem)** — bigger than standard. Drives the "print magazine" reading rhythm.
3. **All-caps red small-caps labels** above every card title (Knockout condensed — use Saira Condensed free alt).
4. **Italic all-caps bylines** "BY AUTHOR NAME" — very magazine.
5. **Custom paid fonts everywhere** — to mimic with free, accept that the typographic personality will be 60-70% there, not 100%.
6. **Multiple serif faces** (display vs body) — Tablet doesn't use one serif for everything. ItcCushing display + BradfordLL body. Mimic with Fraunces display + Newsreader body.
7. **Newspaper column dividers** via `1fr 119px ... 1fr` grid pattern with subtle vertical lines.
8. **20px and 1.25rem dominate** the type scale — embrace this rhythm.
9. **Magazine cover treated as content** (full-width section showcasing physical issue).
10. **Heavy footer** with categorized link lists organized in 3 columns.

---

## What to AVOID lifting (anti-patterns for Sintezaur use)

- **No dark mode** — Tablet doesn't ship one. Don't try to brute-force translate this aesthetic to dark mode.
- **Paid font dependency** — if you don't license ItcCushing + BradfordLL + Knockout + Graebenbach, you're using free alternatives that lose ~30% of the typographic personality.
- **Newspaper density** — Tablet works at this density because of the serif-rich typography. Stripped down to free fonts on a dark bg, it may feel cluttered, not editorial.
- **Religious / Jewish-cultural framing** — Tablet's tone is specific to Jewish cultural commentary; tone doesn't transfer.

---

## How this might inspire Sintezaur (when adapting Revista specifically)

These are **selective extractions** for Revista pages (NOT the whole platform):

- **Section labels in accent color** (amber-gold for Sintezaur) as small caps above titles
- **Drop caps on featured Revista articles** — print-paper signal
- **Body at 20px (1.25rem)** in serif (Spectral) — Tablet rhythm
- **Italic uppercase bylines** "DE AUTHOR NAME"
- **Multi-serif system** (Bricolage for display + Spectral for body, mirroring ItcCushing + BradfordLL)
- **Section dividers as subtle vertical lines** between content columns

Don't extract for Bazar, Forum, Tezaur — they need a more functional language.

---

## Prompt template if you want to test this aesthetic

```
Generate the [Page Name] page in the style of Tablet Magazine (tabletmag.com).

Constraints (attached: design-system-tablet.md):
- Cream background #efe9dc, off-black text #222, brand red #dd3418
- Body text 20px (1.25rem), serif font (use Newsreader as BradfordLL alternative)
- All-caps section labels in red, Saira Condensed (or Barlow Condensed) as Knockout alternative
- Italic uppercase bylines
- Newspaper 3-column grid pattern (1fr 119px ... 1fr)
- Article cards with thin black borders (#222 1px)
- Print-magazine-on-web aesthetic — content-dense but airy
- Light mode only

Content (attached: pages.md, section [Page Name]):
[paste page content]

Output: 1 desktop composition (1080-1272px), optionally mobile-responsive.
```

---

End of extract. Verified 2026-05-14 against tabletmag.com production CSS.
