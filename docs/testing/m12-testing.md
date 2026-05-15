# M12 — Plan de testare manual (dashboard design import v04)

Re-skin complet al app-ului `apps/dashboard` după
`docs/design-imports/2026-05-16-v04`. Shell nou (sidebar +
topbar admin), pagini noi (Dashboard overview, User Edit),
re-skin Users list pe PrimeNG, density + theme toggles, plus
fallback global pentru paginile fără design dedicat (Tezaur,
Bazar, Revistă, Forum-queue, Rapoarte, Badges, Audit log,
Currency rates, Storage, Legal, Contact messages, Feedback).

**Convenții:**
- 📁 Local = `pnpm api` + `pnpm dashboard` (`http://localhost:4201`).
- ☁️ Prod = `https://admin.sintezaur.ro` (sau ruta de admin
  din Coolify).
- ✅ = test trecut. ❌ = bug, deschide PR de fix.
- Logat ca **superadmin** unde apar opțiuni gated (admin grant /
  superadmin grant).

> 🔧 Pre-test: `pnpm seed:superadmin` în container, ca să ai un
> cont admin valid. Vezi `tools/scripts/create-superadmin.ts` +
> env `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` /
> `SUPERADMIN_FULL_NAME` (sau legacy `FIRST_ADMIN_*`).

---

## 1. Shell admin (sidebar + topbar)

### 1.1 Sidebar — render + active state

1. Login → ești redirectat la `/` (Dashboard overview).
2. Sidebarul stâng arată 4 grupe cu „// " prefix accent:
   **Operare**, **Conținut**, **Sistem**, **Altele**.
3. Itemul `Dashboard` are bara accent stânga (`is-active`) când
   ești pe `/`.
4. Navighează la `/useri` → bara accent se mută pe `Useri`,
   `Dashboard` revine la normal.
5. Brand-ul de sus deschide `https://sintezaur.ro` în tab nou.

### 1.2 Sidebar collapse

1. Click pe **Restrânge** (footer sidebar) → sidebarul se
   restrânge la 64px, iconițele rămân, etichetele dispar.
2. Reîncarcă pagina → starea persistă (localStorage
   `sintezaur-admin-side=1`).
3. Click din nou → revine la 240px, persistă inversul.

### 1.3 Top bar — search, notif, theme, density, external, avatar

1. Sus se afișează input-ul search cu placeholder „Caută user,
   gear, listing…" + kbd ⌘K. **Vizual only** în M12; nu navighează.
2. Click pe **clopoțel** → nu face nimic (placeholder M12);
   dot-ul de warn rămâne vizibil ca pre-vizualizare.
3. Click pe iconița soare/lună → tema se schimbă instant
   (light ⇄ dark). HTML attribute `data-theme` se actualizează.
   Reîncărcare → persistă (localStorage `sintezaur-theme`).
4. Click pe iconița density → ciclează compact → comfortable →
   spacious. Dot-ul mic din colț urcă/coboară. Tooltip-ul reflectă
   starea curentă în română.
   Reîncărcare → persistă (localStorage `sintezaur-admin-density`).
5. Click pe iconița external (săgeată-ieșire) → deschide
   `https://sintezaur.ro` în tab nou.
6. Click pe **avatar** (dreapta sus) → logout + redirect `/login`.
   Tooltip-ul arată „Deconectează &lt;nume&gt;".

### 1.4 Tema default

1. Browser nou / incognito → la primul load, HTML are
   `data-theme="light"`. UI-ul apare pe fond crem cald.
2. Toggle la dark → fundalul devine slate cool, font-ul rămâne
   citibil în ambele.
3. Compară cu site-ul public (alt tab) — site-ul rămâne pe
   tokenii vechi (hex), dashboard-ul are tokenii oklch noi.
   **Nu trebuie** să existe leakage: a edita tema în dashboard nu
   schimbă temele pe site.

---

## 2. Dashboard overview (`/`)

### 2.1 Render

1. Pe `/` apare:
   - Eyebrow `// /admin`
   - Titlu „Dashboard"
   - Sub-titlu cu „ultima actualizare acum…"
   - Buton **Reîmprospătează** + **Acțiune rapidă**
2. Stat-strip 6 carduri (Utilizatori activi, Listings active,
   Articole publicate, Threaduri active, Rapoarte open,
   Tranzacții confirmate). Valorile sunt `—` (placeholder M12),
   delta este `flat` și gri. Cardul „Rapoarte open" arată corner
   „acțiune" + valoarea în accent.
3. Trei alert-uri (danger, warn, info) cu CTA pe drepta:
   *Rezolvă acum / Actualizează / Vezi useri*. Click pe fiecare
   → navighează la `/rapoarte`, `/currency-rates`, `/useri`.
4. Două coloane:
   - **Activitate recentă** — placeholder cu un row de info.
     Butonul „Deschide audit log complet →" navighează la
     `/audit-log`.
   - **Acțiuni rapide** + **Pulse pe secțiuni** — 4 link-uri
     fiecare către `/tezaur/new`, `/revista`, `/currency-rates`,
     `/rapoarte` + 4 row-uri cu Tezaur / Bazar / Revistă / Forum.

### 2.2 Density răspuns

1. Schimbă density la **compact** → strip-ul de stat-uri se
   îngustează, font-ul scade ușor, padding-urile cardurilor scad.
2. Density **spacious** → padding-urile cresc, font-ul stat__num
   se mărește la 62px.

### 2.3 Refresh button

1. Click pe **Reîmprospătează** → sub-titlul se schimbă în
   „reîmprospătat acum".

---

## 3. Useri list (`/useri`)

### 3.1 Render

1. Breadcrumb sus: `Admin / Useri` (Admin = link la `/`).
2. Titlu „Useri" + sub-titlul cu totalul real din DB
   (`{{ totalCount }} useri înregistrați`).
3. **Filter bar** sticky sub topbar — input search + 4 select-uri
   disabled (Rol / Trust / Status / Înregistrat) + buton **Reset**.
4. **Bulk strip** apare doar când selecția nu e goală.
5. Tabelul PrimeNG arată coloanele: ✔ User Email Rol Trust
   Member-since Status Acțiuni.
6. Pagina rulează pe noul preset CSS (`.tbl`, `.bdg`, `.tbl__check`).

### 3.2 Selecție rânduri

1. Click pe checkbox-ul unui rând → rândul devine selectat
   (fundal warm), bulk strip apare cu „**1** useri selectați".
2. Selectează încă 2 → strip arată „**3** useri selectați".
3. Click pe checkbox-ul din header → toate rândurile vizibile
   se selectează (`is-mixed` → `is-on`).
4. Click din nou → toate se deselectează.
5. Click pe ❌ din strip → bulk-ul se închide, selecția se
   golește.

### 3.3 Filter + paginare

1. Tastează „admin" în search → după 300ms debounce, lista se
   filtrează server-side prin `/admin/users?q=admin`.
2. Click pe **Reset** → search se golește, lista revine completă,
   page resetează la 1.
3. Schimbă page-size la 100 → tabel se re-fetch-uiește, totalul
   rămâne.
4. Click „›" pe paginator → page 2 se încarcă lazy.

### 3.4 Naviga la User Edit

1. Click pe iconița `⋯` (more) din ultima coloană → navighează
   la `/useri/:id`.
2. Iconița deschisă într-un tab nou cu middle-click — funcționează
   (routerLink standard).

---

## 4. User Edit (`/useri/:id`)

### 4.1 Render

1. Breadcrumb: `Admin / Useri / @username` + short ID pe dreapta.
2. Header cu titlu `@username` + badge-uri: trust + status
   active + roluri.
3. Sub-titlu cu nume + „membru de N luni".
4. Save bar sticky sub topbar — în starea curată afișează
   „Sincronizat" cu dot verde și animație stinsă; butonul
   **Anulează** + **Salvează** sunt disabled.
5. 4 tab-uri: **Profil** (activ), **Activitate**, **Audit log**,
   **Mesaje raportate**.

### 4.2 Edit + Save

1. Pe tab **Profil**, editează `Display name` → save bar
   trece pe `is-dirty`, dot-ul pulsează, butoanele devin active.
2. Click **Anulează** → revine la valoarea originală, save bar
   se curăță.
3. Modifică rolurile (click pe radio-card-uri) — card-urile
   active iau border accent + background warm-soft.
4. Click **Salvează** → backend `POST /admin/users/:id/roles` +
   `DELETE` pentru cele revocate; după success, save bar revine
   pe `is-clean`.
5. **Restricții superadmin:** ca admin (nu superadmin), nu poți
   selecta cardul `Admin` sau `Superadmin` — click pe ele e ignorat.
6. Reîncarcă pagina → rolurile noi persistă în badge-urile din
   header + în badge-urile din sidebar dreapta.

### 4.3 Tab-uri

1. Click **Activitate** / **Audit log** / **Mesaje raportate** —
   placeholder M12 (text explicativ). Save bar rămâne vizibil.
2. Click înapoi pe **Profil** — form-ul își menține valorile dacă
   nu ai salvat (signal in-memory).

### 4.4 Sidebar dreapta

1. Card avatar+name+statgrid (Member since / Roluri / Email
   verified / Trust level).
2. Card „Linkuri rapide" — 3 link-uri: Listings, Audit log,
   Profil public. Acel ultim deschide tab nou la
   `sintezaur.ro/u/:username`.
3. Card **Danger zone** roșu cu Ban + GDPR delete. Butoanele
   sunt **disabled în M12** (backend nu acceptă încă).

---

## 5. Login page (`/login`)

### 5.1 Render

1. Layout centrat pe pagină completă, fără sidebar / topbar.
2. Card admin cu logo + „Sintezaur" + titlu „Autentificare" +
   sub-titlu mono.
3. Form: email + password, butonul **Conectează-te** wide,
   stilul `.btn.btn--primary`.

### 5.2 Flow

1. Email + parolă greșite → eroare pe banner mono roșu.
2. Logat ca user non-staff → redirect `/login?reason=not_staff`,
   apare eroarea „Cont fără acces la dashboard".
3. Logat corect ca admin → redirect `/` (Dashboard overview).

---

## 6. Pagini extrapolate (fallback)

Aceste pagini nu au design dedicat în v04, dar primesc shell-ul
nou + tokens noi prin reguli globale `main.admin { ... }` din
`apps/dashboard/src/styles.scss`. Verifică pentru fiecare:

- Tezaur (`/tezaur`, `/tezaur/new`, `/tezaur/:id/edit`)
- Bazar (`/bazar`)
- Revistă (`/revista`)
- Badges (`/badges`)
- Rapoarte (`/rapoarte`)
- Forum queue (`/forum-queue`)
- Audit log (`/audit-log`)
- Currency rates (`/currency-rates`)
- Storage (`/storage`)
- Legal (`/legal`)
- Mesaje contact (`/contact-messages`)
- Feedback (`/feedback`)

Pentru fiecare:

1. ✅ Sidebar-ul afișează item activ pe ruta curentă.
2. ✅ Conținutul nu se suprapune cu topbar-ul sticky.
3. ✅ Culorile sunt din noul set de tokens (cream în light, oklch
   slate în dark). Niciun fundal albastru / verde rămas.
4. ✅ Density toggle nu rupe layout-ul (cardurile pot avea
   padding mai mic în compact dar nu se sparge nimic).
5. ✅ Logout din topbar te trimite la `/login`.

Dacă o pagină arată „rupt" — text care iese din chrome, butoane
neclickabile etc. — notează și deschide ticket pentru iterația
M12 (re-skin pixel-perfect).

---

## 7. Regresii pe care le verificăm explicit

- ❌→✅ **Nesting `<main>`**: în M12 shell-ul rulează cu
  `<div class="main">` în loc de `<main>`, ca paginile vechi care
  încă au `<main class="admin">` să nu producă HTML invalid.
  Inspectează DOM-ul în Chrome → un singur `<main>` per pagină.
- ❌→✅ **Bug 401 login din productie**: după pași 4.x, login-ul
  trebuie să funcționeze cu credențiale corecte pe noua pagină.
  Vezi `tools/scripts/create-superadmin.ts` pentru bootstrap.
- ❌→✅ **Tema persistă între sesiuni**: schimbă tema, închide
  tab, reîntoarce-te → tema setată e încă activă.
- ❌→✅ **Site-ul public neafectat**: deschide
  `https://sintezaur.ro` în paralel cât testezi dashboard-ul —
  vizualul site-ului nu trebuie să se schimbe. Token-urile vechi
  din `libs/ui/src/lib/tokens/tokens.css` rămân intacte.

---

## 8. Build / smoke

- `pnpm exec nx build dashboard --skip-nx-cache` → ✅ trece
  (1.28 MB bundle initial; warning preexistent „bundle exceeded
  budget" rămâne, nu e parte din M12).
- `pnpm exec nx typecheck dashboard` → ✅ trece.
- `curl -sI http://localhost:4201` → 200.
- `curl -s http://localhost:4201 | grep data-theme` → vede
  `data-theme="light"` în răspuns.
