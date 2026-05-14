# Sintezaur — Design Specification (v1, REFERENCE-ONLY)

> ⚠️ **DEPRECATED for design generation.** This file proved too dense for LLM design tools — they lose detail mid-generation and produce messy output.
>
> **For design generation, use the slimmer pair:** `design-brief.md` (brand & token constraints, ~150 lines) + `pages.md` (page content only, ~400 lines). Prompt pattern in `design-brief.md` last section.
>
> **This file remains as a reference** for design system rationale, component library notes, and detailed page descriptions if a deeper dive is ever needed. Tokens here are SUPERSEDED by `design-brief.md` (which has WCAG-AA-verified light mode contrast — this file's earlier light mode tokens were under-tuned).
>
> **Version:** 0.1 (deprecated 2026-05-14) · **Date:** 2026-05-14 · **Companion:** `docs/spec/spec.md` (functional spec — *what* it does) and `docs/brainstorming/Design References - Modern Editorial Sites.md` (research).

---

## How to use this document

1. **Read sections 1–4 first** — brand, visual direction, design principles, and design tokens. These constrain every screen.
2. **Use section 5** as the component vocabulary — re-use these, don't invent new variants per screen.
3. **Section 6** describes every page with its content, layout, and notes — this is the work list.
4. **Sections 7–11** are guardrails: mobile-first patterns, dual-mode rules, accessibility, performance, and what NOT to do.

When generating a single page, prompt the design tool with: "Generate the `<page-name>` page from the Sintezaur design spec. Mobile-first. Dark mode primary. Use the design tokens and components defined."

---

## 1. Brand foundation

**Name:** Sintezaur (sintez(ator) + aur AND sinteză + tezaur — synth gold AND synthesis treasure)

**Domain:** sintezaur.ro

**Mission:** the trusted, comprehensive, and integrated Romanian-language resource for music production gear — primarily synthesizers — combining encyclopedia + marketplace + magazine + forum in a single coherent ecosystem.

**Audience:** Romanian-speaking music producers and synth enthusiasts. Range: hobbyists to working professionals. Design-literate, technically curious, mobile-heavy, often on the go between studio sessions.

**Tone:**
- Knowledgeable but not snobbish
- Technical but not dry
- Curated but not elitist
- Romanian-native — embraces RO diacritics and lyrical nav labels ("Tezaur" itself is already lyrical)
- Calm, confident, content-led — **never** flashy or fashion-portfolio brutalist

**Personality keywords:** modern, editorial, generous, dark-default, calm, curated, considered, Romanian.

**Anti-keywords:** OLX-cluttered, Web 2.0, banner-ad-heavy, parallax-y, neon-y, fashion-portfolio.

---

## 2. Visual direction

### Reference sites (study these in browser before designing)

Three primary references — open these and study them back-to-back:

1. **Resident Advisor — ra.co** — three-pillar nav, mixed-content feed (events + editorial), calm typographic hierarchy, single accent color used sparingly. Closest structural analogue to Sintezaur.
2. **Bloomberg Businessweek (2024 relaunch) — bloomberg.com/businessweek** — gold standard for editorial typography. Neue Haas Grotesk + Publico pairing, generous spacing, restrained accent (red). Aim for Revista's reading experience to feel like this.
3. **Rest of World — restofworld.org** — best example of dark-mode-toggle done right. Three-tier nav (Beats / Regions / Sections), single saturated accent (orange) sparingly used, photography- and illustration-forward.

Music-specific honorable mention:
- **Hearing Things — hearingthings.co** — ex-Pitchfork journalists, January 2024 launch. Explicit `prefers-color-scheme: dark/light`. Contributor photo bylines. Five-section nav.

Secondary references (mine for specific patterns):
- **Crack Magazine — crackmagazine.net** — dark-as-primary-mode in music editorial. Cover-image hero treatment.
- **gearnews.com** — dark-default UI tuned for gear photography (metallic/black surfaces pop on dark backgrounds).
- **CDM — cdm.link** — 2-tier card system (one featured + grid of regular). Tag-led navigation.
- **Scena9 — scena9.ro** — strongest Romanian editorial-design reference. Romanian diacritic-aware typography, photography-forward.
- **Reverb's News section — reverb.com/news** — editorial driving commerce contextually. Author bylines with credibility.
- **Are.na — are.na** — calm, content-first, blocks-and-channels organizational model. Inspiration for Forum's structure.
- **Discogs (architecture, not aesthetics)** — canonical entity page with marketplace listings hung off it. Wikipedia of records. Tezaur should be this for music gear.

### What we are NOT
- Not a flashy fashion site (no 200px brutalist headlines, no parallax stunts)
- Not a banner-ad-heavy commercial site (no rotating promotional banners, no "Black Friday" floods)
- Not OLX-cluttered (whitespace > density)
- Not Web 2.0 (no rounded glossy gradients, no skeuomorphic textures, no "Web 2.0 badge" aesthetics)
- Not stock-photo-y (commission Romanian-craft photography over stock)
- Not light-only (dark is primary)

### Mood: think *RA + Bloomberg Businessweek + Hearing Things, in Romanian, on dark*.

---

## 3. Design principles (non-negotiable)

These principles override anything else in this document if they conflict.

### Principle 1 — Mobile first, always

Every screen is designed for mobile (375×812 baseline — iPhone SE / 13 mini) first. Desktop is the *expansion*. If a layout works on mobile, it almost always works on desktop with column-additions. The opposite is not true.

**Failure mode to avoid:** Mudee (Iulian's parallel project) was designed desktop-first and looks bad on mobile. Do **not** repeat this.

Concrete consequences:
- Bottom-sheet patterns for filters, chats, replies (sliding up from the bottom of the screen)
- Bottom navigation bar (5 icons) persistent on mobile
- Sticky bottom CTAs ("Send message", "Reply", "Submit listing")
- Touch targets ≥44×44px (Apple HIG) / ≥48×48dp (Material) — never compromise
- Text never under 14px; body never under 16px on mobile
- One-column layouts on mobile, multi-column only as desktop expansion
- Test every screen at 375px width before declaring done

### Principle 2 — Dark mode is the primary mode

Sintezaur defaults to **dark mode**. Light is the alternative. Detection logic:
1. Respect `prefers-color-scheme: dark` (system default) — this is the case for most music producers (studios are dim)
2. Allow manual override via a top-nav toggle (auto / dark / light)
3. Persist the override across sessions (localStorage + user preference if logged in)

Both modes must be **fully designed and tested** — light mode is not a quick auto-invert. Each token has dark and light values explicitly.

Why dark-default: the music-tech audience works in dim studios. Crack Magazine and gearnews.com prove dark-default editorial works. Vice România proved Romanian audiences accept dark. There's a clear vacant chair: dark-default editorial in Romanian.

### Principle 3 — Generous negative space

Whitespace (dark or light) is a first-class design element. Every layout should feel airy. Aim for:
- Comfortable line-height (1.55–1.65 for body)
- Generous padding around cards (24-32px on desktop, 16-20px on mobile)
- Sections separated by 64-96px of vertical space on desktop, 48-64px on mobile
- Max reading measure ~70ch (about 640-720px for body text)

### Principle 4 — Editorial-scale typography, not brutalist

Headlines are **confident but proportional**. Not display-poster huge. Body text is **generous** (18-21px desktop, 16-18px mobile). The "200px brutalist" hero is a fashion-portfolio thing — not us.

Specific scale:
- Display XL (hero / cover): 48-64px mobile, 80-96px desktop
- Display L: 36-44px mobile, 64-72px desktop
- H1: 28-32px mobile, 40-48px desktop
- H2: 22-24px mobile, 28-32px desktop
- H3: 18-20px mobile, 22-24px desktop
- Body L: 18px mobile, 20-21px desktop (for long-form reading)
- Body M: 16px mobile, 17px desktop (UI default)
- Body S: 14px mobile/desktop (metadata, captions)
- Caption: 12px mobile/desktop

### Principle 5 — One saturated accent, used sparingly

Sintezaur uses **a single accent color** (amber/gold — see §4) for emphasis only:
- Primary CTAs
- Active states (selected tab, current nav item)
- Critical alerts
- Brand mark
- Link hover

**Not** for: full-color floods, large backgrounds, full-page tints, every chip on the screen. Like Bloomberg's red or RA's red — sparing.

### Principle 6 — Photography over stock

Real photos of Romanian-owned gear, Romanian producers, Romanian studios, Romanian-modified equipment. Stock images of synths kill credibility instantly. Tezaur entries can use manufacturer press photos initially (with attribution), but Revista features should commission Romanian photography.

### Principle 7 — Romanian-native typography

Choose fonts with **well-drawn Romanian diacritics**: ăâîșț. Not all Latin-1 fonts have proper Romanian glyphs (some draw ț with a generic cedilla instead of comma below — visually wrong for RO). Test every chosen face with a sample Romanian paragraph before locking it in.

### Principle 8 — Content speaks first, chrome speaks last

Navigation, footers, sidebars are quiet. Article body, gear photos, listing imagery, forum posts are loud. Like Stratechery, Are.na, Aeon — the chrome doesn't fight the content.

---

## 4. Design tokens

All tokens are dual-defined (dark + light). Implement as CSS custom properties; PrimeNG + @primeuix/themes will consume these via theme override.

### 4.1 Color palette

#### Brand accent (same hue in both modes, used sparingly)

```
--accent-500:  #E8B53C   /* primary amber-gold — Sintezaur's signature */
--accent-400:  #F0C861   /* lighter for hover on dark mode */
--accent-600:  #C9961F   /* darker for hover on light mode */
--accent-tint: #E8B53C with 14% alpha — for very subtle highlights only
```

Why amber-gold: ties to brand name ("sintez-aur" = synth-gold). Single distinctive hue, warm enough to feel inviting in dark mode, saturated enough to draw the eye for CTAs. Not red (taken by RA, Bloomberg, Reverb). Not orange (Rest of World). Distinctive.

#### Dark mode (primary)

```
--bg-base:      #0E0F12   /* page background, near-black with slight warm undertone */
--bg-raised:    #16181D   /* cards, nav surface */
--bg-elevated:  #1E2127   /* modals, dropdowns, popovers */
--bg-overlay:   rgba(0, 0, 0, 0.65)  /* modal scrims */

--text-primary:    #F0F2F5   /* default text */
--text-secondary:  #9CA0A8   /* metadata, captions */
--text-muted:      #6E7178   /* placeholders, disabled */
--text-on-accent:  #0B0C0F   /* text on accent backgrounds (amber CTAs) */

--border-subtle:  #2A2D33   /* dividers, card borders */
--border-strong:  #3A3E45   /* input borders, focus rings backing */

--success: #4FC373   /* greenish, used for "Confirmat" / "Verificat" */
--warning: #F0A93F   /* warmer than accent so users distinguish */
--error:   #E25A6E   /* desaturated red, not screaming */
--info:    #5B95D8   /* desaturated blue */
```

#### Light mode (alternative)

```
--bg-base:      #FAFAF7   /* warm off-white, slight cream */
--bg-raised:    #FFFFFF   /* cards */
--bg-elevated:  #F4F5F7   /* modals, dropdowns */
--bg-overlay:   rgba(15, 17, 22, 0.55)

--text-primary:    #0B0C0F
--text-secondary:  #52555C
--text-muted:      #8C8F96
--text-on-accent:  #0B0C0F

--border-subtle:  #E5E7EB
--border-strong:  #D1D5DB

--success: #2E9D55
--warning: #C77F2E
--error:   #C8425A
--info:    #3D75B8
```

### 4.2 Typography

#### Font stack

**Display** (hero headlines, magazine covers, page titles): **Bricolage Grotesque** (Google Fonts, free, variable font with optical sizing — more character than the now-overused Space Grotesk while staying legible at every size)
- Weights: 500, 600, 700 (via variable axis 200–800 if implementing variable; otherwise discrete weights)
- Used for: Display XL, Display L, occasionally H1

**Body sans** (UI, most headlines, body): **Inter** (Google Fonts, free, exceptional Romanian glyph coverage, multi-weight, genuinely hard to beat for readability — kept across Mudee/Sintezaur deliberately)
- Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- Used for: H1–H3, body, UI labels, buttons, nav

**Body serif** (long-form reading in Revista articles): **Spectral** (Google Fonts, free, designed by Production Type explicitly for screen reading at body sizes — paired with Inter for editorial register)
- Weights: 400, 500, 600
- Used for: Revista article body (≥600 words), pull-quotes, blockquotes in Revista

**Mono — code & technical readable** (code blocks, inline `<code>`, prices on cards, spec values): **JetBrains Mono** (Google Fonts, free)
- Weights: 400, 500
- Used for: Tiptap code blocks, gear spec values that need legibility, listing prices on cards. **Legibility-first.**

**Mono — synth-aesthetic accent** (sparingly, for vintage / technical callouts): **Departure Mono** (free, retro-pixel mono — gives instant synth-vintage vibe)
- Single weight
- Used for: hero stat tickers ("47 listings noi azi"), Tezaur callouts (serial number labels, firmware version strings), retro-styled badges, sparse "synth-vintage" UI touches. **NOT for body text, NOT for prices in primary CTAs.** Vibe over readability — use surgically (~3–5% of mono usage on a page max).

#### Type scale (mobile / desktop)

```
display-xl:   48px / 80px   line-height 1.05  weight 700  letter-spacing -0.02em  (Bricolage Grotesque)
display-l:    36px / 64px   line-height 1.10  weight 700  letter-spacing -0.02em  (Bricolage Grotesque)
display-m:    28px / 48px   line-height 1.15  weight 600  letter-spacing -0.01em  (Bricolage Grotesque OR Inter)
h1:           24px / 40px   line-height 1.20  weight 600  letter-spacing -0.01em  (Inter)
h2:           20px / 28px   line-height 1.30  weight 600  letter-spacing -0.005em (Inter)
h3:           18px / 22px   line-height 1.35  weight 600                          (Inter)
body-l:       18px / 21px   line-height 1.60  weight 400                          (Inter — UI long-form)
body-l-serif: 20px / 21px   line-height 1.65  weight 400                          (Spectral — Revista articles)
body-m:       16px / 17px   line-height 1.55  weight 400                          (Inter — default UI)
body-s:       14px / 14px   line-height 1.50  weight 400                          (Inter — metadata)
caption:      12px / 12px   line-height 1.45  weight 500  letter-spacing 0.02em   (Inter — labels, tags)
mono-code:    14px / 15px   line-height 1.45  weight 400                          (JetBrains Mono — readable mono)
mono-accent:  14px / 16px   line-height 1.40  weight 400  letter-spacing 0.02em   (Departure Mono — synth-vintage, sparingly)
```

#### Romanian diacritic notes

**Test every face with Romanian diacritics before locking in.** Paste the test phrase "Tezaurul sintetizatoarelor românești: șlefuit, țesut, întâlnit" — verify `ț` and `ș` use bottom-comma (Romanian style), not bottom-cedilla (Turkish style). Status of chosen faces:
- **Inter** — excellent RO glyphs (verified)
- **Bricolage Grotesque** — proper RO glyphs (verified, variable axis works for both static and animated)
- **Spectral** — excellent RO glyphs (verified — Production Type designed it explicitly for multi-language editorial)
- **JetBrains Mono** — fine RO glyphs
- **Departure Mono** — pixel-aesthetic; RO glyphs present but stylized (acceptable for accent use only, NOT for extended reading)

### 4.3 Spacing scale (4px base)

```
space-0:   0
space-1:   4px
space-2:   8px
space-3:   12px
space-4:   16px
space-5:   24px
space-6:   32px
space-7:   48px
space-8:   64px
space-9:   96px
space-10:  128px
space-11:  192px
```

Use for padding, margins, gaps. Don't introduce arbitrary values (`17px`, `23px`). Stick to the scale.

### 4.4 Border radii

```
radius-xs:  4px   /* chips, small tags */
radius-sm:  6px   /* badges, inline elements */
radius-md:  10px  /* buttons, inputs */
radius-lg:  14px  /* cards */
radius-xl:  20px  /* modals, large cards, bottom sheets (top corners) */
radius-2xl: 28px  /* very large surfaces (rare) */
radius-pill: 999px /* pill chips, avatars */
```

### 4.5 Shadows

```
shadow-1:  0 1px 2px 0 rgba(0,0,0,0.08)
              /* subtle separation — cards on dark mode use border instead of shadow */
shadow-2:  0 4px 12px -2px rgba(0,0,0,0.15)
              /* elevated cards, dropdowns */
shadow-3:  0 12px 32px -4px rgba(0,0,0,0.25)
              /* modals, popovers */
shadow-focus: 0 0 0 3px rgba(232, 181, 60, 0.35)
              /* focus ring around accent — for keyboard navigation */
```

On dark mode, shadows are subtle (the dark surface already separates). On light mode, shadows do more visual work.

### 4.6 Motion

Restrained. Modern but not flashy.

```
duration-fast:    120ms   /* hover, button press */
duration-base:    200ms   /* fade-in, dropdown open */
duration-slow:    350ms   /* page transitions, modal entry */
duration-slower:  500ms   /* progress bars, hero reveals */

ease-out:     cubic-bezier(0.16, 1, 0.3, 1)   /* default — feels native */
ease-in-out:  cubic-bezier(0.65, 0, 0.35, 1)   /* for symmetric movements */
ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1) /* RARE — only for bottom sheet pull */
```

**Used for:**
- Hover states on cards (200ms translateY -2px)
- Button press (120ms scale 0.97)
- Modal/sheet entry (350ms slide + fade)
- Skeleton loaders (shimmer)
- Theme toggle (color crossfade 350ms)
- Reading progress bar (smooth, scroll-tied)

**Never:**
- Parallax (motion sickness, no real value)
- Scroll-jacked transitions
- Bouncy / overshoot for everyday UI
- Autoplay video or audio
- Animated full-bleed video heroes

Respect `prefers-reduced-motion` — disable all non-essential motion when set.

### 4.7 Icons

Use **PrimeIcons** (already in tech stack — `primeicons` v7).

- Style: outline (filled only for active states like a filled heart)
- Default size: 20px on mobile, 24px on desktop
- Stroke weight: matches Inter — clean, not thick
- Tap target: 44px minimum around the icon (even if the icon itself is 20px)

Custom icons (gear glyphs, RO flag, etc.) — create in same outline weight + style if needed.

### 4.8 Layout grids

#### Mobile (375-767px)
- Single column
- Outer padding: 16-20px
- Card gap (vertical): 16-24px
- Content max width: 100% minus outer padding

#### Tablet (768-1023px)
- 8-column grid
- Outer padding: 32-40px
- Gutter: 16-24px
- Content max width: 720px (centered) for long-form

#### Desktop (1024-1439px)
- 12-column grid
- Outer padding: 48-64px
- Gutter: 24px
- Content max width: 1200px for browse pages, 720px for long-form

#### Large desktop (1440px+)
- 12-column grid
- Outer padding: 80px+
- Same gutter and max-widths

---

## 5. Component library

These are the building blocks. Every screen uses these — don't invent per-screen variants.

### 5.1 Buttons

**Variants:**
- `primary` — amber fill, dark text. CTAs that matter (publish, send message, confirm)
- `secondary` — outlined, transparent fill, text-primary color. Secondary actions
- `tertiary` — no border, just text + hover bg
- `danger` — error color, used sparingly (delete, ban)
- `ghost` — subtle background, on raised surfaces

**Sizes:**
- `sm` — h:32px, padding 8/16, body-s
- `md` — h:40px, padding 10/20, body-m (default)
- `lg` — h:48px, padding 14/24, body-l (mobile sticky CTAs)

**States:** hover (lighten 4%), active (darken 6%), focus (3px accent ring), disabled (40% opacity), loading (spinner inside, no label change)

**Border-radius:** `radius-md` (10px) for all sizes.

### 5.2 Inputs

**Text inputs / textarea:**
- h:44px (sm 36px, lg 52px)
- Border: 1px `--border-strong`
- BG: `--bg-raised`
- Padding: 12px horizontal
- Focus: accent ring + accent border
- Error: error color border + error message below
- Placeholder: `--text-muted`
- Font-size: 16px minimum (prevents iOS zoom on focus)

**Specialized:**
- Search (with leading icon, sticky on scroll)
- Currency (with currency selector inline)
- Price range (dual slider)
- Date picker (PrimeNG Calendar, restyled)
- Toggle / switch
- Checkbox + radio (custom-styled, large touch area)
- File upload (drag-drop zone with preview)

### 5.3 Cards

#### Gear card (Tezaur browse)
- 1:1 photo top (aspect-ratio 1/1)
- Bottom strip: brand (caption uppercase), model (h3), type tag chip + "X persoane dețin" badge
- Hover: subtle scale (1.02) + shadow lift on desktop
- Mobile: full-width, photo + info row stacked

#### Listing card (Bazar browse)
- 4:3 hero photo
- Top-left chip: condition badge (color-coded: mint=green, very_good=green-tint, good=neutral, fair=warning, for_parts=error-tint)
- Top-right: heart button (watch)
- Bottom: title (h3), brand+model in caption, price (mono, body-l), location (body-s + pin icon)
- Trust strip: seller avatar (24px) + rating stars + verified badge

#### Article card (Revista)
- 16:9 hero
- Category pill (caption uppercase, accent color)
- Title (h2 or h3 depending on placement)
- Excerpt (body-s, 2 lines max ellipsis)
- Byline: author photo (24px) + name + date + reading time
- "New" indicator (small accent dot) if published < 48h ago

#### Thread card (Forum)
- Pinned indicator (icon + small badge) if pinned
- Title (h3)
- Snippet (body-s, 2 lines)
- Tags: gear tags (with photo thumbnail) + free tags
- Footer: author avatar + reply count + last activity timestamp

#### User card (compact)
- Avatar 40px + username + trust badge inline
- Bio (body-s, 1 line)
- "Send message" or "Follow" CTA button

### 5.4 Navigation

#### Top nav (desktop ≥768px)
- Logo on left
- Center: Tezaur / Bazar / Revista / Forum (4 link slots)
- Right: search icon, theme toggle, notification bell (with count badge), avatar dropdown (or "Conectează-te" if guest)
- Background: `--bg-base` with subtle bottom border, sticky on scroll
- Height: 64px

#### Bottom nav (mobile <768px)
- 5 icons: Acasă (home), Tezaur, Bazar, Revistă, Forum
- Position: fixed bottom, h:64px (plus iOS safe-area inset)
- Active state: amber icon + small dot below
- Hides on scroll down, reveals on scroll up
- "Cont" / profile reached via hamburger in top bar OR avatar in top-right

#### Hamburger drawer (mobile + tablet)
- Slides from right
- Content: account links, settings, theme toggle, logout, admin (if applicable)
- Backdrop dismissable

#### Breadcrumbs
- Desktop only (mobile uses back chevron + page title)
- Pattern: `Tezaur / Sintetizatoare / Korg Minilogue XD`
- Last item: no link, slightly muted

#### Tabs (in-page navigation)
- Pill-style on mobile (scrollable horizontally if many)
- Underline-style on desktop
- Active: accent color
- Used for: user profile tabs, search result categories, dashboard sections

### 5.5 Feedback components

- **Toast** (snackbar) — slides from bottom on mobile, top-right on desktop. 4s auto-dismiss. Variants: success / warning / error / info.
- **Modal / dialog** — center on desktop, bottom-sheet on mobile. Dimmed backdrop. Esc to dismiss. Focus trapped inside.
- **Bottom sheet** (mobile) — slides from bottom, snaps at 50% / 100%. Used for filters, chat, reply editor, pickers.
- **Drawer** (side) — used for hamburger menu, admin nav.
- **Skeleton loader** — shimmer animation, matches the eventual shape of content.
- **Empty state** — illustration + headline + one-line explanation + primary CTA.
- **Error state** — similar pattern, with "Retry" or contextual action.
- **Banner** — for system-level messages (maintenance, GDPR notice). Dismissible.

### 5.6 Sintezaur-specific components

#### Gear hero block (Tezaur detail page)
- Left column (desktop): photo gallery with swipe (PrimeNG Galleria)
- Right column: brand (caption), model (display-m), category + type tags, "X persoane dețin" badge, "Marchează ca deținut" dropdown (owned/wishlist/wanted/used_to_own/loaned_out), "Vinde acest pe Bazar" CTA
- Below on mobile: gallery first, then info stacked

#### Price history chart
- Line + area chart (vertical: price, horizontal: time)
- Default: last 12 months, RON-normalized
- Toggle: line / histogram-by-condition
- Currency toggle (RON/EUR)
- Tooltip on hover: date, condition, price, "see listing"

#### Condition badge
- Pill chip with color-coded background tint
- Romanian labels: Nou / Mintă / Foarte bună / Bună / Acceptabilă / Pentru piese
- Always paired with the standard internal enum (`new`/`mint`/`very_good`/`good`/`fair`/`for_parts`)

#### Trust badge
- Levels: Email verificat (default), Telefon verificat (Phase 2), ID verificat (Phase 2), Trusted seller (admin-granted)
- Icon + label (caption text)
- Color-coded: neutral for email-only, accent for higher tiers

#### Rating stars
- 5 stars, accent-colored
- Half-star supported
- Aggregate shown with numeric value beside ("4.7 (23 recenzii)")
- Compact mode (just stars, 16px) for list cards

#### Chat bubble (Bazar messaging)
- Own messages: amber bg + dark text, right-aligned
- Other messages: `--bg-elevated` + primary text, left-aligned
- Variants:
  - `text` — plain bubble
  - `offer-card` — structured card inside bubble with: amount, currency, "Acceptă / Respinge / Contraofertă" buttons, expiry countdown
  - `system` — centered, italic, muted ("Tranzacție confirmată", "Listing marcat ca vândut")
- Image attachment: inline thumbnail, taps to full-screen

#### Forum post block (Discourse-hybrid threading)
- Avatar (40px) + username + trust badge + timestamp
- Optional "În răspuns la @user — Postare #N" header (small, muted, clickable to scroll/highlight parent)
- Body (Tiptap-rendered)
- Footer: Util (heart) count, "Răspunde" button, "Cita" button, "Raportează" overflow menu
- Hidden state: collapsed with "[Postare ascunsă — utilizator blocat] Show anyway" toggle

#### Article author byline
- Author photo (32px on cards, 64px on author profile)
- Name (body-m, bold) + role (caption, muted)
- Date (caption) + reading time (caption) + category pill
- "X articole" link to author profile

#### Forum subscription level dropdown
- Watching / Tracking / Mentioned only / Muted
- Iconography: bell, eye, @, slash-bell
- Default after replying in a thread: Watching

---

## 6. Page-by-page IA

For every page below: **mobile layout described first, desktop second**. All pages support both themes.

### 6.1 Global elements (every page)

**Top bar** (sticky):
- Mobile: logo left, search icon + notification bell + hamburger right (64px tall)
- Desktop: logo left, 4 section links center, search/bell/theme-toggle/avatar right (64px tall)

**Bottom nav** (mobile only, sticky):
- 5 icons: Acasă, Tezaur, Bazar, Revistă, Forum

**Footer** (minimal):
- 3 columns desktop, stacked on mobile:
  - Column 1: Sintezaur logo + tagline + tagline subtext
  - Column 2: Links (Despre, Contact, Termeni, Confidențialitate, RSS)
  - Column 3: Social + newsletter signup
- Bottom row: copyright + theme indicator + locale (RO/EN switcher, EN disabled in MVP)

**Theme toggle** (in top bar): 3 options (Auto / Întunecat / Luminos) in a small dropdown, with sun/moon icons.

### 6.2 Home (`/`)

**Purpose:** Sintezaur's "Storystream" — a unified feed mixing the latest from all four sections. Inspired by The Verge + RA. Sets the visual tone for first-time visitors.

**Mobile layout (top to bottom):**
1. **Welcome strip** (only for guests): tagline + "Conectează-te / Înregistrare" CTAs
2. **Featured hero**: rotating slot (3-5 items, manual curation by admin) — full-bleed image, overlay title + caption + "Citește" CTA
3. **Pulse** strip: "Acum pe Sintezaur" — 4 small chips showing live counts (X listings noi azi, Y discuții active, Z articole săptămâna asta, N persoane online)
4. **Latest in Revista** — 1 large card + 2 smaller cards, "Vezi tot →" link to /revista
5. **Hot in Bazar** — horizontally scrollable strip of 6-8 listing cards (price-drops + new + ending-soon mixed)
6. **Active in Forum** — list of 5 most-recent or most-replied threads, with reply count + last activity
7. **Spotlight Tezaur** — featured gear of the week (admin-curated) — big card with hero image, "Vezi pagina →"
8. **From the catalog** — 6 random Tezaur entries (rotating daily) to drive Tezaur discovery
9. **Final CTA**: "Înregistrează-te" + newsletter signup

**Desktop layout:**
- 12-col grid; hero spans full width with overlay text
- Sections 4-7 alternate between full-width carousels and 2-column splits
- "Pulse" strip becomes a more prominent banner under hero
- Right rail on some sections: "Trending tags", "Popular this month", "New this week"

**Design notes:**
- Hero photography: huge investment — commission Romanian-studio photography (synth on desk, modular rack in apartment, etc.)
- Hero text overlay: bottom-left positioned, max 2 lines, Bricolage Grotesque display-l
- Card hover: subtle lift + shadow, no aggressive zoom
- Photography ratio: 16:9 for hero, 1:1 for gear cards, 4:3 for listings, 16:9 for article cards

### 6.3 Tezaur — list (`/tezaur/`)

**Purpose:** Browse the gear encyclopedia. The "let me find a Korg Minilogue XD" page.

**Mobile layout:**
1. **Header**: "Tezaur" page title (h1) + line of body-s ("Enciclopedia synth-urilor și gear-ului music tech")
2. **Search bar** sticky
3. **Filter bar** — chips of active filters + "Filtre" button that opens **bottom sheet**
   - Bottom sheet contents: Category (multi-select), Type (depends on category), Brand (autocomplete), Year range (slider), In production / discontinued toggle, Sort
4. **Sort dropdown**: Cele mai populare / Alfabetic / Cele mai noi / Cele mai discutate
5. **Card grid**: 2 columns mobile (gear cards)
6. **Pagination** at bottom

**Desktop layout:**
- Left sidebar with filters (sticky, scrolls with content)
- Right: 3-4 column card grid (3 on md, 4 on lg, 5 on xl)
- Top of content: heading + search + sort

**Design notes:**
- Grid is dense but breathable — cards have 16-20px gap
- "Featured" gear (admin-curated) gets a small badge in the corner of the card
- Empty state: when filters return 0, show illustration + "Niciun rezultat. Încearcă filtre diferite sau caută:" with quick-link chips
- Tag filtering visual: when "Sintetizatoare" + "analog_mono" are active, show as two removable chips at top

### 6.4 Tezaur — detail (`/tezaur/:slug`)

**Purpose:** The "killer page" — everything about one gear item aggregated. SEO + monetization engine.

**Mobile layout (top to bottom):**
1. **Breadcrumb chevron** + back button (sticky top while scrolling)
2. **Photo gallery** (swipe horizontally, dots indicator at bottom) — 16:9 with optional zoom
3. **Hero info block**:
   - Brand (caption uppercase, muted)
   - Model (display-m)
   - Type chip (e.g., "Synth analog poliphonic")
   - "X persoane dețin acest synth" badge with eye icon
4. **Personal collection dropdown**: large pill button "Marchează ca..." → opens picker: Deținut / Lista de dorințe / Caut activ / Am avut / Împrumutat
5. **Primary CTAs row**:
   - "Vinde-l pe Bazar" (primary amber button)
   - "Cumpără de la..." dropdown (with affiliate retailer logos)
6. **Tab strip** (sticky on scroll): Detalii / Specs / Preț / Recenzii / Listări / Forum
7. **Tab content** (scrolls below):

   **Detalii tab:**
   - Editorial description (Tiptap-rendered, body-l-serif)
   - Lineage sidebar inline: "Predecesor: ← Moog Sub 37 | Acest model: Subsequent 37 | Succesor: → (niciunul)"
   - "Alte versiuni în familie" — horizontal scroll of related gear

   **Specs tab:**
   - Common fields table (brand, year released, year discontinued, form factor, MSRP at launch)
   - JSONB specs table (type-specific fields per category)
   - Firmware version + "Notițe de release" link if `latest_firmware_version` present
   - External resources: Manual (manufacturer URL), Wikipedia, Reverb price guide

   **Preț tab:**
   - Price history chart (line + condition histogram toggle, RON/EUR toggle)
   - "Vânzări recente" list (last 10 sold listings: date, condition, price)
   - "Preț nou (MSRP la lansare)" stat
   - Affiliate buy links: rows with retailer logo, price, "Cumpără →" link

   **Recenzii tab:**
   - Aggregate: large stars + "4.7 din 5" + "(23 recenzii)"
   - Breakdown bars: 5/4/3/2/1 stars
   - "Scrie o recenzie" CTA (visible only to logged-in users who haven't reviewed yet)
   - Reviews list: avatar + name + stars + body + photos + helpful count

   **Listări tab:**
   - Active Bazar listings for this gear (full listing cards, embedded)
   - "Toate listingurile X Korg Minilogue XD →" link

   **Forum tab:**
   - Canonical Q&A thread (pinned at top if `gear.canonical_thread_id` is set), with "Canonical" badge
   - Other forum threads tagged with this gear, sorted by last activity
   - "Începe un thread nou despre acest gear" CTA

**Desktop layout:**
- 2-column split below hero:
  - Left (8 col): tab content
  - Right (4 col, sticky): persistent action box (Marchează ca... / Vinde-l / Cumpără / Watching this page) + "Statistici" widget (X owners, Y forum threads, Z listings active) + lineage sidebar
- Gallery: large carousel above the split, with thumbnails strip

**Design notes:**
- This is THE page — invest in design polish here
- "Killer page" effect comes from density of cross-section data — make sure all sections feel populated
- Use accent gold sparingly: primary CTA, "Canonical" badge, watching-active state
- Empty states for sections (no reviews yet, no active listings): show as collapsed/grey with "Fii primul care..." CTA
- Print-style polish for the spec table — small caps for labels, mono for values

### 6.5 Bazar — list (`/bazar/`)

**Purpose:** Browse active listings. Filtering and saved searches are first-class.

**Mobile layout:**
1. **Header**: "Bazar" (h1) + line of body-s ("Cumpără și vinde gear muzical")
2. **Action row**: "Vinde un produs" primary button (sticky on scroll) + "Listinguri salvate" + "Căutările mele salvate" icon-links
3. **Search bar** sticky
4. **Filter chips strip** (horizontal scroll): Category, Condition, Kind (sell/trade/both), Delivery, Active filters with X-to-remove
5. **"Filtre avansate" button** → opens bottom sheet (all filters)
6. **Sort dropdown**: Cele mai noi / Preț ↑ / Preț ↓ / Se termină curând / Cele mai văzute
7. **Listing card grid**: 1 column mobile (full-width listing cards)
8. **Pagination / infinite scroll**: pagination for SEO, "Încarcă mai multe" button for UX

**Desktop layout:**
- Left sidebar (sticky filters)
- Right: 2-3 column listing grid (depending on viewport)
- Top action row stays sticky

**Design notes:**
- Listing cards prominently show price (mono, large) and condition badge (color-coded)
- Heart (watch) icon top-right of card — accent-color when active
- "Match pentru o căutare salvată" small badge if listing matches user's saved searches
- Empty-results state: illustration + "Salvează această căutare ca să primești notificări când apar listinguri noi"

### 6.6 Bazar — listing detail (`/bazar/:slug`)

**Purpose:** Single-listing page. Encourages contact, transaction.

**Mobile layout:**
1. **Back chevron** (sticky)
2. **Photo gallery** (swipe, full-bleed)
3. **Hero info**:
   - Title (h1)
   - Brand + model (body-s) — links to Tezaur if `gear_id` is set
   - Condition badge (large chip)
   - Price (display-m, mono) + currency
   - "Acceptă oferte" badge if seller has it enabled
   - Location + delivery method icons
4. **Sticky bottom CTA bar** (always visible):
   - "Trimite mesaj" (primary amber button)
   - Watch (heart) toggle
   - Share button (icon)
5. **Description** (Tiptap-rendered, body-l)
6. **Seller card**:
   - Avatar + username + trust badge
   - Rating + transaction count + member-since
   - "Vezi profilul" link
   - "Trimite mesaj" CTA
7. **Recently sold sidebar** (collapsible on mobile):
   - "Vânzări recente: X Korg Minilogue XD"
   - List of 5-10 sold prices
   - "Preț mediu (90 zile): X RON pentru *very_good*"
8. **Similar listings** strip — 4-6 listing cards horizontally scrollable

**Desktop layout:**
- 2-col split:
  - Left (8 col): gallery + description
  - Right (4 col, sticky): hero info + CTA box + seller card + recently sold
- Similar listings full-width strip below

**Design notes:**
- Sticky bottom CTA on mobile is critical — make sure it works on iOS Safari with proper safe-area
- Gallery: PrimeNG Galleria with swipe + pinch-zoom
- Trust signals on seller card: clearly visible (trust badge, rating stars, transaction count)
- For trade listings (`kind=trade`), show "Schimb pentru: [looking_for]" prominently
- For sold/expired listings: greyed out price, "Listing vândut / expirat" overlay, but still browseable for historic reference

### 6.7 Bazar — listing creation / edit (`/bazar/nou` and `/bazar/:slug/edit`)

**Purpose:** Step-by-step form to create a listing. Multi-step on mobile (1 section per screen).

**Mobile flow (steps):**
1. **Step 1: Cere ce vinzi**
   - Tezaur autocomplete: "Caută în Tezaur..." → typeahead → select gear from catalog
   - OR "Adaugă manual (nu apare în Tezaur)" toggle → free-text fields (brand, model, year)
2. **Step 2: Foto**
   - Upload zone (drag-drop on desktop, picker on mobile)
   - Drag-reorder photos (mobile: long-press + drag)
   - First photo = hero (with "Hero" badge)
   - EXIF strip notice ("Datele GPS din poze sunt eliminate automat")
3. **Step 3: Stare și descriere**
   - Condition picker (large buttons with examples on tap)
   - "Vezi ghid stare" link → opens modal with visual examples per tier
   - Title input
   - Description editor (Tiptap)
4. **Step 4: Preț + condiții**
   - Price + currency
   - "Acceptă oferte" toggle
   - Kind selector: Vând / Schimb / Vând sau schimb
   - "Caut la schimb" textarea (visible if kind != Vând)
5. **Step 5: Livrare**
   - Delivery selector: Doar ridicare / Doar livrare / Ambele
   - Shipping cost (if delivery includes shipping)
   - Carrier checkboxes (Sameday, Cargus, FAN, DPD, GLS, Poșta Română)
6. **Step 6: Locație**
   - City autocomplete (RO cities)
7. **Step 7: Verificare + publicare**
   - Preview card (looks exactly like listing card)
   - "Publică" primary CTA
   - "Salvează ca draft" secondary

**Desktop layout:**
- All steps on one scrollable page, with sticky progress bar at top
- Section anchors in sidebar for jump-to

**Design notes:**
- Each step has a clear primary CTA "Continuă" and back chevron
- Progress indicator at top (5/7, etc.) on mobile
- Validation inline, never blocks step transitions unless required field missing
- "Salvează ca draft" available at every step

### 6.8 Bazar — chat / inbox (`/mesaje` and per-listing chat)

**Purpose:** All buyer-seller conversations. Mobile-first design with bottom-sheet patterns.

**Mobile inbox layout (`/mesaje`):**
1. **Header**: "Mesaje" h1 + tabs: Cumpărător / Vânzător / Toate
2. **Search bar**: filter conversations
3. **Conversation list**:
   - Each row: avatar (40px) + listing thumbnail (small, right side) + name + last-message preview + timestamp + unread dot (accent color)
   - Sorted by most recent
4. Swipe gestures: swipe left for "Mute" / "Archive" actions

**Mobile per-chat layout (opens as full-screen on mobile, slide-in transition):**
1. **Header** (sticky): back chevron + listing thumbnail + listing title + seller/buyer info
2. **"Confirmă tranzacția" status banner** (if any) — shows current state: "Așteaptă confirmarea de la X" or "Tranzacție confirmată, lasă recenzia"
3. **Chat scroll area** (auto-scrolls to bottom):
   - Messages in chronological order
   - Day separator: "Astăzi" / "Ieri" / "12 mai 2026"
   - Message bubbles per §5.6 (text / offer-card / system)
4. **Reply input** (sticky bottom, expandable):
   - Text input + paperclip (attach photo) + smile (emoji) + send button
   - "Face o ofertă" floating button (visible if listing has `accepts_offers`)
   - On keyboard open: adjusts properly with safe-area

**Desktop layout:**
- 2-pane: conversation list on left (300-360px wide), open chat on right
- Mobile chat opens as a fullscreen overlay

**Design notes:**
- Offer card: prominent, structured. Shows offer amount with delta from list price ("750 RON, cu 100 RON mai puțin")
- "Confirmă tranzacția" button: very prominent during negotiation, then disappears after both confirmed
- After bilateral confirm: system message + "Lasă recenzia" CTA appears
- Block / report user accessible from the menu in chat header

### 6.9 Revista — list (`/revista/`)

**Purpose:** Magazine landing. Editorial-grade design.

**Mobile layout:**
1. **Header**: "Revista" (display-m) + subtitle ("Articole, tutoriale, interviuri din scena RO")
2. **Pillar tabs** (horizontal scroll): Toate / Recenzii / Tutoriale / Știri / Interviuri / Ghiduri / Deep-dive
3. **Featured hero**: large 16:9 image + overlay title (Bricolage Grotesque display-l) + byline
4. **Article cards** (1 column on mobile, 16:9 hero each)
5. **"Cele mai citite"** sidebar/strip
6. **"Numărul curent"** if quarterly print issue PDF exists

**Desktop layout:**
- 12-col grid
- Hero: full-width or 8-col with sidebar (3 col) showing "Cele mai citite" + "Autori activi"
- Articles: 2-3 column grid, varying card sizes (one big + several small)
- Pillar tabs: visible at top as pill nav

**Design notes:**
- Magazine-cover energy on featured: photography + minimal text overlay (Crack Magazine reference)
- Each article card carries: pillar pill (caption uppercase), title (h3 or h2 depending on prominence), byline strip, reading time
- Use the body-l-serif (Spectral) starting here so the editorial register is signaled

### 6.10 Revista — article detail (`/revista/:slug`)

**Purpose:** Long-form reading. Maximum reading-experience polish.

**Mobile layout:**
1. **Top bar** (sticky, minimal): back chevron + share icon + bookmark + reading-progress bar at very top (accent color, slides as user scrolls)
2. **Hero**: full-bleed 16:9 image + overlay article title (display-l) at bottom-left
3. **Byline strip**: pillar pill + author photo (32px) + name + date + reading time
4. **Article body**: Tiptap-rendered, body-l-serif (Spectral 20px), max measure 30em, generous line-height (1.65)
   - Inline embeds (YouTube, SoundCloud, Bandcamp) auto-unfurl
   - Inline gear links → Tezaur — styled as accent underline
   - Pull-quotes: display-m, italic, left border accent
   - Images: full-bleed on mobile, with captions
5. **End-of-article block**:
   - Tags (free + gear tags as chips)
   - "Recomandate" — 3 related article cards
   - Share strip
6. **Inline forum thread**: the auto-thread linked to this article rendered inline
   - "Discuții despre acest articol" h2
   - Subscribe toggle (Watching / Tracking / Muted)
   - First 5 replies inline + "Vezi tot pe Forum →" link
   - "Răspunde" CTA → opens reply editor (bottom sheet on mobile)

**Desktop layout:**
- Hero: full-bleed with overlay title left-aligned, bottom 25% of hero
- Article body: max-width 720px (centered)
- Right rail (sticky, optional): table of contents (auto-generated from h2/h3 in body) + "Citește în continuare" strip
- Inline forum thread: full-width section after article

**Design notes:**
- This is where Bloomberg Businessweek energy should be felt — editorial typography executed seriously
- Reading progress bar always visible
- Author byline links to author profile page
- "Citește articolul" audio narration toggle (post-MVP, future feature) — placeholder space reserved
- Print-friendly stylesheet for `@media print`

### 6.11 Author profile (`/autor/:slug`)

**Purpose:** Editorial credibility. Author's bio, photo, social, articles list.

**Mobile layout:**
1. **Hero**: cover image (16:9) or solid color block, author photo (96px) overlaid bottom-left, name (display-m) + role
2. **Bio block**: body-l-serif, generous spacing
3. **Social links**: small icon row (X, Instagram, SoundCloud, personal site)
4. **Stats**: "X articole publicate · Y total citiri · membru din 2026"
5. **Articles list**: chronological, smaller cards (1 col mobile)

**Desktop layout:**
- 2-col: hero + bio on left (5 col), articles list on right (7 col)

### 6.12 Forum — categories (`/forum/`)

**Purpose:** Forum landing. List of categories + recent activity.

**Mobile layout:**
1. **Header**: "Forum" (h1) + line of body-s
2. **Action row**: "Threadul tău" / "Începe un thread" CTA + filters (Toate / Subscrise / Nethreaded)
3. **Trending strip** (horizontal scroll): top 5 active threads "right now"
4. **Categories list**: each category as a row card
   - Name (h2) + description (body-s) + thread count + last activity ("acum 2 ore by @user")
   - Subcategory chips (if any)
5. **Active users widget** (footer): "Online acum" + small avatar strip

**Desktop layout:**
- 12-col: 8 col main (categories list) + 4 col sidebar (trending, online users, "Latest activity" feed)

### 6.13 Forum — thread list per category (`/forum/:category-slug`)

**Purpose:** List of threads in a category.

**Mobile layout:**
1. **Breadcrumb chevron + category name** (sticky)
2. **Description strip**: category description + thread count + subscribe toggle
3. **"Începe un thread nou"** CTA
4. **Sort tabs**: Activitate recentă / Cele mai noi / Cele mai răspunse / Necitite (only for logged-in)
5. **Pinned threads section** (if any): styled distinctly with pin icon + "Anunț" badge
6. **Thread rows**:
   - Title (h3)
   - Snippet (body-s, 1 line)
   - Tags (chips: gear tags with mini-photo, free tags as text chips)
   - Footer: author avatar + reply count + last reply (avatar + timestamp)

**Desktop layout:**
- 2-col: 8 col threads + 4 col sidebar (popular threads, related categories)

### 6.14 Forum — thread detail (`/forum/:category-slug/:thread-slug`)

**Purpose:** Read and reply. Discourse-hybrid threading.

**Mobile layout:**
1. **Sticky top bar**: back chevron + thread title (truncated, expand on tap)
2. **OP post** (rich, full):
   - Author block (avatar 48px + username + trust badge + posted-time)
   - Title (h1)
   - Tags (gear + free)
   - Body (Tiptap-rendered, body-l)
   - Engagement bar: likes count, reply count, share icon
3. **Subscribe dropdown**: pill with current level (Watching / Tracking / Mentioned / Muted)
4. **Replies** (chronological, flat — no visual nesting):
   - Each post: author avatar 40px + username + trust badge + time + body
   - "În răspuns la @user — Postare #N" small header if parent_post_id set; click → scrolls and highlights parent
   - Likes / Reply / Cite / Overflow menu (Edit / Report / Delete if own)
5. **Sticky reply box** (bottom):
   - Compact input expanding on focus
   - "Răspunde" button → opens Tiptap editor in bottom sheet (full-screen on mobile)
6. **Jump-to-newest** floating button (when scrolling away from end)
7. **Hidden posts**: blocked-user placeholder "[Postare ascunsă — utilizator blocat]" with "Show anyway" toggle

**Desktop layout:**
- Thread body: max-width 800px centered
- Right rail sticky: thread participants list (avatars), related threads, "Threadul are X răspunsuri în Y zile" stat

**Design notes:**
- "În răspuns la" header is the key — click to expand inline preview or jump to parent
- Post hover state on desktop: action bar (like, reply, etc.) appears
- Mobile: actions inline on every post (smaller icons)

### 6.15 Forum — new thread (`/forum/:category-slug/nou`)

**Purpose:** Create a thread.

**Mobile layout:**
1. **Header**: "Thread nou în [Category]"
2. **Title input** (large)
3. **Body editor** (Tiptap, expand to full screen)
4. **Tags**: gear tag picker (autocomplete from Tezaur) + free tags input
5. **Subscribe immediately toggle** (default ON)
6. **Submit + preview**

### 6.16 User profile (`/u/:username`)

**Purpose:** Public-facing user page. Profile + activity + tabs.

**Mobile layout:**
1. **Header**: cover image (subtle), avatar (96px) overlaid, username (display-m), trust badge + level
2. **Bio block**: bio text, location pin, social links, member-since
3. **Stats row**: Rating (X.X) + Tranzacții (N) + Articole (M) + Forum mesaje (P)
4. **Action row** (if viewing someone else): "Trimite mesaj" + "Blochează" overflow + "Raportează"
5. **Tab strip** (horizontal scroll):
   - Despre / Colecția / Listinguri active / Listinguri salvate / Recenzii primite / Forum / Articole (if editor)
6. **Tab content**:
   - Despre: full bio + social + collection privacy info
   - Colecția: per spec §8.1 — Deținut / Lista de dorințe / Caut / Am avut / Împrumutat — each as a sub-grid of gear cards
   - Listinguri active: listings grid
   - Recenzii primite: review list with star aggregate + per-review detail
   - Forum: thread list (started + replied to)
   - Articole: article list (if editor role)

**Desktop layout:**
- Hero remains same
- Tabs become a sticky horizontal nav under hero
- Content area: 2-col with right rail for secondary info (recent reviews, trust signals close-up)

### 6.17 My account / settings (`/setari/`)

**Purpose:** User configuration. Sub-pages.

**Mobile layout:**
1. **Header**: "Setări"
2. **Section list** (each opens a sub-page):
   - Profil (avatar, bio, location, social, display_currency)
   - Securitate (parolă, email, sesiuni active)
   - Notificări (matrix: trigger × canal)
   - Confidențialitate (cont public/privat, colecție public/privată, listă blocate)
   - Bazar (afișare contact, salvate, listinguri active, listinguri salvate)
   - Forum (subscrieri active, utilizatori blocați)
   - Date & GDPR (descarcă datele mele, șterge contul)

**Desktop layout:**
- 2-col: section nav left (sticky), section content right

**Design notes:**
- Notification preferences: matrix-style with trigger rows × channel columns (in-app / email), checkboxes. Mobile: collapse into list-per-trigger.
- "Șterge contul" button: very prominent danger styling, requires email confirm before final delete

### 6.18 Auth pages

**Common layout:**
- Minimal — no top nav, no bottom nav
- Sintezaur logo at top
- Title (display-m) + tagline below
- Form (max 380px width on mobile, centered)
- Body-m labels, body-l inputs (16px min)
- Primary CTA (full-width on mobile)
- Secondary links below ("Ai cont? Conectează-te" / "Ai uitat parola?")
- Footer: minimal "Termeni · Confidențialitate · Contact"

**Pages:**
- `/intra` — Login
- `/inregistrare` — Signup (email + password + acceptance checkbox for terms + privacy)
- `/verifica-email` — Email verification landing (token in URL)
- `/uita-parola` — Forgot password (email input only)
- `/reseteaza-parola` — Reset password landing (token in URL, new password + confirm)

**Design notes:**
- Photography: optional brand visual on the right (desktop only) — big synth photo
- Form errors: inline below inputs, error color, no shaking or aggressive animation
- After signup: clear "Verifică email-ul" confirmation page with resend link

### 6.19 Search results (`/cauta?q=...`)

**Purpose:** Unified search across all sections.

**Mobile layout:**
1. **Sticky search bar** with query
2. **Tab strip**: Toate / Tezaur / Bazar / Revista / Forum (with result counts)
3. **Filter chips** (per-tab specific)
4. **Result cards** (per tab):
   - Tezaur: gear cards
   - Bazar: listing cards
   - Revista: article cards
   - Forum: thread cards
5. **Result snippets** with `<mark>` highlighted query terms

**Empty state:**
- "Niciun rezultat pentru 'foo'."
- Suggestions: "Verifică ortografia · Încearcă termeni mai generali · Caută pe..."

### 6.20 Static pages

- `/despre` — About Sintezaur (mission, team, story)
- `/contact` — Contact form + email + social
- `/termeni` — Terms of service
- `/confidentialitate` — Privacy policy (GDPR-compliant)

**Layout:** centered single-column, body-l-serif for editorial feel, max 720px width.

### 6.21 Admin dashboard (`/admin/`)

**Purpose:** Internal admin tools. Functionality > aesthetics, but still polished.

**Sub-pages:**
- Dashboard (stats + alerts)
- Useri (search, filter, manage roles, ban, view audit)
- Tezaur (CRUD gear, families, relationships, descriptions per locale, canonical thread toggle)
- Bazar (listings list, moderate, view disputes)
- Revista (article queue, editor assignments)
- Forum (categories, pinned, moderate posts, content reports queue)
- Audit log viewer
- Currency rates (manual updates)
- Badges (manual grants)
- System config

**Layout:**
- Left sidebar (collapsible) with section nav
- Top bar: search + user menu
- Main content: tables (data-heavy), forms (entity editing)
- PrimeNG DataTable for lists
- Filters as drawer or in-table

**Design notes:**
- Tables: dense but readable, sticky header, row hover, action buttons in last column
- Forms: same input styles as the rest of the site, just denser layout
- Action logs visible inline ("Last edited by @admin 3 hours ago")

### 6.22 Empty / loading / error states

Across the site:

**Empty states** — illustration (line art, single accent color), headline (h2), one-line explanation (body-m), one primary CTA.

**Loading states** — skeleton loaders matching the eventual content shape. Shimmer animation respects `prefers-reduced-motion`.

**Error states** — illustration, headline ("Ceva s-a stricat"), one-line explanation, "Reîncearcă" CTA + "Mergi la pagina principală" secondary.

**404** — friendly, with search bar + "Poate căutai..." suggestions.

---

## 7. Mobile-first patterns (detailed)

### Touch targets

- Minimum: 44×44px (Apple HIG) — non-negotiable
- Padding around small icons (e.g., 20px icon → 44px tap area via padding)
- Test with thumbs, not cursors

### Bottom sheets

For: filters, chat, reply editor, photo upload, gear picker.

Specs:
- Slides from bottom of viewport
- Backdrop dim
- Snap points: 50%, 90%, 100% (full-screen)
- Drag handle (small horizontal bar) at top
- Dismiss: swipe down OR backdrop tap OR explicit close (X) button top-right
- Respect iOS safe-area-inset-bottom

### Bottom navigation

- 5 items max
- 64px height + safe-area-inset-bottom
- Position: fixed bottom
- Hide on scroll-down, show on scroll-up (300ms transition)
- Active state: accent icon + dot below
- Labels: caption text, always visible (not just on press)

### Sticky CTAs

- Bottom-fixed CTA strip (above bottom nav OR replacing it on certain pages)
- Used for: "Trimite mesaj" on listing detail, "Răspunde" on thread, "Continuă" on multi-step forms
- 64-72px tall
- Backdrop blur on iOS Safari for layering

### Pull-to-refresh

- All list pages (Tezaur browse, Bazar browse, Revista list, Forum threads, inbox)
- Native-feeling, with custom indicator (small spinner + accent color)

### Swipe gestures

- Gallery: swipe horizontally
- Inbox conversations: swipe left for "Mute / Archive"
- Thread list: swipe to subscribe / mute

### Mobile-specific text input

- `inputmode` attribute set correctly (e.g., `inputmode="numeric"` for price)
- `autocomplete` attribute (email, current-password, etc.)
- `enterkeyhint` for proper "next/send/search" keyboard buttons

### Safe areas

- Respect `safe-area-inset-*` for iPhone X+ notch and bottom indicator
- Test in landscape too

### Performance on mobile

- Avoid heavy JS on first paint
- Lazy-load images below fold
- Use srcset for responsive images (mobile gets ~600px wide variant max)
- Skeleton loaders < 100ms after navigation start

---

## 8. Dark/Light mode rules

### Detection logic

1. On first visit: respect `prefers-color-scheme` from OS
2. If user has set a preference (in settings): use that, ignore OS
3. Theme toggle in top bar offers: Auto (follow system) / Întunecat / Luminos
4. Persist user preference in localStorage + user account (synced on login)

### What changes between modes

- Background colors (all surface levels)
- Text colors (primary, secondary, muted)
- Border colors
- Shadows (subtler in dark, more pronounced in light)
- Image overlays (more aggressive in dark to prevent text-on-image issues)

### What stays consistent

- Accent color (amber-gold #E8B53C) — works on both
- Typography (font choices, scale)
- Spacing
- Border-radii
- Layout grids

### Per-component rules

- **Buttons** — primary stays amber in both; secondary/tertiary swap appropriately
- **Cards** — on dark mode use `bg-raised`; on light mode use white with subtle shadow
- **Inputs** — dark mode: bg-raised + border-strong; light mode: white + border-strong
- **Code blocks** — different syntax highlighting theme per mode
- **Charts** — colored properly in both (test contrast on both backgrounds)

### Photography handling

- Apply subtle CSS overlay on dark mode to take edge off brightness: `background: linear-gradient(rgba(14,15,18,0.1), rgba(14,15,18,0))`
- Avoid white-bordered manufacturer press photos in dark mode (they cut harshly) — when possible use cropped versions

### Testing checklist

- Switch modes on every page during design review
- Verify text contrast (WCAG 2.1 AA min) on both
- Verify focus rings visible on both
- Verify accent color readability on both surfaces

---

## 9. Accessibility (WCAG 2.1 AA minimum)

### Contrast

- Text on background: 4.5:1 minimum (body), 3:1 (large headlines)
- UI components: 3:1 contrast for borders/icons against adjacent colors
- Use tooling: Stark, axe DevTools, Lighthouse

### Keyboard navigation

- Every interactive element keyboard-accessible
- Focus order logical (top-to-bottom, left-to-right)
- Focus rings visible (3px accent ring with shadow-focus token)
- Skip-to-content link at top of every page (visually hidden until focused)
- Esc closes modals and bottom sheets

### Screen readers

- Semantic HTML (`<nav>`, `<main>`, `<article>`, `<aside>`, `<header>`, `<footer>`)
- ARIA labels where semantics insufficient
- Alt text on all images (descriptive, not "image of...")
- `aria-live` regions for dynamic content (toasts, real-time chat updates)
- Form labels properly associated (`<label for>` or `aria-labelledby`)

### Motion

- Respect `prefers-reduced-motion: reduce`
- Disable parallax, autoplay, non-essential transitions when set
- Provide alternatives (instant transitions instead of slides)

### Touch and pointer

- Min 44×44px touch targets
- Don't rely solely on hover (touch devices have no hover)
- Visible focus on keyboard, distinct from hover

### Color independence

- Never rely solely on color to convey information
- Use icons + text labels for status (e.g., "Disponibil" + green dot, not just green dot)
- Condition badges: color + Romanian text label

### Forms

- Clear labels, never placeholder-only
- Error messages descriptive, inline, accessible
- Required fields marked clearly

### Text

- Minimum 14px (body), 16px on mobile inputs (prevents iOS zoom)
- Line-height 1.5+ for body
- Max line length ~70ch for body
- Text resize-friendly (don't break at 200% zoom)

---

## 10. Performance budget

Lighthouse mobile scores ≥ 90 on home, Tezaur detail, Revista article, Bazar listing.

### Specific targets

- LCP < 2.5s on simulated Slow 4G
- INP < 200ms
- CLS < 0.1
- Initial JS bundle < 200KB gzipped (Angular SSR helps with First Paint)
- Images: srcset with 3 variants (mobile 600px, tablet 1200px, desktop 2000px); lazy-load below fold
- Fonts: preload critical (Inter 400/600 + Bricolage Grotesque 600); display=swap. Spectral, JetBrains Mono, Departure Mono loaded async (per-page-needed only).

### Anti-patterns to avoid

- Web fonts blocking render (use swap + preload critical)
- Hero images without explicit width/height (CLS)
- Carousel libraries that load before first paint
- Embeds (YouTube, SoundCloud) loading eagerly above fold — lazy-load all
- Excessive JS on landing (avoid SPA-router-on-first-paint when SSR is available)

---

## 11. Don'ts (anti-patterns specific to Sintezaur)

These are the failure modes of music-tech / marketplace / forum sites. Avoid every one.

### Do NOT

- **Make light mode the default.** Sintezaur is dark-default. Light is the alternative.
- **Use rotating banner ads** in editorial. Revista articles do not have banner ads between paragraphs. Affiliate links are inline, contextual, not banners.
- **Web 2.0 aesthetics.** No glossy gradients, no rounded skeuomorphic buttons, no "Web 2.0 badge" pattern.
- **OLX clutter.** No dense info-stuffed cards with 8 metadata items each. White space and 3-4 critical metadata only.
- **Fashion-portfolio brutalism.** No 200px headlines. Editorial-scale, not display-poster.
- **Parallax / scroll-jacking.** Motion sickness, no value. Articles scroll linearly.
- **Autoplay video or audio.** Hostile UX, mobile data eater. All media plays on click.
- **Stock photography of synths.** Real RO scene photos > stock images. If we can't get real, manufacturer press photos beat stock.
- **Dense desktop layouts that fail on mobile.** Mobile first, every screen.
- **Skip Romanian diacritics.** Test every typeface with `ăâîșț` before locking it in.
- **Five-color brand palette.** Single accent (amber), used sparingly.
- **Three-level nested forum threading.** We're Discourse-hybrid: linear + reply-jump.
- **Captcha gates.** Honeypot + first-post approval queue, not reCAPTCHA.
- **Hide dark mode behind settings.** Theme toggle visible in top bar.
- **Banner-stuffed homepage.** Editorial slots, content cards, mixed feed — yes. Bouncing pop-ups, cookie banners, GDPR overlays everywhere — no.
- **Generic "global music-tech" branding.** Sintezaur is *Romanian* music-tech. Lyrical RO labels, RO photography, RO accent in tone of voice.

---

## Appendices

### Appendix A — Color token reference table

| Token | Dark mode | Light mode | Usage |
|---|---|---|---|
| `--accent-500` | #E8B53C | #E8B53C | Primary CTAs, active states, brand mark |
| `--accent-400` | #F0C861 | — | Hover on dark mode |
| `--accent-600` | — | #C9961F | Hover on light mode |
| `--bg-base` | #0E0F12 | #FAFAF7 | Page background |
| `--bg-raised` | #16181D | #FFFFFF | Cards, nav |
| `--bg-elevated` | #1E2127 | #F4F5F7 | Modals, dropdowns |
| `--text-primary` | #F0F2F5 | #0B0C0F | Default text |
| `--text-secondary` | #9CA0A8 | #52555C | Metadata |
| `--text-muted` | #6E7178 | #8C8F96 | Placeholders, disabled |
| `--text-on-accent` | #0B0C0F | #0B0C0F | Text on amber backgrounds |
| `--border-subtle` | #2A2D33 | #E5E7EB | Dividers |
| `--border-strong` | #3A3E45 | #D1D5DB | Input borders |
| `--success` | #4FC373 | #2E9D55 | Confirmation states |
| `--warning` | #F0A93F | #C77F2E | Warning states |
| `--error` | #E25A6E | #C8425A | Errors |
| `--info` | #5B95D8 | #3D75B8 | Info messages |

### Appendix B — Typography token reference

| Token | Size mobile/desktop | Line-height | Weight | Family | Letter-spacing |
|---|---|---|---|---|---|
| `display-xl` | 48 / 80px | 1.05 | 700 | Bricolage Grotesque | -0.02em |
| `display-l` | 36 / 64px | 1.10 | 700 | Bricolage Grotesque | -0.02em |
| `display-m` | 28 / 48px | 1.15 | 600 | Bricolage Grotesque | -0.01em |
| `h1` | 24 / 40px | 1.20 | 600 | Inter | -0.01em |
| `h2` | 20 / 28px | 1.30 | 600 | Inter | -0.005em |
| `h3` | 18 / 22px | 1.35 | 600 | Inter | 0 |
| `body-l` | 18 / 21px | 1.60 | 400 | Inter | 0 |
| `body-l-serif` | 20 / 21px | 1.65 | 400 | Spectral | 0 |
| `body-m` | 16 / 17px | 1.55 | 400 | Inter | 0 |
| `body-s` | 14 / 14px | 1.50 | 400 | Inter | 0 |
| `caption` | 12 / 12px | 1.45 | 500 | Inter | 0.02em |
| `mono-code` | 14 / 15px | 1.45 | 400 | JetBrains Mono | 0 |
| `mono-accent` | 14 / 16px | 1.40 | 400 | Departure Mono | 0.02em |

### Appendix C — Spacing token reference

| Token | Value |
|---|---|
| `space-0` | 0 |
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 24px |
| `space-6` | 32px |
| `space-7` | 48px |
| `space-8` | 64px |
| `space-9` | 96px |
| `space-10` | 128px |
| `space-11` | 192px |

### Appendix D — Breakpoint reference

| Breakpoint | Min width | Notes |
|---|---|---|
| `xs` | 0px | Mobile portrait — design baseline |
| `sm` | 480px | Larger mobile / small tablets |
| `md` | 768px | Tablets, small desktops |
| `lg` | 1024px | Standard desktops |
| `xl` | 1280px | Large desktops |
| `2xl` | 1536px | Very large displays |

### Appendix E — Quick reference card (print this if helpful)

**Brand:** Sintezaur · sintezaur.ro · synth-gold + treasure
**Audience:** Romanian music producers, synth enthusiasts, dark-studio dwellers
**Tone:** modern, calm, technical, Romanian-native, content-led
**Mode:** dark-default, light-alternative, both fully designed
**Type:** Bricolage Grotesque (display), Inter (body), Spectral (long-form serif), JetBrains Mono (code), Departure Mono (synth-vintage accent, sparingly)
**Accent:** amber-gold #E8B53C, used sparingly
**Grid:** mobile-first, 4px spacing base, 1 column → 12 column
**Motion:** restrained, 120-350ms, ease-out, respects reduced-motion
**Photography:** Romanian scene > stock images
**Don'ts:** Web 2.0, brutalism, parallax, autoplay, captcha, banner ads, light-as-default

### Appendix F — Example prompts for design tools

When generating a single page, use this prompt template:

> Generate the `<page name>` page for Sintezaur, a Romanian music-tech platform. Apply the Sintezaur Design Specification:
> - Mobile-first, with desktop expansion
> - Dark mode primary (test light mode too)
> - Use design tokens: amber-gold accent #E8B53C, Space Grotesk display, Inter body, generous spacing
> - Components: per the Sintezaur component library (cards, buttons, bottom sheets, etc.)
> - Romanian UI labels (use the labels in section 6 of the spec)
> - Editorial tone, modern, calm, content-led
> - No Web 2.0, no brutalism, no parallax, no banner ads
>
> Page-specific content: [paste the relevant subsection from section 6 here]

For component generation:

> Generate the `<component>` component for Sintezaur. Apply tokens from the design system. Variants: [list]. States: hover, active, focus, disabled. Both dark and light mode.

---

*End of document. Last sync with `docs/spec/spec.md` v0.3 (2026-05-14).*
