import { sql } from 'drizzle-orm';
import {
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  forumPostStatusEnum,
  forumSubscriptionLevelEnum,
} from './enums';
import { forumCategories, forumThreads } from './foundation-forum';
import { gear } from './gear';
import { users } from './users';

const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'tsvector';
  },
});

/* ============================================================
   forum_posts — Tiptap JSON body + cached HTML, parent_post_id
   gives arbitrary nesting depth (renderer caps at 1 visible level
   per spec §8.4 "2-level hybrid").

   Numbering (`top_level_seq`, `sub_seq`) is stored — the OP is
   `top_level_seq = 0, sub_seq = NULL`; top-level replies are
   `top_level_seq = 1..N, sub_seq = NULL`; sub-replies are
   `top_level_seq = parent's seq, sub_seq = 1..M`. Stored so that
   hiding a post leaves stable references intact (`în răspuns la
   @user — #N.M` stays correct even when #N+1 is hidden).

   Soft delete pattern (spec §7.11): `hidden_at` is the mod hide
   ("visible placeholder, no body"); `deleted_at` is hard-er (no
   row visible at all — author self-delete or GDPR).
   ============================================================ */
export const forumPosts = pgTable(
  'forum_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => forumThreads.id, { onDelete: 'cascade' }),
    /** NULL = OP or top-level reply; set = sub-reply. */
    parentPostId: uuid('parent_post_id'),
    /** NULL when the row is author-deleted. */
    authorId: uuid('author_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    body: jsonb('body').notNull().default(sql`'{}'::jsonb`),
    bodyHtml: text('body_html').notNull().default(''),

    /**
     * Numbering per spec §8.4. OP = (0, NULL); top-level = (1..N, NULL);
     * sub-reply = (parent's seq, 1..M). The service computes both at
     * insert time inside a transaction.
     */
    topLevelSeq: integer('top_level_seq').notNull(),
    subSeq: integer('sub_seq'),

    status: forumPostStatusEnum('status').notNull().default('approved'),

    /** Edit window enforced service-side; columns are audit-only. */
    editedAt: timestamp('edited_at', { withTimezone: true }),
    editedByUserId: uuid('edited_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    /** Mod hide (visible placeholder, no body). */
    hiddenAt: timestamp('hidden_at', { withTimezone: true }),
    hiddenReason: text('hidden_reason'),
    hiddenByUserId: uuid('hidden_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    /** Author self-delete / GDPR (row remains, no surface anywhere). */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    /** Denormalized like counter — kept fresh by M5-E like service. */
    likeCount: integer('like_count').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** Populated by postflight generated tsvector column (9006). */
    searchVector: tsvector('search_vector'),
  },
  (t) => [
    /** Hot path: thread page chronological render. */
    index('forum_posts_thread_seq_idx').on(
      t.threadId,
      t.topLevelSeq,
      t.subSeq,
    ),
    /** "User's recent posts" surface. */
    index('forum_posts_author_recent_idx').on(t.authorId, t.createdAt),
    /** First-post approval queue scan. */
    index('forum_posts_status_idx')
      .on(t.status, t.createdAt)
      .where(sql`${t.status} = 'pending'`),
    /** Sub-reply lookup for "în răspuns la" expansion. */
    index('forum_posts_parent_idx').on(t.parentPostId),
    /** Numbering integrity within a thread. */
    uniqueIndex('forum_posts_thread_numbering_unique').on(
      t.threadId,
      t.topLevelSeq,
      t.subSeq,
    ),
  ],
);
export type ForumPost = typeof forumPosts.$inferSelect;
export type NewForumPost = typeof forumPosts.$inferInsert;

/* ============================================================
   forum_post_mentions — flat (post × mentioned_user) join.

   Inserted on post create (parsed from Tiptap JSON); re-synced on
   edit. Powers the `forum_mention` notification fan-out and the
   future "vezi toate mențiunile mele" feed.
   ============================================================ */
export const forumPostMentions = pgTable(
  'forum_post_mentions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => forumPosts.id, { onDelete: 'cascade' }),
    mentionedUserId: uuid('mentioned_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('forum_post_mentions_post_user_unique').on(
      t.postId,
      t.mentionedUserId,
    ),
    index('forum_post_mentions_user_recent_idx').on(
      t.mentionedUserId,
      t.createdAt,
    ),
  ],
);
export type ForumPostMention = typeof forumPostMentions.$inferSelect;
export type NewForumPostMention = typeof forumPostMentions.$inferInsert;

/* ============================================================
   forum_post_likes — single "Util" reaction per spec §8.4.

   Unique (user, post). No ranking effect — pure social signal.
   ============================================================ */
export const forumPostLikes = pgTable(
  'forum_post_likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => forumPosts.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('forum_post_likes_user_post_unique').on(t.userId, t.postId),
    index('forum_post_likes_post_idx').on(t.postId),
  ],
);
export type ForumPostLike = typeof forumPostLikes.$inferSelect;
export type NewForumPostLike = typeof forumPostLikes.$inferInsert;

/* ============================================================
   Subscription tables per spec §7.5 — three flavors (thread,
   category, gear) with real FK constraints. The level enum lives
   in `forumSubscriptionLevelEnum`.
   ============================================================ */
export const userThreadSubscriptions = pgTable(
  'user_thread_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => forumThreads.id, { onDelete: 'cascade' }),
    level: forumSubscriptionLevelEnum('level').notNull().default('watching'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('user_thread_subscriptions_user_thread_unique').on(
      t.userId,
      t.threadId,
    ),
    index('user_thread_subscriptions_thread_idx').on(t.threadId, t.level),
  ],
);
export type UserThreadSubscription =
  typeof userThreadSubscriptions.$inferSelect;
export type NewUserThreadSubscription =
  typeof userThreadSubscriptions.$inferInsert;

export const userCategorySubscriptions = pgTable(
  'user_category_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => forumCategories.id, { onDelete: 'cascade' }),
    level: forumSubscriptionLevelEnum('level').notNull().default('watching'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('user_category_subscriptions_user_category_unique').on(
      t.userId,
      t.categoryId,
    ),
    index('user_category_subscriptions_category_idx').on(
      t.categoryId,
      t.level,
    ),
  ],
);
export type UserCategorySubscription =
  typeof userCategorySubscriptions.$inferSelect;
export type NewUserCategorySubscription =
  typeof userCategorySubscriptions.$inferInsert;

export const userGearSubscriptions = pgTable(
  'user_gear_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    gearId: uuid('gear_id')
      .notNull()
      .references(() => gear.id, { onDelete: 'cascade' }),
    level: forumSubscriptionLevelEnum('level').notNull().default('watching'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('user_gear_subscriptions_user_gear_unique').on(
      t.userId,
      t.gearId,
    ),
    index('user_gear_subscriptions_gear_idx').on(t.gearId, t.level),
  ],
);
export type UserGearSubscription = typeof userGearSubscriptions.$inferSelect;
export type NewUserGearSubscription =
  typeof userGearSubscriptions.$inferInsert;

/* ============================================================
   badges — definitions for the M5-F cron + dashboard editor.

   `user_badges` (in foundation-forum.ts) is the awards join table;
   this is the canonical "what badges exist" registry. Admins can
   add badges from dashboard without a code deploy.

   `criteria` is a free-form jsonb so badge logic can evolve
   (`{ kind: 'post_count', threshold: 100 }` etc.); the M5-F cron
   knows how to interpret each shape.
   ============================================================ */
export const badges = pgTable(
  'badges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull(),
    nameRo: text('name_ro').notNull(),
    nameEn: text('name_en').notNull(),
    /** membership / activity / content / collection / trade / trust */
    category: text('category').notNull(),
    descriptionRo: text('description_ro'),
    descriptionEn: text('description_en'),
    criteria: jsonb('criteria').notNull().default(sql`'{}'::jsonb`),
    /** Display order on profile. */
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('badges_key_unique').on(t.key),
    index('badges_category_position_idx').on(t.category, t.position),
  ],
);
export type Badge = typeof badges.$inferSelect;
export type NewBadge = typeof badges.$inferInsert;
