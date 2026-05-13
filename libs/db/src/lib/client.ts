import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema';

/**
 * Sintezaur DB client. Wraps `pg.Pool` with Drizzle. Schema is bundled
 * so callers get typed `db.select().from(users)...` access via the
 * single `@sintezaur/db` import (no per-table re-imports).
 *
 * Real schema lands starting in M1 (users, sessions, tokens). For M0
 * the schema barrel is intentionally empty — drizzle-kit's
 * `generate` command treats an empty schema as a no-op, so no
 * migration files are produced until we actually define tables.
 */

export type SintezaurDb = NodePgDatabase<typeof schema>;

export function createPool(config: PoolConfig): Pool {
  return new Pool(config);
}

export function createDatabase(pool: Pool): SintezaurDb {
  return drizzle(pool, { schema });
}

export { schema };
