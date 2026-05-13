import 'dotenv/config';

/**
 * Idempotent first-admin bootstrap. Reads FIRST_ADMIN_EMAIL /
 * FIRST_ADMIN_PASSWORD / FIRST_ADMIN_FULL_NAME from env. Creates the
 * row only if it doesn't already exist; safe to invoke repeatedly
 * (Coolify pre-deployment hook target post-M1).
 *
 * For M0 the users table doesn't exist yet — this script is a stub
 * that fails loud if invoked before M1 lands the auth schema. The
 * real implementation lives next to libs/db/src/lib/schema/users.ts
 * once it ships.
 */

async function main() {
  const email = process.env.FIRST_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.FIRST_ADMIN_PASSWORD;
  const fullName = process.env.FIRST_ADMIN_FULL_NAME?.trim();

  if (!email || !password || !fullName) {
    console.error(
      '[create-first-admin] Missing FIRST_ADMIN_EMAIL / FIRST_ADMIN_PASSWORD / FIRST_ADMIN_FULL_NAME in .env',
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error(
      '[create-first-admin] FIRST_ADMIN_PASSWORD must be at least 8 characters.',
    );
    process.exit(1);
  }

  console.error(
    '[create-first-admin] Stub — the users table is not in the schema yet (lands in M1).',
  );
  console.error(
    '[create-first-admin] When M1 ships, this script will hash the password (bcryptjs) and INSERT the admin row.',
  );
  process.exit(1);
}

main().catch((err) => {
  console.error('[create-first-admin] failed:', err);
  process.exit(1);
});
