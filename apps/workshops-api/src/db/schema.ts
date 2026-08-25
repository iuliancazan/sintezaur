import {
  boolean,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
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
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Login accounts per workshop (username + password → role). Managed in the
 * panel; usernames are stored lowercase. The superadmin is NOT here — it
 * logs in with the reserved username `superadmin` against the env hash.
 */
export const workshopAccounts = pgTable(
  'workshop_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workshopId: uuid('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    username: text('username').notNull(),
    role: text('role').notNull(), // guest | admin
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('workshop_accounts_workshop_username_idx').on(
      table.workshopId,
      table.username,
    ),
  ],
);

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
export type WorkshopAccount = typeof workshopAccounts.$inferSelect;
export type AccessEvent = typeof accessEvents.$inferSelect;
