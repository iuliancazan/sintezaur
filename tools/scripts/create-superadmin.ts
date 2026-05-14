import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import {
  createDatabase,
  createPool,
  userRoles,
  users,
} from '@sintezaur/db';

/**
 * Idempotent bootstrap of the `superadmin` user per spec §7.2.
 *
 * Reads SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD / SUPERADMIN_FULL_NAME
 * (+ optional SUPERADMIN_USERNAME) from env. Legacy FIRST_ADMIN_* are
 * still accepted as fallback so existing .env files keep working.
 *
 * Behavior:
 *   - If no user exists for that email: creates one and grants both
 *     `admin` and `superadmin`.
 *   - If the user exists but lacks `superadmin`: grants `superadmin`
 *     (and `admin` if missing). Password / profile unchanged.
 *   - If the user already holds `superadmin`: no-op.
 *
 * The created user has:
 *   - email_verified = true
 *   - trust_level    = 'email_verified'
 *   - must_change_password = false
 */
async function main() {
  const email = (
    process.env.SUPERADMIN_EMAIL ?? process.env.FIRST_ADMIN_EMAIL
  )
    ?.trim()
    .toLowerCase();
  const password =
    process.env.SUPERADMIN_PASSWORD ?? process.env.FIRST_ADMIN_PASSWORD;
  const fullName = (
    process.env.SUPERADMIN_FULL_NAME ?? process.env.FIRST_ADMIN_FULL_NAME
  )?.trim();
  const usernameInput = (
    process.env.SUPERADMIN_USERNAME ?? process.env.FIRST_ADMIN_USERNAME
  )
    ?.trim()
    .toLowerCase();

  if (!email || !password || !fullName) {
    console.error(
      '[create-superadmin] Missing SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD / SUPERADMIN_FULL_NAME in .env',
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error(
      '[create-superadmin] SUPERADMIN_PASSWORD must be at least 8 characters.',
    );
    process.exit(1);
  }
  const username = usernameInput ?? deriveUsername(email);
  if (!/^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/.test(username)) {
    console.error(
      `[create-superadmin] Derived username "${username}" is invalid. Set SUPERADMIN_USERNAME to a slug (3-30 chars, [a-z0-9_-]).`,
    );
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[create-superadmin] DATABASE_URL is not set.');
    process.exit(1);
  }

  const cost = Number.parseInt(process.env.BCRYPT_COST ?? '12', 10);
  const pool = createPool({ connectionString: databaseUrl });
  const db = createDatabase(pool);

  try {
    const conflicts = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
      })
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          or(
            sql`lower(${users.email}) = ${email}`,
            sql`lower(${users.username}) = ${username}`,
          ),
        ),
      );

    const emailMatch = conflicts.find((u) => u.email.toLowerCase() === email);
    let userId: string;

    if (emailMatch) {
      userId = emailMatch.id;
      console.log(
        `[create-superadmin] User ${emailMatch.email} already exists. Ensuring admin + superadmin grants.`,
      );
    } else {
      const usernameMatch = conflicts.find(
        (u) => u.username.toLowerCase() === username,
      );
      if (usernameMatch) {
        console.error(
          `[create-superadmin] Cannot create superadmin "${email}": username "${username}" is already taken by ${usernameMatch.email}.`,
        );
        console.error(
          '[create-superadmin] Set SUPERADMIN_USERNAME in .env to a different value, or grant superadmin to the existing user manually:',
        );
        console.error(
          `  psql "$DATABASE_URL" -c "INSERT INTO user_roles (user_id, role) VALUES ('${usernameMatch.id}'::uuid, 'superadmin') ON CONFLICT DO NOTHING;"`,
        );
        process.exit(1);
      }

      const passwordHash = await bcrypt.hash(password, cost);
      const [created] = await db
        .insert(users)
        .values({
          email,
          username,
          passwordHash,
          fullName,
          trustLevel: 'email_verified',
          emailVerified: true,
          mustChangePassword: false,
        })
        .returning({ id: users.id, email: users.email });
      userId = created.id;
      console.log(
        `[create-superadmin] Created user ${created.email} (${created.id}).`,
      );
    }

    // Idempotent grant: ON CONFLICT DO NOTHING (PK is (user_id, role)).
    const before = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));
    const held = new Set(before.map((r) => r.role));

    const toGrant = (['admin', 'superadmin'] as const).filter(
      (r) => !held.has(r),
    );
    if (toGrant.length === 0) {
      console.log(
        '[create-superadmin] User already holds admin + superadmin. No changes.',
      );
      return;
    }
    await db
      .insert(userRoles)
      .values(toGrant.map((role) => ({ userId, role })))
      .onConflictDoNothing();
    console.log(`[create-superadmin] Granted: ${toGrant.join(', ')}.`);
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
  console.error('[create-superadmin] failed:', err);
  process.exit(1);
});
