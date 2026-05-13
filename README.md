# Sintezaur

Romanian-language vertical platform for music production gear. Four
tightly-integrated sections — **Tezaur** (catalog), **Bazar**
(marketplace), **Revista** (magazine), **Forum** (community) — wired
into a single Nx monorepo.

- Spec: [`docs/spec/spec.md`](docs/spec/spec.md)
- Execution plan: [`docs/planning/execution-plan.md`](docs/planning/execution-plan.md)
- Tech stack (locked versions): [`docs/devops/tech-stack.md`](docs/devops/tech-stack.md)

## Stack (M0)

- Node ≥22.12 · pnpm `10.33.2` (pinned via `packageManager`)
- Nx 22.7 · TypeScript 5.9
- Angular 21.2 (`site`, `dashboard`)
- NestJS 11 (`api`, `worker`)
- PostgreSQL 17 + Drizzle ORM 0.36 + drizzle-kit 0.30
- PrimeNG 21 + `@primeuix/themes` + PrimeFlex + PrimeIcons

Authoritative version list: [`docs/devops/tech-stack.md`](docs/devops/tech-stack.md).
Read that file before running any `pnpm add` — versions are locked
1:1 with `musical-deeds` and must not drift.

## Layout

```
apps/
  api/          NestJS HTTP API (port 3000)
  worker/       NestJS background worker (port 3001) — pg-boss host
  site/         Angular SPA, public site (port 4200)
  dashboard/    Angular SPA, admin dashboard (port 4201)
libs/
  auth/         Shared auth primitives (guards, strategies, decorators)
  db/           Drizzle schema + client factory
  shared/       FE/BE-shared DTOs + helpers (no backend-only imports)
  ui/           Shared Angular components (selector prefix: sintezaur-)
tools/scripts/  Operator scripts: migrate, seed-dev, create-first-admin
docs/           Spec, planning, devops references
design-imports/ Claude Design / Open Design HTML/JSX drops (manual flow)
```

## Quickstart

```bash
# 1. Install dependencies (pnpm pinned via packageManager field)
pnpm install --frozen-lockfile

# 2. Set up env
cp .env.example .env

# 3. Run the four apps in separate terminals
pnpm api          # http://localhost:3000/api/health
pnpm worker       # http://localhost:3001/health
pnpm site         # http://localhost:4200
pnpm dashboard    # http://localhost:4201
```

## Verification (M0 done = all green)

```bash
pnpm lint       # ESLint across all projects
pnpm typecheck  # tsc --noEmit per project
pnpm build      # Nx run-many build for api, worker, site, dashboard
```

## Useful scripts

| Script                 | What it does                                              |
| ---------------------- | --------------------------------------------------------- |
| `pnpm migrate`         | Preflight SQL → drizzle migrations → postflight SQL.      |
| `pnpm migrate:generate`| Diff schema → write a new drizzle migration.              |
| `pnpm seed:admin`      | Bootstrap first admin (lands fully in M1).                |
| `pnpm seed:dev`        | Idempotent dev seed. Guarded against prod DBs.            |
| `pnpm scrub`           | Wipe dist + tsc-build cache + Nx cache.                   |

## Mobile-first

Everything ships mobile-first. Base CSS enforces a 44×44 touch target
minimum on buttons/links, and `font-size: 16px` to prevent iOS input
auto-zoom. See spec §11 + execution plan's "Non-negotiable principles"
for the full set of rules.

## Code & UI language

- All identifiers / file paths / commits: **English**.
- All user-facing strings: **Romanian** via i18n (lands in M1).
- No hardcoded Romanian inside `.ts` / `.html` source.

## Adding dependencies

1. Confirm the package isn't in the "deliberate exclusions" list in
   [`docs/devops/tech-stack.md`](docs/devops/tech-stack.md).
2. Update that file (version pin + section) FIRST.
3. THEN run `pnpm add <pkg>@<version>`.

Never the other way around.
