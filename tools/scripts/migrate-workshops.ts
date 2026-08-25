import 'dotenv/config';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

// Applies drizzle migrations for the workshops database. Simpler than the
// platform's migrate.ts on purpose: no pre/postflight SQL layer until a
// concrete need appears.
const MIGRATIONS_DIR = path.resolve(
  process.cwd(),
  'apps/workshops-api/src/db/migrations',
);

async function main() {
  const databaseUrl = process.env.WORKSHOPS_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('WORKSHOPS_DATABASE_URL is not set.');
  }
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const db = drizzle(pool);
    process.stdout.write('[migrate:workshops] applying migrations...\n');
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    process.stdout.write('[migrate:workshops] done.\n');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[migrate:workshops] failed:', err);
  process.exit(1);
});
