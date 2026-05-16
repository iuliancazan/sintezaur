import { sql } from 'drizzle-orm';
import {
  boolean,
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
  articleCategoryEnum,
  articleStatusEnum,
  imageVariantEnum,
} from './enums';
import { gear } from './gear';
import { users } from './users';

const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'tsvector';
  },
});

/* ============================================================
   articles — Revista CMS rows per spec §8.3.

   Tiptap JSON lives in `body`; we cache the SSR-rendered HTML in
   `body_html` so the public detail page can pass it straight to
   `[innerHTML]` without re-rendering on every request.

   `tags` is a free-text array (spec §8.3 — "free tags + structured
   gear_tag[]"). Structured links to Tezaur live in `article_gear`.

   `slug` is globally unique among non-archived rows; locked the moment
   `status` first flips to `published` (enforced service-side, the same
   way gear/listing slugs work).

   `thread_id` is filled when an article is published — points to the
   minimal `forum_threads` row auto-created in the `Discuții articole`
   system category.
   ============================================================ */
export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),

    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    title: text('title').notNull(),
    excerpt: text('excerpt'),

    /** Tiptap JSON document; rendered to body_html at write time. */
    body: jsonb('body').notNull().default(sql`'{}'::jsonb`),
    bodyHtml: text('body_html').notNull().default(''),

    /**
     * Optional English translation (M16). NULL when the editor hasn't
     * translated this article; readers on the EN locale fall back to
     * the RO body with a "translation pending" banner.
     */
    titleEn: text('title_en'),
    excerptEn: text('excerpt_en'),
    bodyEn: jsonb('body_en'),
    bodyHtmlEn: text('body_html_en'),

    category: articleCategoryEnum('category').notNull(),
    /** Free-text tags — keyword filter only, not a controlled vocab. */
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),

    /** Hero image source_id (refers to article_images.source_id). */
    heroSourceId: uuid('hero_source_id'),

    status: articleStatusEnum('status').notNull().default('draft'),

    /** Per-status timestamps. */
    publishedAt: timestamp('published_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),

    /** Forum thread created on publish (FK app-side — M5 lands the table fully). */
    threadId: uuid('thread_id'),

    /** Premium-gated content — false in MVP; schema-ready for paid tier. */
    isPremium: boolean('is_premium').notNull().default(false),

    /** Lightweight view counter (bot-filtered SSR hit increment). */
    viewCount: integer('view_count').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** Read-only — populated by a postflight generated tsvector column. */
    searchVector: tsvector('search_vector'),
  },
  (t) => [
    uniqueIndex('articles_slug_unique')
      .on(t.slug)
      .where(sql`${t.status} <> 'archived'`),
    /** Public list: published articles by recency. */
    index('articles_status_published_idx').on(t.status, t.publishedAt),
    /** Author profile listing. */
    index('articles_author_status_idx').on(t.authorId, t.status),
    /** Category index page (Reviews / Tutorials / News / etc.). */
    index('articles_category_published_idx').on(t.category, t.publishedAt),
  ],
);
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;

/* ============================================================
   article_gear — M2M between articles and Tezaur gear (spec §8.3).

   Surfaces on `/tezaur/:slug` as "Articles mentioning this gear" and
   on the article detail page as a "Featured gear" sidebar.
   ============================================================ */
export const articleGear = pgTable(
  'article_gear',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    gearId: uuid('gear_id')
      .notNull()
      .references(() => gear.id, { onDelete: 'cascade' }),
    /** 0 = most-relevant; lets editors order the gear sidebar manually. */
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('article_gear_pair_unique').on(t.articleId, t.gearId),
    index('article_gear_article_idx').on(t.articleId, t.position),
    index('article_gear_gear_idx').on(t.gearId),
  ],
);
export type ArticleGear = typeof articleGear.$inferSelect;
export type NewArticleGear = typeof articleGear.$inferInsert;

/* ============================================================
   article_images — Sharp-processed images uploaded inside Tiptap
   (hero + inline). Same `(source_id, variant)` pattern as gear /
   listing photos: one source upload spawns N variant rows.
   ============================================================ */
export const articleImages = pgTable(
  'article_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id').notNull(),
    variant: imageVariantEnum('variant').notNull(),

    path: text('path').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    mimeType: text('mime_type').notNull(),

    caption: text('caption'),
    /** Inline ordering — only meaningful when the editor cares. */
    position: integer('position').notNull().default(0),

    uploadedAt: timestamp('uploaded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('article_images_source_variant_unique').on(
      t.sourceId,
      t.variant,
    ),
    index('article_images_article_idx').on(t.articleId, t.position),
  ],
);
export type ArticleImage = typeof articleImages.$inferSelect;
export type NewArticleImage = typeof articleImages.$inferInsert;

/* ============================================================
   user_followed_categories — per spec §7.5 ("Article published in
   a category I follow"). One row per (user × revista category).

   Kept minimal: the publish fan-out reads followers by category and
   posts `revista_article_in_followed_category` to each. No nesting,
   no per-channel knobs here — those live in `notification_preferences`.
   ============================================================ */
export const userFollowedCategories = pgTable(
  'user_followed_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category: articleCategoryEnum('category').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('user_followed_categories_user_category_unique').on(
      t.userId,
      t.category,
    ),
    index('user_followed_categories_category_idx').on(t.category),
  ],
);
export type UserFollowedCategory =
  typeof userFollowedCategories.$inferSelect;
export type NewUserFollowedCategory =
  typeof userFollowedCategories.$inferInsert;
