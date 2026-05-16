# M11 — Tezaur contributor flow · Testing

Manual testing plan pentru milestone M11 (sub-faze A–C). Convenție:
testarea se face la final pe stack-ul deployed pe Coolify, după ce
toate sub-fazele au fost livrate pe `main`.

**Commits aliniate:**

- M11-A `81ca503` — Backend (state enum + ME endpoints + admin moderare)
- M11-B `a8a9178` — Frontend add page (V06 form + auto-save + preview)
- M11-C `a98dfea` — Drafturile mele + meniu cont
- M11-D `_TBD_` — close milestone + acest doc

## 1. Foundation (M11-A — DB & API)

### Migration & schema

- [ ] DB pe prod a primit migration `0014_gear_moderation.sql`.
      Verifică în psql:
  ```sql
  SELECT enum_range(NULL::gear_state);
  -- → {draft,submitted,approved,rejected}
  SELECT column_name FROM information_schema.columns
    WHERE table_name='gear' AND column_name IN
      ('state','rejection_reason','submitted_at','reviewed_at','reviewed_by');
  -- → 5 rânduri
  ```
- [ ] Backfill aplicat: `SELECT state, COUNT(*) FROM gear GROUP BY state`
      arată toate rândurile pre-existente ca `approved` (acelea cu
      `published=true` la momentul migration-ului).
- [ ] Index-uri create: `\d gear` listează `gear_state_idx` și
      `gear_created_by_state_idx`.

### Endpoints — auth

- [ ] Cere `GET /api/me/tezaur/drafts` fără cookie de sesiune →
      răspuns 401 Unauthorized.
- [ ] Cere `POST /api/me/tezaur/gear` cu un user normal (fără rol
      curator) → 201 Created. Aceasta confirmă că nu mai e nevoie de
      rol `curator+` pentru contribuții (spec §7.2 unlock).
- [ ] Cu același user, `GET /api/me/tezaur/drafts` → lista include
      draftul tocmai creat.

### Ownership

- [ ] User A creează un draft (notează `gearId`).
- [ ] User B (alt cont) face `GET /api/me/tezaur/gear/<gearId>` →
      403 Forbidden ("Not your draft.").
- [ ] User B face `PATCH /api/me/tezaur/gear/<gearId>` → 403.
- [ ] User B face `POST /api/me/tezaur/gear/<gearId>/images` cu un
      fișier valid → 403.
- [ ] User A poate face oricare dintre operațiile de mai sus pe
      propriul draft → 200/201/204.

### State transitions

- [ ] User A apelează `POST /api/me/tezaur/gear/<gearId>/submit` pe
      un draft cu câmpuri incomplete (lipsesc brand sau imagini sau
      descriere) → 400 Bad Request cu body `{ message, missing: [...] }`.
      Verifică în coadă `missing` apare cu cheile lipsă (`brand`,
      `model`, `category`, `yearReleased`, `images`, `description`).
- [ ] Completează tot ce lipsește. Re-apelează submit → 204 No Content.
- [ ] `GET /api/me/tezaur/gear/<gearId>` returnează `state: 'submitted'`
      + `submittedAt` populat.
- [ ] `PATCH` pe același gear acum → 409 Conflict („Draftul nu mai
      poate fi editat (stare: submitted)").

### Admin moderation

- [ ] Login cu user cu rol `curator+` (sau `admin`).
- [ ] `GET /api/admin/tezaur/moderation` → lista include rândul
      submitted al user-ului A, sortată cronologic după `submittedAt`.
- [ ] `POST /api/admin/tezaur/gear/<gearId>/approve` → 204. În DB:
      `state='approved'`, `published=true`, `reviewedAt` populat,
      `reviewedBy` = id-ul curatorului.
- [ ] User A reîncarcă `/cont/contributii-tezaur` → rândul apare cu
      badge verde „publicat" și butonul „Vezi pagina →" funcționează
      navigând la `/tezaur/<slug>`.
- [ ] Creează încă un draft submit-uit. Cu curator: `POST .../reject`
      cu body `{ reason: "Lipsesc surse verificabile" }`. Răspuns 204.
      User A vede rândul cu badge roșu „respins" + textul motivului
      expandat dedesubt.

### Auto-suggest

- [ ] `GET /api/tezaur/meta/brands` (fără auth) → array de
      `{ name, count }` sortat după count desc, max 200. Cap pe
      lista de mărci publicate.
- [ ] `GET /api/tezaur/meta/families` (fără auth) → array de
      `{ id, slug, name }` sortat alfabetic.

## 2. Tezaur list button (M11-B intro)

### Toolbar layout

- [ ] Mergi la `/tezaur` (logged out). Toolbar are 4 coloane: search,
      sort, view, „Adaugă în Tezaur" CTA accent (verde/galben — cf.
      V06 design `.tez-add-btn`).
- [ ] Click pe „Adaugă în Tezaur" → guard te redirectează la
      `/login?redirect=%2Ftezaur%2Fadauga`.
- [ ] Login. Reîncarcă `/tezaur`. Click butonul → ajungi la
      `/tezaur/adauga`, pagina se încarcă, formul e vizibil.

## 3. Add page — core flow (M11-B)

### Header & layout

- [ ] Breadcrumb sus: „← Înapoi la Tezaur · Tezaur / Adaugă piesă nouă".
      Click pe primul link te duce la `/tezaur`.
- [ ] Header are 4 step-uri (01 identificare / 02 imagini & descriere
      / 03 specificații / 04 trimite). Pe load fresh, primul e
      `is-current`, restul `is-todo`.
- [ ] Layout pe desktop: 2 coloane mari — form stânga, sidebar lipit
      dreapta cu preview + meter + CTAs + tips.
- [ ] Mobile (<900px): sidebar se mută jos sub form, nu mai e sticky.

### Identificare (Pasul 01)

- [ ] Click pe input-ul Brand → dropdown se deschide cu „Branduri
      populare" + lista din DB (top 200 după count).
- [ ] Tastează „rol" → lista se filtrează la branduri care încep cu
      „Rol" (Roland etc.).
- [ ] Tastează „BrandComplet Nou" (nu există) → dropdown afișează
      „Adaugă „BrandComplet Nou" ca brand nou". Click pe item-ul de
      add → meniul se închide, input-ul reține textul.
- [ ] Click pe oricare opțiune existentă → input se populează cu numele
      brand-ului, meniul se închide.
- [ ] Sidebar `// preview-brand` se actualizează imediat la valoarea
      tastată.
- [ ] Tastează un Model → preview model se actualizează live.
- [ ] Click pe Categorie dropdown → vezi categoriile grupate pe
      „Sinteză & ritmică / Modular & control / Procesare & efecte /
      Studio & captură / Diverse". Selectează una → meniul se închide.
- [ ] Form factor: radio chips. Click pe „Keyboard" → check vizibil.
      Click pe „Desktop" → bifa se mută (singură selecție).
- [ ] Year released: tastează `2020` → preview year se actualizează la
      `2020`. Tastează ceva non-numeric → input rejectează.
- [ ] Family: combo cu auto-suggest la fel ca brand. Tastează „JUPITER"
      → vezi familiile existente. Tastează ceva nou → opțiunea
      „Creează seria „X"".
- [ ] MSRP: introdu un număr → unit „EUR" rămâne vizibil în input row.

### Auto-save

- [ ] După ce ai completat brand + model + categorie + an, așteaptă
      ~1.5s. Save status pill din sidebar trece prin
      „nesalvat → salvez… → salvat".
- [ ] URL-ul se schimbă în `?draft=<uuid>` (verifică în address bar).
- [ ] Refresh pagina. Conținutul revine — toate câmpurile sunt
      populate.
- [ ] Editează un câmp → save status devine „salvez…" după 1.5s →
      „salvat".

### Imagini (Pasul 02)

- [ ] Click pe „alege de pe disc" sau pe butonul „+" → file picker se
      deschide. Selectează 3 imagini PNG/JPG.
- [ ] Tile-urile apar cu numerotare 01/02/03. Prima tile are badge
      „cover".
- [ ] Drag-and-drop direct pe `.ta-drop` zone (din file manager) → la
      fel se urcă.
- [ ] Sidebar preview folosește imaginea 01 ca media de preview.
- [ ] Trage tile-ul 03 înainte de tile-ul 01 → numerotarea se
      reordonează (01 devine cea mutată, „cover" badge migrează).
      Refresh → reorder e persistat.
- [ ] Click pe X-ul de pe o tile → fișierul se șterge, numerotarea
      se reordonează.
- [ ] Încarcă încă tile-uri până la limita 12. Încearcă să adaugi a
      13-a → error message „Maxim 12 imagini per piesă.".
- [ ] Încarcă un fișier > 8 MB → error message lizibil despre upload
      eșuat.

### Descriere (Pasul 02)

- [ ] Tagline: o linie scurtă. Salvat în `specs.tagline`.
- [ ] Descriere lungă: 12-row textarea. Tastează 2 paragrafe separate
      cu o linie goală. Counter „X / 8000 caractere" se actualizează
      live.
- [ ] Auto-save propagă descrierea. Submit-uiește draftul → în DB,
      tabelul `gear_descriptions` are body Tiptap JSON cu 2 noduri
      `paragraph` și `bodyHtml = "<p>...</p><p>...</p>"`.

### Specificații (Pasul 03)

- [ ] Sub-secțiunea Sinteză: select „Tip sinteză" se deschide cu 11
      opțiuni (analog mono/poly/parafonic, virtual analog, hibrid,
      digital, FM, wavetable, modular voice, drone, other). Selectează.
- [ ] Polifonie numeric. Osc/voce numeric. Filter type free-text.
- [ ] Toggle „Arpeggiator" → label se schimbă „Da" ↔ „Nu".
- [ ] Sub-secțiunea Keyboard: toggle „Are clape?" → când e Nu,
      ar fi logic să ascunzi „Nr. clape" + „Aftertouch" (acum sunt
      vizibile mereu — păstrăm simplu, e ok).
- [ ] Sub-secțiunea Conectivitate: MIDI I/O chip-uri (6 opțiuni
      checkbox), audio out chip-uri (6 opțiuni). Click pe chip →
      checked vizual.
- [ ] Sub-secțiunea Fizic: greutate cu unit „kg", dimensiuni free,
      alimentare free.

### Relații (Pasul 03)

- [ ] Click „Adaugă relație" → row nou cu type=„Inspirat de" default.
- [ ] Selectează type, tastează brand „Roland", model „Juno-60",
      notă opțional.
- [ ] Pe blur, draftul încearcă să rezolve perechea via `/tezaur?q=`.
      Dacă „Roland Juno-60" e publicat în Tezaur, relația se atașează
      (verifică în DB: row în `gear_relationships`).
- [ ] Dacă tastezi brand+model care NU sunt în Tezaur → vezi un
      mesaj de eroare cu sugestia să rămână pentru curator.
- [ ] Click pe X-ul de pe row → row dispare; dacă era atașată,
      relația se șterge din DB.

### Linkuri (Pasul 03)

- [ ] Click „Adaugă link" → row nou.
- [ ] Selectează kind „Producător", label „Pagina oficială", URL
      „https://www.roland.com/global/products/jupiter-x/".
- [ ] Pe blur pe URL, link-ul se salvează (`POST .../links`).
      Verifică în DB că row-ul apare.
- [ ] Editează URL-ul → la blur, vechiul row se șterge și se creează
      altul (linkurile nu au PATCH; delete+recreate).
- [ ] Click pe X → row dispare, link-ul se șterge.

### Sidebar (live preview + meter + CTAs)

- [ ] Preview card: brand + model + an + primă imagine + max 4 tag-uri
      derivate din `synth_type` / `formFactor` / `num_keys` / `polyphony`.
- [ ] Completare meter: bar progress vizual cu procent. Pe rândul de
      mai jos vezi 9 item-uri cu ✓ verde sau · gri. Item-urile se
      bifează când criteriile sunt îndeplinite.
- [ ] CTAs row:
  - **Trimite la moderare →** disabled până când checklist-ul primele
    5 (brand+model, categorie, an, ≥1 imagine, descriere ≥80 char)
    sunt toate ✓.
  - **Salvează ca draft** funcționează oricând (skip-uiește debounce).
  - **Renunță & întoarce-te** afișează un browser confirm. Pe Yes →
    șterge draftul + navighează la `/tezaur`.
- [ ] Tips: 4 entries fixed, content informativ în RO (foto, sunet,
      surse, ce să lași gol).

### Submit la moderare

- [ ] După ce checklist-ul primele 5 sunt bifate, butonul „Trimite
      la moderare →" devine enabled (background accent).
- [ ] Click → state pill se schimbă „salvat → salvez…", apoi forma
      devine locked (opacitate redusă pe `.ta-sec__body`).
- [ ] Banner verde sus: „Trimis la moderare. Curatorul tezaurului
      vede acum piesa în coadă...".
- [ ] State badge din sidebar arată „trimis".
- [ ] Mergi la `/cont/contributii-tezaur` → rândul apare cu badge
      amber „trimis" + tag „⏳ în coadă de moderare" în loc de
      acțiuni.

## 4. Drafturile mele (M11-C)

### Lista

- [ ] Mergi la `/cont/contributii-tezaur` (sau click pe avatar dropdown
      → „Contribuții Tezaur").
- [ ] Cu zero contribuții: vezi empty state cu icon 📚 + lede + buton
      „+ Adaugă în Tezaur".
- [ ] Cu ≥1 contribuție: lista de rânduri.

### Per-state actions

- [ ] **Draft** — badge neutru. Click „Continuă editare →" → ajungi
      la `/tezaur/adauga?draft=<id>` cu draftul pre-loaded. Toate
      câmpurile sunt populate, prima imagine în preview, etc.
- [ ] **Submitted** — badge amber + „⏳ în coadă de moderare" în loc
      de acțiuni. Nu poți edita.
- [ ] **Approved** — badge verde + „Vezi pagina →" link la
      `/tezaur/<slug>`. Click → pagina publică de detaliu se încarcă.
- [ ] **Rejected** — badge roșu + motivul respingerii într-un callout
      sub rând. Acțiuni: „Continuă editare →" (forma se redeschide
      pentru re-edit) + „Șterge".

### Delete

- [ ] Pe un draft, click „Șterge" → browser confirm.
- [ ] Cancel → row rămâne.
- [ ] OK → row dispare din listă. Verifică în DB `SELECT * FROM gear
      WHERE id=<id>` → `deleted_at` populat (soft delete).

### Account menu

- [ ] Click pe avatar din topbar (logged-in). Dropdown apare.
- [ ] Item „Contribuții Tezaur" e vizibil între „Anunțurile mele" și
      „Feedback". Click → navighezi la `/cont/contributii-tezaur` +
      dropdown se închide.

## 5. Regression / smoke

### Existing flows still work

- [ ] `/tezaur` lista publică afișează doar gear-urile cu
      `state='approved'` (sau pre-M11 `published=true`). Nu apar
      drafts.
- [ ] `/tezaur/<slug>` pe un gear approved se încarcă normal.
- [ ] `/bazar/nou` (auth-required) merge — guard-ul nu e regresat.
- [ ] `/cont/anunturi`, `/cont/setari` etc. merg — nu am stricat ruta
      `/cont/*` cu noul child path.
- [ ] Login + logout funcționează (auto-save listează drafturi
      personalizate per user).

### Build budget

- [ ] Bundle size se încadrează în budget (warning 2-3 kB peste e
      acceptat momentan). Lazy chunk `tezaur-add-page` ~52 kB raw,
      `my-tezaur-drafts-page` mic (<20 kB).
- [ ] Nu apar erori de tipuri în console la încărcarea pages.

## 6. Known limitations & next steps

- **Tag chips** (Polifonic, Hibrid, Flagship etc.) — skipped pe M11
  per decizie spec interview. Doar `synth_type` ca dropdown. Pot fi
  adăugate ulterior într-un câmp `specs.tags: string[]`.
- **Video embed** (gear_videos) — endpoint admin există, nu e expus
  în contribuitor flow. Curatorul poate adăuga video-uri ulterior.
- **Tiptap real** în pagină de add — folosim textarea simplu și
  convertim la Tiptap minimal pe submit. Editorul Tiptap complet e
  rezervat pentru curator în dashboard.
- **Admin moderation dashboard UI** — endpoint-uri există
  (`/admin/tezaur/moderation` + approve/reject), dar UI-ul în
  dashboard pentru a vedea coada de moderare nu e încă livrat. Curator
  trebuie temporar să folosească ferestre directe REST sau să comită
  schimbarea prin endpoint-urile existente. UI-ul = polish pass viitor.
- **Tagline → preview** — în acest moment tagline-ul nu apare în
  preview card-ul sticky (preview e brand+model+year+thumb). Tagline e
  vizibil în pagina de detaliu publicată. Ne menținem aici.
- **Contributor role auto-promovare** la 100 forum posts — spec §7.2
  zice „contributor (auto la 100 posturi) ulterior unlock-uit". Acum
  orice user autentificat poate contribui — nu mai e nevoie de rol
  separat. Cap-ul de „contributor" rămâne neimplementat și se poate
  scoate din spec dacă pragmatic-ul ține.
