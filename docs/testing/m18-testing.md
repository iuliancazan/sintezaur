# M18 — manual testing plan (Forum pixel-perfect pass)

Toate cele 5 pagini Forum aliniate 1:1 cu
`docs/design-imports/2026-05-16-v08/Forum*.html`. Testează direct pe
production după ce Coolify a redeployat.

Sub-faze livrate:

| Sub | Commit  | Pagini |
|-----|---------|--------|
| A   | _no-op_ | Landing `/forum` — era deja 1:1 |
| B   | `f69519c` | Thread `/forum/:category/:slug` |
| C   | `12d4a8b` | Category `/forum/:category` |
| D   | `f0c8bb5` | New `/forum/:category/nou` |
| E   | `bac9843` | Search `/cautare` + `/forum/cautare` |
| F   | (acest doc) | Close + testing |

## A. Forum landing (no-op verify)

1. `/forum` — verifică layout vechi neschimbat (deja era 1:1).
2. Inspect: header `.fm-header`, action tabs `.fm-actions`, cats list
   `.fm-cats` cu `.fm-cat` rows, trending + online sidebar `.fm-trending`
   + `.fm-online`.
3. Switch theme dark/light — fără regresie.

## B. Forum thread — V08 layout

### B1. Layout sticky + sidebar

1. Navighează la orice thread populated, ex: `/forum/tezaur-intrebari/<slug>`.
2. **Sticky top bar** (`.ft-sticky`) — verifică prezență:
   - back arrow (sprite `#i-back`) — click duce înapoi la category list
   - thread title (poate fi truncat dacă lung)
   - category name la dreapta
   - progress counter „N / total" la extremă dreapta
3. **Scroll**: progress counter se actualizează live pe măsură ce
   scrollezi (cel mai sus post vizibil din viewport).
4. **Layout 2-col**: posts column stânga + `.ft-side` sidebar dreapta
   pe ecrane > 720px. Pe < 720px sidebar dispare (mobile mode).

### B2. OP post (`.ft-op`)

1. Avatar 48×48 cu inițiale (2 litere, oklch tint determinist din username).
2. Author name + `@handle` + trust badge (vezi B4) — pe rândul cu nume.
3. Meta linie: „Postare #1 · {date}" — dacă editată, apare „editat".
4. Subscribe bell la dreapta sus (componenta `app-forum-subscribe-bell`
   existentă — păstrată cu popover-ul ei, plasată în header-ul OP).
5. **Title** (`.ft-op__title`) — text mare, sub header. Dacă thread-ul
   e blocat (`lockedAt`), apare `🔒` lângă titlu.
6. **Tags row** (`.ft-op__tags`):
   - chips `.fr-gear-chip` pentru fiecare `gearTagged` (brand + model,
     link la pagina Tezaur)
   - `.fr-tag` pentru fiecare free tag (link la search cu filtru)
7. **Body** (`.ft-prose`) — innerHTML din `bodyHtml`. Verifică render
   corect <p>, <ul>, <ol>, <strong>, <em>, <code>, <blockquote>, <a>.
8. **Engagement row** (`.ft-engage`):
   - Util button cu count + heart icon. Click → toggle like.
     `is-on` style când liked.
   - Răspunsuri button cu count → scroll la `.ft-replies-head`.
   - Distribuie button → copy thread URL în clipboard + toast „Link
     copiat în clipboard."
   - (autorul propriu) Edit button cu icon `#i-quote` (heuristică
     vizuală — vechiul edit comportament preserved)
   - Spacer + post actions menu (mod, report etc.)

### B3. Replies (`.ft-post`)

1. Reply-urile au layout cu rail (avatar + `#N`) | main column.
2. Avatar deterministic colored la fel ca OP.
3. Trust badge dacă autorul îndeplinește pragul.
4. **Parent quote ref** (`.ft-quote-ref`) — apare doar pe sub-replies.
   Click pe „Vezi preview" → expand parent body inline (truncate la 240
   chars + `…`). Re-click → ascunde.
5. **Actions row** (`.ft-actions`):
   - Util (like) — toggle
   - Răspunde — deschide composer inline sub post
   - Cită — deschide composer inline cu body parent prefilled ca
     `<blockquote>`
   - Distribuie — copy URL cu `#post-N` anchor
   - (autorul propriu) Editează — deschide editor inline
   - (autorul propriu) Șterge — confirm + soft delete
   - Mod menu pe extrema dreaptă

### B4. Trust badges (`.fr-trust`)

Praguri și UI:

| Tier      | Praguri                                        | Class                  | Label   |
|-----------|------------------------------------------------|------------------------|---------|
| Veteran   | account ≥ 2 ani **sau** ≥ 100 posturi aprobate | `.fr-trust.is-veteran` | Veteran |
| Activ     | account ≥ 6 luni **sau** ≥ 30 posturi          | `.fr-trust.is-regular` | Activ   |
| (none)    | newbies (sub Activ)                            | (no badge)             | —       |

1. Verifică pe propriu cont (dacă e veteran) și pe alți useri.
2. Newbies (cont < 30 zile, < 30 posturi) NU au badge — header curat.

### B5. Nested replies (`.ft-children-toggle`)

1. Pe un thread cu > 5 sub-replies sub același top-level, verifică:
   - Toggle apare cu „N răspunsuri imbricate · <preview comma-separated
     usernames>"
   - Click → expand nested replies (`.ft-children.is-open`)
   - Click din nou → collapse
2. Pe < 5 sub-replies, expand by default.

### B6. Composer (sticky + inline)

1. Logged out: nu apare `.ft-replybox`. Apare un link „Conectează-te ca
   să răspunzi".
2. Logged in: jos pagină apare `.ft-replybox` (avatar + input + buton).
3. Click pe input sau pe „Răspunde" → expand la `.ft-composer` cu
   SzEditor + cancel/send buttons.
4. Reply inline (click „Răspunde" pe orice post) → composer sub post,
   submit → reply nou cu `parentPostId=p.id`.
5. Quote inline (click „Cită") → composer cu body prefilled ca
   blockquote din parent.

### B7. Sidebar `.ft-side`

1. **Gear discutat** — apare doar dacă `thread.gearTag` are entries.
   Show cards `.ft-side-gear` cu brand + year + model + link.
2. **Cei mai activi** — top-5 useri din thread sortați după post count
   (derivat client-side din posts). Avatar + nume + (OP badge dacă e
   autorul OP) + post count.

### B8. Floating jump-to-newest

1. Scroll thread > 600px → apare `.ft-jump` button (bottom-right).
2. Click → smooth scroll la finalul thread-ului.

## C. Forum category (`/forum/:category`)

### C1. Layout

1. **Breadcrumb** `.td-crumb` cu back-arrow.
2. **Cat strip** `.fl-cat-strip.crosses` — kicker („Categorie · ..."),
   big title, description, meta cell cu `.fl-cat-stat` (thread count)
   + subscribe bell.
3. **Action row** `.fl-actions`:
   - CTA primary „Începe un thread nou" (vizibil doar pe categorii
     user-kind, ascuns pe system-kind)
   - sort tabs cu „Activitate recentă" activ; „Cele mai noi" și „Cele
     mai răspunse" cu cursor disabled — backend nu suportă încă sort
     variants (limitation cunoscută).

### C2. Pinned section

1. Dacă există threaduri pinned: apare `.fl-pinned` cu header
   „Anunț · pinned de moderatori (N)".
2. Fiecare row are pin icon, title cu badge „Anunț", tags row, activity
   col (avatar + author + last time), replies count.

### C3. Regular thread list

1. `.fl-list` cu `.fl-row` rows (grid pin / body / activity / replies).
2. Click pe row → navighează la thread.
3. Tags chips până la 4 per row (truncate dacă mai multe).
4. Avatar deterministic + initials.
5. Empty state când no threads.

### C4. Pagination

`.fr-pag` cu state-uri `.is-active`, `.is-disabled`, `.is-ellipsis`.

## D. Forum new thread (`/forum/:category/nou`)

### D1. Layout

1. **Breadcrumb** cu back-arrow.
2. **`.fn-shell` 2-col** (form stânga + sidebar dreapta).
3. **`.fn-form.crosses`** cu head (kicker „Postezi în [category]" +
   title „Thread nou").

### D2. Form fields

1. **Title** `.fn-input-title` — input mare, char counter live („N /
   120 caractere") sub.
2. **Body** — SzEditor (Tiptap) cu toolbar existent, mention `@user`,
   embed support.
3. **Gear picker** — autocomplete cu min 2 chars debounce 250ms.
   Selecții apar ca `.fr-gear-chip` în `.fn-tag-input` cu × remove.
   `.fn-autocomp` dropdown cu primul highlight `.is-hl`.
4. **Free tags** — input + chips `.fr-tag` (parsed pe comma/space,
   validated `[a-z0-9][a-z0-9-]{1,30}`, max 6).

### D3. Sidebar `.fn-side`

1. „Cum scrii un thread bun" — 5 tips numbered cu `<b>` highlight
   (rendered via `[innerHTML]`).
2. „Reguli pe scurt" — 4 monospace bullets.
3. „Threaduri similare" SKIPPED — would need semantic search endpoint;
   listed as known limitation.

### D4. Submit

1. Submit → POST `/api/forum/threads` cu honeypot + form-started-at
   anti-spam.
2. Success → navigate la `/forum/:category/:newSlug`.
3. Error → `.fn-error` apare sub fields cu mesajul backend.

## E. Forum search (`/forum/cautare`)

### E1. Layout

1. **Breadcrumb** + **`.fs-bar`** sticky (icon + input + clear button
   visibil doar când query non-empty).
2. **`.fs-summary`** cu count + sort tabs (3 tabs funcționale; click
   schimbă sort + reload).
3. **`.fs-filters`** active filter chips — apare doar când există
   filtre active. Fiecare chip cu × remove individual + buton „Șterge
   toate filtrele".
4. **`.fs-main` 2-col** rezultate + facets sidebar.

### E2. Results (`.fs-result`)

1. Card cu rail-number `.fs-result__cat-num` (01, 02, ... paginated —
   page 2 începe la 26 dacă pageSize=25).
2. Body cu crumb (category + primii 2 tags), title cu `<mark>`
   highlights (din ts_headline), snippet cu inline `<mark>`, footer
   (avatar + author + relative time + replies count).
3. Click → navigate la thread.
4. Stats col dreapta cu „N · Răspunsuri".

### E3. Facets sidebar (`.fs-facets`)

1. **Categorie** — list `.fs-facets__row` cu toggle `.is-on` pe click.
2. **Autor** — text input cu enter-submit.
3. **Interval timp** — 2 date pickers cu auto-submit on change.

### E4. URL sync

Toate filtrele se reflectă în query params: `q`, `author`, `from`,
`to`, `sort`, `categories` (comma-sep), `page`. Bookmark + back/forward
funcționează.

### E5. ts_headline highlight

În `.fs-result__title` și `.fs-result__snippet`, `<mark>` tags servite
de backend sunt colorate cu `color-mix(in oklab, var(--accent) 30%,
transparent)` (page-local rule via `::ng-deep`).

## Regression

### Build + bundle

1. `npx nx build site` — niciun warning nou (bundle initial warning
   ~23 kB e pre-existent).
2. `npx nx run site:typecheck` — clean.
3. Bundle size lazy chunks: forum-thread (~24 kB) ≈ pre-M18 dimensiune
   minus styles scoase.

### Theme + locale

1. Dark + light mode pe toate cele 5 pagini — fără regresie vizuală
   majoră.
2. RO/EN switch — chrome global se schimbă; form-internalele și
   feature-urile noi (trust badges, jump-to-newest, share toast) cad
   pe fallback RO când EN lipsește.

### Critical paths

1. **Login → thread → like + reply + share**:
   - Loghează-te
   - Mergi la orice thread
   - Click Util pe OP → count creşte, button `.is-on`
   - Click Răspunde pe orice reply → composer inline → completează →
     send → reply nou apare în listă
   - Click Distribuie → toast „Link copiat" → paste într-un browser
     nou: deep-link `#post-N` scrollează direct la post

2. **Category browse → new thread**:
   - `/forum/producție` (sau orice categorie user-kind)
   - Click „Începe un thread nou"
   - Completează title + body + 1 gear tag + 2 free tags
   - Publish → redirectează la thread-ul nou

3. **Search → filter → result**:
   - `/forum/cautare?q=test`
   - Click pe o categorie din facets → filter chip apare
   - Click pe sort „Cele mai noi" → resort
   - Click pe rezultat → navighează la thread

4. **Mobile (< 720px)**:
   - Sidebars `.ft-side` / `.fs-facets` / `.fn-side` ascunse
   - Layout col-singular
   - Sticky bar `.ft-sticky` rămâne accesibilă
   - `.ft-replybox` rămâne sticky bottom

## Known limitations (pentru M19+)

1. **Sort variants pe category list** — „Cele mai noi" / „Cele mai
   răspunse" sunt vizual prezente dar disabled. Backend
   `listByCategorySlug` doar suportă „Activitate recentă" (pin first,
   apoi lastPostAt desc). Adăugare în M19+.
2. **Util count în search results** (`.fs-result__stats .util`) — would
   need backend cross-post `SUM(likeCount)` aggregation pe thread.
   Coloana eliminată din UI deocamdată, doar replies count rămâne.
3. **„Stare thread" facet** (Cu răspunsuri / Hot / Rezolvate / Fără
   răspuns) — features noi backend (computed flags). Skipped în M18.
4. **„Threaduri similare" pe new thread form** — would need semantic
   search endpoint nou (probabil pe title + body). Skipped.
5. **„Gear menționat" facet** pe search — would need aggregation pe
   `forumThreads.gearTag` peste rezultate. Skipped.
6. **Subscribe-pill V08 (single cycling button)** — folosim
   `app-forum-subscribe-bell` existent (componenta cu popover) plasată
   în OP head. Replace cu un single `.fr-sub-pill` cycling visual mai
   apropiat de V08 e o iterație ulterioară.
7. **Sticky bar progress overlap cu topbar** — progress counter ar
   trebui poziționat sub topbar global. Pe mobile poate face overlap;
   verifică vizual.
8. **`fn-editor` V08 custom toolbar** — am păstrat SzEditor (Tiptap)
   în loc să reimplementăm `.fn-editor` cu butoane B/I/U/H/list/quote/
   code/link/image/play + word counter. Same functionality, diferit
   skin. M19+ optional polish.

## Critical paths to verify in production after deploy

- `/forum` → orice categorie → orice thread → engagement row apare,
  share copy URL funcționează, trust badges colorate.
- `/forum/<user-cat>/nou` → form V08 vizibil, gear picker
  autocomplete funcționează.
- `/forum/cautare?q=tr-808` → rezultate cu `<mark>` highlights, facets
  click-toggle filter chips → URL params se actualizează → reload
  păstrează filtrele.
- Mobile width (< 640px) → sticky bar `.ft-sticky` rămâne accesibilă,
  sidebars `.ft-side` / `.fs-facets` / `.fn-side` ascunse, reply box
  sticky bottom.
