# M9 — Plan de testare manual (SEO + unified search + observability)

Verifică toate trei sub-fazele după deploy. Toate testele presupun
că ești logat ca **superadmin** unde se cere autentificare.

**Convenții:**
- 📁 Local = stack-ul rulează cu `pnpm api` + `pnpm worker` + `pnpm site` + `pnpm dashboard`.
- ☁️  Prod = Coolify cu env-urile populate (`SENTRY_DSN`, R2 dacă e cazul, etc.).
- ✅ = test trecut. ❌ = bug, deschide PR de fix.

---

## 1. SEO closure (M9-A)

### 1.1 Forum 410 Gone path

1. Pe dashboard, creează un thread test pe `/forum/discutii-generale/nou`,
   apoi în DB:
   ```sql
   -- Simulează un slug rename + expiry
   INSERT INTO slug_redirects (target_type, old_slug, new_slug, target_id, expires_at)
   VALUES ('forum_thread', 'thread-test-vechi', '<current-slug>', '<thread-id>', now() - interval '1 day');
   ```
2. Pe site vizitează `https://sintezaur.ro/forum/discutii-generale/thread-test-vechi`.
3. Trebuie să te redirecționeze la `/gone` (HTTP 404 cu body
   `{ message: 'gone' }` interpretat client-side).
4. Update redirect-ul:
   ```sql
   UPDATE slug_redirects SET expires_at = now() + interval '30 days'
   WHERE old_slug = 'thread-test-vechi';
   ```
5. Vizitează același URL — trebuie să te ducă pe `/forum`
   (replaceUrl) cu mesaj că thread-ul s-a redenumit.

### 1.2 BreadcrumbList JSON-LD

1. Deschide DevTools pe oricare detail page (Tezaur / Bazar / Revista
   / Forum thread). În `<head>`, găsește
   `<script id="sintezaur-jsonld" type="application/ld+json">`.
2. Conținutul trebuie să fie un **array** cu 2 elemente:
   - Primul: tipul nativ paginii (`Product` / `Article` /
     `DiscussionForumPosting`).
   - Al doilea: `BreadcrumbList` cu `itemListElement` ordonat
     (`Acasă` → modul → pagina curentă).
3. Validează la
   https://search.google.com/test/rich-results — paste URL-ul
   public, ar trebui să detecteze 2 entități structurate.

### 1.3 Homepage Organization + WebSite SearchAction

1. Pe `https://sintezaur.ro/` DevTools → `<head>` → JSON-LD.
2. Array cu 2 entități: `WebSite` (cu `potentialAction.SearchAction`
   target `/cautare?q={search_term_string}`) + `Organization`.
3. Validează la rich-results testing tool.

### 1.4 Brand placeholders

1. `curl -I https://sintezaur.ro/assets/branding/og-default.png` →
   HTTP 200, content-type `image/png`.
2. `curl -I https://sintezaur.ro/assets/branding/logo.png` → idem.
3. Test share preview: paste link `https://sintezaur.ro/` în Slack
   sau iMessage. Trebuie să vezi card cu wordmark + "Gear · Bazar
   · Revista · Forum" pe fundal dark.

### 1.5 Build warnings absente

```bash
pnpm site  # nx serve site
# Expected: zero warnings în output. Nu mai vezi NG8107/8102/8113.

nx run site:build --configuration=production
# Expected: "Successfully ran target build" fără WARNING.
```

---

## 2. Unified search /cautare (M9-B)

### 2.1 Endpoint public

```bash
# Min 2 chars rejected
curl 'https://api.sintezaur.ro/api/search?q=a' | jq
# → { "query": "a", "tooShort": true, ..., "totalHits": 0 }

# Real query — should hit 4 sections in parallel
curl 'https://api.sintezaur.ro/api/search?q=roland' | jq
# → { tezaur: { items: [...], totalCount: N },
#     bazar: { items: [...], totalCount: M },
#     revista: { items: [...] },
#     forum:  { items: [...] },
#     totalHits: T }
```

### 2.2 Site page

1. Click butonul de search din topbar (iconul lupă). Te duce la
   `/cautare`.
2. Tastează `roland` → după ~300ms apare lista cu rezultate
   grouped pe 4 secțiuni.
3. URL devine `/cautare?q=roland`. Refresh page — query persistă.
4. Click pe „Vezi toate {N} rezultate" sub Tezaur → ar trebui să te
   ducă la `/tezaur?q=roland` (filtru deja aplicat).
5. Test edge cases:
   - Query empty → mesaj „Începe să scrii ca să vezi rezultate."
   - Query 1 char → „Scrie cel puțin 2 caractere…".
   - Query care nu match-uiește nimic → „Niciun rezultat pentru…".

### 2.3 Section failures graceful

1. Oprește temporar accesul la `forum_posts` (sau hack — opreşte API-ul
   forum service): de exemplu, rename `forum_posts.search_vector`
   coloana pentru 5 minute.
2. Trimite `GET /api/search?q=roland`. Restul de 3 secțiuni trebuie să
   răspundă normal; forum returnează `items: [], totalCount: 0`.
3. Worker log trebuie să arate `forum search failed: ...`.
4. Restore coloana.

### 2.4 SearchAction Google sitelinks (after indexing)

1. Submită `sintezaur.ro` în Google Search Console.
2. După ce e indexed (~1-7 zile), caută „sintezaur" pe Google.
3. În rezultatul homepage trebuie să apară un sitelinks search box
   sub link-ul principal. Test-uiește scriind acolo „roland" →
   te duce pe `/cautare?q=roland`.

---

## 3. Observability (M9-C)

### 3.1 Sentry no-op pe dev

1. Local cu `SENTRY_DSN=` (gol):
   ```bash
   pnpm api
   # → log: nimic despre Sentry. Boot normal.
   ```
2. Trigger o eroare manual:
   ```bash
   curl 'http://localhost:3000/api/health/throw-test'
   # (sau orice endpoint care arunca o excepție necontrolată)
   ```
3. Eroarea NU se trimite nicăieri — local, no-op.

### 3.2 Sentry pe prod

1. Setează în Coolify Shared Variables `SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project>`.
2. Redeploy api + worker.
3. Pe boot, log-urile au inițializare Sentry silentioasă (nu există un
   log explicit — Sentry SDK e quiet by default).
4. Trigger o eroare 500 controlat — accesează un endpoint care arunca
   excepție (de ex. ștergi o resursă inexistentă cu role admin).
5. Pe sentry.io dashboard → Issues → ar trebui să vezi eroarea în
   <2 minute.
6. Eroarea din worker (de exemplu, un pg-boss job care eșuează) e
   tagged cu `service: worker` — verifică filter-ul în Sentry UI.

### 3.3 Daily pg_dump cron

1. Pe Coolify, asigură-te că `worker` container are
   `postgresql-client` în imagine (verifică Dockerfile sau Coolify
   buildpack):
   ```bash
   docker exec -it <worker-container> which pg_dump
   # → /usr/bin/pg_dump (sau similar)
   ```
2. Trigger manual fără să aștepți cron-ul de la 02:30 UTC:
   ```bash
   docker exec -it <worker-container> sh -c \
     'pnpm tsx -e "
        import PgBoss from \"pg-boss\";
        const boss = new PgBoss({ connectionString: process.env.DATABASE_URL, schema: \"pgboss\" });
        await boss.start();
        const jobId = await boss.send(\"backup:pg-dump\", {});
        console.log(\"job:\", jobId);
        await boss.stop({ graceful: false });
     "'
   ```
3. După ~30 secunde, verifică worker log: `pg_dump done: X.X MB at ...`.
4. Inspect:
   ```bash
   docker exec -it <worker-container> ls -la /app/storage/backups/
   # Trebuie să vezi sintezaur-<timestamp>.dump
   ```
5. Test retention: setează `BACKUP_RETAIN_DAYS=1` și rulează două
   joburi cu zi diferită prin `touch` pe un fișier ca timestamp:
   ```bash
   touch -d "3 days ago" /app/storage/backups/sintezaur-fake-old.dump
   # Trigger job
   # → log: "pruned 1 old backup files"
   # → file dispărut.
   ```

### 3.4 Restore drill (recommended quarterly)

Conform `docs/devops/backups.md` §Layer 3:

```bash
scp <vps>:/var/coolify/<worker-volume>/storage/backups/sintezaur-latest.dump /tmp/
createdb sintezaur_restore_test
pg_restore --dbname=sintezaur_restore_test --clean --if-exists \
           --no-owner --no-privileges /tmp/sintezaur-latest.dump
psql sintezaur_restore_test -c "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL;"
psql sintezaur_restore_test -c "SELECT MAX(created_at) FROM audit_log;"
dropdb sintezaur_restore_test
```

Marchează în calendar — chunk de 30 min trimestrial.

### 3.5 Offsite sync (manual config)

Per `docs/devops/backups.md` §Layer 2 — instalează rclone pe VPS-ul
Coolify, configurează `hetzner-box` remote, adaugă cron `30 3 * * *`.
Verifică după 24h că `rclone ls hetzner-box:sintezaur-backups` arată
dump-ul de aseară.

---

## Anexă — comenzi utile debugging

```bash
# Vezi toate cron-urile pg-boss programate
psql sintezaur -c "SELECT name, cron, data FROM pgboss.schedule ORDER BY name;"

# Vezi ultimele joburi rulate
psql sintezaur -c "
  SELECT name, state, completed_on
  FROM pgboss.job
  WHERE completed_on > now() - interval '1 day'
  ORDER BY completed_on DESC LIMIT 20;
"

# Force-trigger oricare cron pe-loc
docker exec <worker> sh -c 'pnpm tsx -e "
  import PgBoss from \"pg-boss\";
  const boss = new PgBoss({ connectionString: process.env.DATABASE_URL, schema: \"pgboss\" });
  await boss.start();
  await boss.send(\"<job-name>\", {});
  await boss.stop({ graceful: false });
"'

# Vezi cele mai recente erori Sentry din terminal (cu @sentry/cli)
sentry-cli issues list --project sintezaur-api
```
