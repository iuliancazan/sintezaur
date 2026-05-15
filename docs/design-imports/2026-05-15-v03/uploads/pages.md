# Sintezaur — Page Content & Structure

> **Pair with `design-brief.md`.** Pure content + block order per page. No design language — the design tool decides layout, spacing, sizing within the brief constraints.
>
> Mobile-first reading order in every page. Desktop expands horizontally where indicated.

---

## Site-wide elements (appear on every page)

### Top bar (sticky)

- **Mobile**: logo (left), search icon + notification bell + hamburger menu (right). Height ~64px.
- **Desktop**: logo (left), 4 nav links centered (Tezaur, Bazar, Revistă, Forum), right side: search + bell + theme toggle + avatar dropdown (or "Conectează-te" if guest).

### Bottom nav (mobile only)

- Sticky bottom, 5 icons with labels: **Acasă**, **Tezaur**, **Bazar**, **Revistă**, **Forum**
- Active state visible on current section
- Hides on scroll-down, reveals on scroll-up

### Theme toggle

- 3 options: Auto (follow system) / Întunecat / Luminos
- Top bar on desktop; inside hamburger menu on mobile

### Hamburger drawer (mobile + tablet)

- Slides from right
- Contents: account links, settings, theme toggle, logout, admin link (if applicable)

### Footer (minimal)

- 3 columns desktop / stacked mobile:
  1. Logo + tagline + tagline subtext
  2. Links: Despre, Contact, Termeni, Confidențialitate, RSS
  3. Social icons + newsletter signup (email input + button)
- Bottom strip: copyright + locale switch (RO/EN — EN disabled in MVP)

---

## Home (`/`)

**Important: this is NOT a marketing landing page.** It is the active platform homepage — a Storystream-style mixed-content feed showing live activity from all four sections. Think Resident Advisor's homepage, not a SaaS landing page.

Content blocks (mobile order):

1. **Welcome strip** (only if user is not logged in): one-line tagline + Conectează-te + Înregistrare buttons
2. **Featured hero** — rotating slot (3-5 admin-curated items). Full-bleed image + overlay title + 1-line caption + "Citește" CTA
3. **Pulse strip** — small live counts: e.g., "47 listings noi azi · 12 articole săptămâna asta · 89 utilizatori activi"
4. **Latest in Revista** — 1 large article card + 2 smaller. Each: image, pillar pill, title, byline (author photo + name + date + reading time). Link below: "Vezi toate articolele →"
5. **Hot in Bazar** — horizontal-scroll strip of 6-8 listing cards (mix of new + price-drops + ending-soon). Each card: photo, gear name, price, condition badge, location
6. **Active in Forum** — list of 5 most-recent or most-replied threads. Each row: title, author avatar, reply count, last activity timestamp ("acum 2 ore")
7. **Spotlight Tezaur** — featured gear of the week (admin-curated). Big card with hero image + brand+model + 1-line description + "Vezi pagina →"
8. **From the catalog** — 6 random Tezaur entries (rotate daily). Gear card grid (2 col mobile, 4-6 col desktop)
9. **Footer CTA**: "Înregistrează-te" button + newsletter signup field

Empty state: never empty (we always seed content). If somehow no listings/articles yet, show: "Sintezaur abia se trezește — primele listinguri și articole vin în curând."

---

## Tezaur — list (`/tezaur/`)

**Purpose**: browse the gear encyclopedia (synths, drum machines, samplers, eurorack, etc.).

Content blocks:

1. Page header: "Tezaur" title + tagline "Enciclopedia gear-ului music tech"
2. Search bar (sticky)
3. Active filter chips strip (visible if any filters applied; X to remove each)
4. Filters button → opens bottom sheet (mobile) or expands sidebar (desktop)
   - Filters: Category (multi-select), Type (depends on category), Brand (autocomplete), Year range (slider), Status (in production / discontinued)
5. Sort dropdown: Cele mai populare / Alfabetic / Cele mai noi / Cele mai discutate
6. Gear card grid:
   - Each card: 1:1 photo (top), brand (small caps), model (large), category + type tags, "X persoane dețin" counter
   - Grid: 2 col mobile, 3-4 col tablet, 4-5 col desktop
7. Pagination at bottom

Empty state: "Niciun rezultat. Încearcă filtre diferite sau caută:" + quick-link chips for popular categories.

---

## Tezaur — detail (`/tezaur/:slug`)

**Purpose**: the platform's killer page. Everything about one gear item aggregated.

Content blocks (mobile order):

1. Back chevron (sticky)
2. Photo gallery (swipe horizontally on mobile, dots indicator)
3. Hero info block: brand (small caps, muted), model (large), category + type tags, "X persoane dețin acest gear" badge
4. **Personal collection dropdown** button: "Marchează ca..." → opens picker: Deținut / Lista de dorințe / Caut activ / Am avut / Împrumutat
5. **Primary CTAs row**:
   - "Vinde acest pe Bazar" (primary)
   - "Cumpără de la..." dropdown with affiliate retailer logos (Thomann, Reverb, etc.)
6. **Tab strip** (sticky on scroll): Detalii / Specs / Preț / Recenzii / Listări / Forum

### Tab content

**Detalii**
- Editorial description (long-form text, formatted)
- Lineage sidebar: "Predecesor: ← X | Acest model | Succesor: → Y" (from typed gear_relationships)
- "Alte versiuni în familie" horizontal scroll of related gear cards

**Specs**
- Common fields table: brand, year released, year discontinued, form factor, MSRP at launch
- Type-specific JSONB specs rendered as table (e.g., synth: polyphony, oscillators, filter type, keyboard size, MIDI/CV)
- Firmware: latest version + "Notițe de release" link (if known)
- External resources: Manual URL, manufacturer site, Wikipedia, Reverb price guide (rendered as link rows)

**Preț**
- Price history chart (line chart + histogram-by-condition toggle, RON/EUR toggle)
- "Vânzări recente" list (last 10 sold listings: date, condition, price)
- MSRP at launch (if known)
- Affiliate buy links: row per retailer with logo, current price (if available), "Cumpără →" button

**Recenzii**
- Aggregate: large stars + "4.7 din 5" + "(23 recenzii)"
- Star breakdown bars (5/4/3/2/1)
- "Scrie o recenzie" CTA (visible only to logged-in users who haven't yet)
- Reviews list: avatar, username, stars, body, optional photos, helpful count

**Listări**
- All active Bazar listings for this gear, rendered as full listing cards
- Link: "Toate listingurile [gear name] →"

**Forum**
- Canonical Q&A thread pinned at top (if gear has `canonical_thread_id`), with "Canonical" badge
- Other forum threads tagged with this gear, sorted by last activity (thread cards)
- "Începe un thread nou despre acest gear" CTA

Desktop variant: 2-col split below hero. Left = tabs content. Right = sticky sidebar with: action box (collection dropdown, CTAs, watch toggle), stats widget (X owners, Y threads, Z active listings), lineage sidebar.

---

## Bazar — list (`/bazar/`)

**Purpose**: browse active listings.

Content blocks:

1. Page header: "Bazar" + tagline "Cumpără și vinde gear muzical"
2. Action row: "Vinde un produs" primary button (sticky) + icon links to "Listinguri salvate" + "Căutările mele salvate"
3. Search bar (sticky)
4. Filter chips strip + "Filtre avansate" button (opens bottom sheet on mobile, sidebar on desktop)
   - Filters: Category, Gear (Tezaur autocomplete), Condition, Price range, Location, Kind (Vând/Schimb/Ambele), Delivery (Pickup/Shipping/Ambele), Status (default: only `active`)
5. Sort dropdown: Cele mai noi / Preț ↑ / Preț ↓ / Se termină curând / Cele mai văzute
6. Listing card grid (1 col mobile, 2-3 col desktop):
   - Each card: 4:3 hero photo, top-left chip (condition badge color-coded), top-right heart (watch) button, bottom strip with title, brand+model (small text), price (large), location with pin icon, seller trust line (avatar, rating, verified badge)
7. Pagination + "Încarcă mai multe" button

Empty state: "Niciun rezultat. Salvează această căutare ca să primești notificări când apar listinguri noi."

---

## Bazar — listing detail (`/bazar/:slug`)

**Purpose**: single listing page. Encourages contact and transaction.

Content blocks (mobile order):

1. Back chevron (sticky)
2. Photo gallery (swipe, full-bleed)
3. Hero info: title, brand + model (links to Tezaur if FK set), condition badge (large chip), price + currency, "Acceptă oferte" badge if applicable, location + delivery method icons
4. **Sticky bottom CTA bar** (always visible): "Trimite mesaj" primary button + watch (heart) toggle + share icon
5. Description (long, formatted)
6. Seller card:
   - Avatar + username + trust badge
   - Rating stars + transaction count + member-since
   - "Vezi profilul" link
   - "Trimite mesaj" CTA (duplicate of sticky)
7. **Recently sold sidebar** (collapsible on mobile):
   - "Vânzări recente: [gear name]"
   - List of 5-10 sold prices with date, condition, price
   - "Preț mediu (90 zile): X RON pentru *very_good*"
8. **Similar listings** strip: 4-6 listing cards horizontally scrollable

Desktop: 2-col split. Left = gallery + description. Right = sticky sidebar with hero info + CTA + seller card + recently sold.

---

## Bazar — listing creation / edit (`/bazar/nou`, `/bazar/:slug/edit`)

**Purpose**: create or edit a listing. Multi-step on mobile (1 section per screen), single-page on desktop with progress sidebar.

Steps:

1. **Cere ce vinzi**: Tezaur autocomplete (typeahead) → select; OR "Adaugă manual (nu apare în Tezaur)" toggle → free-text fields (brand, model, year)
2. **Foto**: drag-drop upload zone (mobile: picker), drag-reorder, first photo = hero (badge), EXIF strip notice
3. **Stare + descriere**: condition picker (with "Vezi ghid stare" link → modal with photo examples per tier), title input, description editor (Tiptap)
4. **Preț + condiții**: price + currency, "Acceptă oferte" toggle, Kind selector (Vând / Schimb / Vând sau schimb), "Caut la schimb" textarea (visible if Kind ≠ Vând)
5. **Livrare**: delivery selector (Doar ridicare / Doar livrare / Ambele), shipping cost if applicable, carrier checkboxes (Sameday, Cargus, FAN Courier, DPD, GLS, Poșta Română)
6. **Locație**: city autocomplete (Romanian cities)
7. **Verificare + publicare**: preview card (looks exactly like a listing card), "Publică" primary CTA, "Salvează ca draft" secondary

Each step on mobile: clear primary "Continuă" CTA + back chevron. Progress indicator at top (e.g., "Pasul 3 din 7").

---

## Bazar — chat / inbox (`/mesaje` and per-listing chat)

### Inbox (`/mesaje`)

Content blocks:

1. Page header: "Mesaje" + tabs (Cumpărător / Vânzător / Toate)
2. Search bar (filter conversations)
3. Conversation rows:
   - Each row: avatar (left), listing thumbnail (right), name, last-message preview (1 line), timestamp, unread dot
   - Sorted by most recent activity
4. Swipe gestures: swipe left for "Mute" / "Archive"

### Per-chat (full-screen on mobile, slides in from right)

Content blocks:

1. **Sticky header**: back chevron + listing thumbnail + listing title + other party info + overflow menu (Block, Report, Mute)
2. **Transaction status banner** (if applicable): "Așteaptă confirmarea de la X" or "Tranzacție confirmată — lasă o recenzie"
3. **Chat scroll area**:
   - Day separators: "Astăzi" / "Ieri" / "12 mai 2026"
   - Message bubbles, three types:
     - **Text bubble** (regular chat)
     - **Offer card** (structured: amount, currency, expiry countdown, "Acceptă" / "Respinge" / "Contraofertă" buttons)
     - **System message** (italic, centered, e.g., "Tranzacție confirmată", "Listing marcat ca vândut")
4. **Reply input** (sticky bottom, expandable):
   - Text input + paperclip (attach photo) + emoji + send button
   - "Face o ofertă" floating action button (visible if listing has `accepts_offers`)
   - On keyboard open: respects safe-area, doesn't overlap content

---

## Revista — list (`/revista/`)

**Purpose**: magazine landing. Editorial-grade design.

Content blocks:

1. Page header: "Revista" + tagline "Articole, tutoriale, interviuri din scena RO"
2. Pillar tabs (horizontal scroll on mobile, pill nav on desktop): **Toate** / **Recenzii** / **Tutoriale** / **Știri** / **Interviuri** / **Ghiduri** / **Deep-dive**
3. Featured hero: large 16:9 image + overlay article title + byline strip + pillar pill
4. Article card grid (1 col mobile, 2-3 col desktop, varying sizes — one big + several small):
   - Each card: 16:9 hero, pillar pill (small caps), title, excerpt (2 lines max), byline (author photo + name + date + reading time), "New" indicator if published <48h ago
5. Desktop right rail (optional): "Cele mai citite", "Autori activi"

---

## Revista — article detail (`/revista/:slug`)

**Purpose**: long-form reading. Maximum reading-experience polish.

Content blocks:

1. **Sticky top bar** (minimal): back chevron + share icon + bookmark + **reading-progress bar** at very top (slides as user scrolls)
2. **Hero**: full-bleed 16:9 image + overlay article title at bottom-left
3. **Byline strip**: pillar pill + author photo + name + date + reading time
4. **Article body**: long-form, Tiptap-rendered. Inline embeds (YouTube, SoundCloud, Bandcamp, Spotify) auto-unfurl. Inline gear links → Tezaur. Pull-quotes (left-bordered, italic). Full-bleed images with captions on mobile, contained on desktop.
   - Max reading measure ~720px on desktop, full-width on mobile
   - Body in serif font for long-form (per design brief)
5. **End-of-article block**:
   - Tags (free + gear tags as chips)
   - "Recomandate" — 3 related article cards
   - Share strip
6. **Inline forum thread**: the article's auto-thread rendered inline
   - "Discuții despre acest articol" heading
   - Subscribe dropdown (Watching / Tracking / Mentioned / Muted)
   - First 5 replies inline
   - "Vezi tot pe Forum →" link
   - "Răspunde" CTA → opens reply editor (bottom sheet on mobile)

Desktop right rail (optional, sticky): table of contents (auto-generated from h2/h3 in body) + "Citește în continuare" strip.

---

## Author profile (`/autor/:slug`)

Content blocks:

1. **Hero**: cover image (subtle) or solid block, author photo (large, overlaid bottom-left), author name, role/title
2. **Bio block**: bio text (medium length)
3. **Social links** row (small icon row: X, Instagram, SoundCloud, personal site)
4. **Stats line**: "X articole publicate · Y citiri totale · membru din 2026"
5. **Articles list**: chronological, smaller cards (1 col mobile, 2 col desktop)

Desktop: 2-col layout — hero + bio left, articles list right.

---

## Forum — categories (`/forum/`)

**Purpose**: forum landing — list of categories + recent activity.

Content blocks:

1. Page header: "Forum" + tagline
2. Action row: "Începe un thread" primary CTA + filters (Toate / Subscrise / Necitite)
3. **Trending strip** (horizontal scroll): top 5 active threads right now
4. **Categories list** — each as a row card:
   - Name (large) + description (1-2 lines)
   - Thread count + last activity ("acum 2 ore by @user")
   - Subcategory chips (if any)
5. **Online users widget** (footer): "Online acum" + small avatar strip

---

## Forum — thread list (`/forum/:category-slug`)

Content blocks:

1. **Sticky breadcrumb + category name**
2. Description strip: category description + thread count + subscribe toggle
3. "Începe un thread nou" CTA
4. **Sort tabs**: Activitate recentă / Cele mai noi / Cele mai răspunse / Necitite (logged-in only)
5. **Pinned threads section** (if any): styled distinctly with pin icon + "Anunț" badge
6. **Thread rows**:
   - Title (large)
   - Snippet (1 line)
   - Tags (gear tags with mini-photos + free tags as text chips)
   - Footer: author avatar + reply count + last reply (avatar + timestamp)

---

## Forum — thread detail (`/forum/:category-slug/:thread-slug`)

**Threading model**: Discourse-hybrid. **LINEAR chronological order**. No visual nesting. Replies show "în răspuns la @user — Postare #N" header that jumps to parent. No depth limit, no indentation.

Content blocks:

1. **Sticky top bar**: back chevron + thread title (truncated, tap to expand)
2. **OP post** (rich, full):
   - Author block: avatar (large) + username + trust badge + posted-time
   - Title (large)
   - Tags (gear + free chips)
   - Body (formatted, with embeds)
   - Engagement bar: likes count, reply count, share icon
3. **Subscribe dropdown** pill button: Watching / Tracking / Mentioned only / Muted
4. **Replies** (chronological, flat list — no visual indentation):
   - Each post: author avatar + username + trust badge + time + body
   - Optional **"În răspuns la @user — Postare #N"** small header at top of post if it's a reply (click to scroll/highlight parent)
   - Action bar per post: Util (heart) count, "Răspunde", "Cita", overflow (Edit if own, Report, Delete if own)
5. **Sticky reply box** (bottom):
   - Compact input → expands to full Tiptap editor when focused (bottom sheet on mobile)
   - "Răspunde" primary button
6. **Jump-to-newest** floating button (visible when user scrolls away from end)

**Hidden posts** (blocked-user content): replaced with `[Postare ascunsă — utilizator blocat]` placeholder + "Show anyway" toggle.

---

## Forum — new thread (`/forum/:category-slug/nou`)

Content blocks:

1. Header: "Thread nou în [Category name]"
2. Title input (large, single line)
3. Body editor (Tiptap, expandable to full-screen)
4. Tags: gear tag picker (Tezaur autocomplete) + free tags input
5. "Subscribe to thread on submit" toggle (default ON)
6. Action row: "Publică" primary + "Previzualizare" secondary

---

## User profile (`/u/:username`)

Content blocks:

1. **Hero**: cover image (subtle), avatar (large, overlaid), username (large), trust badge + level
2. **Bio block**: bio text, location pin, social links, member-since date
3. **Stats row**: Rating (X.X stars) + Tranzacții count + Articole count + Forum mesaje count
4. **Action row** (if viewing someone else's profile): "Trimite mesaj" + overflow menu ("Blochează", "Raportează")
5. **Tab strip** (horizontal scroll on mobile, pill nav on desktop):
   - Despre / Colecția / Listinguri active / Listinguri salvate / Recenzii primite / Forum / Articole (last only if editor role)
6. Tab content:
   - **Despre**: full bio + social links + collection visibility info
   - **Colecția**: subgrids per status (Deținut / Lista de dorințe / Caut / Am avut / Împrumutat) showing gear cards
   - **Listinguri active**: grid of own active listings
   - **Listinguri salvate**: hearted listings grid
   - **Recenzii primite**: review list with star aggregate at top + individual reviews
   - **Forum**: list of threads started + recently active in
   - **Articole**: list of published articles (editor profile only)

---

## Settings (`/setari/`)

Section list (each opens a sub-page):

- **Profil**: avatar, bio, location, social links, `display_currency` preference
- **Securitate**: change password, change email, view active sessions, sign out other devices
- **Notificări**: matrix of triggers × channels (in-app, email)
- **Confidențialitate**: public/private profile toggle, public/private collection toggle, blocked users list
- **Bazar**: default contact display setting, saved searches manager, active listings, watched listings
- **Forum**: active subscriptions list, blocked users (same list as Confidențialitate, scoped view)
- **Date & GDPR**: "Descarcă datele mele" button, "Șterge contul" (danger zone, requires email confirmation)

Layout:
- Mobile: section list view, tap section → opens sub-page
- Desktop: 2-col — section nav left (sticky), section content right

---

## Auth pages

**Common layout**: minimal — no top nav, no bottom nav. Just logo at top + title + form + minimal footer.

Form sizing: max ~380px wide on mobile (centered), inputs 16px font-size minimum.

Pages:

- **`/intra`** — Login: email input + password input + "Conectează-te" primary CTA + "Ai uitat parola?" link + "Nu ai cont? Înregistrează-te"
- **`/inregistrare`** — Signup: email + password + confirm password + "Sunt de acord cu Termenii și Confidențialitatea" checkbox + primary CTA + "Ai cont? Conectează-te"
- **`/uita-parola`** — Forgot password: email input only + "Trimite link" CTA
- **`/reseteaza-parola`** — Reset (token in URL): new password + confirm + "Schimbă parola" CTA
- **`/verifica-email`** — Verify (token in URL): success message + "Continuă spre site" CTA
- **After signup**: confirmation page "Verifică email-ul" with resend link

Optional desktop right-side visual: large synth photography (brand atmosphere).

---

## Search results (`/cauta?q=...`)

Content blocks:

1. Sticky search bar with current query pre-filled
2. **Result category tabs**: Toate / Tezaur (count) / Bazar (count) / Revista (count) / Forum (count)
3. Per-tab filter chips (e.g., on Bazar tab: condition, price range; on Forum tab: category)
4. **Result cards** per tab:
   - Tezaur: gear cards
   - Bazar: listing cards
   - Revista: article cards
   - Forum: thread cards
5. **Result snippets**: 2 lines of content with matched query term highlighted (`<mark>` style)

Empty: "Niciun rezultat pentru '[query]'." with suggestions: "Verifică ortografia · Încearcă termeni mai generali · Caută în categoriile populare:" + chips.

---

## Static pages

`/despre` — About Sintezaur (mission, story, team)
`/contact` — Contact form + email + social
`/termeni` — Terms of service
`/confidentialitate` — Privacy policy (GDPR-compliant)

**Layout**: single column centered, body in serif font (long-form reading), max 720px width.

---

## Admin dashboard (`/admin/`)

**Layout**: left sidebar nav (collapsible on mobile), top bar (search + user menu), main content area for tables/forms.

Sub-pages:

- **Dashboard**: stats overview (active listings, new users today, pending reports count, etc.) + alerts strip
- **Useri**: searchable table (filter by role, status), columns (username, email, role, trust level, member-since, ban-status); actions (Edit, Ban, View audit)
- **Tezaur**: CRUD interface for gear, families, relationships, descriptions per locale, canonical thread toggle
- **Bazar**: listings table (moderate, hide, restore), disputes view
- **Revista**: article queue (pending publish, drafts), editor assignments
- **Forum**: categories management, pinned threads, content_report queue
- **Audit log**: filterable by actor, action, target, date range
- **Currency rates**: list current rates, add new rate entry
- **Badges**: list users, grant/revoke badges manually
- **System config**: env-level settings (visible but read-only) + feature flags

Polished but data-dense. Tables: dense rows, sticky header, hover row state, action buttons in last column.

---

## Empty / loading / error states (universal patterns)

- **Empty state**: small illustration (line art, single accent) + headline + 1-line explanation + primary CTA
- **Loading**: skeleton loaders matching content shape, shimmer animation (respects `prefers-reduced-motion`)
- **Error state**: illustration + "Ceva s-a stricat" headline + 1-line + "Reîncearcă" primary CTA + "Mergi acasă" secondary
- **404**: friendly, with search bar + "Poate căutai..." suggestions chips

---

End of pages document.
