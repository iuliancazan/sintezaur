import { sql } from 'drizzle-orm';
import {
  check,
  decimal,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  auditLogActionEnum,
  contentReportStatusEnum,
  contentReportTargetEnum,
  displayCurrencyEnum,
  slugRedirectTargetEnum,
} from './enums';
import { users } from './users';

/* ============================================================
   user_block — bilateral block list per spec §7.4.

   Users block other users; effects:
   - blocked user can't message blocker
   - blocked user's listings hidden from blocker's Bazar lists
   - blocked user's forum posts replaced with "[Postare ascunsă]"
     with a "Show anyway" toggle (M5)
   ============================================================ */
export const userBlocks = pgTable(
  'user_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    blockerId: uuid('blocker_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedId: uuid('blocked_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('user_blocks_pair_unique').on(t.blockerId, t.blockedId),
    index('user_blocks_blocked_idx').on(t.blockedId),
    check(
      'user_blocks_not_self',
      sql`${t.blockerId} <> ${t.blockedId}`,
    ),
  ],
);
export type UserBlock = typeof userBlocks.$inferSelect;
export type NewUserBlock = typeof userBlocks.$inferInsert;

/* ============================================================
   user_email_history — audit trail of email changes.

   Each successful `change-email` writes one row. Used by support
   to verify a user controlled an older address, and by anti-abuse
   to detect rapid email churn.
   ============================================================ */
export const userEmailHistory = pgTable(
  'user_email_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    oldEmail: text('old_email').notNull(),
    newEmail: text('new_email').notNull(),
    /** Captured on the request that initiated the change. */
    ipAddress: text('ip_address'),
    changedAt: timestamp('changed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('user_email_history_user_idx').on(t.userId, t.changedAt)],
);
export type UserEmailHistoryRow = typeof userEmailHistory.$inferSelect;
export type NewUserEmailHistoryRow = typeof userEmailHistory.$inferInsert;

/* ============================================================
   content_report — unified abuse-report queue per spec §7.10.

   Polymorphic: `(target_type, target_id)` describes WHAT is being
   reported. Not a real FK (DB can't enforce across enum-discriminated
   tables); enforced at app boundary.

   Replaces v0.2 `forum_report`. M3 wires reports from Bazar
   (listing, message, gear_review). M5 adds forum_post / forum_thread
   / article_comment / user_profile.
   ============================================================ */
export const contentReports = pgTable(
  'content_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reporterId: uuid('reporter_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    targetType: contentReportTargetEnum('target_type').notNull(),
    targetId: uuid('target_id').notNull(),

    /** Free-text reason from reporter; reason category later (post-MVP). */
    reason: text('reason').notNull(),

    status: contentReportStatusEnum('status').notNull().default('open'),
    resolvedByUserId: uuid('resolved_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    resolutionNote: text('resolution_note'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    /** Mod queue: open reports first, newest first. */
    index('content_reports_status_idx').on(t.status, t.createdAt),
    /** Lookup "have I reported this already?". */
    uniqueIndex('content_reports_reporter_target_unique')
      .on(t.reporterId, t.targetType, t.targetId)
      .where(sql`${t.status} = 'open'`),
    index('content_reports_target_idx').on(t.targetType, t.targetId),
  ],
);
export type ContentReport = typeof contentReports.$inferSelect;
export type NewContentReport = typeof contentReports.$inferInsert;

/* ============================================================
   audit_log — privileged-action log per spec §7.10.

   Append-only (no UPDATE / DELETE in app code). Retained even when
   the `actor` user is deleted (legitimate-interest per §7.11). The
   `details` JSONB captures action-specific payload — for "hide_post"
   that's `{ reason: "...", post_excerpt: "..." }`.

   Polymorphic target same convention as `content_reports`.
   ============================================================ */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: auditLogActionEnum('action').notNull(),

    /** Polymorphic target (e.g. ("forum_post", "<uuid>")). */
    targetType: text('target_type'),
    targetId: uuid('target_id'),

    /** Action-specific structured payload. */
    details: jsonb('details').notNull().default(sql`'{}'::jsonb`),

    /** IP + UA captured at time of action. */
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('audit_log_actor_idx').on(t.actorId, t.createdAt),
    index('audit_log_action_idx').on(t.action, t.createdAt),
    index('audit_log_target_idx').on(t.targetType, t.targetId),
  ],
);
export type AuditLogRow = typeof auditLog.$inferSelect;
export type NewAuditLogRow = typeof auditLog.$inferInsert;

/* ============================================================
   slug_redirect — 30-day 301 redirects per spec §7.13.

   When admin/editor renames a gear / article / forum_thread, an
   entry lands here. Router middleware on `site` app reads this
   table before issuing 404. After `expires_at`, the row is archived
   and the URL serves 410 Gone.

   `target_type + target_id` is polymorphic (FK enforced app-side).
   ============================================================ */
export const slugRedirects = pgTable(
  'slug_redirects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetType: slugRedirectTargetEnum('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    oldSlug: text('old_slug').notNull(),
    newSlug: text('new_slug').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '30 days'`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    /** Active lookup: only one redirect per (type, old_slug) at a time. */
    uniqueIndex('slug_redirects_type_oldslug_unique').on(
      t.targetType,
      t.oldSlug,
    ),
    index('slug_redirects_target_idx').on(t.targetType, t.targetId),
    index('slug_redirects_expires_idx').on(t.expiresAt),
  ],
);
export type SlugRedirect = typeof slugRedirects.$inferSelect;
export type NewSlugRedirect = typeof slugRedirects.$inferInsert;

/* ============================================================
   currency_rate — manual monthly RON conversion table per spec §7.12.

   Admin updates monthly via dashboard (post-MVP: automated BNR/ECB
   feed). Newest row with `valid_from <= now()` per `currency_code`
   is the active rate.
   ============================================================ */
export const currencyRates = pgTable(
  'currency_rates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /**
     * Source currency. Stored as `display_currency` enum so the rate
     * column matches the same set we let users choose from. Note: RON
     * itself has no rate (always 1); only `eur` rows are meaningful.
     */
    currencyCode: displayCurrencyEnum('currency_code').notNull(),
    /** 1 unit of `currency_code` = `rate_to_ron` RON. */
    rateToRon: decimal('rate_to_ron', { precision: 10, scale: 4 }).notNull(),
    validFrom: timestamp('valid_from', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: uuid('updated_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('currency_rates_currency_validfrom_idx').on(
      t.currencyCode,
      t.validFrom,
    ),
  ],
);
export type CurrencyRate = typeof currencyRates.$inferSelect;
export type NewCurrencyRate = typeof currencyRates.$inferInsert;
