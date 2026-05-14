import { sql } from 'drizzle-orm';
import {
  check,
  decimal,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  displayCurrencyEnum,
  transactionStatusEnum,
} from './enums';
import { listingMessageThreads, messages } from './messaging';
import { listings } from './listings';
import { users } from './users';

/* ============================================================
   transactions — buyer/seller bilateral confirmation of a sale.

   Created the moment the first party clicks "Confirmă tranzacția"
   (one row per thread; subsequent clicks update the confirmed_*
   timestamps). When both parties have confirmed, status flips to
   `confirmed`, the listing.status flips to `sold`, and a system
   message is inserted in the thread.

   Final agreed price is captured here (may differ from listing.price
   after offer negotiation) so price-history aggregations stay
   accurate when listing price gets edited later.
   ============================================================ */
export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => listingMessageThreads.id, { onDelete: 'cascade' }),

    sellerId: uuid('seller_id')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
    buyerId: uuid('buyer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),

    status: transactionStatusEnum('status').notNull().default('pending'),

    /** Final agreed price (may differ from listing.price after offers). */
    finalPrice: decimal('final_price', { precision: 12, scale: 2 }).notNull(),
    currency: displayCurrencyEnum('currency').notNull(),

    /** Optional FK to the accepted offer message, when present. */
    acceptedOfferMessageId: uuid('accepted_offer_message_id').references(
      () => messages.id,
      { onDelete: 'set null' },
    ),

    sellerConfirmedAt: timestamp('seller_confirmed_at', { withTimezone: true }),
    buyerConfirmedAt: timestamp('buyer_confirmed_at', { withTimezone: true }),
    /** Set when status flips to `confirmed` — opens the 30-day review window. */
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelReason: text('cancel_reason'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    /** One pending transaction per thread; re-opening lands in same row. */
    uniqueIndex('transactions_thread_unique').on(t.threadId),
    index('transactions_seller_status_idx').on(t.sellerId, t.status),
    index('transactions_buyer_status_idx').on(t.buyerId, t.status),
    check(
      'transactions_buyer_seller_distinct',
      sql`${t.buyerId} <> ${t.sellerId}`,
    ),
  ],
);
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

/* ============================================================
   transaction_reviews — bilateral, one row per (transaction, reviewer)
   pair. Both buyer and seller may submit one review of the other
   within 30 days of `confirmed_at`.

   Aggregates roll up to each user's profile via a service hook on
   insert / hidden_at change.
   ============================================================ */
export const transactionReviews = pgTable(
  'transaction_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    /** Who is writing the review. */
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Who is being reviewed. */
    revieweeId: uuid('reviewee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    rating: integer('rating').notNull(),
    body: text('body').notNull(),

    /** Soft-hide for moderator action (spec §7.11). */
    hiddenAt: timestamp('hidden_at', { withTimezone: true }),
    hiddenReason: text('hidden_reason'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    /** One review per direction per transaction. */
    uniqueIndex('transaction_reviews_txn_reviewer_unique').on(
      t.transactionId,
      t.reviewerId,
    ),
    index('transaction_reviews_reviewee_idx').on(t.revieweeId, t.createdAt),
    check(
      'transaction_reviews_rating_range',
      sql`${t.rating} BETWEEN 1 AND 5`,
    ),
    check(
      'transaction_reviews_reviewer_not_reviewee',
      sql`${t.reviewerId} <> ${t.revieweeId}`,
    ),
  ],
);
export type TransactionReview = typeof transactionReviews.$inferSelect;
export type NewTransactionReview = typeof transactionReviews.$inferInsert;

/* ============================================================
   user_review_aggregate — denormalized roll-up per user. Maintained
   by a service hook on transaction_reviews insert / hidden_at change.
   Reading the user profile shouldn't trigger a GROUP BY scan of the
   reviews table every time.
   ============================================================ */
export const userReviewAggregate = pgTable(
  'user_review_aggregate',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Sum of visible review ratings / count = avgRating. Kept as numeric(3,2). */
    avgRating: decimal('avg_rating', { precision: 3, scale: 2 }),
    reviewCount: integer('review_count').notNull().default(0),
    /** Lifetime confirmed transactions where user was buyer OR seller. */
    transactionCount: integer('transaction_count').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);
export type UserReviewAggregate = typeof userReviewAggregate.$inferSelect;
export type NewUserReviewAggregate = typeof userReviewAggregate.$inferInsert;
