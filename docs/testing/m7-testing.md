# M7 — Plan de testare manual (storage refactor)

Pași de testat secvențial pe **local** (înainte de orice cutover) și
apoi pe **prod** (după ce R2 e configurat per `docs/devops/storage-r2.md`).
Toate testele presupun că ești logat ca **superadmin** (alte roluri
testate punctual).

**Convenții:**
- 📁 Local = `STORAGE_DRIVER=local` cu `pnpm migrate` + `pnpm api` + `pnpm site` + `pnpm dashboard` + `pnpm worker` toate pornite.
- ☁️  Prod = `STORAGE_DRIVER=s3` setat în Coolify, după redeploy.
- ✅ = test trecut. ❌ = bug, deschide PR de fix.

---

## 0. Preflight (rulezi o singură dată pe local)

```bash
# Aplicează migrațiile + verifică schema
pnpm migrate
psql sintezaur_dev -c "\dt storage_* user_upload_quota forum_post_attachments revista_article_attachments"
# → 6 tabele listate

# Smoke check infrastructură storage
pnpm tsx tools/scripts/smoke-storage.ts
# → "[smoke] all checks ok"

# Type-check global
pnpm typecheck
# → all green

# Pornește stack-ul
pnpm api &
pnpm worker &
pnpm site &
pnpm dashboard &
```

---

## 1. Driver layer (M7-A)

### 1.1 Upload imagine Tezaur (driver local)

1. Pe dashboard `http://localhost:4201/tezaur/<orice-gear-id>/edit`,
   upload o imagine `.jpg`.
2. Răspunsul backend conține `path` de forma:
   `gear/<gear-id>/<source-id>/<variant>-<sha256-12>.jpg`.
3. Verifică pe disc:
   ```bash
   find ./storage/uploads/gear -type f -newer /tmp/marker
   # Trebuie 7 fișiere (7 variants) noi, fiecare cu hash în nume.
   ```
4. Pe site, vizitează `/tezaur/<slug>` — imaginea se afișează corect
   în galerie.

### 1.2 Avatar pipeline

1. Login pe site ca un user normal → `/cont/profil` → upload avatar.
2. Verifică:
   - Fișier salvat la `./storage/uploads/avatar/<user-id>.webp`.
   - `users.avatar_url` în DB conține `avatar/<user-id>.webp`.
   - Pe `/autor/<username>` imaginea apare în card-ul profilului.

### 1.3 Delete image

1. Pe dashboard, șterge una dintre imaginile uploadate la 1.1.
2. Verifică că 7 fișiere (variantele) au dispărut de pe disc.
3. DB-ul nu mai are rândurile `gear_images` corespunzătoare.

---

## 2. Multi-type pipeline + quota (M7-B)

### 2.1 Magic-byte detection

1. Test pozitiv: pe site, ca autor, încearcă să atașezi un MP3 valid
   la o postare forum → succes.
2. Test negativ: redenumește un `.txt` în `fake.mp3` și încearcă
   upload → eroare „Tip de fișier nedetectat" sau „Conținutul fișierului
   nu corespunde tipului audio".

### 2.2 Per-file size cap

1. Ia un fișier ZIP de 25 MB (peste limita 20 MB).
2. Upload pe revista article ZIP → eroare 413 cu mesaj
   „Fișierul depășește limita de 20 MB."

### 2.3 Per-user daily cap

1. Login ca user-test. Upload 5 fișiere MP3 a câte 10 MB fiecare la
   atașamente forum (= 50 MB).
2. Upload al 6-lea fișier MP3 → eroare 429 „Ai atins limita zilnică de
   upload."
3. Așteaptă cron-ul de la 00:00 UTC (sau rulează manual:
   `pnpm tsx -e "import('pg-boss').then(boss => new boss.default({connectionString: process.env.DATABASE_URL!}).send('storage:reset-daily-quota', {}))"`).
4. După reset, upload din nou → succes.

### 2.4 Lifetime alert notification

1. Modifică temporar seed-ul: `UPDATE storage_limits SET max_bytes=1024 WHERE
   scope='per_user_lifetime_alert';` (1 KB pentru test rapid).
2. Upload câteva fișiere ca user-test până depășești 1 KB cumulat.
3. Verifică în DB:
   ```sql
   SELECT * FROM notifications WHERE kind = 'storage_quota_lifetime_reached';
   -- Trebuie 1 rând pentru user + N rânduri pentru admini.
   SELECT notified_lifetime_at FROM user_upload_quota WHERE user_id = '<test-user>';
   -- Trebuie setat (NOT NULL).
   ```
4. Upload al 6-lea fișier → NU se mai trimite a doua notificare
   (one-shot).
5. Resetează limita: `UPDATE storage_limits SET max_bytes=1073741824 WHERE
   scope='per_user_lifetime_alert';`.

### 2.5 Public limits endpoint

```bash
curl http://localhost:3000/api/storage/limits | jq
# → { "items": [...9 limite seed cu maxBytes...] }
# → Header: Cache-Control: public, max-age=300
```

### 2.6 Crons pg-boss

1. Verifică log worker: la pornire trebuie să se vadă
   `crons scheduled (storage 00:00/03:00 + listings 03:15/03:30/03:45 + badges 04:00 UTC)`.
2. Trigger manual:
   ```bash
   # Daily reset (rulează imediat o singură dată)
   pnpm tsx -e "
   import PgBoss from 'pg-boss';
   const boss = new PgBoss({ connectionString: process.env.DATABASE_URL, schema: 'pgboss' });
   await boss.start();
   await boss.send('storage:reset-daily-quota', {});
   await boss.stop({ graceful: false });
   "
   ```
3. Verifică log worker: `daily quota reset for N users`.

---

## 3. Attachment endpoints + site UI (M7-C)

### 3.1 Forum attachments (max 3)

1. Login pe site ca user normal. Creează un thread nou pe `/forum/<cat>/nou`.
2. Pe pagina thread-ului, sub OP-ul tău (autor = tu), apare
   `<app-attachment-box>` cu mesajul „Atașamente — max 3...".
3. Click „Adaugă atașament" → selectează un MP3 → upload OK → fișierul
   apare în listă cu native `<audio controls>` player.
4. Repetă pentru un PDF + un ZIP. Acum sunt 3 atașamente — butonul de
   adăugare dispare și apare mesajul „Ai atins limita de 3 atașamente".
5. Click „Șterge" pe unul dintre atașamente → fișierul dispare + butonul
   de adăugare reapare.
6. Pe alt browser/cont (sau anonim) deschide același thread → vezi
   atașamentele dar fără butoanele de „Șterge" / „Adaugă".

### 3.2 Revista attachments (uncapped)

1. Ca autor de articol (sau admin/editor), pe `/revista/<slug>` apare
   secțiunea „// Atașamente" + `<app-attachment-box>`.
2. Upload 4-5 atașamente diverse — toate acceptate, nu există cap.
3. Vizitează articolul în browser anonim → atașamentele sunt listate
   read-only sub body-ul articolului.

### 3.3 Validare pre-check client-side

1. În attachment box, încearcă să selectezi un fișier `.docx` →
   eroare „Tip de fișier neacceptat. Folosește audio, PDF sau ZIP."
2. Încearcă un fișier MP3 de 11 MB (peste 10 MB limit forum) →
   eroare „Fișierul depășește limita de 10 MB." (înainte să posteze
   pe wire).

---

## 4. Admin panel (M7-D)

### 4.1 Acces

1. Login pe dashboard ca admin / superadmin.
2. Home card → click „Storage". Pagina `/admin/storage` deschide tab-ul
   „Limite" by default.
3. Login ca user normal → încearcă `/admin/storage` direct → redirect /
   forbidden.

### 4.2 Limits tab — edit live

1. Modifică `per_file / image / *` de la 8388608 (8 MB) la 4194304
   (4 MB). Click „Salvează" → toast „Limită salvată".
2. Imediat (în <5 min), pe site încearcă upload imagine de 6 MB →
   trebuie respinsă cu eroare 413.
3. Resetează limita la 8388608.

### 4.3 Overview tab

1. Click „Overview". Trebuie să vezi:
   - 2 metric cards: Total bytes + Total uploads.
   - Tabel „Per modul" cu rânduri pentru tezaur/bazar/revista/forum/avatar.
   - Tabel „Per tip fișier" cu image/audio/pdf/zip.
2. Sumele de pe modul trebuie să corespundă cu cele pe tip fișier
   (cumulate).

### 4.4 Folders tab

1. Click „Folders". Filter „Modul" pe `*` (toate) → vezi top resurse
   sortate descrescător după bytes.
2. Filter pe `forum` → vezi doar post-urile cu atașamente forum.

### 4.5 Trends tab

1. Click „Trends". Default `Zilnic` + interval gol → toate bucket-urile
   până astăzi.
2. Setează `De la` = acum 7 zile, `Până la` = azi → vezi doar
   bucket-urile din ultima săptămână.
3. Schimbă pe `Săptămânal` / `Lunar` → grupare diferită.

### 4.6 Top users tab

1. Click „Top useri". Lista sortată descrescător după bytes uploadate.
2. Verifică că user-ul cu cele mai multe atașamente apare primul.

### 4.7 Reconcile button

1. Click „Reconcile acum" → toast „Job reconciliere trimis (id: …)".
2. Verifică log worker: `STORAGE_DRIVER != s3 — skipping reconciliation`
   (pe local, e no-op).
3. Pe prod (după R2 setup), log-ul trebuie să arate:
   `reconcile tezaur: remote=N local=M (within tolerance)` pentru
   fiecare modul.

---

## 5. Prod cutover (după `docs/devops/storage-r2.md`)

### 5.1 Smoke post-cutover

1. SSH pe VPS → verifică `docker logs <api>` la boot:
   ```
   [StorageModule] storage driver = s3 (Cloudflare R2)
   ```
2. Pe site `https://sintezaur.ro` (anonim), încearcă să vizitezi
   detail-ul unui gear cu imagini. Hmm — `wipe & remake` înseamnă că
   imaginile vechi nu mai există. Trebuie re-uploadate din dashboard
   (sau acceptate ca "în refacere").
3. Login ca superadmin → upload imagine la primul gear din Tezaur
   → URL-ul răspunsului e `https://files.sintezaur.ro/gear/.../<hash>.jpg`.
4. Click pe URL → fișierul se servește direct de pe R2 prin Cloudflare
   CDN. Headers (DevTools Network tab):
   ```
   Content-Type: image/jpeg
   Cache-Control: public, max-age=31536000, immutable
   CF-Cache-Status: HIT  (după prima cerere)
   ```

### 5.2 Verificare reconciliation

1. După 24h pe prod (cron de la 03:00 UTC a rulat o dată), pe dashboard
   admin/storage tab Reconcile button → trigger manual.
2. Verifică `docker logs <worker>`:
   ```
   reconcile tezaur: remote=N local=M (within tolerance)
   reconcile bazar: ...
   reconcile revista: ...
   reconcile forum: ...
   reconcile avatar: ...
   ```
3. Drift > 1 MB (dacă apare) → înseamnă fie un object pe R2 fără rând
   în `storage_events`, fie invers. Investighează manual.

### 5.3 Verificare cost (după 1 săptămână)

1. Cloudflare dashboard → R2 → Overview → vezi metrics:
   - Storage used: < 5 GB tipic în prima săptămână.
   - Class A operations: < 1000 (PUT-uri).
   - Class B operations: variable după trafic.
   - Egress: nu se taxează niciodată.

---

## Anexă — comenzi utile debugging

```bash
# Vezi toate storage_events ale unui user
psql sintezaur_dev -c "
SELECT module, purpose, bytes, content_type, created_at
FROM storage_events
WHERE user_id = '<uuid>'
ORDER BY created_at DESC LIMIT 20;
"

# Quota curentă a unui user
psql sintezaur_dev -c "
SELECT * FROM user_upload_quota WHERE user_id = '<uuid>';
"

# Forțează resetul daily counter (fără să aștepți cron-ul)
psql sintezaur_dev -c "
UPDATE user_upload_quota
SET daily_bytes = 0, last_reset_at = now()
WHERE daily_bytes > 0;
"

# Vezi toate atașamentele dintr-un thread
psql sintezaur_dev -c "
SELECT a.kind, a.original_filename, a.bytes, a.object_key
FROM forum_post_attachments a
JOIN forum_posts p ON p.id = a.post_id
JOIN forum_threads t ON t.id = p.thread_id
WHERE t.slug = '<thread-slug>'
ORDER BY a.position;
"

# Drop un atașament greșit de pe disc (după DELETE din DB)
docker exec -it sintezaur-api ls /app/storage/uploads/forum/<post-id>/
```
