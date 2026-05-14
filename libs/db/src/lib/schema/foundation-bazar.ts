import { sql } from 'drizzle-orm';
import {
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
  displayCurrencyEnum,
  savedSearchNotifyModeEnum,
  savedSearchTargetEnum,
} from './enums';
import { users } from './users';

/* ============================================================
   user_listing_watch — Bazar hearts.

   Schema lives here (M2 foundation) so M3 doesn't need a migration
   to wire the heart button. `listing_id` is a forward-reference to
   the M3 listing table — FK enforced application-side until M3
   lands the listing schema.
   ============================================================ */
export const userListingWatches = pgTable(
  'user_listing_watches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Forward-ref to `listings.id` (lands in M3). */
    listingId: uuid('listing_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('user_listing_watches_user_listing_unique').on(
      t.userId,
      t.listingId,
    ),
    index('user_listing_watches_listing_idx').on(t.listingId),
  ],
);
export type UserListingWatch = typeof userListingWatches.$inferSelect;
export type NewUserListingWatch = typeof userListingWatches.$inferInsert;

/* ============================================================
   saved_search — persisted filter queries per spec §8.2.

   MVP populates only Bazar saved searches; the table is generic via
   `target` enum so future Tezaur / Forum saved searches reuse it.

   `query` is a JSON snapshot of the URL search params at save time
   ({ gear_id, condition, max_price, currency, kind, ... }). The
   evaluator service reads this on listing INSERT/UPDATE and queues
   match notifications.

   Cap 50 per user enforced application-side (env
   `SAVED_SEARCH_MAX_PER_USER`).
   ============================================================ */
export const savedSearches = pgTable(
  'saved_searches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    target: savedSearchTargetEnum('target').notNull().default('bazar'),
    /** User-given title (defaults to "Search 1", "Search 2", etc.). */
    name: text('name').notNull(),
    /** Frozen search-params snapshot — see service for the shape. */
    query: jsonb('query').notNull().default(sql`'{}'::jsonb`),

    /** spec §8.2: instant / daily_digest / off. */
    notifyMode: savedSearchNotifyModeEnum('notify_mode')
      .notNull()
      .default('instant'),

    /** Last time the evaluator ran for this search. */
    lastEvaluatedAt: timestamp('last_evaluated_at', { withTimezone: true }),
    /** Last time the user got a notification from this search. */
    lastNotifiedAt: timestamp('last_notified_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('saved_searches_user_idx').on(t.userId, t.target, t.createdAt),
  ],
);
export type SavedSearch = typeof savedSearches.$inferSelect;
export type NewSavedSearch = typeof savedSearches.$inferInsert;

/* ============================================================
   listing_price_history — every Bazar listing price UPDATE writes
   here (Drizzle service helper, no app code writes directly).

   Powers spec §8.1 price-history chart on Tezaur detail pages and
   the price-drop notification trigger in M3.

   Forward-ref to listings.id (M3) — FK app-side.
   ============================================================ */
export const listingPriceHistory = pgTable(
  'listing_price_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id').notNull(),
    oldPrice: decimal('old_price', { precision: 12, scale: 2 }),
    newPrice: decimal('new_price', { precision: 12, scale: 2 }).notNull(),
    currency: displayCurrencyEnum('currency').notNull(),
    changedAt: timestamp('changed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('listing_price_history_listing_changed_idx').on(
      t.listingId,
      t.changedAt,
    ),
  ],
);
export type ListingPriceHistoryRow =
  typeof listingPriceHistory.$inferSelect;
export type NewListingPriceHistoryRow =
  typeof listingPriceHistory.$inferInsert;
