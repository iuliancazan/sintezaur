# M16 — Plan de testare manual (bilingual platform RO/EN)

Site-ul devine bilingv: păstrăm RO ca limbă implicită, adăugăm un
spațiu URL `/en/...` mirror + un selector RO/EN în topbar care
comută conținutul live. Forum-ul și Bazar-ul rămân în limba
utilizatorilor (UGC), DOAR chrome-ul + Tezaur taglines + Revista
articles + Legal pages se traduc.

**Convenții:**
- 📁 Local = stack-ul rulează cu `pnpm api` + `pnpm worker` + `pnpm site` + `pnpm dashboard`.
- ☁️  Prod = Coolify cu env-urile populate.
- ✅ = test trecut. ❌ = bug, deschide PR de fix.

Înainte de orice test, rulează migrațiile pe DB ținta (`pnpm migrate` sau
`pnpm migrate:prod`) — M16-A introduce `0017_bilingual_columns.sql` și
postflight-ele `9017_forum_seed_categories_en.sql` +
`9018_bilingual_search_vectors.sql`.

---

## 1. Schema (M16-A)

### 1.1 Coloane noi prezente

Pe DB-ul țintă:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name IN ('gear','articles','legal_pages','users','forum_categories')
  AND column_name LIKE '%en%' OR column_name = 'preferred_locale';
```

Așteaptă cel puțin:
- `gear.tagline_ro`, `gear.tagline_en`
- `articles.title_en`, `articles.excerpt_en`, `articles.body_en`, `articles.body_html_en`
- `legal_pages.title_en`, `legal_pages.body_md_en`, `legal_pages.meta_description_en`
- `users.preferred_locale` (NOT NULL, default `'ro'`)
- `forum_categories.name_en`, `forum_categories.description_en`

### 1.2 Seed EN pentru categoriile forum

```sql
SELECT key, name, name_en FROM forum_categories ORDER BY position;
```

Cele 8 categorii trebuie să aibă `name_en` populat (ex.
`productie → Production`, `tezaur_intrebari → Tezaur — Questions`).

### 1.3 search_vector_en pe articles

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'articles' AND column_name = 'search_vector_en';
```
Și verifică index-ul:
```sql
SELECT indexname FROM pg_indexes
WHERE tablename = 'articles' AND indexname = 'articles_search_vector_en_idx';
```

---

## 2. URL prefix `/en/` (M16-B)

### 2.1 Rută EN funcțională

1. `https://sintezaur.ro/en/tezaur` — randează lista Tezaur identic
   cu RO, doar chrome-ul în engleză.
2. `https://sintezaur.ro/en/bazar` — listă bazar, chrome EN, anunțuri
   păstrează RO (UGC).
3. `https://sintezaur.ro/en/cont/setari` — pentru user logat, redirect-uri
   relative funcționează în interiorul shell-ului EN.
4. `https://sintezaur.ro/en/blabla` (URL inexistent) — randează 404.

### 2.2 Detecție inițială locale

1. Browser în Incognito, fără cookie `sz_locale`:
   - `/` → randează RO (default)
   - `/en/` → randează EN
2. După ce comuți manual la EN (vezi 3.1), revin acasă `/`:
   - URL rămâne `/` (RO) — nu redirectează automat la `/en`
3. După un click pe „RO" în switcher pe `/en/tezaur`:
   - Navighează la `/tezaur` (locale-aware switch via `LocaleService.setLocale`)

### 2.3 `<html lang>` se sincronizează

Pe DevTools → Elements:
- Pe `/`, `<html lang="ro">`.
- Pe `/en/`, `<html lang="en">`.
- După comutare manuală, atributul se actualizează fără refresh.

---

## 3. Language switcher (M16-C)

### 3.1 Desktop

1. Topbar dreapta sus între temă și avatar: buton mic mono cu eticheta
   `RO` (pe RO) sau `EN` (pe EN). Tooltip-ul (title attribute) zice
   „Switch to English" sau „Comută în română".
2. Click → URL se schimbă cu/fără prefix `/en` păstrând restul căii.
3. Conținutul chrome-ului se actualizează în 1-2s (timpul de fetch al
   bundle-ului `en.json` / `ro.json`).
4. Cookie `sz_locale=en` setat după click pe „EN".

### 3.2 Mobile (≤ 640px)

1. Burger panel → grup nou „Limbă / Language" cu segmented control RO/EN
   identic vizual cu Tema (Auto/Lumin./Întun.).
2. Tap pe `EN` → panoul se închide + URL se schimbă.

### 3.3 Persistență logat vs anonim

Notă: `users.preferred_locale` e doar în DB acum, NU se actualizează
automat la setLocale. Va fi cablat în M16-F sau ulterior — în acest
moment cookie-ul `sz_locale` e singura persistență. Anonimul +
logat-ul se comportă identic.

---

## 4. en.json bundle (M16-D)

### 4.1 Chrome tradus

1. Pe `/en/tezaur`:
   - Topbar nav: `Home · Tezaur · Bazar · Revista · Forum` (notează că
     Tezaur/Bazar/Revista rămân nume proprii brand)
   - Buton signup/login: `Sign up` / `Log in`
   - Footer: „Built in Bucharest" etc.
2. Pe `/en/cont/setari`:
   - Tab strip: `Profile · Password · Email · My data · Notification
     preferences · Blocked users`
   - Headerul: „Settings"
3. Avatar dropdown EN: `Settings, My listings, Send feedback, Log out`.

### 4.2 Fallback RO pentru chei netraduse

1. Pe `/en/tezaur/adauga` (pagină contribuitor):
   - Tab-ul de form (Identificare, Imagini, Descriere, Specs etc.)
     afișează încă în RO — pagina nu e tradusă în bundle EN
     (planificat M16-F).
   - **Nu** trebuie să apară chei brute (`tezaur.add.section.identification`),
     ci copy-ul RO. Confirmă că degradarea e curată.

---

## 5. API per-locale (M16-E)

### 5.1 HTTP interceptor injectează `?locale=`

DevTools → Network tab, pe `/en/tezaur/korg-ms-20`:
- Request: `/api/tezaur/korg-ms-20?locale=en` (nu doar
  `/api/tezaur/korg-ms-20`).
- Pe `/tezaur/korg-ms-20`: `?locale=ro`.

### 5.2 Tezaur detail returnează lang-aware

1. Vizitează `/tezaur/<slug-cu-doar-RO>` — răspunsul JSON
   (`Network → Preview`) are:
   ```
   description: { ..., lang: 'ro', isTranslated: true }
   tagline: { value: '...', isTranslated: true }
   ```
2. `/en/tezaur/<același-slug>` — `isTranslated: false` pe description
   (fallback la RO) și pe tagline.
3. După ce un curator populează `taglineEn` (M16-F sau prin SQL
   manual), `/en/tezaur/...` → `tagline.isTranslated: true`.

### 5.3 Legal pages

1. Pe `/en/termeni` (după dashboard editor populează EN — sau cu SQL
   manual `UPDATE legal_pages SET title_en='Terms' WHERE slug='termeni'`):
   - JSON: `{ title: 'Terms', isTranslated: true, lang: 'en' }`
2. Fără EN populat: `{ title: 'Termeni' (RO), isTranslated: false, lang: 'ro' }`.

---

## 6. Legal pages dashboard EN (M16-H)

### 6.1 Editor

1. Pe `/dashboard/legal`, click „Editează" pe orice rând.
2. Sub formularul RO există secțiunea colapsabilă
   `🇬🇧 English translation (optional)`.
3. Click pe summary → se expandează cu 3 câmpuri: Title (EN), Meta
   description (EN), Body (Markdown, EN).
4. Lasă goale și salvează → no change la EN columns (rămân NULL).
5. Populează toate trei → salvează → revine pe pagina publică
   `/en/termeni` (sau slug-ul editat) → vezi conținutul EN.
6. Șterge body_md_en (lasă gol) și salvează → coloana revine la NULL,
   `/en/termeni` revine la RO fallback.

---

## 7. Hreflang + sitemap (M16-J)

### 7.1 Sitemap

1. `https://sintezaur.ro/sitemap.xml` — verifică:
   - `xmlns:xhtml` în declarația `<urlset>`.
   - Fiecare `<url>` are 3 `<xhtml:link rel="alternate"
     hreflang="...">`: `ro`, `en`, `x-default`.
   - URL-urile sunt prezente în AMBELE versiuni (RO bare +
     `/en/...`) — adică sitemap-ul are dublu numărul de URL-uri față
     de înainte de M16.

### 7.2 `<link rel="alternate">` în head

1. Pe `/tezaur/korg-ms-20` (DevTools → Elements → `<head>`):
   - `<link rel="canonical" href="https://sintezaur.ro/tezaur/korg-ms-20">`
   - `<link rel="alternate" hreflang="ro" href="https://sintezaur.ro/tezaur/korg-ms-20">`
   - `<link rel="alternate" hreflang="en" href="https://sintezaur.ro/en/tezaur/korg-ms-20">`
   - `<link rel="alternate" hreflang="x-default" href="https://sintezaur.ro/tezaur/korg-ms-20">`
2. Pe `/en/tezaur/korg-ms-20`:
   - `canonical` arată spre URL-ul EN.
   - Alternates ro/en/x-default identice cu sus.

### 7.3 og:locale flips

1. Pe `/en/`, `<meta property="og:locale" content="en_US">` +
   `<meta property="og:locale:alternate" content="ro_RO">`.
2. Pe `/`, ordine inversă.

---

## 8. Search bilingv (M16-I)

### 8.1 Recall pe EN

Pre-cond: un articol Revista cu `body_html_en` populat (manual via SQL,
că M16-G nu a livrat editorul).
```sql
UPDATE articles SET
  title_en = 'My EN synth review',
  excerpt_en = 'A review of the new wavetable synthesizer.',
  body_html_en = '<p>This wavetable synthesizer ships with...</p>'
WHERE slug = '<test-article-slug>';
```

1. Pe `/en/cautare?q=synthesizer` — articolul EN apare în secțiunea
   Revista.
2. Pe `/cautare?q=sintetizator` — același articol apare prin
   matching-ul RO (`search_vector` indexează `title` RO original).
3. Pe `/cautare?q=wavetable` — articolul apare prin EN vector
   (RO body nu menționează „wavetable").
4. Articolul **fără** EN populat continuă să apară doar prin RO.

### 8.2 Tezaur / Bazar / Forum

Search rămâne RO-only pe acestea în M16 — nu testa EN search aici.

---

## 9. Regresie

- [ ] `/cont` (RO) → tot redirectează la `/cont/setari/profil` (M10).
- [ ] `/en/cont` → redirectează la `/en/cont/setari/profil`.
- [ ] Bazar listing detail: anunțul postat de un user în RO continuă
      să apară în RO și pe `/en/bazar/<slug>`. Doar chrome-ul în EN.
- [ ] Forum thread: același — corpul postului rămâne în RO/EN-ul
      autorului. Chrome-ul (butoane „Răspunde" → „Reply") se traduce.
- [ ] Notifications panel pe clopoțel: kind labels în EN pe `/en/`.

---

## 10. Known limitations (deferred / out of scope M16)

- **Tezaur dashboard form bilingual (M16-F):** contributor add page
  încă scrie doar `tagline_ro` (via specs.tagline legacy) și un singur
  body. EN tagline + EN body trebuie populate manual pe DB până aici.
- **Revista editor bilingual (M16-G):** inline Tiptap secundar pentru
  EN body, plus `title_en` + `excerpt_en`, nu există.
- **Gear descriptions per-locale FTS:** `gear_descriptions.search_vector`
  folosește `sintezaur_ro` config pentru ambele lang-uri. EN content în
  această tabelă va fi stemmat cu reguli RO până se face migrația
  CASE-based.
- **Persistență `users.preferred_locale`:** câmpul există dar nu se
  actualizează când userul logat comută limba. Implementare în M16-F
  sau ulterior — acum doar cookie-ul `sz_locale`.
- **Email-uri tranzacționale EN:** templates rămân RO. Va fi
  implementat când avem un volum semnificativ de utilizatori EN.
