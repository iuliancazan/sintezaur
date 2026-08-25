# apps/workshops-api/Dockerfile
# One service for workshops.sintezaur.ro: NestJS serves the built Angular
# SPA behind the session gate (workshops-spec.md §3/§13).
# Stage 1: Build
FROM node:22-alpine AS builder

# Match the api image's toolchain (some transitive deps build natively).
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Enable corepack — pnpm version is pinned via the `packageManager` field
# in package.json (read after the COPY below).
RUN corepack enable

# Both tsconfig.json AND tsconfig.base.json are required by Nx 22's build.
COPY package.json pnpm-lock.yaml nx.json tsconfig.base.json tsconfig.json ./
COPY eslint.config.mjs ./eslint.config.mjs

# Full build context for the two workshops apps (+ tools for runtime scripts).
COPY apps/workshops ./apps/workshops
COPY apps/workshops-api ./apps/workshops-api
COPY libs ./libs
COPY tools ./tools
COPY drizzle-workshops.config.ts ./drizzle-workshops.config.ts

RUN pnpm install --frozen-lockfile

# Build SPA + API.
RUN pnpm exec nx build workshops --configuration=production
RUN pnpm exec nx build workshops-api --configuration=production

# Stage 2: Production runtime
FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable

COPY --from=builder /app/dist/apps/workshops-api ./dist/apps/workshops-api
COPY --from=builder /app/dist/apps/workshops ./dist/apps/workshops
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Runtime scripts: pnpm migrate:workshops + pnpm seed:workshops (idempotent).
COPY --from=builder /app/tools/scripts ./tools/scripts
COPY --from=builder /app/apps/workshops-api/src/db ./apps/workshops-api/src/db
COPY --from=builder /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/drizzle-workshops.config.ts ./drizzle-workshops.config.ts

ENV NODE_ENV=production
EXPOSE 3300

# Migrate, seed the first workshop if missing (idempotent), then serve.
CMD ["sh", "-c", "pnpm migrate:workshops && pnpm seed:workshops && node dist/apps/workshops-api/main.js"]
