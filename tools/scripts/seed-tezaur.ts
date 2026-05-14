import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { gear, gearDescriptions, gearFamilies, users } from '@sintezaur/db';
import { slugFromParts, slugify, uniqueSlug } from '@sintezaur/shared';

/**
 * Seed the Tezaur catalog from
 * `docs/brainstorming/Seed List - Tezaur Gear Catalog v1.md`.
 *
 * Idempotent: matches on (brand, model) — re-running updates existing
 * rows in place rather than duplicating. Reads the FIRST_ADMIN_EMAIL
 * to attribute `created_by` (falls back to NULL when no admin yet).
 *
 * Run with:
 *   pnpm seed:tezaur
 */

const SEED_FILE = resolve(
  process.cwd(),
  'docs/brainstorming/Seed List - Tezaur Gear Catalog v1.md',
);

interface SeedRow {
  brand: string;
  model: string;
  category: string;
  type: string | null;
  yearReleased: number | null;
  yearDiscontinued: number | null;
  formFactor: string | null;
  msrpAtLaunchEur: number | null;
  rationale: string;
}

/* Map md `category` strings to schema enum values. */
const CATEGORY_MAP: Record<string, string> = {
  synthesizer: 'synthesizer',
  drum_machine: 'drum_machine',
  sampler: 'sampler',
  sequencer: 'sequencer',
  effect: 'effect',
  midi_controller: 'midi_controller',
  eurorack_module: 'eurorack_module',
  eurorack_case: 'eurorack_case',
  audio_interface: 'audio_interface',
  mixer: 'mixer',
  monitor: 'monitor',
  headphones: 'headphones',
  microphone: 'microphone',
  recorder: 'recorder',
  software_synth: 'software_synth',
  software_fx: 'software_fx',
  daw: 'daw',
  accessory: 'accessory',
  // Seed-only synonyms (md uses 'groovebox' as a category — we collapse
  // to `sampler` since that's how the schema treats grooveboxes).
  groovebox: 'sampler',
};

/* Map md `form_factor` strings. */
const FORM_FACTOR_MAP: Record<string, string> = {
  desktop: 'desktop',
  keyboard: 'keyboard',
  pedal: 'pedal',
  rack_unit: 'rack_unit',
  eurorack: 'eurorack',
  module: 'module',
  standalone: 'standalone',
  software: 'software',
};

/* Categories with a `type` sub-enum (per spec §8.1). */
const TYPE_SUB_ENUM_CATEGORIES = new Set([
  'synthesizer',
  'drum_machine',
  'sampler',
  'effect',
  'software_fx',
  'midi_controller',
  'eurorack_module',
]);

/* Hardcoded family suggestions — md doesn't include these. Brand+
   pattern detection groups variants of the same model line. */
const FAMILY_HINTS: { match: RegExp; name: string; slug: string }[] = [
  { match: /^Roland Juno/i, name: 'Roland Juno series', slug: 'roland-juno' },
  { match: /^Roland TR-/i, name: 'Roland TR drum machines', slug: 'roland-tr' },
  { match: /^Roland JP-/i, name: 'Roland Jupiter / Boutique', slug: 'roland-jp' },
  { match: /^Roland JD-/i, name: 'Roland JD synths', slug: 'roland-jd' },
  { match: /^Roland Aira/i, name: 'Roland Aira Compact', slug: 'roland-aira-compact' },
  { match: /^Korg Volca/i, name: 'Korg Volca series', slug: 'korg-volca' },
  { match: /^Korg Minilogue/i, name: 'Korg Minilogue series', slug: 'korg-minilogue' },
  { match: /^Korg MS-20/i, name: 'Korg MS-20 series', slug: 'korg-ms-20' },
  { match: /^Moog Subsequent/i, name: 'Moog Subsequent', slug: 'moog-subsequent' },
  { match: /^Moog Minimoog/i, name: 'Moog Minimoog', slug: 'moog-minimoog' },
  { match: /^Sequential Prophet/i, name: 'Sequential Prophet', slug: 'sequential-prophet' },
  { match: /^Yamaha Reface/i, name: 'Yamaha Reface', slug: 'yamaha-reface' },
  { match: /^Arturia Mini/i, name: 'Arturia Brute / Freak', slug: 'arturia-mini' },
  { match: /^Elektron Model/i, name: 'Elektron Model series', slug: 'elektron-model' },
  { match: /^Behringer (Model D|TD-3|Pro-1)/i, name: 'Behringer clones', slug: 'behringer-clones' },
  { match: /^Mutable Instruments/i, name: 'Mutable Instruments', slug: 'mutable-instruments' },
  { match: /^Make Noise/i, name: 'Make Noise', slug: 'make-noise' },
];

function parseSeedFile(content: string): SeedRow[] {
  const lines = content.split('\n');
  const rows: SeedRow[] = [];
  for (const line of lines) {
    if (!line.startsWith('| ') || line.startsWith('| brand') || line.startsWith('|---')) {
      continue;
    }
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 9) continue;
    const [brand, model, category, type, yearReleased, yearDiscontinued, formFactor, msrp, rationale] = cells;
    if (!brand || !model) continue;
    if (type === '—') continue; // header-ish guard
    rows.push({
      brand,
      model,
      category: CATEGORY_MAP[category] ?? category,
      type: type && type !== '—' ? type : null,
      yearReleased: yearReleased ? Number(yearReleased) : null,
      yearDiscontinued: yearDiscontinued ? Number(yearDiscontinued) : null,
      formFactor: formFactor ? FORM_FACTOR_MAP[formFactor] ?? null : null,
      msrpAtLaunchEur: msrp ? Number(msrp) : null,
      rationale,
    });
  }
  return rows;
}

function familyForRow(row: SeedRow): { name: string; slug: string } | null {
  const combined = `${row.brand} ${row.model}`;
  for (const hint of FAMILY_HINTS) {
    if (hint.match.test(combined)) return { name: hint.name, slug: hint.slug };
  }
  return null;
}

function descriptionStub(row: SeedRow): { body: object; bodyHtml: string } {
  // Tiptap-compatible doc shape: one paragraph from the rationale.
  // This is intentionally minimal — editors flesh out via dashboard.
  const paragraph = row.rationale.trim();
  const body = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: paragraph }],
      },
    ],
  };
  // bodyHtml mirrors body — single <p>, escaped.
  const escaped = paragraph
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return { body, bodyHtml: `<p>${escaped}</p>` };
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not set. Copy .env.example to .env first.');
  }

  const content = await readFile(SEED_FILE, 'utf8');
  const rows = parseSeedFile(content);
  console.log(`[seed-tezaur] parsed ${rows.length} entries from seed file`);

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  // Resolve admin actor for created_by attribution.
  let actorId: string | null = null;
  const adminEmail = process.env.FIRST_ADMIN_EMAIL;
  if (adminEmail) {
    const [admin] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          sql`lower(${users.email}) = ${adminEmail.toLowerCase()}`,
          isNull(users.deletedAt),
        ),
      )
      .limit(1);
    actorId = admin?.id ?? null;
  }
  console.log(`[seed-tezaur] actor: ${actorId ?? '(none — created_by NULL)'}`);

  // Phase 1: create families on demand.
  const familyIdBySlug = new Map<string, string>();
  for (const row of rows) {
    const family = familyForRow(row);
    if (!family || familyIdBySlug.has(family.slug)) continue;
    const [existing] = await db
      .select({ id: gearFamilies.id })
      .from(gearFamilies)
      .where(eq(gearFamilies.slug, family.slug))
      .limit(1);
    if (existing) {
      familyIdBySlug.set(family.slug, existing.id);
      continue;
    }
    const [inserted] = await db
      .insert(gearFamilies)
      .values({ slug: family.slug, name: family.name })
      .returning({ id: gearFamilies.id });
    familyIdBySlug.set(family.slug, inserted.id);
    console.log(`[seed-tezaur] family created: ${family.slug}`);
  }

  // Phase 2: gear rows (upsert by (brand, model)).
  let createdCount = 0;
  let updatedCount = 0;
  for (const row of rows) {
    const family = familyForRow(row);
    const familyId = family ? familyIdBySlug.get(family.slug) ?? null : null;

    const specs: Record<string, unknown> = {};
    if (row.type && TYPE_SUB_ENUM_CATEGORIES.has(row.category)) {
      specs.type = row.type;
    }

    // Find existing by (brand, model).
    const [existing] = await db
      .select({ id: gear.id, slug: gear.slug })
      .from(gear)
      .where(
        and(
          eq(gear.brand, row.brand),
          eq(gear.model, row.model),
          isNull(gear.deletedAt),
        ),
      )
      .limit(1);

    let gearId: string;
    if (existing) {
      await db
        .update(gear)
        .set({
          category: row.category as 'synthesizer',
          familyId,
          formFactor: row.formFactor as 'desktop' | null,
          yearReleased: row.yearReleased,
          yearDiscontinued: row.yearDiscontinued,
          msrpAtLaunchEur: row.msrpAtLaunchEur?.toString() ?? null,
          specs,
          updatedAt: new Date(),
          updatedBy: actorId,
        })
        .where(eq(gear.id, existing.id));
      gearId = existing.id;
      updatedCount++;
    } else {
      const slugCandidate = slugFromParts(row.brand, row.model);
      const slug = await uniqueSlug(slugCandidate, async (s) => {
        const probe = await db
          .select({ id: gear.id })
          .from(gear)
          .where(and(eq(gear.slug, s), isNull(gear.deletedAt)))
          .limit(1);
        return probe.length > 0;
      });
      const [inserted] = await db
        .insert(gear)
        .values({
          slug,
          published: true,
          category: row.category as 'synthesizer',
          brand: row.brand,
          model: row.model,
          familyId,
          formFactor: row.formFactor as 'desktop' | null,
          yearReleased: row.yearReleased,
          yearDiscontinued: row.yearDiscontinued,
          msrpAtLaunchEur: row.msrpAtLaunchEur?.toString() ?? null,
          specs,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ id: gear.id });
      gearId = inserted.id;
      createdCount++;
    }

    // Phase 3: editorial description stub (RO).
    const { body, bodyHtml } = descriptionStub(row);
    await db
      .insert(gearDescriptions)
      .values({
        gearId,
        lang: 'ro',
        body,
        bodyHtml,
        updatedBy: actorId,
      })
      .onConflictDoUpdate({
        target: [gearDescriptions.gearId, gearDescriptions.lang],
        set: { body, bodyHtml, updatedBy: actorId, updatedAt: new Date() },
      });
  }

  console.log(
    `[seed-tezaur] done: ${createdCount} created, ${updatedCount} updated, ${familyIdBySlug.size} families`,
  );
  await pool.end();
}

main().catch((err) => {
  console.error('[seed-tezaur] failed:', err);
  process.exit(1);
});
