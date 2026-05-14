import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

/* ============================================================
   user_badge — objective-milestone badges per spec §7.4.

   Populated by a nightly cron in M5 (Forum) that scans user activity
   and awards badges. Categories (controlled by `category` string for
   forward-compat — no enum until the badge set stabilizes):
     membership / activity / content / collection / trade / trust

   Badges visible on profile only, never next to each post — explicit
   no-ranking signal.
   ============================================================ */
export const userBadges = pgTable(
  'user_badges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    /** Stable badge identifier (e.g. "first_listing", "100_posts", "year_of_membership"). */
    badgeKey: text('badge_key').notNull(),
    category: text('category').notNull(),

    /** Optional context — e.g. for "first_listing" badge: { listing_id: "..." }. */
    awardedFor: text('awarded_for'),

    awardedAt: timestamp('awarded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('user_badges_user_badge_unique').on(t.userId, t.badgeKey),
    index('user_badges_user_idx').on(t.userId, t.awardedAt),
  ],
);
export type UserBadge = typeof userBadges.$inferSelect;
export type NewUserBadge = typeof userBadges.$inferInsert;
