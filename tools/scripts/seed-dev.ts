import 'dotenv/config';

/**
 * Idempotent dev-data seed.
 *
 * Empty for M0 — no tables exist yet. Each milestone wires its own
 * seed data:
 *   - M2: 50–100 Tezaur gear entries (see tools/scripts/seed-tezaur.ts
 *         when it lands; this orchestrator can stay or be replaced)
 *   - M3: a few Bazar listings + a transaction in each lifecycle state
 *   - M4: 2–3 published articles (one with rich Tiptap content)
 *   - M5: a few seeded forum threads
 *
 * Always idempotent — slug / email-based existence checks per insert.
 */

const log = (...args: unknown[]) =>
  process.stdout.write(args.join(' ') + '\n');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not set. Copy .env.example to .env first.');
  }

  log('[seed] no-op for M0 — nothing to seed until milestones add tables.');
  log('[seed] done.');
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
