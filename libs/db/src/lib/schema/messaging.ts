import { sql } from 'drizzle-orm';
import {
  boolean,
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
import { displayCurrencyEnum, messageKindEnum } from './enums';
import { listings } from './listings';
import { users } from './users';

/* ============================================================
   listing_message_threads — one thread per (listing, buyer) pair.

   The seller is derived from `listings.seller_id`; not stored here so a
   listing transfer (post-MVP) doesn't need to rewrite threads. Unique
   on (listing_id, buyer_id) so re-opening a closed conversation lands
   in the same thread.

   `last_message_at` is denormalized for the inbox query — sorting by
   it is the hottest read path. Maintained by a service hook on
   message insert.
   ============================================================ */
export const listingMessageThreads = pgTable(
  'listing_message_threads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    buyerId: uuid('buyer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    /** Denormalized for inbox sort + unread badge. */
    lastMessageAt: timestamp('last_message_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastMessagePreview: text('last_message_preview'),

    /** Last seen timestamps per side — drive the unread dot. */
    sellerLastReadAt: timestamp('seller_last_read_at', { withTimezone: true }),
    buyerLastReadAt: timestamp('buyer_last_read_at', { withTimezone: true }),

    /** Counter-offer cap (5 rounds per spec §8.2) tracked here. */
    offerRoundCount: integer('offer_round_count').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('listing_message_threads_listing_buyer_unique').on(
      t.listingId,
      t.buyerId,
    ),
    /** Inbox sort: "my recent threads in descending activity". */
    index('listing_message_threads_buyer_recent_idx').on(
      t.buyerId,
      t.lastMessageAt,
    ),
    index('listing_message_threads_listing_idx').on(t.listingId),
  ],
);
export type ListingMessageThread = typeof listingMessageThreads.$inferSelect;
export type NewListingMessageThread =
  typeof listingMessageThreads.$inferInsert;

/* ============================================================
   messages — per-thread chronological message log.

   `kind` discriminates the row shape:
   - `text`: just `body`
   - `offer` / `counter_offer`: `offer_amount`, `offer_currency`,
     `offer_expires_at` are NOT NULL; `replies_to_message_id` may point
     at an earlier offer (the one we counter).
   - `offer_accepted` / `offer_rejected`: terminal states pointing at
     the offer they resolve via `replies_to_message_id`.
   - `transaction_confirmed`: system message inserted when both parties
     have clicked the button. `body` carries an audit context like
     "Tranzacție confirmată de @vlad la 21:32".
   - `system`: catch-all for status changes ("Listing-ul a fost marcat
     vândut", "Vânzătorul a refresh-uit listing-ul", etc.).

   Soft delete: messages never soft-delete (per spec §7.11). GDPR
   account deletion anonymizes `senderId` and nulls `body`. The row
   stays for the other party's context.
   ============================================================ */
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => listingMessageThreads.id, { onDelete: 'cascade' }),
    /**
     * Author. Nullable so GDPR deletion can null this without losing
     * thread continuity for the other party (per spec §7.11).
     */
    senderId: uuid('sender_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    kind: messageKindEnum('kind').notNull().default('text'),
    /** Plain text body (system messages too). NULL after GDPR anonymization. */
    body: text('body'),

    /** Offer payload — populated when kind in ('offer','counter_offer'). */
    offerAmount: decimal('offer_amount', { precision: 12, scale: 2 }),
    offerCurrency: displayCurrencyEnum('offer_currency'),
    offerExpiresAt: timestamp('offer_expires_at', { withTimezone: true }),
    /** Points at the offer this row counters / accepts / rejects. */
    repliesToMessageId: uuid('replies_to_message_id'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Edit window for text messages — system messages immutable. */
    editedAt: timestamp('edited_at', { withTimezone: true }),
  },
  (t) => [
    /** Hot path: render thread in order. */
    index('messages_thread_created_idx').on(t.threadId, t.createdAt),
    index('messages_sender_idx').on(t.senderId, t.createdAt),
    check(
      'messages_offer_payload_when_offer',
      sql`
        (${t.kind} NOT IN ('offer','counter_offer'))
        OR (${t.offerAmount} IS NOT NULL AND ${t.offerCurrency} IS NOT NULL)
      `,
    ),
  ],
);
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

/* ============================================================
   message_attachments — image attachments uploaded inside chat.

   Sharp-processed same as listing_photos (3 aspect ratios × 2 sizes
   + original). EXIF stripped. One attachment per message currently;
   schema supports many for future bulk-attach feature.
   ============================================================ */
export const messageAttachments = pgTable(
  'message_attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id').notNull(),
    /** Same variant enum as gear/listing photos. */
    variant: text('variant').notNull(),
    path: text('path').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    mimeType: text('mime_type').notNull(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('message_attachments_source_variant_unique').on(
      t.sourceId,
      t.variant,
    ),
    index('message_attachments_message_idx').on(t.messageId),
  ],
);
export type MessageAttachment = typeof messageAttachments.$inferSelect;
export type NewMessageAttachment = typeof messageAttachments.$inferInsert;
