import { sql } from 'drizzle-orm';
import {
  bigint,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { articles } from './articles';
import { forumPosts } from './forum';
import { users } from './users';

/* ============================================================
   M7 — Storage refactor schema.

   Six new tables, all created in the postflight migration
   `9013_storage_schema.sql`. The schema types here exist so Drizzle
   query builders are typed; the actual DDL is raw idempotent SQL so
   we don't have to dance with the drizzle-kit journal.

   - storage_limits        — admin-editable size caps per (scope × type × module)
   - user_upload_quota     — per-user running counters (daily + lifetime)
   - storage_events        — append-only audit log of every put
   - storage_folder_stats  — incremental rollups (module × resource_id)
   - forum_post_attachments     — Forum audio/PDF/ZIP attachments (max 3/post)
   - revista_article_attachments — Revista audio/PDF/ZIP (no hard cap)
   ============================================================ */

/**
 * Quota scope. `per_file` caps a single upload; `per_user_daily` is
 * the rolling-day cap; `per_user_lifetime_alert` is the threshold at
 * which the admin + user get notified once.
 */
export const storageLimitScopeEnum = pgEnum('storage_limit_scope', [
  'per_file',
  'per_user_daily',
  'per_user_lifetime_alert',
]);
export type StorageLimitScope =
  (typeof storageLimitScopeEnum.enumValues)[number];

/**
 * File type bucket. Mirrors the four pipelines: images, audio, PDFs,
 * ZIPs. `*` is a wildcard — used by `per_user_daily` /
 * `per_user_lifetime_alert` rows that aren't tied to a specific type.
 */
export const storageFileTypeEnum = pgEnum('storage_file_type', [
  'image',
  'audio',
  'pdf',
  'zip',
  '*',
]);
export type StorageFileType =
  (typeof storageFileTypeEnum.enumValues)[number];

/**
 * Module bucket. Mirrors the four feature areas plus avatars. `*` is
 * the wildcard for cross-cutting limits (e.g. per-user-daily).
 */
export const storageModuleEnum = pgEnum('storage_module', [
  'tezaur',
  'bazar',
  'revista',
  'forum',
  'avatar',
  '*',
]);
export type StorageModuleValue =
  (typeof storageModuleEnum.enumValues)[number];

/**
 * Attachment kind for Forum + Revista attachments. Images live in
 * their own tables (`gear_images`, `listing_photos`, `article_images`)
 * and have Sharp variants — these three live here verbatim, no
 * re-encode.
 */
export const storageAttachmentKindEnum = pgEnum('storage_attachment_kind', [
  'audio',
  'pdf',
  'zip',
]);
export type StorageAttachmentKind =
  (typeof storageAttachmentKindEnum.enumValues)[number];

/* ============================================================
   storage_limits — admin-editable cap config.

   Single row per (scope, file_type, module) triple. Lookup uses an
   ordered fallback: exact match first, then wildcards. Read-heavy /
   write-rare — guard caches the table in-memory for 5 min.
   ============================================================ */
export const storageLimits = pgTable(
  'storage_limits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: storageLimitScopeEnum('scope').notNull(),
    fileType: storageFileTypeEnum('file_type').notNull(),
    module: storageModuleEnum('module').notNull(),
    maxBytes: bigint('max_bytes', { mode: 'number' }).notNull(),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: uuid('updated_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  (t) => [
    uniqueIndex('storage_limits_scope_type_module_unique').on(
      t.scope,
      t.fileType,
      t.module,
    ),
  ],
);
export type StorageLimit = typeof storageLimits.$inferSelect;
export type NewStorageLimit = typeof storageLimits.$inferInsert;

/* ============================================================
   user_upload_quota — per-user running counters.

   `daily_bytes` resets to 0 nightly via pg-boss cron at 00:00 UTC.
   `lifetime_bytes` never resets; `notified_lifetime_at` is set the
   first time the user crosses the lifetime-alert threshold.
   ============================================================ */
export const userUploadQuota = pgTable('user_upload_quota', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  dailyBytes: bigint('daily_bytes', { mode: 'number' }).notNull().default(0),
  lifetimeBytes: bigint('lifetime_bytes', { mode: 'number' })
    .notNull()
    .default(0),
  lastResetAt: timestamp('last_reset_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  notifiedLifetimeAt: timestamp('notified_lifetime_at', {
    withTimezone: true,
  }),
});
export type UserUploadQuota = typeof userUploadQuota.$inferSelect;
export type NewUserUploadQuota = typeof userUploadQuota.$inferInsert;

/* ============================================================
   storage_events — append-only audit log.

   One row per successful put. Indexed on `(module, created_at)` and
   `(user_id, created_at)` for fast aggregations. Reconciliation
   compares the sum here vs the R2 ListObjects totals.

   `purpose` examples: 'photo', 'thumbnail', 'cover', 'attachment',
   'avatar'. Free-text on purpose — feature areas pick their own.
   ============================================================ */
export const storageEvents = pgTable(
  'storage_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    module: storageModuleEnum('module').notNull(),
    resourceId: text('resource_id'),
    purpose: text('purpose').notNull(),
    objectKey: text('object_key').notNull(),
    bytes: bigint('bytes', { mode: 'number' }).notNull(),
    contentType: text('content_type').notNull(),
    fileType: storageFileTypeEnum('file_type').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('storage_events_module_created_idx').on(t.module, t.createdAt),
    index('storage_events_user_created_idx').on(t.userId, t.createdAt),
    index('storage_events_resource_idx').on(t.module, t.resourceId),
  ],
);
export type StorageEvent = typeof storageEvents.$inferSelect;
export type NewStorageEvent = typeof storageEvents.$inferInsert;

/* ============================================================
   storage_folder_stats — materialized rollup keyed by (module ×
   resource_id). Updated incrementally on every put + delete; full
   recompute happens during nightly reconciliation.
   ============================================================ */
export const storageFolderStats = pgTable(
  'storage_folder_stats',
  {
    module: storageModuleEnum('module').notNull(),
    resourceId: text('resource_id').notNull(),
    totalBytes: bigint('total_bytes', { mode: 'number' }).notNull().default(0),
    fileCount: integer('file_count').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('storage_folder_stats_pk').on(t.module, t.resourceId),
  ],
);
export type StorageFolderStat = typeof storageFolderStats.$inferSelect;
export type NewStorageFolderStat = typeof storageFolderStats.$inferInsert;

/* ============================================================
   forum_post_attachments — audio/PDF/ZIP attached to a Forum post.
   Hard cap of 3 per post enforced service-side.
   ============================================================ */
export const forumPostAttachments = pgTable(
  'forum_post_attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => forumPosts.id, { onDelete: 'cascade' }),
    uploadedBy: uuid('uploaded_by').references(() => users.id, {
      onDelete: 'set null',
    }),

    kind: storageAttachmentKindEnum('kind').notNull(),
    objectKey: text('object_key').notNull(),
    originalFilename: text('original_filename').notNull(),
    contentType: text('content_type').notNull(),
    bytes: bigint('bytes', { mode: 'number' }).notNull(),
    contentHash: text('content_hash').notNull(),

    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('forum_post_attachments_post_idx').on(t.postId, t.position),
    uniqueIndex('forum_post_attachments_key_unique').on(t.objectKey),
  ],
);
export type ForumPostAttachment = typeof forumPostAttachments.$inferSelect;
export type NewForumPostAttachment =
  typeof forumPostAttachments.$inferInsert;

/* ============================================================
   revista_article_attachments — audio/PDF/ZIP attached to a Revista
   article. No hard cap on count — per-user daily / lifetime quotas
   are the only ceilings.
   ============================================================ */
export const revistaArticleAttachments = pgTable(
  'revista_article_attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    uploadedBy: uuid('uploaded_by').references(() => users.id, {
      onDelete: 'set null',
    }),

    kind: storageAttachmentKindEnum('kind').notNull(),
    objectKey: text('object_key').notNull(),
    originalFilename: text('original_filename').notNull(),
    contentType: text('content_type').notNull(),
    bytes: bigint('bytes', { mode: 'number' }).notNull(),
    contentHash: text('content_hash').notNull(),
    /** Optional editor-provided caption (shown next to the player / link). */
    caption: text('caption'),

    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('revista_article_attachments_article_idx').on(
      t.articleId,
      t.position,
    ),
    uniqueIndex('revista_article_attachments_key_unique').on(t.objectKey),
  ],
);
export type RevistaArticleAttachment =
  typeof revistaArticleAttachments.$inferSelect;
export type NewRevistaArticleAttachment =
  typeof revistaArticleAttachments.$inferInsert;

/**
 * Sentinel string for `audit_log.action` rows logged by the
 * reconciliation cron. Not part of the `audit_log_action` enum (avoids
 * a migration each time we add a storage-side audit type) — the cron
 * logs into a separate `storage_audit` table once it lands in M7-B.
 * Kept here as a constant so the migration + cron share the value.
 */
export const STORAGE_DRIFT_AUDIT_KEY = 'storage_drift';
