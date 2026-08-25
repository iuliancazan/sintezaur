import {
  boolean,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Workshops DB — its own database (`sintezaur_workshops`), deliberately
 * apart from the platform schema so the whole section stays deletable
 * (workshops-spec.md §2). Content lives in code; these tables hold only
 * runtime state: the workshop registry, its passwords, and access events.
 */

export const workshops = pgTable('workshops', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  titleEn: text('title_en').notNull(),
  titleRo: text('title_ro').notNull(),
  subtitleEn: text('subtitle_en'),
  subtitleRo: text('subtitle_ro'),
  eventDate: date('event_date'),
  venue: text('venue'),
  published: boolean('published').notNull().default(false),
  /** Panel toggle: whether guest sessions may open the slides. */
  guestSeesSlides: boolean('guest_sees_slides').notNull().default(false),
  guestPasswordHash: text('guest_password_hash'),
  adminPasswordHash: text('admin_password_hash'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const accessEvents = pgTable(
  'access_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workshopId: uuid('workshop_id').references(() => workshops.id, {
      onDelete: 'cascade',
    }),
    /** Anonymous per-browser id (`ws_visitor` cookie) — no IPs, no PII. */
    visitorId: uuid('visitor_id'),
    role: text('role').notNull(), // guest | admin | superadmin
    event: text('event').notNull(), // login | view | download
    document: text('document'), // slides | handbook | script | run-of-show
    lang: text('lang'), // en | ro
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('access_events_workshop_created_idx').on(
      table.workshopId,
      table.createdAt,
    ),
  ],
);

export type Workshop = typeof workshops.$inferSelect;
export type AccessEvent = typeof accessEvents.$inferSelect;
