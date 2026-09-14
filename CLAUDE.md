# Sintezaur

Platformă verticală în română pentru echipamente de producție muzicală — patru secțiuni integrate: **Tezaur** (catalog), **Bazar** (marketplace), **Revista** (revistă), **Forum** (comunitate) — într-un monorepo Nx: Angular 21 (`site`, `dashboard`), NestJS 11 (`api`, `worker`), PostgreSQL 17 + Drizzle. Layout, quickstart și scripturi: [README.md](README.md). Cod/commit-uri: **engleză**; stringuri UI: **română** (i18n); conversația cu Iulian: **română**.

## Planning docs (în afara repo-ului)

Documentele de planning trăiesc în vaultul Obsidian «hq», sincronizat prin iCloud:
`/Users/Iulian/Library/Mobile Documents/iCloud~md~obsidian/Documents/hq/projects/software/sintezaur/`
În repo există symlink-ul gitignored `planning/` către acel folder (accesul Claude e dat prin `permissions.additionalDirectories` în `.claude/settings.json`):

- `planning/docs/spec/spec.md` — spec-ul complet
- `planning/docs/planning/execution-plan.md` — planul de execuție pe milestones
- `planning/docs/STATUS.md` — **sursa de adevăr pentru hand-off între sesiuni**; convenție: ultimul pas al fiecărui commit de sub-fază este actualizarea acestui fișier
- `planning/docs/devops/tech-stack.md` — versiuni locked; se citește ÎNAINTE de orice `pnpm add` și se actualizează în același commit
- `planning/docs/testing/` — planurile de testare per milestone
- `planning/design-prototypes/` — prototipurile HTML/CSS versionate (fost `docs/design-imports/`); comentariile din cod le citează ca `planning/design-prototypes/<versiune>`

Nu crea fișiere de planning în repo. Excepție (input de runtime, rămâne în repo): `tools/scripts/seed-data/Seed List - Tezaur Gear Catalog v1.md`, citit de `pnpm seed:tezaur`.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
