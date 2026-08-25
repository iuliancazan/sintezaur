# Sintezaur Workshops

Password-gated workshop materials on **workshops.sintezaur.ro** — slides,
student handbook, presenter script and run-of-show per workshop, fully
bilingual (EN default, RO toggle). Spec: `planning/docs/spec/workshops-spec.md`.

Two apps, one deployable:

- `apps/workshops` — Angular 21 SPA (login, hub, deck runtime, doc runtime,
  superadmin panel) + ALL course content as code under
  `src/app/content/<slug>/`.
- `apps/workshops-api` — NestJS: auth (per-workshop guest/admin passwords +
  standalone superadmin), panel endpoints, access analytics, PDF delivery,
  and in production it serves the built SPA behind the session gate.

## Run locally

```bash
# once: local DB + schema + first workshop (idempotent)
createdb sintezaur_workshops
pnpm migrate:workshops
pnpm seed:workshops        # dev passwords: guest fourm-guest · admin fourm-admin

# two terminals
pnpm workshops-api         # NestJS on http://localhost:3300
pnpm workshops             # Angular on http://localhost:4300 (proxies /api)
```

Open http://localhost:4300 — password `fourm-guest` (or `fourm-admin` for
everything). Superadmin panel: the "Control panel" link on the login page;
dev password `workshops-dev` (hash in `.env`, base64-encoded — regenerate
with `pnpm tsx tools/scripts/workshops-hash-password.ts <password>`).

Content edits (slides/handbook/script files) hot-reload in the browser.
Backend edits need a restart of `pnpm workshops-api`.

## Content model

One file per slide (`content/sequential-fourm/slides/sNN-MM-*.ts`, EN+RO
colocated) listed in `slides/index.ts` — **deleting a page = deleting its
file + its index line**. Handbook pages, presenter script and run-of-show
live next to them. The handbook is a single dark source; the print/PDF
light theme is derived (`handbook/handbook-theme.scss`, generated). The
original v02.1 prototype (reference/archive) lives in the Obsidian vault:
`planning/design-prototypes/…/claude-design-prototypes/2026-08-17-v02.1`,
ported by `tools/scripts/port-course-slides.ts` / `port-course-docs.ts`.

## PDFs

```bash
# with both dev servers running:
pnpm workshops:pdf         # → apps/workshops-api/src/assets/pdf/<slug>/  (commit these)
```

Regenerate + commit whenever content changes. Production serves the
committed files behind auth (`GET /api/pdf/:slug/:doc?lang=`) — no browser
in the prod image.

## Offline at the venue (plan B)

```bash
pnpm migrate:workshops && pnpm seed:workshops   # once, on the presenting laptop
CI=true pnpm exec nx build workshops --configuration=production
node dist/apps/workshops-api/main.js            # http://localhost:3300 — full gated app, no internet needed
```

Second fallback: the committed PDFs.

## Deploy (Coolify)

One service from `apps/workshops-api/Dockerfile` (builds SPA + API; runtime
migrates, seeds idempotently, serves on **3300**). Env vars:

```
WORKSHOPS_DATABASE_URL=postgres://…/sintezaur_workshops   # DB on the existing PG instance
WORKSHOPS_SESSION_SECRET=<openssl rand -base64 32>
WORKSHOPS_SUPERADMIN_PASSWORD_HASH=<pnpm tsx tools/scripts/workshops-hash-password.ts …>  # base64!
NODE_ENV=production
```

Domain `workshops.sintezaur.ro` (DNS: Cloudflare A → 65.21.188.102, DNS
only) — Traefik issues TLS. Set watch paths so only
`apps/workshops*`/`tools`-related pushes redeploy it. After first deploy:
log into the panel and set real guest/admin passwords (the seed's dev
passwords are placeholders).

Deleting the whole section later = remove the two app folders, the Coolify
service, the DNS record, and `DROP DATABASE sintezaur_workshops`
(spec §2 — fully detachable by design).
