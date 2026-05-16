import { sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Postgres `tsvector` — read-only on the app side. The column is
 * created by postflight SQL as a STORED generated column (see
 * `migrations/9002_gear_search.sql`). Drizzle just needs to know the
 * column exists so query helpers can reference it; we never write to
 * it from app code.
 */
const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'tsvector';
  },
});
import {
  formFactorEnum,
  gearCategoryEnum,
  gearLinkKindEnum,
  gearRelationshipTypeEnum,
  gearStateEnum,
  gearVideoProviderEnum,
  imageVariantEnum,
  localeEnum,
} from './enums';
import { users } from './users';

/* ============================================================
   gear_family — groups variants of a single model line.
   Example: "Roland Juno series" groups Juno-6, Juno-60, Juno-106.
   ============================================================ */
export const gearFamilies = pgTable(
  'gear_families',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Editor-set; auto-suggest from brand. */
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    /** Optional short description shown on a family overview page. */
    summary: text('summary'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('gear_families_slug_unique').on(t.slug)],
);

export type GearFamily = typeof gearFamilies.$inferSelect;
export type NewGearFamily = typeof gearFamilies.$inferInsert;

/* ============================================================
   gear — the core Tezaur entity.

   Common columns (spec §8.1) + JSONB `specs` for per-category
   structured fields. Category-specific shapes are application-side
   validation (DTOs); DB stores arbitrary JSON.

   Slug locked-after-publish per spec §7.13 — the locking is enforced
   in the service layer; DB stores plain text + unique index.
   ============================================================ */
export const gear = pgTable(
  'gear',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    /**
     * Legacy editorial flag — kept for backward compatibility and used
     * by `listPublic` / `findBySlug` to gate visibility. Set true when
     * `state` transitions to `approved`; false otherwise.
     */
    published: boolean('published').notNull().default(false),
    /**
     * Moderation lifecycle (spec §7.2 — community Tezaur contributions).
     * `draft` = author still editing; `submitted` = sent to curator
     * queue; `approved` = curator-published (also flips `published`);
     * `rejected` = sent back with `rejectionReason`, author may edit
     * and resubmit. Admin-created rows can land directly in `approved`
     * via the admin endpoint.
     */
    state: gearStateEnum('state').notNull().default('draft'),
    /** Curator's reason text when `state = 'rejected'`. NULL otherwise. */
    rejectionReason: text('rejection_reason'),
    /** Timestamp when contributor clicked "Trimite la moderare". */
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    /** Timestamp of last approve/reject decision. */
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    /** Curator/admin who last approved or rejected. */
    reviewedBy: uuid('reviewed_by').references(() => users.id, {
      onDelete: 'set null',
    }),

    /** Family grouping (optional — standalone items can have null). */
    familyId: uuid('family_id').references(() => gearFamilies.id, {
      onDelete: 'set null',
    }),

    category: gearCategoryEnum('category').notNull(),
    brand: text('brand').notNull(),
    model: text('model').notNull(),
    formFactor: formFactorEnum('form_factor'),

    yearReleased: integer('year_released'),
    /** NULL = still in production as of `updated_at`. */
    yearDiscontinued: integer('year_discontinued'),

    /** MSRP at launch, EUR (numeric per spec §7.12). NULL when unknown. */
    msrpAtLaunchEur: decimal('msrp_at_launch_eur', { precision: 12, scale: 2 }),

    /**
     * Per-category structured fields. Application-side DTOs validate
     * shape; DB stays permissive so new fields don't need migrations.
     * Synth + eurorack_module shapes are spec §8.1 locked.
     */
    specs: jsonb('specs').notNull().default(sql`'{}'::jsonb`),

    /** Aggregate from gear_review.rating — kept fresh by trigger or service hook. */
    avgRating: decimal('avg_rating', { precision: 3, scale: 2 }),
    reviewCount: integer('review_count').notNull().default(0),

    /** Materialized count of public-profile `user_gear_status` rows with `owned`. */
    ownersPublicCount: integer('owners_public_count').notNull().default(0),

    /** Latest known firmware version (text — "1.3.2"). NULL for software-only or unsupported items. */
    latestFirmwareVersion: text('latest_firmware_version'),
    firmwareNotesUrl: text('firmware_notes_url'),

    /**
     * Optional canonical Q&A thread (per spec §8.1). FK to a future
     * forum_thread row; nullable. Set NULL deferrable so schema can
     * forward-reference without an FK enforcement on a yet-to-land
     * table (real FK lands in M5 alongside forum_thread).
     */
    canonicalThreadId: uuid('canonical_thread_id'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Soft delete per spec §7.11 — usually `year_discontinued` instead. */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    updatedBy: uuid('updated_by').references(() => users.id, {
      onDelete: 'set null',
    }),

    /** Read-only — populated by postflight generated column. */
    searchVector: tsvector('search_vector'),
  },
  (t) => [
    uniqueIndex('gear_slug_unique')
      .on(t.slug)
      .where(sql`${t.deletedAt} IS NULL`),
    index('gear_category_idx').on(t.category),
    index('gear_brand_idx').on(t.brand),
    index('gear_family_idx').on(t.familyId),
    index('gear_year_released_idx').on(t.yearReleased),
    index('gear_published_idx').on(t.published, t.deletedAt),
    /** Surface "still in production" filter without scanning. */
    index('gear_in_production_idx').on(t.yearDiscontinued),
    /** Moderation queue listing (state=submitted ordered by submittedAt). */
    index('gear_state_idx').on(t.state, t.submittedAt),
    /** "My contributions" listing (created_by + state). */
    index('gear_created_by_state_idx').on(t.createdBy, t.state),
  ],
);

export type Gear = typeof gear.$inferSelect;
export type NewGear = typeof gear.$inferInsert;

/* ============================================================
   gear_description — locale-aware editorial body.

   Per spec §8.1 ships per (gear_id, lang). MVP populates `ro`;
   forward-compat for `en` instance per spec §7.3.

   `body` is Tiptap JSON (the editor source-of-truth); `body_html`
   is the SSR-friendly pre-rendered output that route handlers serve
   without re-rendering Tiptap on every request.
   ============================================================ */
export const gearDescriptions = pgTable(
  'gear_descriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gearId: uuid('gear_id')
      .notNull()
      .references(() => gear.id, { onDelete: 'cascade' }),
    lang: localeEnum('lang').notNull(),
    /** Tiptap JSON document. */
    body: jsonb('body').notNull().default(sql`'{}'::jsonb`),
    /** Pre-rendered HTML for SSR. */
    bodyHtml: text('body_html').notNull().default(''),
    updatedBy: uuid('updated_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('gear_descriptions_gear_lang_unique').on(t.gearId, t.lang),
  ],
);

export type GearDescription = typeof gearDescriptions.$inferSelect;
export type NewGearDescription = typeof gearDescriptions.$inferInsert;

/* ============================================================
   gear_image — uploaded photos with Sharp variants.

   One source upload produces multiple variant rows (one per
   `imageVariantEnum` value). All variants share `source_id` so a
   delete cascades; `position` orders the gallery within a gear.

   `path` is the on-disk filename relative to the storage root
   (env `STORAGE_ROOT`, default `./storage/uploads`). EXIF strip is
   done at upload time by the image service.
   ============================================================ */
export const gearImages = pgTable(
  'gear_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gearId: uuid('gear_id')
      .notNull()
      .references(() => gear.id, { onDelete: 'cascade' }),
    /**
     * Groups all variants of a single source upload. Same UUID across
     * `square_thumb`, `square_medium`, etc., for a given upload.
     */
    sourceId: uuid('source_id').notNull(),
    variant: imageVariantEnum('variant').notNull(),

    /** Path relative to STORAGE_ROOT (e.g. "gear/<gearId>/<sourceId>/square_thumb.jpg"). */
    path: text('path').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    mimeType: text('mime_type').notNull(),

    /** Editor caption (RO). Optional. */
    caption: text('caption'),
    /** Gallery order; only meaningful per gear, not per variant. */
    position: integer('position').notNull().default(0),

    uploadedBy: uuid('uploaded_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('gear_images_source_variant_unique').on(t.sourceId, t.variant),
    index('gear_images_gear_idx').on(t.gearId, t.position),
  ],
);

export type GearImage = typeof gearImages.$inferSelect;
export type NewGearImage = typeof gearImages.$inferInsert;

/* ============================================================
   gear_video — external embeds (YouTube, Vimeo, SoundCloud, Bandcamp).
   ============================================================ */
export const gearVideos = pgTable(
  'gear_videos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gearId: uuid('gear_id')
      .notNull()
      .references(() => gear.id, { onDelete: 'cascade' }),
    provider: gearVideoProviderEnum('provider').notNull(),
    /** Provider-specific identifier (YouTube video ID, etc.). */
    externalId: text('external_id').notNull(),
    title: text('title'),
    position: integer('position').notNull().default(0),
    addedBy: uuid('added_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('gear_videos_gear_idx').on(t.gearId, t.position)],
);

export type GearVideo = typeof gearVideos.$inferSelect;
export type NewGearVideo = typeof gearVideos.$inferInsert;

/* ============================================================
   gear_link — external links (manual PDF, Wikipedia, manufacturer
   site, affiliate URLs, firmware notes, etc.).
   ============================================================ */
export const gearLinks = pgTable(
  'gear_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gearId: uuid('gear_id')
      .notNull()
      .references(() => gear.id, { onDelete: 'cascade' }),
    kind: gearLinkKindEnum('kind').notNull(),
    url: text('url').notNull(),
    /** Display label (e.g. "Manual PDF — 24 pagini"). */
    label: text('label'),
    /** Optional vendor name for affiliate links. */
    vendor: text('vendor'),
    position: integer('position').notNull().default(0),
    addedBy: uuid('added_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('gear_links_gear_idx').on(t.gearId, t.position)],
);

export type GearLink = typeof gearLinks.$inferSelect;
export type NewGearLink = typeof gearLinks.$inferInsert;

/* ============================================================
   gear_relationship — directed typed links between gear rows.
   Per spec §8.1: successor / variant / inspired_by / based_on / replaces.
   ============================================================ */
export const gearRelationships = pgTable(
  'gear_relationships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentGearId: uuid('parent_gear_id')
      .notNull()
      .references(() => gear.id, { onDelete: 'cascade' }),
    childGearId: uuid('child_gear_id')
      .notNull()
      .references(() => gear.id, { onDelete: 'cascade' }),
    type: gearRelationshipTypeEnum('type').notNull(),
    /** Optional editor note (e.g. "successor in same chassis"). */
    note: text('note'),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('gear_relationships_unique_triple').on(
      t.parentGearId,
      t.childGearId,
      t.type,
    ),
    index('gear_relationships_parent_idx').on(t.parentGearId, t.type),
    index('gear_relationships_child_idx').on(t.childGearId, t.type),
  ],
);

export type GearRelationship = typeof gearRelationships.$inferSelect;
export type NewGearRelationship = typeof gearRelationships.$inferInsert;
