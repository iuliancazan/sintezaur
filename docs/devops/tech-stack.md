# Sintezaur — Tech Stack (Locked Versions)

**Status:** AUTHORITATIVE — these versions are locked and identical to those running in `musical-deeds`. Do not experiment with version bumps or alternatives without explicit approval.

**Source of truth:** `~/DevWorkspace/my-projects/musical-deeds/package.json` (last synced 2026-05-13). When in doubt, diff against that file.

**Rule for any AI coding agent working on Sintezaur:**
1. Use the exact versions listed below.
2. Do not add new dependencies without updating this file first.
3. Do not run `pnpm update` or change version specifiers unless explicitly asked.
4. If a dep is missing from this list, ask before installing — likely it's intentional.

---

## Environment

```
node:    >=22.12.0
pnpm:    >=10.0.0
pinned:  pnpm@10.33.2 (via packageManager field in package.json)
```

---

## Scripts (verbatim from package.json)

```json
"scripts": {
  "api":              "CI=true nx serve api",
  "worker":           "CI=true nx serve worker",
  "site":             "CI=true nx serve site",
  "dashboard":        "CI=true nx serve dashboard",
  "migrate":          "tsx tools/scripts/migrate.ts",
  "migrate:generate": "drizzle-kit generate",
  "seed:superadmin":  "tsx tools/scripts/create-superadmin.ts",
  "seed:dev":         "tsx tools/scripts/guards/dev-only.ts && tsx tools/scripts/seed-dev.ts",
  "lint":             "nx run-many --target=lint",
  "test":             "nx run-many --target=test",
  "typecheck":        "nx run-many --target=typecheck",
  "build":            "nx run-many --target=build",
  "scrub":            "rm -rf dist/out-tsc dist/libs node_modules/.cache/tsc-build .nx/cache && nx reset"
}
```

Note: `seed:yt-sessions` from Mudee is Mudee-specific — drop it from Sintezaur. Add Sintezaur-specific seed scripts as needed (e.g., `seed:tezaur` for the 50–100 gear entries).

---

## Dependencies (production)

### Framework — Angular 21.2
```json
"@angular/animations":        "~21.2.10",
"@angular/common":            "~21.2.0",
"@angular/compiler":          "~21.2.0",
"@angular/core":              "~21.2.0",
"@angular/forms":             "~21.2.0",
"@angular/platform-browser":  "~21.2.0",
"@angular/router":            "~21.2.0"
```

### Framework — NestJS 11
```json
"@nestjs/common":            "^11.0.0",
"@nestjs/config":            "^4.0.4",
"@nestjs/core":              "^11.0.0",
"@nestjs/jwt":               "^11.0.2",
"@nestjs/mapped-types":      "^2.1.1",
"@nestjs/passport":          "^11.0.5",
"@nestjs/platform-express":  "^11.0.0",
"@nestjs/throttler":         "^6.4.0"
```

### UI — PrimeNG 21 + PrimeUix themes
```json
"@primeuix/themes":  "^1.2.5",
"primeflex":         "^4.0.0",
"primeicons":        "^7.0.0",
"primeng":           "^21.1.6"
```

### Rich text editor — Tiptap 3
```json
"@tiptap/core":                  "^3.22.5",
"@tiptap/extension-link":        "^3.22.5",
"@tiptap/extension-placeholder": "^3.22.5",
"@tiptap/starter-kit":           "^3.22.5"
```

**To add later in M2/M3/M4** (versions must match the `^3.22.5` family — same major+minor):
- `@tiptap/extension-image`
- `@tiptap/extension-youtube`
- Custom oEmbed node (in-house, no extra package — built as a NodeExtension in `libs/ui`)
- Optionally `@tiptap/extension-code-block-lowlight` (only if Forum syntax-highlighted blocks materialize)
- Optionally `@tiptap/extension-mention` for `@username` in Forum (M5)

### Database — PostgreSQL via pg + Drizzle ORM
```json
"drizzle-orm":  "^0.36.4",
"pg":           "^8.20.0"
```

### Background jobs — pg-boss (Postgres-native, no Redis)
```json
"pg-boss": "^10.4.2"
```

### Auth — Passport JWT + bcryptjs
```json
"bcryptjs":              "^2.4.3",
"passport":              "^0.7.0",
"passport-jwt":          "^4.0.1",
"passport-local":        "^1.0.0",
"passport-google-oauth20": "^2.0.0"
```

Note: `passport-google-oauth20` is installed but Google OAuth is **NOT wired** in MVP. Avoids package-version drift when we enable it post-MVP.

### HTTP / utility
```json
"axios":            "^1.6.0",
"class-transformer":"^0.5.1",
"class-validator":  "^0.15.1",
"cookie-parser":    "^1.4.7",
"dotenv":           "^17.4.2",
"helmet":           "^8.0.0",
"reflect-metadata": "^0.1.13",
"rxjs":             "^7.8.0"
```

### File handling — Multer + Sharp
```json
"multer": "^2.1.1",
"sharp":  "^0.33.5"
```

### Email — Nodemailer
```json
"nodemailer": "^8.0.7"
```

### Logging — Pino
```json
"nestjs-pino": "^4.6.1",
"pino":        "^9.14.0",
"pino-http":   "^10.5.0"
```

---

## Dev dependencies

### Nx 22.7 (monorepo tooling)
```json
"@nx/angular":     "22.7.0",
"@nx/devkit":      "22.7.0",
"@nx/eslint":      "22.7.0",
"@nx/eslint-plugin":"22.7.0",
"@nx/jest":        "22.7.0",
"@nx/js":          "22.7.0",
"@nx/nest":        "22.7.0",
"@nx/node":        "22.7.0",
"@nx/playwright":  "22.7.0",
"@nx/vite":        "22.7.0",
"@nx/vitest":      "22.7.0",
"@nx/web":         "22.7.0",
"@nx/webpack":     "22.7.0",
"nx":              "22.7.0"
```

### Angular tooling (21.2)
```json
"@analogjs/vite-plugin-angular": "~2.1.2",
"@analogjs/vitest-angular":      "~2.1.2",
"@angular-devkit/core":          "~21.2.0",
"@angular-devkit/schematics":    "~21.2.0",
"@angular/build":                "~21.2.0",
"@angular/cli":                  "~21.2.0",
"@angular/compiler-cli":         "~21.2.0",
"@angular/language-service":     "~21.2.0",
"angular-eslint":                "^21.2.0",
"@schematics/angular":           "~21.2.0"
```

### NestJS tooling
```json
"@nestjs/schematics": "^11.0.0",
"@nestjs/testing":    "^11.0.0"
```

### TypeScript + linting
```json
"@eslint/js":               "^9.8.0",
"@typescript-eslint/utils": "^8.40.0",
"eslint":                   "^9.8.0",
"eslint-config-prettier":   "^10.0.0",
"eslint-plugin-playwright": "^1.6.2",
"jsonc-eslint-parser":      "^2.1.0",
"prettier":                 "^3.8.1",
"typescript":               "~5.9.2",
"typescript-eslint":        "^8.40.0"
```

### Compiler / runtime helpers
```json
"@oxc-project/runtime":  "^0.115.0",
"@swc-node/register":    "1.11.1",
"@swc/core":             "1.15.8",
"@swc/helpers":          "0.5.18",
"tslib":                 "^2.3.0",
"tsx":                   "^4.21.0",
"ts-node":               "10.9.1"
```

### Drizzle migrations
```json
"drizzle-kit": "^0.30.6"
```

### Testing — Jest + Vitest + Playwright
```json
"@playwright/test":        "^1.36.0",
"@vitest/coverage-v8":     "~4.1.0",
"@vitest/ui":              "~4.1.0",
"jest":                    "^30.0.2",
"jest-environment-node":   "^30.0.2",
"jest-util":               "^30.0.2",
"jsdom":                   "^27.1.0",
"ts-jest":                 "^29.4.0",
"vite":                    "^8.0.0",
"vitest":                  "^4.0.8"
```

### Build / bundling
```json
"webpack-cli": "^5.1.4"
```

### Types (devDependencies)
```json
"@types/bcryptjs":              "^2.4.6",
"@types/cookie-parser":         "^1.4.7",
"@types/express":               "^5.0.6",
"@types/jest":                  "^30.0.0",
"@types/multer":                "^2.1.0",
"@types/node":                  "20.19.9",
"@types/nodemailer":            "^8.0.0",
"@types/passport-google-oauth20": "^2.0.17",
"@types/passport-jwt":          "^4.0.1",
"@types/passport-local":        "^1.0.38",
"@types/pg":                    "^8.20.0"
```

---

## pnpm build-trust list

```json
"pnpm": {
  "onlyBuiltDependencies": [
    "@nestjs/core",
    "@parcel/watcher",
    "@swc/core",
    "esbuild",
    "less",
    "lmdb",
    "msgpackr-extract",
    "nx",
    "sharp",
    "unrs-resolver"
  ]
}
```

Critical: pnpm 10.x defaults to NOT running postinstall scripts. The list above tells pnpm which packages are trusted to run postinstalls. Without this, `sharp` and others fail with cryptic errors.

---

## What's NOT in the stack (deliberate exclusions)

These were considered and explicitly rejected per spec §10. Do not install:

| Tool | Why not |
|------|---------|
| Redis | Postgres + LISTEN/NOTIFY + in-memory throttler are sufficient at MVP scale (see spec §10). |
| Meilisearch / Typesense / Elasticsearch | Postgres FT + `pg_trgm` is sufficient. Add only if a concrete UX bottleneck appears. |
| AWS SDK / S3 client | Storage stays on Hetzner local volume (Coolify-mounted). Future: Hetzner Storage Box (S3-compatible) — at that point install `@aws-sdk/client-s3`. |
| Backblaze SDK | Same reason. |
| Stripe / payment SDK | No payments in MVP. |
| BullMQ / Bull | Replaced by `pg-boss` (Postgres-native). |
| Socket.io standalone | Use `@nestjs/websockets` which wraps Socket.io — but we don't add `socket.io` directly; let NestJS pull the right version. |
| Any captcha library (reCAPTCHA, hCaptcha) | Honeypot + time-on-form + rate limits + first-post approval is the explicit anti-spam stack (spec §8.4). |

If a future need arises for any of these, update this doc and the spec §10 table BEFORE installing.

---

## Adding new dependencies — workflow

1. Confirm the dep isn't in the "deliberate exclusions" list above.
2. Pick a version that matches the Node/Angular/NestJS major versions in use.
3. If unsure, look at how `musical-deeds` handles a similar need.
4. Update this file with the new entry under the right section.
5. Update spec.md §10 if it's a major tech-decision-level change (new database, new framework, etc.).
6. THEN run `pnpm add <package>@<version>`.

Do not skip step 1–5 just because pnpm makes installs easy. The whole point of this doc is to prevent silent stack drift.

---

## Sync protocol with musical-deeds

When `musical-deeds/package.json` updates (Iulian bumps a version or adds a dep), and we want to mirror:

1. Diff `musical-deeds/package.json` against this file.
2. Decide which changes to adopt (some Mudee features won't apply to Sintezaur — e.g., YouTube API, Discogs API).
3. Update this file.
4. Update Sintezaur's `package.json` to match.
5. Run `pnpm install --frozen-lockfile` and verify all 4 apps still build.

Don't blindly copy — Mudee may install things for features Sintezaur doesn't need.
