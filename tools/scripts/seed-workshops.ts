import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  workshopAccounts,
  workshops,
} from '../../apps/workshops-api/src/db/schema';

/**
 * Idempotent seed for the first workshop (sequential-fourm) and its two
 * default accounts. Existing rows are never overwritten — the panel owns
 * them after creation.
 *
 * Dev default accounts (change the passwords in the panel for anything real):
 *   guest / fourm-guest  ·  admin / fourm-admin
 */
async function main() {
  const databaseUrl = process.env.WORKSHOPS_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('WORKSHOPS_DATABASE_URL is not set.');
  }
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);
  try {
    const slug = 'sequential-fourm';
    let rows = await db
      .select()
      .from(workshops)
      .where(eq(workshops.slug, slug));

    if (rows.length === 0) {
      rows = await db
        .insert(workshops)
        .values({
          slug,
          titleEn: 'Intro to Synthesis',
          titleRo: 'Intro to Synthesis',
          subtitleEn:
            'A crash course in subtractive synthesis, on the Sequential Fourm',
          subtitleRo:
            'Un crash course de sinteză subtractivă, pe Sequential Fourm',
          eventDate: '2026-09-21',
          venue: 'Club Control, București',
          published: true,
          guestSeesSlides: false,
        })
        .returning();
      console.log(`[seed:workshops] created "${slug}".`);
    }
    const workshop = rows[0];

    const defaults = [
      { username: 'guest', role: 'guest', password: 'fourm-guest' },
      { username: 'admin', role: 'admin', password: 'fourm-admin' },
    ];
    for (const acc of defaults) {
      const existing = await db
        .select({ id: workshopAccounts.id })
        .from(workshopAccounts)
        .where(
          and(
            eq(workshopAccounts.workshopId, workshop.id),
            eq(workshopAccounts.username, acc.username),
          ),
        );
      if (existing.length === 0) {
        await db.insert(workshopAccounts).values({
          workshopId: workshop.id,
          username: acc.username,
          role: acc.role,
          passwordHash: bcrypt.hashSync(acc.password, 12),
        });
        console.log(
          `[seed:workshops] created account "${acc.username}" (${acc.role}).`,
        );
      }
    }
    console.log('[seed:workshops] done.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[seed:workshops] failed:', err);
  process.exit(1);
});
