import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { gear } from './gear';
import { users } from './users';

/* ============================================================
   gear_review — Discogs-style independent gear ratings.

   Independent of any marketplace transaction (per spec §7.4). Any
   logged-in user can review any gear once. Rating 1–5.

   Soft delete via `hidden_at` for mod action; `deleted_at` for
   user-initiated removal — both keep the row so aggregates stay
   stable but exclude from public listing.
   ============================================================ */
export const gearReviews = pgTable(
  'gear_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gearId: uuid('gear_id')
      .notNull()
      .references(() => gear.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    rating: integer('rating').notNull(),
    body: text('body').notNull(),

    /** Optional: how long the reviewer has owned this gear (months). */
    ownershipMonths: integer('ownership_months'),

    /** Aggregate "helpful" votes from `gear_review_helpfuls` table (M3+). */
    helpfulCount: integer('helpful_count').notNull().default(0),

    /** Mod-hide per spec §7.11 — hidden but row preserved. */
    hiddenAt: timestamp('hidden_at', { withTimezone: true }),
    hiddenReason: text('hidden_reason'),
    /** User-initiated delete (own review). */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    /** One review per user per gear. Soft-deletes counted (no orphan re-review). */
    uniqueIndex('gear_reviews_user_gear_unique').on(t.userId, t.gearId),
    index('gear_reviews_gear_idx').on(
      t.gearId,
      t.hiddenAt,
      t.deletedAt,
      t.createdAt,
    ),
    check('gear_reviews_rating_range', sql`${t.rating} BETWEEN 1 AND 5`),
  ],
);

export type GearReview = typeof gearReviews.$inferSelect;
export type NewGearReview = typeof gearReviews.$inferInsert;
