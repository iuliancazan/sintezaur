import { sql } from 'drizzle-orm';
import {
  integer,
  pgTable,
  index,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { forumCategoryKindEnum } from './enums';
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

/* ============================================================
   forum_categories — flat category list per spec §8.4.

   M4 introduces this table to host the `Discuții articole` system
   category (article auto-threads). M5 expands with user categories
   and per-category settings (subscription defaults, post-approval,
   etc.).
   ============================================================ */
export const forumCategories = pgTable(
  'forum_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Stable string id (e.g. `discutii_articole`) used by app code. */
    key: text('key').notNull(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    kind: forumCategoryKindEnum('kind').notNull().default('user'),
    /** Display order; system categories typically sink to the bottom. */
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('forum_categories_key_unique').on(t.key),
    uniqueIndex('forum_categories_slug_unique').on(t.slug),
    index('forum_categories_kind_position_idx').on(t.kind, t.position),
  ],
);
export type ForumCategory = typeof forumCategories.$inferSelect;
export type NewForumCategory = typeof forumCategories.$inferInsert;

/* ============================================================
   forum_threads — minimal in M4; expanded in M5 (locked/pinned/
   subscription level / first-post moderation). M4 only needs:
   create on article publish + list with reply count.
   ============================================================ */
export const forumThreads = pgTable(
  'forum_threads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => forumCategories.id, { onDelete: 'restrict' }),
    authorId: uuid('author_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    title: text('title').notNull(),

    /** Denormalized stats — kept fresh by M5 post-write hooks. */
    postCount: integer('post_count').notNull().default(0),
    lastPostAt: timestamp('last_post_at', { withTimezone: true }),

    /** M5 mod flags — present here so M5 doesn't need a migration. */
    pinnedAt: timestamp('pinned_at', { withTimezone: true }),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('forum_threads_slug_unique')
      .on(t.slug)
      .where(sql`${t.deletedAt} IS NULL`),
    index('forum_threads_category_recent_idx').on(
      t.categoryId,
      t.lastPostAt,
    ),
    index('forum_threads_author_idx').on(t.authorId),
  ],
);
export type ForumThread = typeof forumThreads.$inferSelect;
export type NewForumThread = typeof forumThreads.$inferInsert;
