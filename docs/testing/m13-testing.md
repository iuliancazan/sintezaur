# M13 — Site design import v05 · Testing

Manual testing plan pentru milestone M13 (sub-faze A–G). Convenție:
testarea se face la final pe stack-ul deployed pe Coolify, după ce
toate sub-fazele au fost livrate pe `main`.

**Commits aliniate:**

- M13-A `84dda78` — Foundation (tokens + sprite + footer)
- M13-B `044fd5a` — Home page rewrite
- M13-C1 `5d5c541` — Bazar list re-aligned
- M13-C2 `a635f18` — Bazar detail rewrite
- M13-D `cafb77f` — Tezaur list + detail re-aligned
- M13-E `2529bfe` — Revista list rewrite + detail icon swap
- M13-F `137f4d4` — Forum foundation + list rewrite
- M13-G `_TBD_` — close milestone + this doc

## 1. Foundation (M13-A)

### Token & theme

- [ ] Dark theme: deschide site-ul pe `data-theme="dark"` (default
      din localStorage). Verifică:
  - Background este `#0a0a0b` (negru aproape pur, NU OKLCH ambient
    gold).
  - Cards / panels au `#181819` / `#1f1f20` (neutral grey, NU
    warm-tinted).
  - Lines = `#2a2a2c`; line-strong = `#3e3e40`.
  - Text foreground = `#edecea` (off-white, NU warm cream).
- [ ] Light theme: toggle din topbar (sun icon). Verifică:
  - Background = `#f3eedd` (warm cream).
  - Cards = `#faf6e8`, lines = `#d4ccaf`, fg = `#18140c`.
- [ ] Grid dots vizibili pe body pe ambele teme (24px spacing,
      gold-tinted la dark, brown-tinted la light).

### SVG sprite

- [ ] Deschide DevTools → inspectează `<svg>` cu `width="0"
      height="0"` în root-ul `<app-root>`. Verifică că are 58
      `<symbol>` cu `id="i-*"`.
- [ ] Toate iconițele din topbar (search, bell, heart, mail,
      burger, sun/moon, chevron) se afișează corect.
- [ ] Pe paginile redesenate, iconițele inline (pin, back, x,
      caret-down etc.) sunt vizibile.

### Footer

- [ ] Footer-ul folosește clase V05 `.foot/.foot__grid/.foot__col`.
- [ ] Locale switch `.locale` cu RO active.
- [ ] Link-urile din footer NU au touch-target 44×44 (regula global
      e suprascrisă în `app.ts` styles pentru `.foot__col a`).

## 2. Home page (M13-B)

### Guest state (logged-out)

- [ ] Deschide `/` ca guest. Verifică:
  - Welcome strip NU apare (doar logat).
  - Hero featured article populat din `revista.list({sort:'newest',
    pageSize:4})[0]`. Fallback la string-uri generice când DB e
    goală.
  - Rotator placeholder `01 / N` în colțul media.
  - Pill-uri: Featured (accent gold) + Live · Revistă + data
    publicării.
  - Byline cu inițiale-avatar autor + CTA `Citește →`.
- [ ] Revista grid: 1 big card span-2 + 2 small cards mici (sau
      `—` placeholder dacă lipsesc articole).
- [ ] Bazar scroll: 8 listings cu condition chip + price + loc
      + seller. Scroll horizontal pe desktop, snap.
- [ ] Forum + Pulse: 5 thread stub-uri statice + 4 pulse cells cu
      `—` (note: așteaptă endpoint dedicat).
- [ ] Tezaur Spotlight: gear popular #1 cu specs.
- [ ] Catalog: 6 gear cards (popular #2..#7).
- [ ] CTA strip Guest:
  - Bloc stânga = accent gold „Fă-ți cont." + body + buton
    Înregistrare.
  - Bloc dreapta = newsletter form cu input + Abonează-te.

### Logged-in state

- [ ] Loghează-te cu un user. Verifică:
  - Welcome strip apare între topbar și hero, cu accent eyebrow
    + greeting interpolat cu prenumele + 2 ghost buttons.
  - CTA strip swap la stânga: titlu „Postează." + 3 ghost
    buttons (Anunț nou, Thread nou, Trimite articol).

## 3. Bazar list (M13-C1)

- [ ] Vizitează `/bazar`. Verifică:
  - Header `.tez-header` cu mega title „Bazar.", lede, 3 stats
    (listinguri active, categorii, RO).
  - Action row `.bz-actions` cu CTA primary „Vinde un produs" +
    (logat) 2 ghost links Listinguri salvate / Căutări salvate.
  - Toolbar sticky `.tez-toolbar` cu search input + kbd ⌘K +
    sort dropdown.
  - Active filter chips când selectezi opțiuni (badge cu × pentru
    fiecare).
  - Filter rail stânga `.tez-rail`: 6 secțiuni (Condition, Kind,
    Delivery, Price, Location, Category).
  - Grid `.bz-grid` cu `.listing` cards (3-col desktop, 2-col
    tablet, 1-col mobile). Cards: media + chip condition +
    brand/title + price + loc + seller initials.
  - Pagination `.tez-pag` la bottom.

## 4. Bazar detail (M13-C2)

- [ ] Click pe un listing. Verifică:
  - Breadcrumb `.td-crumb` cu back arrow + Bazar / brand / title.
  - Hero `.bd-hero` cu galerie stânga (chip condition + counter +
    prev/next nav + thumbs grid) + info dreapta:
    - Topline cu brand link + status pulse (Listing activ).
    - Title mega + sub.
    - Price-row mare cu accent + delta (când offers welcome).
    - 3 chips (pin loc, truck delivery, negotiable când acceptă
      oferte).
    - Deal cell strip 2-col (transaction + posted / shipping).
    - CTAs 3-button: primary Trimite mesaj (scroll la form),
      ghost Fă o ofertă, icon heart watch toggle.
    - Posted row cu view count.
  - Main grid 2-col: descriere (innerHTML) + looking-for +
    condition-note + mini-specs cu link Tezaur + `.bd-similar`
    cu listings din `recentlySold({gearId})`.
  - Sidebar: seller card (avatar + 3 stats rating/sales/reviews
    + Block/Report buttons + contact textarea + phone) + safety
    tips 4-item.
- [ ] Click „Trimite mesaj" → focus pe textarea + scroll smooth.
- [ ] Watch toggle (heart icon) funcționează când logat.
- [ ] Owner view: vezi „Editează" + „Anunțurile mele" + eye-icon
      în loc de Trimite mesaj.

## 5. Tezaur (M13-D)

### List (`/tezaur`)

- [ ] Header `.tez-header` cu „Tezaur.", lede, 3 stats.
- [ ] Toolbar sticky cu search (kbd ⌘K) + sort + view grid.
- [ ] Filter rail: Categorie + Status.
- [ ] Grid 4-col desktop cu `.tez-card`: media (gear-fill +
      photo), brand, model display font, tags, foot cu owners
      count + year.
- [ ] Pagination funcțională.

### Detail (`/tezaur/:slug`)

- [ ] Breadcrumb `.td-crumb`.
- [ ] Hero `.td-hero` 2-col: galerie + info.
- [ ] Tabs sticky 6 buttons (Detalii / Specs / Preț / Recenzii /
      Listări / Forum).
- [ ] Tab Detalii: prose body cu `.td-prose` (h2/h3, blockquote
      accent, strong = accent gold).
- [ ] Tab Specs: secțiuni cu rows k/v.
- [ ] Tab Preț: chart placeholder + sold table.
- [ ] Tab Recenzii: agg score + bars + cards.
- [ ] Sidebar sticky: stat-grid + lineage + watch.
- [ ] Td-buy / Td-official panels page-locale funcționale.

## 6. Revista (M13-E)

### List (`/revista`)

- [ ] Header `.rev-header` cu „Revista.".
- [ ] Pillar tabs `.rev-tabs` cu toate cele 6 categorii + „Toate".
- [ ] Featured hero `.rev-hero` cu overlay gradient (apare doar
      pe „Toate" tab, page 1).
- [ ] Grid `.rev-main` 2-col: `.rev-grid` (big first + small
      restul) + `.rev-side` (Cele mai citite top 5 + newsletter).
- [ ] Articole noi (< 7 zile) au badge „Nou" accent.
- [ ] Filtrare pe categorie: click pillar → reload cu category
      filter, hero dispare, toate articolele intră în grid.
- [ ] Follow strip apare pe categorie specifică pentru users
      logați.
- [ ] Pagination cu `.tez-pag` (V05 shared).

### Detail (`/revista/:slug`)

- [ ] Breadcrumb cu back arrow `<svg><use href="#i-back"/>`.
- [ ] Layout `.rd-*` scoped păstrat — funcțional dar NU V05
      `.ad-*` (polish pass viitor).
- [ ] Article body innerHTML.
- [ ] Author card.
- [ ] Tags + gear sidebar.

## 7. Forum (M13-F)

### List (`/forum`)

- [ ] Header `.fm-header` cu „Forum.".
- [ ] Actions row cu tabs („Toate categoriile" active, search
      quick-link).
- [ ] Categories list `.fm-cats`:
  - Fiecare rând `.fm-cat` cu număr zero-padded (01, 02, ...) +
    body cu titlu display + descriere + sub-chips pentru system
    categories (badge admin/auto) + activity meta + count cell →.
  - User categories primele, system după.
- [ ] Click pe categorie → navighează la `/forum/:slug` (pagina
      veche `.fc-*` scoped, încă funcțională).

### Thread / Category / Search / New thread

- [ ] Pagini funcționale cu layout vechi `.fc-*`/`.ff-*`/`.ft-*`
      scoped (NU V05's `.fm-*`/`.ft-*`/`.fp-*`). Foundation V05
      `styles.forum.css` e încărcat global, gata pentru rewrite
      viitor.
- [ ] Thread display, post listing, reply form funcționale.
- [ ] New thread form (`/forum/nou`) funcțional.
- [ ] Search (`/forum/cautare`) funcțional.

## 8. Cont (M13-G — fără rewrite)

- [ ] `/cont/setari` shell cu 6 tabs (Profil / Parolă / Email /
      Datele mele / Preferințe / Blocați) — funcțional, layout
      `.settings__*` scoped.
- [ ] `/cont/favorite` shell cu 3 tabs (Anunțuri salvate /
      Căutări salvate / Abonamente forum) — funcțional.
- [ ] `/cont/mesaje` shell cu 2 tabs (Bazar inbox / Forum
      placeholder) — funcțional.
- [ ] Tabs au stiluri page-locale care funcționează cu tokens-ul
      v05 (background, fg, accent inheritance).

## 9. Regression check (orice sub-fază)

- [ ] Login / Signup pages încă funcționale (auth shell separat).
- [ ] Topbar nav (Acasă / Tezaur / Bazar / Revistă / Forum)
      highlight pe pagina activă.
- [ ] Topbar tools (search, bell, heart, mail, burger, theme
      toggle, avatar dropdown) intacte din M10.
- [ ] Notifications panel (bell click) deschide.
- [ ] Account menu (avatar click) deschide.
- [ ] Mobile menu (burger click pe mobile) deschide drawer.
- [ ] Footer-ul curate inheritance pentru tokens.
- [ ] Build clean: `pnpm exec nx build site --skip-nx-cache` ⇒
      zero warnings.

## 10. Known limitations (next milestones / polish)

- **Forum threads recent**: Home page folosește 5 stub-uri
  hardcoded din V05 design. Endpoint dedicat
  (`/forum/threads/recent`) urmează în polish pass viitor.
- **Pulse counts**: Home pulse cells au `—` placeholder.
  Endpoint platform-stats urmează.
- **Hero rotator (Home)**: butoanele ‹ › sunt placeholder.
- **Revista detail**: layout `.rd-*` scoped păstrat, NU V05's
  `.ad-*` (Article Detail). Rewrite = polish pass viitor.
- **Forum thread/category/search/new**: păstrate pe `.fc-*`
  scoped, foundation V05 importată dar nu adoptată.
- **Cont shells**: păstrate pe `.settings/.favorites/.messages`
  scoped, NU V05's `.acc-*` rewrite.
- **Tezaur detail panels**: SzBadge/Avatar/Button încă folosite
  în Detalii/Specs/Recenzii (9 spots). V05 sprite migration
  parțial.

## 11. Smoke build

- [ ] `pnpm exec nx build site --skip-nx-cache` cu succes.
- [ ] `pnpm exec nx build dashboard --skip-nx-cache` cu succes
      (libs/ui și apps/dashboard neatinse de M13).
- [ ] CSS bundle creșteri așteptate:
  - `v05.css` (4503 linii) + `v05-forum.css` (1952 linii) adaugă
    ~70 kB nemininified la stylesheet global.
  - Per-page lazy chunks SCAD substantial datorită eliminării
    duplicate-urilor scoped (bazar-list 32→22 kB, tezaur-list
    23.6→13 kB, tezaur-detail 40→26 kB, revista-list 18→15.6 kB).
- [ ] Smoke server: `pnpm exec nx serve site` la `http://localhost:4200`
      → toate cele 5 secțiuni încarcă și fac fetch real de date.
