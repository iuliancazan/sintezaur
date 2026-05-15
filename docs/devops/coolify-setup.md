# Coolify Setup — Sintezaur

**Ultima actualizare:** 2026-05-15

Checklist complet pentru setup-ul Sintezaur în Coolify. Copiază pattern Mudee 1:1, cu adaptările necesare.
Referință: `knowledge-base/_projects/personal/mudee/infrastructure/deployment.md`

---

## 0. Prerequisite

- [ ] Coolify rulează la `http://65.21.188.102:8000`
- [ ] GitHub App configurat în Coolify → Sources (același folosit de Mudee)
- [ ] Repo `sintezaur-ro` există pe GitHub și are branch `main`
- [ ] Dockerfile-uri existente pentru toate apps (vezi Secțiunea 4)

---

## 1. Creare proiect + environment

În Coolify UI:

1. **Projects → New Project** → Name: `sintezaur`
2. **Environments → New Environment** → Name: `production`

---

## 2. Postgres database

**Resources → New Resource → Database → PostgreSQL**

| Câmp | Valoare |
|---|---|
| Name | `sintezaur-postgres` |
| Version | `17` |
| Database name | `sintezaur_prod` |
| Database user | `sintezaur` |
| Database password | *(generează random, salvează în 1Password: `Sintezaur DB — prod`)* |

> ⚠️ Nu expune portul extern. Accesibil intern ca `sintezaur-postgres:5432`.
>
> Connection string format: `postgres://sintezaur:<pass>@sintezaur-postgres:5432/sintezaur_prod`

---

## 3. Aplicații — configurare comună

**Pentru fiecare aplicație:**
- **Repository:** `github.com/IulianCazan/sintezaur-ro` (sau cum se numește pe GitHub)
- **Branch:** `main`
- **Base Directory:** `/` ← **critic, nu schimba**
- **Build context:** `/`
- **Auto-deploy:** ✓ (webhook pe push `main`)

---

## 4. Aplicații — detalii per app

### 4a. `sintezaur-api`

| Câmp | Valoare |
|---|---|
| Name | `sintezaur-api` |
| Dockerfile | `apps/api/Dockerfile` |
| Domain | `https://api.sintezaur.ro` |
| Port | `3000` |
| Healthcheck path | `/api/health` |
| Healthcheck start period | `30s` (migrate poate dura) |

**Storage (volumes):**
- Name: `sintezaur-uploads`
- Mount path în container: `/app/storage/uploads`
- Type: Docker volume

> ⚠️ Fără volum, uploads se pierd la fiecare redeploy. Configurează ÎNAINTE de primul deploy.

### 4b. `sintezaur-site`

| Câmp | Valoare |
|---|---|
| Name | `sintezaur-site` |
| Dockerfile | `apps/site/Dockerfile` |
| Domain | `https://sintezaur.ro` |
| Port | `80` ← **nu 3000** |
| Healthcheck path | `/healthz` |
| Healthcheck start period | `10s` |

### 4c. `sintezaur-dashboard`

| Câmp | Valoare |
|---|---|
| Name | `sintezaur-dashboard` |
| Dockerfile | `apps/dashboard/Dockerfile` |
| Domain | `https://admin.sintezaur.ro` |
| Port | `80` ← **nu 3000** |
| Healthcheck path | `/healthz` |
| Healthcheck start period | `10s` |

### 4d. `sintezaur-worker`

| Câmp | Valoare |
|---|---|
| Name | `sintezaur-worker` |
| Dockerfile | `apps/worker/Dockerfile` |
| Domain | *(niciunul — fără port public)* |
| Port | *(gol)* |

---

## 5. Environment variables

Setate în **Coolify → proiect `sintezaur` → Shared Variables** (propagate la toate apps).
Pentru valori unice per app, setate pe resource-ul respectiv.

### Shared (toate apps)

| Var | Valoare prod | Note |
|---|---|---|
| `NODE_ENV` | `production` | |
| `DATABASE_URL` | `postgres://sintezaur:<pass>@sintezaur-postgres:5432/sintezaur_prod` | |
| `DATABASE_POOL_SIZE` | `4` | |
| `DATABASE_POOL_MAX` | `20` | |

### API

| Var | Valoare prod | Note |
|---|---|---|
| `API_PORT` | `3000` | |
| `CORS_ORIGIN` | `https://sintezaur.ro,https://admin.sintezaur.ro` | fără spații lângă virgulă |
| `UPLOADS_DIR` | `/app/storage/uploads` | trebuie să coincidă cu mount path-ul volumului |
| `LOG_LEVEL` | `info` | |
| `LOG_FORMAT` | `json` | |
| `JWT_ACCESS_SECRET` | *(32+ bytes random)* | `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | *(32+ bytes random, diferit)* | `openssl rand -base64 32` |
| `JWT_ACCESS_TTL` | `15m` | |
| `JWT_REFRESH_TTL` | `30d` | |
| `BCRYPT_COST` | `12` | |
| `COOKIE_DOMAIN` | `.sintezaur.ro` | **cu punct** = wildcard pentru subdomenii |
| `COOKIE_SECURE` | `true` | |
| `SMTP_HOST` | `smtp-relay.brevo.com` | |
| `SMTP_PORT` | `587` | |
| `SMTP_USER` | `aa1208001@smtp-brevo.com` | din Brevo → SMTP & API |
| `SMTP_PASS` | *(cheia SMTP Brevo)* | generează `sintezaur-api-prod` în Brevo |
| `SMTP_FROM_NAME` | `Sintezaur` | |
| `SMTP_FROM_EMAIL` | `noreply@sintezaur.ro` | |

### First admin seed (one-time, sterge dupa)

| Var | Valoare |
|---|---|
| `FIRST_ADMIN_EMAIL` | *(emailul tău)* |
| `FIRST_ADMIN_PASSWORD` | *(parolă temporară, schimb-o din UI după)* |
| `FIRST_ADMIN_FULL_NAME` | `Iulian Cazan` |

### External APIs (opționale în MVP)

| Var | Note |
|---|---|
| `DISCOGS_TOKEN` | Opțional. 60 req/min cu token vs 25 anon |
| `DISCOGS_USER_AGENT` | `Sintezaur/1.0 (+https://sintezaur.ro)` |

---

## 6. Dockerfile patterns

Aceleași capcanele Mudee se aplică. Template minimal per tip de app:

### API Dockerfile (NestJS)

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
# NU copia pnpm-workspace.yaml
COPY tsconfig.json tsconfig.base.json ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY apps/api apps/api
COPY libs libs
COPY nx.json ./
RUN pnpm nx build api --configuration=production

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist/apps/api ./dist/apps/api
# libs sursa pentru tsx (migrate, seed)
COPY --from=build /app/libs ./libs
COPY --from=build /app/tsconfig.json /app/tsconfig.base.json ./
COPY tools/scripts ./tools/scripts
EXPOSE 3000
CMD sh -c "pnpm migrate && node dist/apps/api/main.js"
```

### Site / Dashboard Dockerfile (Angular → nginx)

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.base.json ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY apps/site apps/site   # sau apps/dashboard
COPY libs libs
COPY nx.json ./
RUN pnpm nx build site --configuration=production   # sau dashboard

FROM nginx:alpine AS runner
COPY --from=build /app/dist/apps/site/browser /usr/share/nginx/html
COPY apps/site/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

> `nginx.conf` minimal pentru Angular SPA (history API fallback):
> ```nginx
> server {
>   listen 80;
>   root /usr/share/nginx/html;
>   index index.html;
>   location / { try_files $uri $uri/ /index.html; }
>   location /healthz { return 200 'ok'; add_header Content-Type text/plain; }
> }
> ```

---

## 7. Capcane (moștenite din Mudee)

1. **`tsconfig.json` ȘI `tsconfig.base.json` ambele necesare** — Dockerfile trebuie să copieze ambele. Fără `tsconfig.json` → build eșuează cu eroare cryptică @nx/js.

2. **`pnpm-workspace.yaml` NU se copiază** — dacă îl incluzi, pnpm intră în workspace mode și nu mai rezolvă imports `@sintezaur/db`.

3. **`libs/` în runner stage** — necesar pentru `pnpm migrate` și `pnpm seed:admin` din container.

4. **`fileReplacements` pentru Angular prod** — `environment.prod.ts` trebuie să conțină URL-urile de prod (`https://api.sintezaur.ro`), nu localhost. Verifică `apps/site/project.json` și `apps/dashboard/project.json`.

5. **Port 80 pentru SPA-uri** — `sintezaur-site` și `sintezaur-dashboard` rulează nginx pe port **80** intern, nu 3000. Setează corect în Coolify → Ports Exposes.

6. **`COOKIE_DOMAIN` cu punct** — `.sintezaur.ro` (cu punct) = funcționează pe toate subdomeniile. Fără punct = cookie valid doar pe root, auth se sparge pe `admin.sintezaur.ro`.

---

## 8. Ordinea de deploy (prima oară)

1. Pornește Postgres → verifică că e healthy
2. Deploy `sintezaur-api` → prima rulare face migrate automat (CMD)
3. Rulează `pnpm seed:admin` (exec în container API) → creează primul admin
4. Deploy `sintezaur-site`
5. Deploy `sintezaur-dashboard`
6. Deploy `sintezaur-worker`
7. Testează `https://sintezaur.ro` și `https://admin.sintezaur.ro`

---

## 9. Generare SMTP key dedicat pentru prod

În Brevo → Settings → SMTP & API → **+ Generate SMTP key** → Name: `sintezaur-api-prod`.
Copiaz-o imediat (nu mai e vizibilă după). Pune-o în Coolify ca `SMTP_PASS` și în 1Password ca `Sintezaur Brevo SMTP — prod`.
