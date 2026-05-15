# Storage — Cloudflare R2 setup (M7 cutover)

Pași unu-câte-unu pentru a comuta `STORAGE_DRIVER` de la `local` (dev)
la `s3` (prod) folosind Cloudflare R2 (S3-compatible). Spec §M7.

**Pre-requisite:** cont Cloudflare cu plan Workers Paid sau R2 enabled
(R2 nu necesită upgrade pe planul Free în 2026, dar verifică limita
gratuită de 10 GB stocare + 1M Class A operations / lună). Domeniul
`sintezaur.ro` trebuie să fie deja delegat la Cloudflare (folosit
deja pentru DNS-ul site-ului).

---

## 1. Creează bucket-ul

1. Dashboard Cloudflare → **R2** → **Overview** → **Create bucket**.
2. Nume: `sintezaur-uploads`.
3. Locație: **Automatic (smart placement)** (R2 nu are concept de
   regiune; lasă default).
4. Click **Create bucket**.

## 2. Conectează domeniul `files.sintezaur.ro`

1. Pe pagina bucket-ului → **Settings** → **Public access** → **Connect
   Domain**.
2. Introdu `files.sintezaur.ro`.
3. Cloudflare creează automat CNAME-ul în zona `sintezaur.ro`
   (proxied — orange cloud), către hostname-ul R2 al bucket-ului.
4. Așteaptă ~30s pentru propagare. Verifică:

   ```bash
   curl -I https://files.sintezaur.ro/non-existent.txt
   # → HTTP/2 404 (404 e OK; înseamnă că domeniul ajunge la R2)
   ```

## 3. Generează API token pentru aplicație

1. Dashboard → **R2** → **Manage R2 API Tokens** → **Create API
   token**.
2. Token name: `sintezaur-prod-api`.
3. Permissions: **Object Read & Write**.
4. Resources: **Specify bucket** → bifează `sintezaur-uploads`. NU
   acorda acces la alte bucket-uri (principle of least privilege).
5. TTL: **Forever** (sau lung — minimum 1 an, ca să nu pice
   producția la mijlocul nopții).
6. Click **Create API Token**.
7. Salvează imediat — token-ul nu se mai poate vedea după închiderea
   modalului:
   - **Access Key ID** → în 1Password → vault `Sintezaur` → item
     `R2 API Token — prod`, câmp `Access Key ID`.
   - **Secret Access Key** → același item, câmp `Secret Access Key`.
   - **Endpoint** (forma `https://<account-id>.r2.cloudflarestorage.com`)
     → același item, câmp `Endpoint`.

## 4. Setează env vars în Coolify

Aplicația citește env vars din Coolify Shared Variables (pe deploy
target-ul de prod). Setează:

```bash
STORAGE_DRIVER=s3
STORAGE_PUBLIC_BASE_URL=https://files.sintezaur.ro
R2_ENDPOINT=<din 1Password>
R2_BUCKET=sintezaur-uploads
R2_ACCESS_KEY_ID=<din 1Password>
R2_SECRET_ACCESS_KEY=<din 1Password>
```

`STORAGE_DRIVER=local` (default) rămâne pe dev. NU pune `R2_*` în
`.env`-ul de pe laptop — păstrăm onboarding-ul fără secrets.

## 5. Wipe local uploads pe VPS (post-deploy)

Înainte să comutăm `STORAGE_DRIVER` pe `s3`, șterge directorul de
local uploads de pe VPS-ul actual (sub Coolify, e probabil un volum
montat — verifică):

```bash
# SSH pe VPS
ssh deploy@<vps-host>

# Verifică volumul (caut path-ul din /storage/uploads pe container)
docker volume ls | grep sintezaur

# Wipe directorul (dacă e relevant — uploads-urile vor migra by re-upload
# pe path-ul nou cu hash în filename)
docker exec -it <api-container> rm -rf /app/storage/uploads/*
```

Sub spec §M7 "wipe & remake" nu rulăm migrare de fișiere. Userii
re-uploadează ce au nevoie (MVP scope: doar ~10 gear seed + avatar-ul
superadminului).

## 6. Redeploy + smoke test

1. Coolify → app `sintezaur-api` → **Restart**.
2. La boot, log-urile API ar trebui să afișeze:

   ```
   [StorageModule] storage driver = s3 (Cloudflare R2)
   ```

3. Smoke test (de pe laptop, după ce s-a redeploy-at):

   ```bash
   # Login ca superadmin
   curl -c cookies.txt -X POST https://api.sintezaur.ro/api/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"email":"<superadmin-email>","password":"<pwd>"}'

   # Upload o imagine la primul gear (de test)
   curl -b cookies.txt -X POST \
     https://api.sintezaur.ro/api/admin/tezaur/gear/<gear-id>/images \
     -F 'file=@./test.jpg'

   # Răspunsul trebuie să returneze `path` cu format hash:
   # gear/<gear-id>/<source-id>/<variant>-<hash12>.jpg
   ```

4. Verifică URL public:

   ```bash
   # URL-ul răspunsului trebuie să fie de forma
   # https://files.sintezaur.ro/gear/.../<variant>-<hash12>.jpg
   curl -I https://files.sintezaur.ro/gear/<gear-id>/<source-id>/original-<hash>.jpg
   # → HTTP/2 200
   # → Content-Type: image/jpeg
   # → Cache-Control: public, max-age=31536000, immutable
   ```

5. Verifică hotlink protection (opțional, M7.5):

   ```bash
   curl -I https://files.sintezaur.ro/.../foo.jpg
   # Fără Referer = 403 (dacă regulile WAF sunt activate)

   curl -I -H 'Referer: https://sintezaur.ro/' https://files.sintezaur.ro/.../foo.jpg
   # Cu Referer = 200
   ```

## 7. Hotlink protection (WAF rule — opțional)

Dacă vrei să blochezi hotlink-urile din alte domenii:

1. Cloudflare dashboard → zona `sintezaur.ro` → **Security** → **WAF**
   → **Custom rules** → **Create rule**.
2. Nume: `Block hotlink to files.sintezaur.ro`.
3. Condiție:

   ```
   (http.host eq "files.sintezaur.ro" and
    not http.referer contains "sintezaur.ro" and
    http.referer ne "")
   ```

4. Action: **Block**.
5. Save → deploy.

Notă: requestul cu `Referer` gol e permis (necesar pentru
deep-linking + acces direct). Fii prudent — regula prea strictă poate
sparge previewurile pe Slack/iMessage.

## 8. Backup strategy (M7.5 — TBD)

Pentru moment, R2 e singura copie. Decizii viitoare:

- **Opțiune A** — `rclone sync` zilnic R2 → Hetzner Storage Box BX11
  (€3.20/lună) pentru redundanță geografică.
- **Opțiune B** — accept că asset-urile sunt re-uploadable de utilizatori
  (DB e sursa de adevăr și e deja backup-ată în M6).

Tracker în `docs/spec/spec.md` §13 Open Questions.

## 9. Costuri tipice

La scala noastră (~70 GB anul 1, ~1M GET-uri/lună):

- **Stocare**: 70 GB × $0.015/GB/lună = **$1.05/lună**.
- **Class A operations** (PUT/list): ~10k/lună × $4.50 / 1M = **negligibil**.
- **Class B operations** (GET/head): cele de la CDN nu se contează (cache hit);
  cele care ajung la R2 ~50k/lună × $0.36 / 1M = **negligibil**.
- **Egress**: **$0.00** (R2 nu taxează egress, niciodată).

Total estimat: **$1-2 / lună anul 1**. Comparativ Hetzner Object Storage
fix €4.99/lună minimum + risc de spike pe egress dacă cineva
descarcă în masă.

## 10. Rollback dacă R2 pică

Setează în Coolify Shared Variables:

```bash
STORAGE_DRIVER=local
STORAGE_PUBLIC_BASE_URL=https://api.sintezaur.ro/uploads
```

Redeploy. API-ul revine la driver-ul local cu volum Coolify. **Atenție:**
uploads-urile noi vor sta pe volum, iar cele vechi de pe R2 vor da 404
până se revine la R2 — păstrează acest rollback strict ca emergency
break-glass.

---

## Anexă — convențiile object key

Folosite by `StorageService` din `apps/api/src/app/common/storage.service.ts`:

```text
Images (gear/listing/article):
  <module>/<resource-id>/<source-id>/<variant>-<sha256-12>.jpg

Avatare:
  avatar/<user-id>.webp

Attachments (forum/revista audio/PDF/ZIP):
  <module>/<resource-id>/attachment-<sha256-12>.<ext>
```

Cheile pentru imagini variante și attachments sunt content-addressate
(hash 12 chars din SHA-256), deci `Cache-Control: public, max-age=
31536000, immutable` e safe. Avatarele sunt mutabile (single key per
user); pe ele `Cache-Control: public, max-age=60, must-revalidate`.
