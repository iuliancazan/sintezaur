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
  varchar,
} from 'drizzle-orm/pg-core';
import {
  displayCurrencyEnum,
  imageVariantEnum,
  listingConditionEnum,
  listingDeliveryEnum,
  listingKindEnum,
  listingStatusEnum,
  shippingCarrierEnum,
} from './enums';
import { gear } from './gear';
import { users } from './users';

const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'tsvector';
  },
});

/* ============================================================
   listings — Bazar marketplace listings per spec §8.2.

   `gear_id` is nullable: when set, the listing inherits brand/model
   from the Tezaur catalog. When null, `raw_make`/`raw_model`/`raw_year`
   carry the seller's free-text input — feeds the post-MVP AI
   consolidation pipeline.

   Slug is globally unique (per §7.13). Locked on `published` transition
   (enforced service-side, the same way gear works).
   ============================================================ */
export const listings = pgTable(
  'listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),

    sellerId: uuid('seller_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    /** Optional FK to the catalog — nullable for free-text listings. */
    gearId: uuid('gear_id').references(() => gear.id, {
      onDelete: 'set null',
    }),
    rawMake: text('raw_make'),
    rawModel: text('raw_model'),
    rawYear: integer('raw_year'),

    title: text('title').notNull(),
    /** Optional one-line subtitle ("what's different about this exemplar") shown above the description in the V07 sell page. */
    tagline: varchar('tagline', { length: 200 }),
    /** Tiptap JSON document; rendered to bodyHtml at write time. */
    description: jsonb('description').notNull().default(sql`'{}'::jsonb`),
    descriptionHtml: text('description_html').notNull().default(''),
    /** Free-form "known defects" note. Distinct from conditionNote (which is only required for `condition='mint'`). */
    defects: text('defects'),

    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    currency: displayCurrencyEnum('currency').notNull().default('ron'),

    condition: listingConditionEnum('condition').notNull(),
    /** Required when condition='mint' (≥50 chars). Validated service-side. */
    conditionNote: text('condition_note'),

    kind: listingKindEnum('kind').notNull().default('sell'),
    /** Free-text "I'm looking for X" — populated when kind != 'sell'. */
    lookingFor: text('looking_for'),

    delivery: listingDeliveryEnum('delivery').notNull().default('pickup_only'),
    shippingCost: decimal('shipping_cost', { precision: 12, scale: 2 }),
    shippingCarriers: shippingCarrierEnum('shipping_carriers')
      .array()
      .notNull()
      .default(sql`ARRAY[]::shipping_carrier[]`),

    acceptsOffers: boolean('accepts_offers').notNull().default(false),

    /** Romanian city. Future: structured location with geocoding. */
    location: text('location').notNull(),
    /** Optional seller-public phone override (per spec §8.2). */
    contactPhone: text('contact_phone'),

    status: listingStatusEnum('status').notNull().default('draft'),

    /** View counter incremented per detail page hit (with bot filter). */
    viewCount: integer('view_count').notNull().default(0),

    /** spec §8.2: created_at + 90 days at insert time. */
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    /** Set on each `refresh` action; max 1 per 30 days (enforced service-side). */
    refreshedAt: timestamp('refreshed_at', { withTimezone: true }),
    /** Set when status flips to `removed` (soft delete per §7.11). */
    removedAt: timestamp('removed_at', { withTimezone: true }),
    /** Set when status flips to `sold` — opens the 30-day review window. */
    soldAt: timestamp('sold_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** Read-only — populated by postflight generated tsvector column. */
    searchVector: tsvector('search_vector'),
  },
  (t) => [
    uniqueIndex('listings_slug_unique')
      .on(t.slug)
      .where(sql`${t.removedAt} IS NULL`),
    /** Hot path: "all active listings for this gear, sorted by price". */
    index('listings_gear_status_price_idx').on(t.gearId, t.status, t.price),
    /** Hot path: filter by seller. */
    index('listings_seller_status_idx').on(t.sellerId, t.status, t.createdAt),
    /** Hot path: "show me active listings in this city + condition". */
    index('listings_status_city_condition_idx').on(
      t.status,
      t.location,
      t.condition,
    ),
    /** Daily expiry cron: WHERE status='active' AND expires_at < now(). */
    index('listings_status_expiresat_idx').on(t.status, t.expiresAt),
    /** Cleanup cron: WHERE status='expired' AND removed_at IS NULL AND ... */
    index('listings_status_removedat_idx').on(t.status, t.removedAt),
    index('listings_kind_idx').on(t.kind),
  ],
);

export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;

/* ============================================================
   listing_photos — Sharp-processed photo variants.

   Same `(source_id, variant)` pattern as gear_images: one source upload
   = 7 rows (one per `imageVariantEnum` value). EXIF stripped at upload
   time (privacy / GDPR per spec §8.2).
   ============================================================ */
export const listingPhotos = pgTable(
  'listing_photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id').notNull(),
    variant: imageVariantEnum('variant').notNull(),

    path: text('path').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    mimeType: text('mime_type').notNull(),

    /** Gallery position within the listing (0-indexed). First photo = hero. */
    position: integer('position').notNull().default(0),

    uploadedAt: timestamp('uploaded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('listing_photos_source_variant_unique').on(
      t.sourceId,
      t.variant,
    ),
    index('listing_photos_listing_position_idx').on(t.listingId, t.position),
  ],
);

export type ListingPhoto = typeof listingPhotos.$inferSelect;
export type NewListingPhoto = typeof listingPhotos.$inferInsert;
