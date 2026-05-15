# Backups strategy

Three layers, în ordine din interior spre exterior. Spec §M6
deliverable + spec §13 audit-log retention requirement.

## Layer 1 — Daily `pg_dump` (in-process, automatic)

Worker pg-boss cron `backup:pg-dump` rulează zilnic la **02:30 UTC**
și execută:

```bash
pg_dump --format=custom --compress=9 \
        --file=$BACKUP_DIR/sintezaur-<timestamp>.dump \
        $DATABASE_URL
```

Apoi face prune pe fișiere mai vechi de `BACKUP_RETAIN_DAYS`
(default 14 zile).

**Env vars** (în Coolify Shared Variables pe deployment-ul worker):
- `BACKUP_DIR` — default `./storage/backups`. Pe Coolify, montează un
  volum persistent aici (NU bake-uit în imagine).
- `BACKUP_RETAIN_DAYS` — default `14`. Cu media ~50 MB / dump, 14 zile
  = ~700 MB local. Crește dacă vrei history mai lung pe disc.

**Pre-requisites:**
- `pg_dump` binary disponibil pe worker container. Dockerfile-ul
  worker-ului trebuie să includă `postgresql-client` package
  (verifică `apps/worker/Dockerfile` sau echivalentul Coolify).
- Worker container are write access la `BACKUP_DIR`.

**Verificare manuală:**
```bash
# Trigger un dump pe-loc, fără să aștepți cron-ul
pnpm tsx -e "
import PgBoss from 'pg-boss';
const boss = new PgBoss({ connectionString: process.env.DATABASE_URL, schema: 'pgboss' });
await boss.start();
const jobId = await boss.send('backup:pg-dump', {});
console.log('job:', jobId);
await boss.stop({ graceful: false });
"

# Apoi inspectează ./storage/backups/ pe worker container
docker exec -it <worker-container> ls -la /app/storage/backups/
```

## Layer 2 — Offsite sync (Hetzner Storage Box, manual config)

Layer 1 ne protejează de „pierdut o săptămână de date din cauza unui
bug în COPY/migrare". NU ne protejează de „VPS-ul Hetzner a luat
foc". Pentru asta: sync zilnic la Storage Box pe alt continent
geografic.

Nu e integrat în worker — e operațional pe Coolify cron sau pe host
direct.

**Opțiune A — rclone (recomandată):**

1. Provisionează Hetzner Storage Box BX11 (€3.20/lună, 1 TB).
2. Pe VPS-ul Coolify:
   ```bash
   apt install rclone
   rclone config  # → wizard interactiv: New remote → name "hetzner-box"
                  # → SFTP → host=u123456.your-storagebox.de
                  # → user=u123456, pass=<password>
   ```
3. Adaugă cron pe host (Coolify → server cron, sau `/etc/crontab`):
   ```cron
   # Zilnic la 03:30 UTC — după ce pg-boss backup la 02:30 a terminat.
   30 3 * * * rclone sync /var/coolify/<worker-volume>/storage/backups \
                          hetzner-box:sintezaur-backups \
                          --max-age 30d --log-file /var/log/rclone-sync.log
   ```

**Opțiune B — rsync over SSH:**

Mai simplu dar fără cleanup automat:
```bash
30 3 * * * rsync -avz --delete --max-age=30 \
              /var/coolify/<worker-volume>/storage/backups/ \
              u123456@u123456.your-storagebox.de:./sintezaur-backups/
```

**Opțiune C — accept doar Layer 1 (post-MVP):**

Pentru soft-launch cu < 100 useri, Layer 1 ne acoperă orice incident
non-catastrofic. Layer 2 e investiție de ~€3-4/lună pe care o adaugi
când traffic-ul justifică riscul.

## Layer 3 — Restore drill (recomandat trimestrial)

Backup care n-a fost restaurat = backup care nu există. La fiecare
3 luni, restaurează cel mai recent dump pe o instanță separată:

```bash
# Pull cel mai recent dump
scp <vps>:/var/coolify/<worker-volume>/storage/backups/sintezaur-latest.dump /tmp/

# Setup o DB temporară curată
createdb sintezaur_restore_test

# Restore
pg_restore --dbname=sintezaur_restore_test --clean --if-exists \
           --no-owner --no-privileges /tmp/sintezaur-latest.dump

# Verifică câteva rânduri-pivot
psql sintezaur_restore_test -c "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL;"
psql sintezaur_restore_test -c "SELECT COUNT(*) FROM gear WHERE published = true;"
psql sintezaur_restore_test -c "SELECT MAX(created_at) FROM audit_log;"

# Cleanup
dropdb sintezaur_restore_test
```

Marchează în calendar; chunk de 30 min trimestrial.

## Retention policy

- **Layer 1 (local)**: 14 zile (configurabil prin `BACKUP_RETAIN_DAYS`).
- **Layer 2 (offsite)**: 30 zile (configurabil prin `--max-age` în
  rclone/rsync).
- **Audit log în DB**: indefinit per spec §7.10 — exempt de la GDPR
  cascade pentru legitimate-interest fraud investigation.

## Securitate

- Dump-urile conțin PII (email, nume, mesaje chat). Layer 1 stă pe
  volum encrypted-at-rest pe Hetzner. Layer 2 (Storage Box) folosește
  SFTP cu user/parola unice — NU reuse credențialele Coolify.
- Storage Box-ul NU expune dump-urile public; access doar prin
  credențiale.
- Restore drill rulează pe o DB locală temporară — nu pleacă din
  perimetru.

## Open follow-ups

- **Encryption la rest pe Storage Box**: rclone suportă crypt remote.
  Adaugă când inflațăm scope-ul GDPR (post-MVP).
- **Health-check Sentry pentru cron failures**: dacă cron-ul pică, nu
  există dump nou și nimeni nu observă până la următorul restore drill.
  Adaugă un check „file modified date < 25h" pe directorul backups
  care raportează la Sentry (post-MVP).
