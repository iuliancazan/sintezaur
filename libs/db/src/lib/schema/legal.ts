import { sql } from 'drizzle-orm';
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Static legal / informational pages editable from the admin dashboard
 * per M6-A. Six pages seeded at migration time: termeni, confidentialitate,
 * cookies, regulament-forum, despre, contact. Slug is the URL segment
 * (`/<slug>` on the site).
 *
 * Body is Markdown — the site renders it via the same Tiptap renderer
 * pipeline used for Revista articles. `updated_at` powers the "ultima
 * actualizare" stamp in the footer of each page.
 */
export const legalPages = pgTable(
  'legal_pages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    bodyMd: text('body_md').notNull(),
    /** Optional one-liner shown in `<meta name="description">` per page. */
    metaDescription: text('meta_description'),
    /**
     * Optional English fields (M16). When the EN locale is active and
     * any field is NULL, the controller falls back to the RO column.
     */
    titleEn: text('title_en'),
    bodyMdEn: text('body_md_en'),
    metaDescriptionEn: text('meta_description_en'),
    updatedByUserId: uuid('updated_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('legal_pages_slug_unique').on(t.slug)],
);
export type LegalPage = typeof legalPages.$inferSelect;
export type NewLegalPage = typeof legalPages.$inferInsert;

/**
 * Contact form submissions per M6-A. Public `/contact` page POSTs a
 * row; admins read & resolve via dashboard queue. `category` is a
 * five-value enum (cumparator/vanzator/editor/juridic/altele) per
 * the spec interview decision.
 */
export const contactMessageCategoryEnum = pgEnum('contact_message_category', [
  'cumparator',
  'vanzator',
  'editor',
  'juridic',
  'altele',
]);
export type ContactMessageCategory =
  (typeof contactMessageCategoryEnum.enumValues)[number];

export const contactMessageStatusEnum = pgEnum('contact_message_status', [
  'new',
  'read',
  'archived',
]);
export type ContactMessageStatus =
  (typeof contactMessageStatusEnum.enumValues)[number];

export const contactMessages = pgTable(
  'contact_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Optional — populated when an authenticated user submits. */
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    email: text('email').notNull(),
    category: contactMessageCategoryEnum('category').notNull(),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    status: contactMessageStatusEnum('status').notNull().default('new'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    readByUserId: uuid('read_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('contact_messages_status_idx').on(t.status, t.createdAt),
    index('contact_messages_category_idx').on(t.category, t.createdAt),
  ],
);
export type ContactMessage = typeof contactMessages.$inferSelect;
export type NewContactMessage = typeof contactMessages.$inferInsert;

/**
 * In-app feedback submissions per M6-D. Distinct from `contact_messages`:
 * feedback is in-product (link in user menu, auto-captured `page_url` +
 * user-agent, only authenticated users), contact is a public-page form.
 *
 * `page_url` captures whatever page the user was on when they clicked
 * "Trimite feedback" — the most valuable single piece of context when
 * triaging bug reports. Admins read in `/feedback` dashboard queue.
 */
export const userFeedbackKindEnum = pgEnum('user_feedback_kind', [
  'bug',
  'sugestie',
  'altele',
]);
export type UserFeedbackKind =
  (typeof userFeedbackKindEnum.enumValues)[number];

export const userFeedbackStatusEnum = pgEnum('user_feedback_status', [
  'new',
  'read',
  'archived',
]);
export type UserFeedbackStatus =
  (typeof userFeedbackStatusEnum.enumValues)[number];

export const userFeedback = pgTable(
  'user_feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: userFeedbackKindEnum('kind').notNull(),
    body: text('body').notNull(),
    /** Path + query the user was on when they opened the feedback modal. */
    pageUrl: text('page_url'),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
    status: userFeedbackStatusEnum('status').notNull().default('new'),
    readByUserId: uuid('read_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('user_feedback_status_idx').on(t.status, t.createdAt),
    index('user_feedback_kind_idx').on(t.kind, t.createdAt),
    index('user_feedback_user_idx').on(t.userId, t.createdAt),
  ],
);
export type UserFeedback = typeof userFeedback.$inferSelect;
export type NewUserFeedback = typeof userFeedback.$inferInsert;
