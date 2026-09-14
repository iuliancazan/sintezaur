# Sintezaur

Romanian-language vertical platform for music production gear. Four
tightly-integrated sections — **Tezaur** (catalog), **Bazar**
(marketplace), **Revista** (magazine), **Forum** (community) — wired
into a single Nx monorepo.

- Spec: [`planning/docs/spec/spec.md`](planning/docs/spec/spec.md)
- Execution plan: [`planning/docs/planning/execution-plan.md`](planning/docs/planning/execution-plan.md)
- Dev status / hand-off: [`planning/docs/STATUS.md`](planning/docs/STATUS.md)
- Tech stack (locked versions): [`planning/docs/devops/tech-stack.md`](planning/docs/devops/tech-stack.md)

> Planning docs live in the iCloud Obsidian vault (`hq/projects/software/sintezaur/`);
> `planning/` is a gitignored symlink to it — see `CLAUDE.md`.

## Stack (M0)

- Node ≥22.12 · pnpm `10.33.2` (pinned via `packageManager`)
- Nx 22.7 · TypeScript 5.9
- Angular 21.2 (`site`, `dashboard`)
- NestJS 11 (`api`, `worker`)
- PostgreSQL 17 + Drizzle ORM 0.36 + drizzle-kit 0.30
- PrimeNG 21 + `@primeuix/themes` + PrimeFlex + PrimeIcons

Authoritative version list: [`planning/docs/devops/tech-stack.md`](planning/docs/devops/tech-stack.md).
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
tools/scripts/  Operator scripts: migrate, seed-dev, create-superadmin
planning/       Gitignored symlink → Obsidian vault "hq" (spec, planning, STATUS, design-prototypes)
design-imports/ Inbox for new Claude Design / Open Design drops (archived versions: planning/design-prototypes/)
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
| `pnpm seed:superadmin` | Bootstrap the superadmin user + grant admin/superadmin (idempotent). |
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
   [`planning/docs/devops/tech-stack.md`](planning/docs/devops/tech-stack.md).
2. Update that file (version pin + section) FIRST.
3. THEN run `pnpm add <pkg>@<version>`.

Never the other way around.
