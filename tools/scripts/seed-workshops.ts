import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { workshops } from '../../apps/workshops-api/src/db/schema';

/**
 * Idempotent seed for the first workshop (sequential-fourm). Creates the row
 * if missing; on an existing row it only fills in ABSENT password hashes and
 * never overwrites edits made through the panel.
 *
 * Dev default passwords (change them in the panel for anything real):
 *   guest: fourm-guest · admin: fourm-admin
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
    const existing = await db
      .select()
      .from(workshops)
      .where(eq(workshops.slug, slug));

    if (existing.length === 0) {
      await db.insert(workshops).values({
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
        guestPasswordHash: bcrypt.hashSync('fourm-guest', 12),
        adminPasswordHash: bcrypt.hashSync('fourm-admin', 12),
      });
      console.log(`[seed:workshops] created "${slug}" (dev passwords set).`);
      return;
    }

    const row = existing[0];
    const patch: Partial<typeof workshops.$inferInsert> = {};
    if (!row.guestPasswordHash) {
      patch.guestPasswordHash = bcrypt.hashSync('fourm-guest', 12);
    }
    if (!row.adminPasswordHash) {
      patch.adminPasswordHash = bcrypt.hashSync('fourm-admin', 12);
    }
    if (Object.keys(patch).length > 0) {
      await db.update(workshops).set(patch).where(eq(workshops.id, row.id));
      console.log(`[seed:workshops] "${slug}" existed — filled missing passwords.`);
    } else {
      console.log(`[seed:workshops] "${slug}" already seeded — nothing to do.`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[seed:workshops] failed:', err);
  process.exit(1);
});
