# Sintezaur — execution status

Single source of truth pentru hand-off între sesiuni. Convenție: ultimul pas în
fiecare commit de sub-fază este actualizarea acestui fișier (linia + "Next up").
Niciodată nu poate diverge de git log dacă regula e respectată.

## Current state

**Last shipped:** **M14** ✅ — Bazar V07 sell page + light-mode default.
Pagina `/bazar/nou` și `/bazar/:slug/editare` reskinate complet pe V07
„Vinde un produs" (single-page + sticky sidebar cu live preview și
checklist). Auto-save pe draft cu debounce 1.5s, fallback URL prin
`history.replaceState(?listing=<id>)`. Backend: migration 0015 cu
`tagline varchar(200)` + `defects text` pe `listings`; rute noi
`POST /me/bazar/listings/draft`, `POST /me/bazar/listings/:id/publish`,
`GET /me/bazar/listings/:id` (owner-only fetch inclusiv pe drafts).
`PublicBazarController.detail` ascunde drafturile pentru oricine
nu e owner. `ThemeService.readInitialMode()` default schimbat din
`auto` → `light` pentru utilizatori fără preferință salvată; `auto`
acum se persistă explicit ca să nu mai colapseze în default. CSS
`apps/site/src/v06-tezaur-add.css` redenumit `v06-add-forms.css`
(scope partajat Tezaur + Bazar add) + ~350 linii `.bz-*` noi.
`docs/testing/m14-testing.md` cu plan manual de testare.

**Last shipped (previous):** **M11** ✅ — Tezaur contributor flow complete.
Toate sub-fazele A–D livrate pe `main`. `docs/testing/m11-testing.md`
scris cu plan complet de testare manuală pe stack-ul deployed (6
secțiuni: foundation backend + tezaur list button + add page core
flow + drafturile mele + regression + known limitations).

Per total M11 a livrat: backend cu migration 0014 (state enum +
tracking columns + 2 indexes), refactor `TezaurService` (+ ~680
linii), controller nou `MeContributorController`, extinderi
public + admin controllers; frontend cu pagina nouă
`/tezaur/adauga` (componentă 760 linii TS + 580 linii HTML +
984 linii CSS extras din V06), pagina `/cont/contributii-tezaur`
(~370 linii), extinderi service + i18n (~120 chei noi).
Tezaur list capătă buton „Adaugă în Tezaur"; account menu capătă
link „Contribuții Tezaur".

**Last shipped (previous):** **M11-C** — Drafturile mele + meniu cont.
Pagina nouă `/cont/contributii-tezaur` cu `MyTezaurDraftsPage`.
Lista rândurilor (88×88 thumb + brand+model + state badge color-coded
{draft=neutral, submitted=galben, approved=verde, rejected=roșu} +
„actualizat la {date}" + motiv respingere expandabil pentru
rejected). Acțiuni per stare: draft/rejected = „Continuă editare →"
(navighează la `/tezaur/adauga?draft=<id>`) + „Șterge" (cu confirm,
soft delete via `meDeleteDraft`); submitted = „⏳ în coadă"
read-only; approved = „Vezi pagina →" link la `/tezaur/<slug>`.
Empty state cu CTA „+ Adaugă în Tezaur". Layout 3-col mobile-first
care colapsează la 2-col pe <720px (acțiuni se mută pe row 2).
Item nou în account-menu „Contribuții Tezaur" (vizibil pentru
toți userii autentificați, între „Anunțurile mele" și separatorul
către dashboard). 13 chei i18n noi sub `my_tezaur_drafts.*` +
1 `account.menu.my_tezaur_drafts`.

**Last shipped (previous):** **M11-B** — Tezaur contributor add page (V06 form + auto-save).
Pagina nouă la `/tezaur/adauga` (auth-guarded). Componenta
`TezaurAddPage` cu form ReactiveForm complet pe markup V06
`.ta-*` — 6 secțiuni (Identificare, Imagini, Descriere, Specs cu
4 sub-secțiuni, Relații, Linkuri) + sidebar sticky (preview live,
progress meter, CTAs, tips). Auto-save debounced 1.5s creează
draft la prima cheie validă, apoi PATCH-uri pe gear-ul existent
— refresh-ul păstrează lucrul (query param `?draft=<id>`
înlocuit prin `history.replaceState`). Live preview leagă brand /
model / year / tags la card-ul din sidebar. Progress meter calculat
din 9-item checklist (mirror al validării backend `meSubmitDraft`).
Drag-drop pentru reorder imagini cu API `reorderDraftImages` per
mișcare. Upload multi-file la endpoint multipart. Combo dropdowns
custom pentru brand (auto-suggest din `/tezaur/meta/brands` cu
counts), familie (din `/tezaur/meta/families`, lookup-or-create
backend pe submit), categorie (18 RO labels grupate pe „Sinteză &
ritmică / Modular & control / Procesare & efecte / Studio &
captură / Diverse"), synth_type, aftertouch. Repeatable rows
pentru relații + linkuri — relațiile rezolvă brand+model la
`gear.id` via `/tezaur` search (mesaj prietenos dacă nu există).
Markup HTML extras într-un template file separat (572 linii). CSS
v06 `.ta-*` (984 linii) copiat la `apps/site/src/v06-tezaur-add.css`
și importat din `styles.scss`. Buton „Adaugă în Tezaur" adăugat
în toolbar-ul `/tezaur` per design V06 (clasa `.tez-toolbar.has-add`).
106 chei i18n noi sub `tezaur.add.*`. Bundle add page:
52.65 kB / 12.61 kB gzip lazy.

**Last shipped (previous):** **M11-A** — Tezaur contributor backend (state enum + ME endpoints).
Migration `0014_gear_moderation.sql` adaugă enum `gear_state`
{draft, submitted, approved, rejected} + coloane `state` (default
'draft'), `rejection_reason`, `submitted_at`, `reviewed_at`,
`reviewed_by` FK pe `users`. Backfill: 109 rows existente cu
`published=true` → `state='approved'`. Două index-uri noi
(`gear_state_idx` pe state+submitted_at pentru queue moderare,
`gear_created_by_state_idx` pentru lista „drafturile mele").
`TezaurService` extins cu metode `me*`: `meCreateDraft`,
`meGetDraft`, `meUpdateDraft`, `meDeleteDraft`, `meSubmitDraft`
(validează min set înainte de transiție draft→submitted),
`meListMyDrafts`, `meAttachImage`/`Detach`/`Reorder`, `meAddLink`/
`Remove`, `meAddRelationship`/`Remove`. Toate `me*` rulează prin
helper-ul privat `assertOwnsEditableDraft` care verifică ownership
(`createdBy === userId`) + state editabil (`draft`|`rejected`).
Helper-uri noi: `lookupOrCreateFamily` (FE poate da label text →
service rezolvă la `gear_families` row, lookup-or-create cu
slug auto), `descriptionFromText` (plain text → Tiptap minimal
JSON + escaped HTML, split pe `\n\n`), `mergeTaglineIntoSpecs`
(păstrează `specs.tagline`). Public endpoints: `GET /api/tezaur/
meta/brands` (distinct brand counts top 200), `GET /api/tezaur/
meta/families` (lift din admin). Admin: `GET /admin/tezaur/
moderation?state=submitted&page=` + `POST /admin/tezaur/gear/:id/
approve` (state=approved + published=true) + `POST .../reject`
(state=rejected + rejection_reason). Controller nou
`MeContributorController` la `/api/me/tezaur/*` (auth required,
no role gate).

**Last shipped (previous):** **M13** ✅ — Site design import v05 complete.
Toate sub-fazele A–G livrate pe `main` (vezi tabelul M13 de mai
jos). `docs/testing/m13-testing.md` scris cu plan complet de
testare manuală pe stack-ul deployed (foundation + 5 secțiuni +
regression + smoke build + known limitations). Cont shells
(Setari / Favorite / Mesaje) păstrate pe scoped `.settings/.favorites/
.messages` styles din M10 — funcționează curat cu tokens v05; rewrite
la V05's `.acc-*` = polish pass viitor.

Per total M13 a livrat: ~7000+ linii noi (v05.css 4503 + v05-forum.css
1952 + page templates rewrites + sprite component cu 58 simboluri),
~3500+ linii de scoped styles șterse (dead code eliminat din
bazar-list/-detail, tezaur-list/-detail, revista-list, forum-list).
CSS global creste cu ~70 kB nemin (most rules unused până la adoptarea
markup-ului `.fl-*/.fm-*` pe forum thread + `.ad-*` pe revista detail
+ `.acc-*` pe cont — toate planificate ca polish pass viitor).

**Last shipped (previous):** **M13-F** — Forum foundation + list rewrite la V05.
V05 `styles.forum.css` (1952 linii) copiat la `apps/site/src/v05-forum.css`
și importat din `apps/site/src/styles.scss` după `v05.css`. Asta dă
disponibilitate globală pentru `.fl-*` / `.fm-*` / `.ft-*` / `.fp-*`
clase pe paginile forum. `forum-list.page.ts` rescris cu markup V05:
`.fm-header` (title+lede), `.fm-actions` cu tabs row, `.fm-cats` cu
`.fm-cat` rows (num cu padding-uri zero-padded + body cu titlu/desc/
sub-chips + activity meta + count-cell). 3 chei i18n noi
(`forum.tab_all`, `forum.kind_user`, `forum.kind_system`). Pages
rămase pe `.fc-*/.ff-*` scoped (thread/category/search/form, total
~3164 linii) sunt funcționale dar nu rescrise — foundation V05 e gata,
rescrierea lor e un polish pass viitor (păstrăm budget pentru M13-G).

**Last shipped (previous):** **M13-E** — Revista list rewrite la V05 + detail icon swap.
`revista-list.page.ts` complet rescris cu markup V05: `.rev-header`
(big title + lede + optional editor CTA), `.rev-tabs` pillar tabs
peste cele 6 categorii (active state pe selectat), `.rev-hero` cu
overlay gradient (featured = `articles[0]` doar pe "all" view +
page 1), `.rev-main` 2-col cu `.rev-grid` (primul card = `.is-big`
span-2 + restul small) + `.rev-side` (Cele mai citite top 5 + bloc
newsletter). Cards folosesc `.gear-fill__photo`+`.gear-fill__label`
ca pe Home/Bazar/Tezaur (uniform). Computed signals noi:
`heroArticle()`, `gridArticles()`, `sideTopList()`, `isNewArticle()`
(< 7 zile → badge „Nou"). Style block redus de la ~330 la ~50 linii
(doar `.rev-results-row` + `.rev-follow` page-locals). 8 chei i18n
noi (`revista.featured/new_badge/tabs_aria/side_top_read/
side_newsletter_*/pagination.show_count`). `revista-detail.page.ts`:
doar `SzIconComponent` scos + `<sz-icon name="back">` → sprite
`<use href="#i-back"/>`. Layout `.rd-*` scoped păstrat funcțional —
rewrite la V05's `.ad-*` (Article Detail) e un polish pass viitor
(out of scope pentru M13-E pragmatic). Bundle revista-list 18→15.6 kB.

**Last shipped (previous):** **M13-D** — Tezaur list + detail re-aligned la V05.
Ambele template-uri foloseau deja clase V05 `.tez-*` / `.td-*`; munca
a fost trim-uirea blocurilor `styles:` (v05.css le furnizează acum
global) + scoaterea `SzIconComponent` în favoarea sprite-ului V05
(`<svg><use href="#i-search"/>` etc.). **Tezaur list:** stiluri
404→6 reguli page-locale (`.tez-results-row`, `.tez-empty`), bundle
23.6→13.0 kB. Card media folosește `.gear-fill__photo`+`.gear-fill__label`
ca Home/Bazar (uniform). Toolbar primește kbd ⌘K. **Tezaur detail:**
stiluri 663→13 reguli page-locale (`.muted`, `.td-empty`,
`.td-gallery__photo/ph`, `.td-buy`/`.td-buy__row`/`.td-buy__note`,
`.td-official`/`.td-official__head/badge/meta/title`). Bundle
40.0→26.4 kB. `SzBadge/Avatar/Button` păstrate (folosite în 9 locuri
pe panourile Detalii/Specs/Recenzii — replace global ar fi fost
overkill pentru M13-D). Class logic neatinsă în ambele pagini.

**Last shipped (previous):** **M13-C2** — Bazar detail rewrite V05 1:1.
`apps/site/src/app/bazar/bazar-detail.page.ts` complet rescris cu
markup V05: `.td-crumb` breadcrumb, `.bd-hero` cu `.bd-gallery`
(main cu chip-condition + counter + nav prev/next + thumbs grid) și
`.bd-info` (topline brand+kind + status + title + sub + price-row
mare + chips loc/livrare/negociabil + `.bd-info__deal` 2-cell +
`.bd-info__ctas` 3-button — primary „Trimite mesaj", ghost „Fă
ofertă", icon-only heart watch — + `.bd-info__posted`). `.bd-main`
2-col: descrieri (`.bd-desc` cu innerHTML), `looking_for`,
`condition_note`, `.bd-mini-specs` cu link la Tezaur (când gear-ul
e legat), `.bd-similar` cu `bz-grid` + `.listing` cards (din
`bazar.recentlySold({gearId})`); sidebar: `.bd-sidebar__block`
seller (avatar + 3 stat cells rating/sales/reviews + Block/Report
actions + textarea contact-form/login CTA + telefon opțional) +
safety-tips 4-item. Logica clasei (signals, watch toggle, contact
form, SEO product/breadcrumb JSON-LD) păstrată; `SzAvatar/Badge/
Button/Icon` imports scoase (V05 sprite + clase globale). Helper
`prevPhoto/nextPhoto` + `activeIndex` + `focusContactForm`. 21 chei
i18n noi (`bazar.detail.*`). Build curat.

**Last shipped (previous):** **M13-C1** — Bazar list re-aligned la V05 (`5d5c541`).
Migrare de pe clase scoped `.bz-header/.bz-toolbar/.bz-main/.bz-rail/
.bz-card/.bz-pag` la utilități V05 globale (`.tez-header/.tez-toolbar/
.tez-search/.tez-sort/.tez-chips/.tez-main/.tez-rail/.tez-check/
.tez-pag`) livrate de `v05.css`. Cards switched de la `.bz-card`
inline-styled la `.bz-grid > .listing` (aceeași clasă ca pe Home
bazar-scroll). Nou `.bz-actions` action row înainte de toolbar
(„Vinde un produs" + 2 ghost links salvate, vizibil doar logat).
Style block redus de la ~500 la ~50 linii (păstrate doar
extra-uri page-local: `bz-price-row` dual-input, `bz-currency`
toggle, `bz-text-input`, `bz-results-row`). `SzIconComponent`
import scos — SVG-uri via `<use href="#i-..."/>` la
`V05SpriteComponent`. 3 chei i18n noi (`bazar.card.tx`,
`bazar.actions_saved_listings`, `bazar.actions_saved_searches`).
Build curat; bundle Bazar list 32→22 kB.

**Last shipped (previous):** **M13-B** — Home page rewrite V05 1:1. Sub
`apps/site/src/app/home.page.ts` complet rescris cu markup V05 +
date reale prin servicii existente. Welcome strip auth-aware,
hero featured article (article[0] din `revista.list({sort:'newest',
pageSize:4})`), revista grid 1 big + 2 small (article[1..3]),
bazar horizontal scroll (8 listings via `bazar.list({pageSize:8})`),
forum + 4-cell pulse aside (static stubs, threads din V05 design
verbatim — no „recent across categories" endpoint yet), tezaur
spotlight (popular #1) + catalog 6 (popular #2..#7) via
`tezaur.list({sort:'popular', pageSize:7})`. CTA strip auth-aware:
Guest „Fă-ți cont" + newsletter; Logat „Postează" cu 3 ghost
action buttons + newsletter already-subscribed UI. 60 chei i18n
noi în `apps/site/public/assets/i18n/ro.json` (înlocuiește vechiul
sub-tree `home.hero/sections`). Build curat, fără warnings.

**Last shipped (previous):** **M13-A** — site design import v05, foundation.
V05 `styles.css` copiat la `apps/site/src/v05.css` (4503 linii) cu
dark tokens swapped la valorile v2-neutral hex per design decision
(`#0a0a0b`/`#131314`/`#181819`/...). Light theme rămâne warm cream
din v05. `apps/site/src/styles.scss` migrat de pe
`libs/ui/tokens/tokens.css` pe noul `v05.css`. SVG sprite component
nou — `V05SpriteComponent` în `apps/site/src/app/ui/` cu 58 simboluri
lifted 1:1 din toate paginile v05 (search, bell, sun, moon, heart,
pin, arrow, mail, burger, plus, check, alert, info, flag, eye, link,
image, list, grid, archive, book, bookmark, tag, chat, reply, quote,
share, external, doc, log, code, play, upload, download, cog, coins,
truck, users, sliders, density, shield, logout, etc.). Sprite mount
în app.ts root; footer markup aliniat la clasele V05 (`.foot` /
`.foot__grid` / `.foot__col` / `.brand` / `.locale`) — stilurile
inline din app.ts eliminate, livrate acum global de `v05.css`.
`libs/ui` și `apps/dashboard` neatinse. Build OK (CSS bundle 30→31 kB).

M12 anterior (dashboard design import v04) rămâne deployment ultimului
commit pe dashboard. Re-skin
complet al `apps/dashboard`: shell nou inline (sidebar + admin
topbar + SVG sprite în `apps/dashboard/src/app/shell/`), tokens
oklch din `docs/design-imports/2026-05-16-v04` override-uiți peste
`libs/ui/tokens/tokens.css` (scope dashboard only, site neatins).
Theme + density + sidebar-collapse persistate via
`AdminShellService` în signals + localStorage (`sintezaur-theme`,
`sintezaur-admin-density`, `sintezaur-admin-side`). Pagini noi:
`/` (DashboardPage cu KPI strip + alerts + activity feed +
quick actions + section pulse), `/useri/:id` (UserEditPage cu
breadcrumb + sticky save bar + 4 tabs + role radio-grid + danger
zone). `/useri` re-skin: filter bar sticky + bulk actions strip +
PrimeNG TableModule peste design tokens. Login decuplat de shell
(centered card pe `.auth-shell`). Restul paginilor admin (Tezaur,
Bazar, Revistă, Forum-queue, Rapoarte, Badges, Audit, Currency,
Storage, Legal, Contact, Feedback) păstrează template-ul vechi
dar inherit shell + tokens via fallback global `main.admin`.
Light = default. `home.page.ts` șters (înlocuit de
`dashboard.page.ts`). Acest milestone a fost executat
out-of-order — M11 (Tezaur contributor) rămâne next.

**Next up:** **M11** — Tezaur contributor flow per spec §7.2.
Cont shells (Favorite/Mesaje/Setari) păstrate pe scoped din M10 —
nu au nevoie de rewrite imediat. Polish-pass-uri V05 pentru forum
thread/category/search/new, revista detail (`.ad-*`), tezaur detail
SzComponents → sprite sunt notate ca _Known limitations_ în
`docs/testing/m13-testing.md`, programabile între milestones.
_M13-G_ = close + testing doc fără sub-faze noi.

**Skipped from earlier plan:** _M13-F legacy_ — Forum 5 pages per
`docs/design-imports/2026-05-16-v05/Forum.html` + `Forum -
Cauta.html` + `Forum - Nou.html` + `Forum - Tezaur Intrebari.html`
+ `Forum - Thread TR-808.html`. V05 forum design include un layout
`.fm-*` distinct cu header, action row tabs, categorii list cu
număr/descriere/sub-chips/activity și sticky trending sidebar,
plus `styles.forum.css` separat (1952 linii — thread post layout,
reply card, mention chip, gear-tag). **Skipped from earlier plan:**
_M13-E legacy_ — Revista list + detail per
`docs/design-imports/2026-05-16-v05/Revista.html` și `Revista - Cum
suna Romania prin Juno-60.html`. Magazine layout: `.rev-header`
(big title + lede), `.rev-tabs` pillar tabs, `.rev-hero` featured
article cu overlay gradient, `.rev-main` 2-col cu `.rev-grid`
3-col (`.rev-card.is-big` span-2 + small cards) + `.rev-side`
sticky (top-list). Detail: prose layout cu blockquote + author byline.
**Skipped from earlier plan:** _M13-D legacy_ — Tezaur list + detail per
`docs/design-imports/2026-05-16-v05/Tezaur.html` și `Tezaur - Roland
Juno-60.html`. Tezaur list folosește același shell `.tez-*` ca
Bazar list (header + toolbar + chips + rail + grid + pag) — diff e
markup-ul de gear cards (`.tez-card` cu `tez-card__brand/model/tags/
foot/year`). Detail: `.td-hero` (galerie + info brand/model/tags +
3 stats + collection toggle + 2 CTAs), `.td-tabs` sticky, `.td-main`
cu `.td-prose` (descriere lungă cu blockquote support), `.td-family`
strip, `.td-specs` (sections cu rows k/v), `.td-price` chart + sold
table, `.td-reviews` (agg + cards), `.td-sidebar` (stat-grid +
lineage + watch). Apoi M13-E, F, G. După M13 close → **M11** Tezaur
contributor flow per spec §7.2 (\_legacy bazar detail next-up\_:
rol
`docs/design-imports/2026-05-16-v05/Bazar - Roland Juno-60.html`.
Detail page rewrite la clase V05: `.bd-hero` (galerie 1.4fr + info
1fr panel), `.bd-info` cu price-row strikethrough + delta, chips
(condition / kind / accepts_offers), CTA grid 2+1 (primary contact +
ghost offer + icon save), `.bd-desc` prose, `.bd-included` grid
4-col, `.bd-mini-specs`, sidebar sticky cu seller card + similar
listings. Apoi **M13-D** (Tezaur list + detail), **M13-E** (Revista
list + detail), **M13-F** (Forum 5 pagini), **M13-G** (Cont 3 shells
+ close + testing doc). După M13 complet, revenim la **M11** —
Tezaur contributor flow per spec §7.2: rol
`contributor` (auto-promote la 100 forum posts) și `curator` (manual
de admin) primesc capacitatea de a propune / edita echipamente direct
de pe site (`/tezaur/propune`, „Editează" inline pe `/tezaur/:slug`),
cu coadă moderare pentru status `pending_review`. Cod existent
pe API: `@RolesAllowed('curator','admin','superadmin')` — trebuie
relaxat la `contributor` cu guard own-only pe update / delete.

**Active milestone:** none — M13 closed, M11 (Tezaur contributor) next.

## Milestones

### M0 — Scaffold

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| —   | `e4de783` | done | Nx monorepo skeleton |
| —   | `d4c9cbf` | done | Claude Design v01 import |

### M1 — Auth

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| backend  | `6099aef` | done | schema + cookie-JWT endpoints |
| frontend | `83851c0` | done | site auth pages + dashboard login + first-admin seed |

### M2 — Tezaur

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| A   | `dcdecc2` | done | backend: schema, FT search, image pipeline, CRUD, 109 seed entries |
| B   | `ed91d90` | done | design infra: tokens, 7 atomic components, PrimeNG preset, topbar |
| C1  | `56a16fe` | done | site `/tezaur` list page |
| C2  | `d6f6d21` | done | site `/tezaur/:slug` detail page (6 URL-routed tabs) |
| C3  | `f1952b2` | done | dashboard `/tezaur` admin |

### M3 — Bazar

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| A   | `9d4465b` | done | schema: listings/photos/threads/messages/transactions/reviews/notifications |
| B   | `c872825` | done | SzEditor în libs/ui + listings backend CRUD + photos + quick-list |
| C+D | `a0f7b0e` | done | saved-search/watch/expiry crons + realtime chat/offers/transactions/reviews |
| E1  | `af36af9` | done | site `/bazar` list page |
| E2  | `6b136e9` | done | site `/bazar/:slug` detail |
| E3  | `4e5c205` | done | site `/bazar/nou` + `/bazar/:slug/editare` form |
| E4a | `20b54ae` | done | site inbox + chat thread |
| E4b | `33d70e0` | done | structured offers cu 5-round cap |
| E4c | `2dc0567` | done | bilateral transaction confirm + review submission |
| E5a | `bb4bc91` | done | my-listings + my-watches dashboards |
| E5b | `8b6ca82` | done | saved-searches manager + "save current filters" CTA |
| E5c | `6444894` | done | notification bell + drop-down panel în topbar |
| E6  | `ea35e0f` | done | dashboard Bazar moderation |
| EWS | `f728db7` | done | Socket.io client — live notifications + live chat |

### M3.5 — Cross-cutting

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| roles | `8603848` | done | 8-role system, multi-valued via user_roles, superadmin gate |
| spec  | `3045a87` | done | forum categories locked v0.3 + 2-level hybrid threading |

### M4 — Revista

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| A   | `c04660e` | done | schema: articles + article_gear + article_images + minimal forum_categories/threads |
| B   | `69fb01b` | done | backend ArticleModule: editor CRUD + publish auto-thread + image pipeline + admin moderation |
| C   | `952d49c` | done | site `/revista` list + detail + `/autor/:username` profile |
| D   | `bca979e` | done | inline composer pe `/revista/nou` + `/revista/:slug/editare` cu Tiptap rich |
| E   | `553821b` | done | dashboard moderare articole + grant roluri (editor/curator/moderator) |
| F   | `49b520a` | done | revista category follow + publish fan-out (`revista_article_in_followed_category` §7.5) |

### M5 — Forum

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| A   | `dcf95d0` | done | schema: forum_posts + likes + mentions + 3-way subscriptions + badges; 9 categorii seed |
| B   | `eb57245` | done | backend: 3 services (Categories/Threads/Posts) + 3 controllers (Public/Auth/Mod) |
| C   | `31b5b99` | done | site read pages: `/forum` index + `/forum/:category` listă + `/forum/:category/:slug` thread cu 2-level threading + sourceLink pentru system threads |
| D   | `b204883` | done | posting (new thread page + inline reply + general reply + edit window + delete) + `@mention` autocomplete (server parsing) + pending state UI + mention-search endpoint |
| E   | `7395179` | done | likes toggle + 4-level subscriptions (thread + category) + bell dropdown UI + auto-watch on reply + notification fan-out (mention > revista-author > thread-watcher) + `/cont/abonamente` |
| F   | `a2fcd23` | done | badge awarding (3 kinds: post_count / account_age_days / likes_received) + instant hooks (post / like) + nightly cron sweep 04:00 UTC + dashboard CRUD + 6 seeded badges + `forum_badge_earned` notify + secțiune badges pe `/autor/:username` |
| G   | `6899eb3` | done | mod inline kebab (hide/lock/pin/delete/approve/reject) + report dialog cu 5 categorii + content_reports CRUD + `/rapoarte` queue cu acțiuni combinate (hide+resolve / lock+resolve / delete+resolve) + audit_log per acțiune + notify (`forum_mod_action_on_my_content` + `forum_report_resolved`) |
| H   | `1417fce` | done | faceted search `/forum/cautare` (text + category + author + date + tags + gear_tag, ts_headline snippets cu `<mark>`) + tags + gear_tag schema (migration 0010) + tag input + gear picker pe thread form + anti-spam stack (honeypot + time-on-form + IP rate-limit per-process) + dashboard `/forum-queue` first-post approval |
| I   | `efd6b1c` | done | thread oficial per echipament (Tezaur toggle integration, reverse FK migration 0011) + auto-OP + toggle ON/OFF cu reuse pe re-enable + audit log + card oficial + listă related threads pe `/tezaur/:slug` forum tab + checkbox „Thread oficial" în dashboard tezaur edit |

### M6 — Polish + Soft-launch prep + MVP foundation closure

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| A   | `83c6ba4` | done | pagini legale (6 slug-uri seed RO) + admin `/legal` CRUD + formular contact public cu honeypot + admin `/contact-messages` queue + cookies banner + footer extins + migration `0012_legal_pages` + seed `9009_legal_pages_seed` + `marked` lib pentru render markdown |
| B   | `4f786ad` | done | SEO mediu: `SeoService` global (title+description+OG+Twitter+canonical) cablat pe Home/Tezaur/Bazar/Revista/Forum/Autor/Legal + JSON-LD per tip (Product/Article/ClassifiedAd/DiscussionForumPosting/ProfilePage/WebSite) + `GET /sitemap.xml` dinamic (129 URL baseline) + `GET /robots.txt` dinamic + `docs/seo-todo.md` |
| C   | `0f08502` | done | polish UI pass: ToastService + ToastContainer + HttpErrorInterceptor global (network/5xx/429/403) + NotFoundPage brand-aware pentru 404 + 410 catch-all + EmptyStateComponent cablat pe 9 spoturi (Tezaur/Bazar/Revista lists, Forum cautare + category, 5 account pages) + SkeletonComponent CSS-only aplicat pe legal page |
| D   | `e663622` | done | schema `user_feedback` (migration 0013) + backend `FeedbackModule` (POST auth-only cu throttle + email notify operator, GET/PATCH admin) + site FeedbackService + FeedbackModal (mount root shell, link declanșator în `/cont`, auto-capture pathname+search) + dashboard `/feedback` queue cu filtre status+kind + expand-row + auto-mark-read |
| E1  | `5e36ec7` | done | profil public: `users.location` (migration `9010`) + `AuthUserPublic` extins (bio/location/avatar/website/3× social) + `PATCH /auth/me/profile` + `POST/DELETE /auth/me/avatar` (256×256 WebP dedicat) + site `/cont/profil` cu uploader + form complet + link „Profil" în meniul `/cont` + `/autor/:username` afișează location |
| E2  | `ff5ef8c` | done | block + report UI cablat: backend `BlocksModule` (`/me/blocks` GET/POST/DELETE) + `ContentReportsService.verifyTarget` + `snapshot` extins pe `listing`/`message`/`gear_review`/`user_profile` + `listings.listPublic` filtrează vânzători blocați; site `BlocksService` + `<app-block-button>` + `<app-report-button>` reusable, wired pe bazar detail (seller card), chat thread (header), `/autor/:username` (safety actions); `/cont/blocuri` list page; dashboard `/rapoarte` queue extins cu 4 target options noi + link-uri |
| E3  | `0668be0` | done | MVP foundation closure: backend `AuditLogService.list` cu filtre + `AdminClosureModule` (`GET /admin/audit-log`, `GET/POST /admin/currency-rates`) + `CurrencyRatesService` cu audit logging; seed `9011_currency_rate_eur_seed` (EUR→RON 5.0700); dashboard `/audit-log` viewer (filter action/target/perioadă + expand JSON), `/currency-rates` admin (form + istoric); home: 2 module noi (Audit log activ înlocuiește placeholder „Land în M2.5", Curs valutar) |
| E4  | `2cc2ceb` | done | pre-launch hardening: GDPR `GET /auth/me/export` (JSON dump 19 secțiuni) + `DELETE /auth/me/account` (PII anonymize + soft-delete listings + hide forum posts + clear cookies); site `/cont/date` cu magic-phrase confirm; slug_redirect INSERT pe rename article publicat + lookup pe revista 404 (gone vs redirect); Tezaur lookup returnează `expired` (410 path); `user_email_history` INSERT pe verifyEmail când email schimbat; nou `gdpr_self_delete` audit action (migration `9012`) |

### M7 — Storage Refactor (Local → Cloudflare R2)

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| A   | `6341d09` | done | StorageDriver interface (libs/shared) + Local/S3 drivers (apps/api/storage) + StorageModule env-driven; schema migration `9013` (storage_limits + user_upload_quota + storage_events + storage_folder_stats + forum_post_attachments + revista_article_attachments + 4 enums); seed migration `9014` (limite default per spec, idempotent); StorageService refactat la driver I/O cu chei content-addressed (`<module>/<resource>/<source>/<variant>-<hash12>.jpg`); refactor callers Tezaur/Bazar/Revista la `deleteObjects(keys[])`; avatar pipeline pe driver cu cache mutable; env nou (`STORAGE_DRIVER` + `STORAGE_PUBLIC_BASE_URL` + `R2_*`); `@aws-sdk/client-s3@^3.1047.0` adăugat; smoke script `tools/scripts/smoke-storage.ts` |
| B   | `d23661f` | done | Magic-byte detector (8 formats, zero-dep); `StorageLimitsService` (wildcard fallback + cache 5min); `UploadQuotaService` (`check()` 413/429 pre-upload + `track()` storage_events/user_upload_quota/storage_folder_stats + lifetime alert notification); StorageService extins cu `processAudio`/`processPdf`/`processZip` + integrare quota pe image/avatar; public `GET /api/storage/limits` (cache 300s); migration `9015` adaugă `storage_quota_lifetime_reached` în `notification_kind`; pg-boss crons în worker — `storage:reset-daily-quota` @ 00:00 UTC + `storage:reconcile` @ 03:00 UTC (paginat 1000 keys/page + 200ms sleep, no-op pe LocalDriver); DB type rename `StorageFileType` → `StorageFileTypeValue`; smoke check extins cu 10 cazuri magic-byte |
| C   | `e246332` | done | Forum attachments backend (`POST/DELETE /forum/posts/:postId/attachments` cu max 3 enforce + `GET /forum/threads/:slug/attachments` public) + Revista attachments backend (uncapped, optional caption); site `AttachmentsService` HTTP client cu cache 5min limite + wildcard fallback; site `AttachmentBoxComponent` (uploader + delete) + `AttachmentListComponent` (audio `<audio controls>` inline / PDF link / ZIP download); wire pe `forum-thread.page` (per post pentru autor) + `revista-detail.page` (sub article body pentru autor/editor/admin); i18n key `revista.attachments_label`; `StorageDriver` interface: `Buffer` → `Uint8Array` ca să rămână libs/shared browser-safe |
| D   | `a81b883` | done | Backend `AdminStorageService` + `AdminStorageController` cu 7 endpoints (GET limits/overview/folders/trends/users + PUT limits/:id + POST reconcile + GET users/:id/quota); admin-gated `@RolesAllowed('admin','superadmin')`; PUT invalidează cache-ul `StorageLimitsService`; reconcile fires pg-boss one-shot. Dashboard `/storage` cu 5 tabs (Limits editabil cu inline number input + Salvează + toast / Overview 2 metric cards + per-modul + per-tip / Folders drill-down + module filter / Trends granularity+date range / Top users limit 50) + buton „Reconcile acum". Card „Storage" pe home dashboard. `docs/devops/storage-r2.md` (10 pași cutover R2). `docs/testing/m7-testing.md` (5 secțiuni manual test plan + debugging appendix). Director nou `docs/testing/`. |

### M8 — MVP gap closure

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| —   | `931561c` | done | Notification preferences UI `/cont/preferinte` (§7.5) cu matrix grupat pe modul × 2 channels (in-app/email); backend `GET/PUT /me/notifications/preferences` cu DEFAULT_PREFS merged + bulk upsert. Toggle public/privat colecție §11 (`users.collection_public` migration `9016` default true, expus pe AuthUserPublic + authorProfile, checkbox în `/cont/profil` sub Confidențialitate). Umami Cloud analytics §M6 — `UmamiService` la APP_INITIALIZER injectează script tag când env-urile populate (no-op pe dev). i18n: 20 kind labels noi + grupuri + col headers + common.loading/saving. AuthUser type extins cu collectionPublic. |

### M9 — SEO closure + unified search + observability

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| A   | `4e2103c` | done | Forum 410 Gone (§7.13 — `ForumThreadsService.lookupSlugRedirect` + `handleSlugMiss` helper în controller + site honor pe `forum-thread.page`); BreadcrumbList JSON-LD pe 4 detail pages via `SeoService.breadcrumbList()` static helper + array form `setJsonLd([primary, breadcrumb])`; homepage Organization + WebSite SearchAction (sitelinks search box); brand placeholders generate via `tools/scripts/generate-brand-assets.ts` (Sharp) — `og-default.png` 1200×630 + `logo.png` 512×512; warnings cleanup (NG8107/8102 bio.value, 2× NG8113 imports nefolosite, bundle budget 1500kb/2500kb) |
| B   | `9f0e604` | done | Unified cross-module search `/cautare` (§7.6) — backend `UnifiedSearchService` fan-out paralel cu try/catch per section + public `GET /api/search?q=&limit=` (min 2 chars, max 20/section); site `SearchPage` cu debounce 300ms + URL param sync + 4 grouped sections (top 5 + „Vezi toate" deep-links); app shell topbar search button cablat; homepage SearchAction target swap `/forum/cautare` → `/cautare`; i18n `search.*` block nou; ForumModule.exports extended cu ForumSearchService |
| C   | `1b5762a` | done | Observability M6 deliverables. **Sentry** `@sentry/nestjs@^10.53.1` + `@sentry/node@^10.53.1` — `instrument.ts` (side-effect init before NestFactory) + `SentryModule.forRoot()` în api + worker AppModule. Worker tagged `service: 'worker'`. 4 env vars opționale (`SENTRY_DSN/ENVIRONMENT/TRACES_SAMPLE_RATE/RELEASE`), no-op pe dev. **Daily pg_dump**: `PgDumpBackupJob` cron `backup:pg-dump` @ 02:30 UTC, `pg_dump --format=custom --compress=9` la `BACKUP_DIR` (default `./storage/backups`) + prune > `BACKUP_RETAIN_DAYS` (default 14). `docs/devops/backups.md` cu 3 layers (local + Hetzner Storage Box rclone + restore drill trimestrial). |

### M14 — Bazar V07 sell page + light-mode default

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| A   | `4401af7` | done | Backend draft flow + schema. Migration `0015_listing_tagline_defects.sql` adaugă `tagline varchar(200)` + `defects text` pe `listings`. `bazar.dto.ts`: `CreateListingDto` capătă `tagline`/`defects` optional, nou `CreateListingDraftDto` cu toate câmpurile opționale. `listings.service.ts` extins cu `createDraft` (status='draft', placeholder slug + title, expiresAt=null), `publishDraft` (validează shape-ul full + re-slug din brand+model+title + setează expiresAt + fan-out saved-search), `findOwnById` (slug-then-detail prin findBySlug cu sellerId pentru a permite acces la drafts). `update` extins să accepte schimbări de `gearId`/`rawMake`/`rawModel`/`rawYear`/`tagline`/`defects`. `MeBazarController` capătă `POST listings/draft`, `POST listings/:id/publish`, `GET listings/:id`. `PublicBazarController.detail` ascunde drafturile pentru oricine ≠ owner. |
| B   | `dfbd736` | done | Frontend V07 form + light-mode default. `apps/site/src/v06-tezaur-add.css` redenumit `v06-add-forms.css` (scope partajat Tezaur + Bazar add); ~350 linii `.bz-*` apendate (`.bz-add-link`, `.bz-cond`, `.bz-deal`, `.bz-price`, `.bz-deliv`, `.bz-payment`, `.bz-prev-card`, `.bz-trust`, `.bz-side-est`, `.bz-note`). `BazarFormPage` rescris complet în V07 markup: reactive form + auto-save 1.5s + `history.replaceState(?listing=<id>)` la primul save, combo dropdown pentru Tezaur lookup, condition radio 5-step mapată pe enum-ul existing (`new`/`very_good`/`good`/`fair`/`for_parts`, fără `mint`), deal-type radio cu 3 cards (sell/trade/sell_or_trade), delivery radio (pickup/ship/both) cu shipping cost + carriers chip-grid apărute condiționat, photo dropzone cu drag-to-reorder, sticky sidebar cu live preview card + progress meter live + checklist 8-item + CTAs (Publică / Save draft / Preview / Discard). `ThemeService.readInitialMode()` default schimbat de la `auto` la `light`; `setMode` persistă acum și `auto` ca să respecte explicit alegerea userului. ~110 chei i18n noi sub `bazar.form.*` (înlocuiește vechiul block parțial). |
| C   | _TBD_ | done | Close + `docs/testing/m14-testing.md` cu plan manual de testare (6 secțiuni: BE migration & endpoints, V07 form happy path, auto-save & resume, photos & reorder, publish & validation, light-mode default + regression). |

### M12 — Dashboard design import v04 (out-of-order before M11)

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| —   | `b641f85` | done | Re-skin complet apps/dashboard la `docs/design-imports/2026-05-16-v04`. **Shell** inline în `apps/dashboard/src/app/shell/` (AdminShellComponent + AdminSidebarComponent + AdminTopbarComponent + AdminIconsComponent SVG sprite + AdminShellService cu theme/density/collapse persisted via signals + localStorage). **Tokens v04 oklch** override peste `libs/ui/tokens/tokens.css` în `apps/dashboard/src/styles.scss` (scope dashboard only — site neatins, alt agent lucra paralel pe M10 site UX). **Pagini noi:** `/` DashboardPage (KPI strip, alerts, activity feed, quick actions, section pulse), `/useri/:id` UserEditPage (breadcrumb, sticky save bar, 4 tabs, role radio-grid, danger zone). **Re-skin Useri list** cu filter bar sticky + bulk actions + PrimeNG TableModule peste design tokens. **Login** decuplat de shell (centered `.auth-shell` + `.auth-card`). **Restul paginilor** admin inherit shell + tokens via fallback global `main.admin` din `styles.scss`. Default theme = `light`, density = `comfortable`. `home.page.ts` șters. `app.routes.ts` mutat la shell-wrapped child route tree. `docs/testing/m12-testing.md` cu plan complet de testare manual. |

### M13 — Site design import v05 (out-of-order before M11)

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| A   | `84dda78` | done | Foundation: V05 `styles.css` copiat la `apps/site/src/v05.css` (4503 linii) cu dark tokens swapped la valorile v2-neutral hex per design decision (`#0a0a0b`/`#131314`/`#181819`/...). Light theme rămâne warm cream. `apps/site/src/styles.scss` migrat de pe `libs/ui/tokens/tokens.css` pe `v05.css`. Nou `V05SpriteComponent` (`apps/site/src/app/ui/v05-sprite.component.ts`) cu 58 simboluri SVG lifted 1:1 din toate paginile v05. Sprite mount în `app.ts` root. Footer markup aliniat la clasele V05 (`.foot` / `.foot__grid` / `.foot__col` / `.brand` / `.locale`) — stilurile inline din app.ts eliminate (livrate global de v05.css). `libs/ui` și `apps/dashboard` neatinse. Build OK (CSS bundle 30→31 kB). |
| B   | `044fd5a` | done | Home page rewrite V05 1:1: welcome strip auth-aware, hero featured article (revista.list newest #1) + rotator placeholder, revista grid 1 big + 2 small, bazar horizontal scroll 8 listings, forum + 4-cell pulse aside (static threads + `—` pulse pending dedicated endpoint), tezaur spotlight popular #1 + catalog 6, CTA strip auth-aware (Guest signup vs Logat 3 ghost actions + newsletter). 60 chei i18n noi (înlocuiește vechiul `home.hero/sections` tree). Build curat. |
| C1  | `5d5c541` | done | Bazar list re-aligned la V05: clase `.tez-*` globale (header/toolbar/main/rail/check/pag) + cards switched la `.bz-grid > .listing` (uniform cu Home bazar-scroll) + `.bz-actions` row. Style block 500→50 linii. Bundle 32→22 kB. |
| C2  | `a635f18` | done | Bazar detail rewrite V05 1:1: `.td-crumb` breadcrumb, `.bd-hero` cu `.bd-gallery` (main+chip+counter+nav+thumbs) și `.bd-info` (topline+title+price-row+chips+deal+CTAs+posted). `.bd-main` 2-col cu `.bd-desc` (innerHTML) + `looking_for`/`condition_note` + `.bd-mini-specs` (link Tezaur) + `.bd-similar` cu `bz-grid` din `recentlySold`; sidebar cu seller block (3 stats + Block/Report + contact textarea) + safety tips 4-item. SzAvatar/Badge/Button/Icon scoase. 21 chei i18n noi. |
| D   | `cafb77f` | done | Tezaur list + detail re-aligned la V05. Ambele foloseau deja `.tez-*`/`.td-*` — work a fost trim de styles + SzIcon → sprite V05. List: stiluri 404→6 reguli (`.tez-results-row`, `.tez-empty`), bundle 23.6→13.0 kB, kbd ⌘K. Detail: stiluri 663→13 reguli (`.muted`, `.td-empty`, gallery photo/ph, `.td-buy*`, `.td-official*`), bundle 40.0→26.4 kB. SzBadge/Avatar/Button păstrate pe panourile Detalii/Specs/Recenzii. |
| E   | `2529bfe` | done | Revista list rewrite V05 1:1: `.rev-header` (title+lede), `.rev-tabs` pillar tabs, `.rev-hero` cu overlay gradient (featured `articles[0]` doar pe "all"+page1), `.rev-main` 2-col cu `.rev-grid` (`.is-big` span-2 + small) + `.rev-side` (Top 5 + newsletter). `gear-fill` cards. 8 chei i18n noi. Bundle 18→15.6 kB. Detail: doar `SzIconComponent` scos; layout `.rd-*` scoped păstrat (rewrite la V05's `.ad-*` = polish pass viitor). |
| F   | `137f4d4` | done | Forum foundation: V05 `styles.forum.css` (1952 linii) copiat la `apps/site/src/v05-forum.css` + importat din `styles.scss`. `forum-list.page.ts` rescris la V05's `.fm-*` (header + actions tabs + `.fm-cats` cu `.fm-cat` rows). 3 chei i18n noi. Thread/category/search/form rămân pe scoped `.fc-*/.ff-*` (rewrite = polish pass viitor; foundation V05 ready pentru pickup). |
| G   | `f68c854` | done | Close M13 + `docs/testing/m13-testing.md` (plan manual de testare pe 11 secțiuni: foundation, Home guest/logat, Bazar list+detail, Tezaur list+detail, Revista list+detail, Forum list+legacy, Cont shells, regression, known limitations, smoke build). Cont shells (Setari/Favorite/Mesaje) păstrate pe scoped din M10 — funcționează curat cu tokens v05, rewrite la `.acc-*` = polish pass viitor. |
| D   | _TBD_ | pending | Tezaur list + detail. |
| E   | _TBD_ | pending | Revista list + detail. |
| F   | _TBD_ | pending | Forum (list, thread, category, new, search). |
| G   | _TBD_ | pending | Cont pages (Favorite, Mesaje, Setari) + `docs/testing/m13-testing.md` + close. |

### M10 — Post-launch UX iteration #1 (cont reorg)

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| A   | `f7a1008` | done | Topbar avatar dropdown role-gated înlocuiește butonul „CONT". `SzAvatarComponent` cu `seed` (oklch hue determinist din `user.id`); `SzTopbarComponent` cu accountClick emit + accountMenuOpen border-state. Nouă `AccountMenuComponent` în site (fixed panel à la notifications, outside-click + Esc, item-uri: Setări, Anunțurile mele, Trimite feedback, Dashboard pentru admin/superadmin, Ieși din cont). i18n: 3 chei. Dashboard wired la goHome ca să păstreze comportamentul vechi. |
| B   | `ee939ac` | done | Iconițe ❤️ ✉️ în topbar + burger mobile. Sprite gains `mail` icon; topbar primește 3 inputs (showFavorites/Messages/Burger) + badge slot pe ✉️ + class `.sz-icon-btn--collapsible` care ascunde iconițele sub 640px. Nouă `MobileMenuComponent` slide-in din dreapta cu favorite/mesaje/theme/setări/anunțuri/feedback/dashboard/logout. App shell juggle 3 panouri mutually exclusive. |
| C   | `0227d3d` | done | `/cont/setari` shell cu 6 tab-uri peste paginile existente (Profil/Parolă/Email/Datele mele/Preferințe notificări/Utilizatori blocați). `AuthShell.embedded` mode pentru change-password / change-email când sunt în shell. 6 redirect-uri vechi (`/cont/profil` etc.) → noile tab-uri. i18n: `account.settings.*`. |
| D   | `0627544` | done | `/cont/favorite` shell cu 3 tab-uri (Anunțuri salvate, Căutări salvate, Abonamente forum) peste paginile existente. 3 redirect-uri vechi. Heart click în topbar → `/cont/favorite`. i18n: `account.favorites.*`. |
| E   | `25e8fba` | done | `/cont/mesaje` shell cu tab Bazar (inbox live) + Forum (placeholder „În curând" pentru viitoare PM-uri Forum). Threadul `:threadId` rămâne pe URL-ul vechi (acum copil al shell-ului). Default tab redirect la `bazar`. i18n: `account.messages_shell.*`. Future dev notat: unified inbox Bazar+Forum cu badge pe sursă. |
| F   | `ea1f957` | done | Cleanup: `account-home.page.ts` șters, `/cont` redirect → `/cont/setari`, chei i18n orfane curățate (`my_watches`, `saved_searches`). `docs/testing/m10-testing.md` cu plan manual pentru toate 6 sub-faze + regresie + bookmark-uri vechi + known limitations. |

## Conventions (recap from memory)

- **Spec-first:** rundă de 5-8 întrebări înainte de cod, plan aprobat, apoi implement.
- **Code în engleză, UI în română** (i18n strict).
- **Commit & push între sub-faze.** Ultimul pas în fiecare commit:
  bifează linia în acest fișier + actualizează "Next up".
- **Spec autoritativ:** `docs/spec/spec.md` (citează § când iei decizii).
- **Migrations:** drizzle-kit generează cu nume aleator — redenumesc manual la
  `<idx>_<descriptive>.sql` + actualizez `meta/_journal.json` ca să nu colidă
  prefixele.
