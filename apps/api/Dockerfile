# apps/api/Dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder

# Sharp needs vips on alpine
RUN apk add --no-cache vips-dev python3 make g++

WORKDIR /app

# Enable corepack — pnpm version is pinned via the `packageManager` field
# in package.json (read after the COPY below). Don't `prepare pnpm@latest`,
# that drift broke a deploy when pnpm 10.x tightened ERR_PNPM_IGNORED_BUILDS
# behavior in non-interactive mode.
RUN corepack enable

# Copy dependency manifests
# Note: no pnpm-workspace.yaml — Nx uses a single-root package.json,
# libs are wired via tsconfig.base.json `paths` aliases.
# Both tsconfig.json AND tsconfig.base.json are required: Nx 22's
# @nx/js:typescript-sync generator looks for the root tsconfig.json
# during build and aborts if it's missing.
COPY package.json pnpm-lock.yaml nx.json tsconfig.base.json tsconfig.json ./

# Copy all apps and libs (Nx needs full context for build)
COPY apps/api ./apps/api
COPY libs ./libs
# tools/scripts is needed by the runtime stage for `pnpm migrate`
COPY tools ./tools

# Install dependencies. Trusted lifecycle scripts (sharp, esbuild, nx, etc.)
# are listed in `package.json:pnpm.onlyBuiltDependencies` — that's how pnpm
# 10.x knows which postinstalls to run. Pinning the pnpm version via the
# `packageManager` field is what keeps this stable across deploys.
RUN pnpm install --frozen-lockfile

# Build the API
RUN pnpm exec nx build api --configuration=production

# Stage 2: Production runtime
FROM node:22-alpine AS runner

# Sharp runtime needs vips
RUN apk add --no-cache vips

WORKDIR /app

# Enable corepack — version is pinned via package.json `packageManager`.
RUN corepack enable

# Copy built artifacts and minimal runtime files
COPY --from=builder /app/dist/apps/api ./dist/apps/api
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy lib sources + root tsconfigs so `tsx` can resolve the
# `@sintezaur/db`, `@sintezaur/auth`, `@sintezaur/shared`, `@sintezaur/ui`
# path aliases at runtime when executing scripts like:
#   pnpm migrate      (tools/scripts/migrate.ts)
#   pnpm seed:admin   (tools/scripts/create-first-admin.ts)
#   pnpm seed:dev     (tools/scripts/seed-dev.ts)
# This also includes libs/db/src/lib/migrations, so no separate
# COPY for the migrations directory is needed.
COPY --from=builder /app/libs ./libs
COPY --from=builder /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/tools/scripts ./tools/scripts

# Create uploads directory.
#
# IMPORTANT: in production this MUST be backed by a persistent volume.
# Without one, every redeploy / restart wipes uploaded photos —
# user-visible as broken images on gear pages. Coolify volume mount
# config: target = /app/storage/uploads. Set UPLOADS_DIR env var if
# pointing at a different path.
RUN mkdir -p /app/storage/uploads
VOLUME ["/app/storage/uploads"]

ENV NODE_ENV=production
EXPOSE 3000

# Run migrations, then start API
CMD ["sh", "-c", "pnpm migrate && node dist/apps/api/main.js"]
