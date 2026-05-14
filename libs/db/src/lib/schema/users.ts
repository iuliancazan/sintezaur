import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  displayCurrencyEnum,
  subscriptionTierEnum,
  trustLevelEnum,
  userRoleEnum,
} from './enums';

/**
 * Core identity row. Spec §7.1 (auth flows), §7.2 (roles), §7.4 (trust
 * tiers), §7.12 (display currency), §9 (data model). All v0.3 columns
 * present from M1 even where the supporting flow ships later — saves
 * migration churn.
 *
 * Username + email are independent: email = login secret, username =
 * public handle (mentions, profile URL). Both case-insensitive unique
 * via lower() functional index in postflight SQL. `password_hash` is
 * nullable so future Google-only accounts can exist without setting a
 * local password.
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    /** bcryptjs hash. NULL = no local password (e.g. Google-only account post-MVP). */
    passwordHash: text('password_hash'),
    /** Public handle. Slug-safe (validated app-side: [a-z0-9_-], 3–30 chars). */
    username: text('username').notNull(),
    fullName: text('full_name').notNull(),

    trustLevel: trustLevelEnum('trust_level').notNull().default('unverified'),
    displayCurrency: displayCurrencyEnum('display_currency')
      .notNull()
      .default('ron'),
    subscriptionTier: subscriptionTierEnum('subscription_tier')
      .notNull()
      .default('free'),

    emailVerified: boolean('email_verified').notNull().default(false),

    /** E.164 phone (e.g. +40712345678). Verification flow lands post-MVP. */
    phoneE164: text('phone_e164'),
    phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),
    idVerifiedAt: timestamp('id_verified_at', { withTimezone: true }),

    /** Brute-force defense — bumped on bad login, reset on success. */
    failedLoginCount: integer('failed_login_count').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),

    /**
     * `mustChangePassword` is set when an admin bootstraps an account
     * with a temporary password (rare; first-admin path). Cleared on
     * the first successful `change-password` call.
     */
    mustChangePassword: boolean('must_change_password')
      .notNull()
      .default(false),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Soft delete per spec §7.11. Anonymization (PII redaction) on GDPR delete. */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    /** Audit pointer: who created this row (null = self-signup). */
    createdBy: uuid('created_by'),
  },
  (t) => [
    // Case-insensitive uniqueness on email + username, soft-delete aware.
    // The lower() functional index is created in a postflight SQL file
    // (9001_users_lower_indexes.sql) since drizzle-kit doesn't emit
    // expression indexes. Here we keep the plain uniqueIndex as a
    // belt-and-braces guard against case-exact duplicates.
    uniqueIndex('users_email_unique')
      .on(t.email)
      .where(sql`${t.deletedAt} IS NULL`),
    uniqueIndex('users_username_unique')
      .on(t.username)
      .where(sql`${t.deletedAt} IS NULL`),
    index('users_trust_level_idx').on(t.trustLevel),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

/**
 * Multi-valued role assignments per spec §7.2. A user holds any
 * combination of roles (e.g. `editor` + `curator`). `guest` is implicit
 * (no row) — never persisted here. Demotions take effect immediately
 * because `RolesGuard` re-reads this table on every authorized request.
 *
 * `granted_by` is NULL for system-initiated grants (e.g. auto-promotion
 * to `contributor` at 100 forum posts) and for the bootstrap superadmin
 * row created by the seed script.
 */
export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: userRoleEnum('role').notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Admin/superadmin who granted this role; NULL for system/auto grants. */
    grantedBy: uuid('granted_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.role] }),
    index('user_roles_role_idx').on(t.role),
  ],
);

export type UserRoleRow = typeof userRoles.$inferSelect;
export type NewUserRoleRow = typeof userRoles.$inferInsert;
