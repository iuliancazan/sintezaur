# apps/dashboard/Dockerfile
# Stage 1: Build the Angular admin SPA
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm. Pinned to major 10 to match the lockfile and the
# `engines.pnpm: ">=10.0.0"` constraint in package.json. Avoids
# surprise behavior changes if pnpm 11+ ships during a redeploy.
RUN corepack enable

# Copy dependency manifests.
# - No pnpm-workspace.yaml (Nx uses single-root package.json; libs via tsconfig paths).
# - Both tsconfig.base.json AND tsconfig.json are required: Nx 22's
#   @nx/js:typescript-sync generator looks for the root tsconfig.json
#   during build and aborts if it's missing.
COPY package.json pnpm-lock.yaml nx.json tsconfig.base.json tsconfig.json ./

# Copy the dashboard app + all libs (Nx needs full context for build)
COPY apps/dashboard ./apps/dashboard
COPY libs ./libs

# Install all dependencies (devDeps included — needed for build tooling).
# NODE_ENV must NOT be set to "production" here, or pnpm skips devDeps.
RUN pnpm install --frozen-lockfile

# Build the dashboard for production.
# Output lands at /app/dist/apps/dashboard/browser (Angular 21 application builder).
# fileReplacements in project.json swaps environment.ts → environment.prod.ts.
RUN pnpm exec nx build dashboard --configuration=production

# Stage 2: Runtime — nginx serves the static files
FROM nginx:alpine AS runner

# Custom nginx config: SPA routing, cache headers, gzip.
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the static build output.
COPY --from=builder /app/dist/apps/dashboard/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
