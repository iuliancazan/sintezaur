# M10 — Plan de testare manual (post-launch UX iteration #1)

Reorganizarea suprafeței `/cont` în topbar nou (avatar dropdown,
favorite, mesaje, burger mobile) + trei tab-shell-uri:
`/cont/setari`, `/cont/favorite`, `/cont/mesaje`. Cele 12 link-uri
din vechea pagină `/cont` au dispărut.

**Convenții:**
- 📁 Local = stack-ul rulează cu `pnpm api` + `pnpm worker` + `pnpm site` + `pnpm dashboard`.
- ☁️  Prod = Coolify cu env-urile populate.
- ✅ = test trecut. ❌ = bug, deschide PR de fix.
- Logat ca **superadmin** unde se cere autentificare specială.

---

## 1. Topbar avatar dropdown (M10-A)

### 1.1 Avatar fallback cu inițiale colorate

1. Logat ca user fără poză profil — în dreapta sus, locul fostului
   buton `CONT` afișează un pătrat cu 1–2 inițiale.
2. Culoarea de fundal e generată determinist din `user.id` — același
   user vede aceeași culoare la fiecare login, din orice browser /
   device.
3. Testează cu un al doilea cont — culoarea trebuie să fie diferită.
4. Setează `avatarUrl` pe profil → la refresh, avatarul afișează
   poza, nu inițialele.

### 1.2 Deschidere meniu + click-outside

1. Click pe avatar → se deschide meniul flotant sub el.
2. Click în afara meniului → se închide.
3. Apasă `Esc` → se închide.
4. Click pe clopoțelul de notificări cât meniul e deschis → meniul
   contului se închide și se deschide panoul de notificări (sunt
   mutually exclusive).

### 1.3 Item-uri role-gated

1. Ca **user obișnuit**: vezi „Setări", „Anunțurile mele",
   „Trimite feedback", „Ieși din cont". **Nu** vezi „Dashboard".
2. Ca **admin** sau **superadmin**: vezi în plus item-ul „Dashboard"
   care deschide `https://admin.sintezaur.ro` într-o navigare
   normală (rel="noopener").
3. Click pe „Trimite feedback" → meniul se închide și se deschide
   modalul de feedback.
4. Click pe „Ieși din cont" → te delogă și te trimite pe `/`.

---

## 2. Iconițe ❤️ ✉️ + burger mobile (M10-B)

### 2.1 Desktop (≥ 641px)

1. Logat — în topbar apar (de la stânga): 🔍 🔔 ❤️ ✉️ tema 👤.
2. Click ❤️ → navighează la `/cont/favorite/anunturi`.
3. Click ✉️ → navighează la `/cont/mesaje/bazar`.
4. Delogat — ❤️ ✉️ și burger-ul dispar.

### 2.2 Burger mobile (≤ 640px)

1. Redimensionează la mobil (sau folosește simularea din DevTools).
2. În topbar: 🔍 🔔 👤 ☰. Iconițele ❤️ ✉️ și theme toggle-ul nu
   mai sunt vizibile inline.
3. Click ☰ → se deschide din dreapta un panou cu:
   - Profil user (avatar nu, dar nume + email) → click duce la
     `/cont/setari`.
   - „Favorite", „Mesaje" — scurtături.
   - Theme toggle (3 butoane).
   - „Setări", „Anunțurile mele", „Trimite feedback",
     („Dashboard" pentru admin/superadmin), „Ieși din cont".
4. Click pe backdrop sau apasă `Esc` → panoul se închide.
5. Avatarul ✕ funcționează și pe mobil — îl atingi, se deschide
   dropdown-ul desktop. Cele două sunt redundante intenționat,
   user-ul are mai multe căi spre setări.

---

## 3. /cont/setari (M10-C)

### 3.1 Tab strip

1. Navighează la `/cont/setari` → te redirecționează la
   `/cont/setari/profil` (prima tab).
2. Tab strip: Profil · Parolă · Email · Datele mele · Preferințe
   notificări · Utilizatori blocați. Tab-ul activ are linie
   accent sub el.
3. Click pe fiecare tab → URL se schimbă, conținutul se schimbă,
   chrome-ul (titlu „Setări", greeting) rămâne.
4. Pe mobil, dacă tab-urile depășesc lățimea, scroll orizontal
   în tab strip.

### 3.2 Redirect-uri vechi

1. `/cont/profil` → `/cont/setari/profil` (verifică în adresă).
2. `/cont/parola` → `/cont/setari/parola`.
3. `/cont/email` → `/cont/setari/email`.
4. `/cont/date` → `/cont/setari/date`.
5. `/cont/preferinte` → `/cont/setari/preferinte`.
6. `/cont/blocuri` → `/cont/setari/blocuri`.

### 3.3 Tab-ul Parolă și Email (embedded auth shell)

1. În tab-ul Parolă, formularul NU mai are logo „SINTEZAUR" sus,
   nici link-ul „← Înapoi" jos, nici background full-page. E
   doar cardul cu formularul.
2. Idem Email.
3. Submisia funcționează ca înainte — schimbă parola / email-ul,
   ia mesajul de succes.

### 3.4 Tab-ul Datele mele (RGPD)

1. Click „Descarcă datele" → primește JSON cu cele 19 secțiuni
   (verificat în M9-E4).
2. Frază magică de delete cont → încă funcționează.

---

## 4. /cont/favorite (M10-D)

### 4.1 Tab strip

1. `/cont/favorite` → redirect la `/cont/favorite/anunturi`.
2. Tab-uri: Anunțuri · Căutări · Abonamente forum.
3. Conținut: Anunțuri salvate (heart), Căutări salvate (filtre
   bazar), Abonamente forum (thread-uri urmărite).

### 4.2 Redirect-uri vechi

1. `/cont/salvate` → `/cont/favorite/anunturi`.
2. `/cont/cautari-salvate` → `/cont/favorite/cautari`.
3. `/cont/abonamente` → `/cont/favorite/abonamente`.

### 4.3 Heart inline pe Bazar / Forum

1. Pe `/bazar/:slug`, click pe ❤️ pe un anunț → apare în
   `/cont/favorite/anunturi`. (Comportament neschimbat — doar
   ruta țintă s-a mutat.)

---

## 5. /cont/mesaje (M10-E)

### 5.1 Tab strip Bazar funcțional + Forum placeholder

1. `/cont/mesaje` → redirect la `/cont/mesaje/bazar`.
2. Tab-uri: Bazar · Forum.
3. Tab Bazar — inbox-ul existent: listă conversații, badge
   unread, click pe row → `/cont/mesaje/:threadId` (în interiorul
   shell-ului, tab-urile rămân vizibile sus).
4. Tab Forum — mesaj „În curând" cu explicația că forum-ul nu
   are PM-uri private încă și că vor fi unificate în viitor cu
   Bazar.

### 5.2 Compat thread URL

1. `/cont/mesaje/<thread-id-valid>` (URL trimis prin notificare
   email sau bell) — duce direct pe thread, în shell.
2. Linkurile interne (`/bazar/:slug` → „Mesaje", row click în
   inbox, notification bell → mesaj) toate funcționează.

### 5.3 Realtime

1. De pe alt browser/incognito, trimite un mesaj în threadul
   pe care îl vezi → mesajul apare live (socket.io neschimbat).
2. Inbox-ul (tab Bazar) actualizează badge-ul unread fără refresh.

---

## 6. Cleanup `/cont` (M10-F)

### 6.1 Pagina-grid retrasă

1. Navighează la `/cont` (fără sub-cale) → redirect la
   `/cont/setari` (URL final în bară).
2. Nu mai există grid cu 12 link-uri.
3. Codul `account-home.page.ts` nu mai există (verifică în
   `apps/site/src/app/account/`).

### 6.2 Bookmark-uri vechi

Verifică TOATE redirect-urile dintr-o singură rundă rapidă:

| URL vechi | Așteptat |
|---|---|
| `/cont` | `/cont/setari/profil` |
| `/cont/profil` | `/cont/setari/profil` |
| `/cont/parola` | `/cont/setari/parola` |
| `/cont/email` | `/cont/setari/email` |
| `/cont/date` | `/cont/setari/date` |
| `/cont/preferinte` | `/cont/setari/preferinte` |
| `/cont/blocuri` | `/cont/setari/blocuri` |
| `/cont/salvate` | `/cont/favorite/anunturi` |
| `/cont/cautari-salvate` | `/cont/favorite/cautari` |
| `/cont/abonamente` | `/cont/favorite/abonamente` |
| `/cont/mesaje` | `/cont/mesaje/bazar` |
| `/cont/mesaje/<id>` | `/cont/mesaje/<id>` (neschimbat) |
| `/cont/anunturi` | `/cont/anunturi` (neschimbat — „Anunțurile mele") |

---

## 7. Regresie — verificări scurte

- [ ] `/login` și `/signup` arată chrome-ul auth normal (logo +
      footer), NU embedded. (Confirmă că `embedded` mode se
      aplică doar pe change-password / change-email.)
- [ ] Notificările bell rămân funcționale (rămâne `showBell`
      input, badge etc.).
- [ ] Realtime socket.io pentru mesaje rămâne live.
- [ ] Dashboard (admin) — avatar topbar afișează inițiale, click
      pe avatar duce la `/` (comportament neschimbat).

---

## 8. Known limitations (out of scope pentru M10)

- Forum PMs: tab-ul „Forum" din `/cont/mesaje` e placeholder. Va fi
  implementat când Forum PM-urile sunt în spec.
- Unified inbox: planul e ca în viitor Bazar + Forum messages să
  apară împreună într-o listă, cu badge pe sursă. Acum sunt
  separate prin tab.
- Tezaur contributor flow (propune echipament, coadă moderare,
  auto-promote la 100 posturi) — M11.
