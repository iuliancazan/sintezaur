import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const MIGRATIONS_DIR = path.resolve(
  process.cwd(),
  'libs/db/src/lib/migrations',
);

/**
 * Drizzle-kit only tracks files listed in `meta/_journal.json`. Hand-written
 * `*.sql` files that are NOT in the journal need to be applied manually around
 * drizzle's pass.
 *
 * Naming convention:
 *   - `0xxx_*.sql`  → preflight (runs BEFORE drizzle). Use for extensions,
 *                     triggers, functions that must exist before drizzle tries
 *                     to use them (e.g. `pgcrypto`, `pg_trgm` in M2).
 *   - `9xxx_*.sql`  → postflight (runs AFTER drizzle). Use for indexes/views/
 *                     triggers that reference columns drizzle just created
 *                     (e.g. GIN tsvector index on gear in M2).
 *
 * Hand-written SQL must be idempotent (`IF NOT EXISTS`, `CREATE OR REPLACE`).
 */
async function applyRawMigrations(
  pool: Pool,
  trackedTags: Set<string>,
  phase: 'pre' | 'post',
): Promise<void> {
  let files: string[];
  try {
    files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .filter((f) => !trackedTags.has(f.replace(/\.sql$/, '')))
      .filter((f) => (phase === 'pre' ? f.startsWith('0') : f.startsWith('9')))
      .sort();
  } catch {
    // Migrations dir might not exist on a brand-new clone — that's fine.
    return;
  }

  for (const file of files) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    process.stdout.write(`[migrate] ${phase}flight: ${file}\n`);
    await pool.query(sql);
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set.');
  }
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const journalPath = path.join(MIGRATIONS_DIR, 'meta', '_journal.json');
    let trackedTags = new Set<string>();
    try {
      const journalRaw = await readFile(journalPath, 'utf8');
      const journal = JSON.parse(journalRaw) as { entries: { tag: string }[] };
      trackedTags = new Set(journal.entries.map((e) => e.tag));
    } catch {
      // No drizzle migrations yet — that's fine on a fresh schema.
    }

    await applyRawMigrations(pool, trackedTags, 'pre');

    if (trackedTags.size > 0) {
      const db = drizzle(pool);
      process.stdout.write('[migrate] applying drizzle-tracked migrations...\n');
      await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    } else {
      process.stdout.write(
        '[migrate] no drizzle migrations yet (schema empty). Run `pnpm migrate:generate` after defining schema.\n',
      );
    }

    await applyRawMigrations(pool, trackedTags, 'post');

    process.stdout.write('[migrate] done.\n');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
