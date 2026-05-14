import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { and, isNull, sql } from 'drizzle-orm';
import {
  createDatabase,
  createPool,
  users,
} from '@sintezaur/db';

/**
 * Idempotent first-admin bootstrap. Reads FIRST_ADMIN_EMAIL /
 * FIRST_ADMIN_PASSWORD / FIRST_ADMIN_FULL_NAME (+ optional
 * FIRST_ADMIN_USERNAME) from env. Creates the row only if no admin
 * currently exists for that email — safe to invoke repeatedly
 * (Coolify pre-deployment hook).
 *
 * The admin is created with:
 *   - role = 'admin'
 *   - email_verified = true (skip the email click-through; admin is
 *     bootstrapped by an operator who already trusts the address)
 *   - trust_level = 'email_verified' (matches verified state)
 *   - must_change_password = false (operator chose the password)
 */
async function main() {
  const email = process.env.FIRST_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.FIRST_ADMIN_PASSWORD;
  const fullName = process.env.FIRST_ADMIN_FULL_NAME?.trim();
  const usernameInput = process.env.FIRST_ADMIN_USERNAME?.trim().toLowerCase();

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
  const username = usernameInput ?? deriveUsername(email);
  if (!/^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/.test(username)) {
    console.error(
      `[create-first-admin] Derived username "${username}" is invalid. Set FIRST_ADMIN_USERNAME to a slug (3-30 chars, [a-z0-9_-]).`,
    );
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[create-first-admin] DATABASE_URL is not set.');
    process.exit(1);
  }

  const cost = Number.parseInt(process.env.BCRYPT_COST ?? '12', 10);
  const pool = createPool({ connectionString: databaseUrl });
  const db = createDatabase(pool);

  try {
    // Case-insensitive lookup so re-running with a slightly different
    // casing doesn't insert a duplicate that the lower() index would
    // then reject.
    const [existing] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          sql`lower(${users.email}) = ${email}`,
        ),
      )
      .limit(1);

    if (existing) {
      console.log(
        `[create-first-admin] User ${existing.email} already exists (role=${existing.role}). No changes made.`,
      );
      return;
    }

    const passwordHash = await bcrypt.hash(password, cost);
    const [created] = await db
      .insert(users)
      .values({
        email,
        username,
        passwordHash,
        fullName,
        role: 'admin',
        trustLevel: 'email_verified',
        emailVerified: true,
        mustChangePassword: false,
      })
      .returning({ id: users.id, email: users.email });

    console.log(
      `[create-first-admin] Created admin ${created.email} (${created.id}).`,
    );
  } finally {
    await pool.end();
  }
}

function deriveUsername(email: string): string {
  const local = email.split('@')[0];
  return local
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
}

main().catch((err) => {
  console.error('[create-first-admin] failed:', err);
  process.exit(1);
});
