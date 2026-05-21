# M17 — manual testing plan

Sub-faze livrate: **A** (Tezaur add bilingv), **B** (Revista editor bilingv),
**H** (Tezaur detail sprite swap), **K** (mobile drawer parity),
**L** (Contribuții-tezaur verify — no-op).

Sub-fazele **C / D / E / F / G / I / J** au fost mutate la **M18 pixel-perfect
pass page-by-page** după ce am descoperit la implementare că rewrite-ul
markup la clasele V05/V08 implică restructurare layout (pixel-perfect),
nu simplu prefix rename. Vezi STATUS.md → M17 table → notele „deferred".

Toate testele se fac pe stack-ul deployed (sintezaur.ro) după ce
commit-urile au ajuns pe `main` și Coolify a redeployat. Pentru rute
care cer auth (M17-A/B/K), folosește contul tău obișnuit.

## A. Tezaur add bilingv (`ddacb43`)

### A1. Save EN tagline + body pe draft nou

1. Loghează-te. Navighează la `/tezaur/adauga`.
2. Completează minim: brand, model, categorie, an lansare, 1 imagine.
3. Scrie tagline RO + descriere RO (≥ 80 caractere).
4. **Scroll la secțiunea „Descriere".** Verifică prezența blocului
   colapsat „Traducere în engleză (opțional)" cu `+` în stânga.
5. Click summary → bloc se deschide, `+` devine `–`.
6. Completează `taglineEn` (ex: „Flagship analog poly").
7. Completează `descriptionTextEn` (≥ 50 caractere).
8. Aștept 2s → status pill „salvat" (auto-save 1.5s).
9. Reîncarcă pagina (F5). Verifică: tagline EN + body EN repopulate.
10. **Verifică în Network tab**: PATCH `/api/me/tezaur/gear/:id` are în
    payload `taglineEn` + `descriptionTextEn`.

### A2. Clearance EN textarea

1. Pe același draft, ștergi tot textul din `descriptionTextEn`.
2. Aștept auto-save. Reîncarcă pagina.
3. EN textarea apare goală. Verifică în Network: PATCH a fost trimis,
   request body conține `descriptionTextEn: ""`.
4. (DB verify dacă vrei): rândul `gear_descriptions{gearId, lang:'en'}`
   nu mai există după save.

### A3. Submit cu EN parțial completat

1. Pe același draft, lasă numai `taglineEn` completat (descriere EN goală).
2. Click „Trimite la moderare".
3. Submit OK (EN câmpurile sunt opționale, validarea cere doar RO + min set).
4. Status pill: „submitted".

### A4. Public read EN fallback (smoke, după ce un draft e aprobat)

1. Aprobă draftul ca admin (sau folosește un draft tău aprobat anterior).
2. Vizitează `/tezaur/<slug>` — vezi RO (default).
3. Vizitează `/en/tezaur/<slug>` — vezi tagline EN și body EN dacă populate;
   altfel cad înapoi pe RO și pagina afișează „translation pending".

## B. Revista editor bilingv (`ae69692`)

### B1. Save EN title + excerpt + body pe articol nou

1. Loghează-te ca editor/admin. Navighează la `/revista/nou`.
2. Completează: title RO ≥ 3 chars, category, body RO (cu Tiptap).
3. **Scroll sub secțiunea Body.** Verifică „Traducere în engleză
   (opțional)" colapsat cu `+`.
4. Click summary → expandare cu `–`.
5. Completează `titleEn`, `excerptEn`, `bodyEn` (Tiptap secundar).
6. Click „Salvează schița". Aștept 1–2s.
7. URL se schimbă la `/revista/:slug/editare`.
8. Reîncarcă pagina. Toate câmpurile EN repopulate.
9. **Network**: POST `/api/revista/articles` (sau PATCH la update)
   conține `titleEn`, `excerptEn`, `bodyEn`, `bodyHtmlEn`.

### B2. Clearance EN body (Tiptap)

1. În același articol, șterge tot conținutul din EN body editor.
2. Click „Salvează schița".
3. Reîncarcă. EN body apare gol.
4. Verifică în DB (opțional): `articles.body_en` + `body_html_en` = NULL
   pe rândul respectiv. `titleEn`/`excerptEn` rămân așa cum erau.

### B3. Publish + verificare detail-side

1. Articol cu RO complet + EN doar `titleEn` populat. Click „Publică".
2. Vizitează `/revista/:slug` → vezi titlu RO, excerpt RO, body RO.
3. Vizitează `/en/revista/:slug` → **EN read-side resolution NU e încă
   implementată** (e M18 work — `findBySlug` rămâne RO-only până când
   rewrite-ul revista detail intră în pass pixel-perfect). Acceptabil
   în M17 — datele EN sunt salvate corect pe articole, doar nu sunt
   afișate per locale încă. Documentat ca _Known limitation_ mai jos.

### B4. Body EN folosește image uploader RO

1. În editor EN body, click butonul „Insert image" din Tiptap toolbar.
2. Upload o imagine (jpg/png/webp).
3. Imaginea apare în EN body. Aceeași pipeline ca RO (img attach pe
   articol).
4. Salvează + reîncarcă: imaginea persistă în EN body.

## H. Tezaur detail sprite swap (`<commit hash>`)

### H1. Breadcrumb back arrow

1. Navighează la `/tezaur` → click pe orice gear → ajungi la detail.
2. **Inspect element** pe „← Înapoi la listă" link din breadcrumb.
3. Verifică: SVG inline `<svg><use href="#i-back"/></svg>` (NU mai e
   `<sz-icon>` Angular component).
4. Vizual: săgeata back arată identic cu V05 (sprite global v05).
5. Click → întoarcere la listă funcționează.

### H2. Restul componentelor Sz neatinse

1. Pe aceeași pagină detail, verifică prezența:
   - 3× `<sz-badge variant="pill">` în `.td-info__tags` (type, category,
     vintage).
   - `<sz-avatar>` pe fiecare review (tab Recenzii).
   - `<button sz-button>` în formurile review submission.
2. Toate trebuie să fie funcționale, neschimbate vizual față de pre-M17.

## K. Mobile drawer parity (`<commit hash>`)

### K1. Drawer arată „Contribuții Tezaur"

1. Pe mobile (< 640px viewport), click avatar/burger din topbar.
2. Drawer se deschide din dreapta.
3. Verifică ORDINE itemi:
   - „Setări" → `/cont/setari`
   - „Anunțurile mele" → `/cont/anunturi`
   - **„Contribuții Tezaur" → `/cont/contributii-tezaur`** ← NOU
   - „Trimite feedback"
   - (admin) „Dashboard"
   - „Logout"
4. Click „Contribuții Tezaur" → drawer se închide + navigare la
   `/cont/contributii-tezaur`.

### K2. Parity cu account-menu dropdown desktop

1. Pe desktop (> 640px), click avatar → account-menu dropdown.
2. Verifică aceleași itemi în aceeași ordine.
3. Drawer mobile + dropdown desktop = parity 100%.

## L. Contribuții-tezaur verify (no-op cod)

### L1. Pagina folosește namespace V08 deja

1. Loghează-te. Navighează la `/cont/contributii-tezaur`.
2. **Inspect element** pe orice rând din strip (statistici).
3. Confirmă clase: `.cn-strip`, `.cn-strip__cell`, `.cn-strip__k`,
   `.cn-strip__v`. Toate aliniate cu V08 design.
4. Pe rândurile din tabel: `.cn-tbl`, `.cn-gear`, `.cn-gear__brand`,
   `.cn-gear__model`, `.cn-stat`. Toate aliniate.
5. Pe moderator view (dacă ai rol curator/admin): `.mod-card`,
   `.mod-card__head`, `.mod-card__actions`, `.mod-btn`. Aliniate.

### L2. Feature-uri V08 lipsă (notate ca known limitations)

V08 design include features pe care pagina noastră NU le are încă:
- **Paginare** (`.cn-pager` / `.cn-pager__ctrls`) — toate rândurile se
  încarcă într-o singură pagină acum (acceptabil cât timp un user are
  sub 50 de contribuții).
- **Column sorting** (`.is-sortable` / `.is-sorted`) — tabelul nu poate
  fi sortat din UI.
- **Active cell highlight** (`.cn-strip__cell is-active`) — strip-ul
  arată toate statisticile cu același styling.
- **Pagination ellipsis** (`.is-dots`) — nu există paginație → N/A.

Toate cad în pass pixel-perfect M18 + features ulterioare.

## Regression smoke

1. **Build**: niciun warning nou față de baseline (bundle initial
   warning ~23 kB e pre-existent).
2. **Theme switch**: dark/light pe orice pagină rescrisă (`/tezaur/adauga`,
   `/revista/nou`, `/tezaur/<slug>`). Nicio regresie vizuală majoră.
3. **Locale switch**: RO ↔ EN funcționează. EN bundle servește traducerile
   ce există + fallback RO pentru chei lipsă (verificat în M16).
4. **Forms (Tezaur add + Revista editor)**: auto-save / save manual /
   submit toate funcționale. Niciun toast de eroare neașteptat.
5. **Mobile drawer**: nu rupe pe < 640px. Touch funcționează.
6. **Tezaur detail**: nu apar erori în console după swap-ul SzIcon →
   sprite. Toate cele 6 tab-uri se randează.

## Known limitations din M17 (pentru M18)

- **Revista detail EN read-side resolution** — `articles.service.findBySlug`
  nu citește încă din `title_en`/`body_en` per locale. Datele se salvează
  corect (B verified), dar `/en/revista/:slug` afișează tot RO. Fix vine
  cu rewrite-ul revista detail în M18.
- **Forum 4 pages structural rewrite** — markup actual e fundamental
  diferit de design V05 (`.ft-crumbs/.ft-header/.ft-source/.ft-master`
  vs `.ft-sticky/.ft-main/.ft-op/.fr-trust/.fr-pag`). Pass-ul 1:1 e
  M18.
- **Cont 3 shells (.acc-*)** + **My-listings (.am-*)** — clasele V08
  lipsesc din CSS. Adoptare = pixel-perfect work cu CSS nou + markup
  nou. M18.
- **„Articolele mele" ca pagină dedicată revista author** — V08 design
  o include, dar nu există endpoint backend pentru „list my published
  articles". Feature nou = M18.
- **Tezaur detail SzBadge/Avatar/Button** — păstrate intenționat
  (decizia M13-D). Replace global = overkill fără pass pixel-perfect.
  M18.

## Critical paths to verify in production after deploy

- Loghează-te → mergi la `/tezaur/adauga` → completează RO + EN minim →
  draft auto-save → reîncarcă → restore complet.
- Loghează-te → `/revista/nou` → completează RO + EN → save draft →
  publish → vezi articolul publicat (RO render).
- Mobile width → avatar → drawer → click „Contribuții Tezaur" → ajunge la
  pagină.
- Orice gear detail (`/tezaur/<slug>`) → breadcrumb back arrow vizibil
  și funcțional.
