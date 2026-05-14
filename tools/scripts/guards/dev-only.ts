import 'dotenv/config';

/**
 * Refuses to run if DATABASE_URL doesn't point at a local Postgres
 * (localhost / 127.0.0.1) or if NODE_ENV=production.
 *
 * Used as a chained pre-step on dev-only scripts in package.json:
 *   "seed:dev": "tsx tools/scripts/guards/dev-only.ts && tsx tools/scripts/seed-dev.ts"
 *
 * Scripts that MUST run on prod don't get this guard:
 *   - `pnpm migrate`    (Coolify pre-deployment hook)
 *   - `pnpm seed:superadmin` (idempotent superadmin bootstrap on prod)
 */

const url = process.env.DATABASE_URL ?? '';
const isLocal = url.includes('localhost') || url.includes('127.0.0.1');
const isProd = process.env.NODE_ENV === 'production';

const redact = (u: string) => u.replace(/:[^@/]+@/, ':***@');

if (isProd || !isLocal) {
  console.error('❌ Refusing to run: this script is dev-only.');
  console.error('');
  console.error(`   DATABASE_URL : ${url ? redact(url) : '(unset)'}`);
  console.error(`   NODE_ENV     : ${process.env.NODE_ENV ?? '(unset)'}`);
  console.error('');
  if (isProd) {
    console.error('   NODE_ENV is "production".');
  }
  if (!isLocal) {
    console.error('   DATABASE_URL does not point at localhost / 127.0.0.1.');
  }
  console.error('');
  console.error('   Set DATABASE_URL to a local Postgres and ensure');
  console.error('   NODE_ENV is unset or "development" before retrying.');
  process.exit(1);
}

console.log('✓ dev-only guard passed (local DB).');
