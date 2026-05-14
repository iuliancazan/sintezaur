import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { userGearStatusFlagEnum } from './enums';
import { gear } from './gear';
import { users } from './users';

/* ============================================================
   user_gear_status — personal collection flags per spec §8.1.

   One row per (user, gear, status); a user can simultaneously hold
   multiple statuses on the same gear (e.g. owned + loaned_out).

   Aggregate "X persoane dețin acest gear" reads
   COUNT(DISTINCT user_id) WHERE status='owned' AND is_public=true.
   That count is materialized to `gear.owners_public_count` by a
   service hook on insert/update/delete.
   ============================================================ */
export const userGearStatuses = pgTable(
  'user_gear_statuses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    gearId: uuid('gear_id')
      .notNull()
      .references(() => gear.id, { onDelete: 'cascade' }),
    status: userGearStatusFlagEnum('status').notNull(),

    /**
     * Per-flag privacy. Default true; user can hide individual entries
     * from the public "X persoane dețin" aggregate + their public
     * "Colecția mea" tab.
     */
    isPublic: boolean('is_public').notNull().default(true),

    /** Optional context (e.g. "împrumutat lui @ana, pentru o lună"). */
    note: text('note'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('user_gear_statuses_user_gear_status_unique').on(
      t.userId,
      t.gearId,
      t.status,
    ),
    index('user_gear_statuses_gear_status_public_idx').on(
      t.gearId,
      t.status,
      t.isPublic,
    ),
    index('user_gear_statuses_user_idx').on(t.userId, t.status),
  ],
);

export type UserGearStatus = typeof userGearStatuses.$inferSelect;
export type NewUserGearStatus = typeof userGearStatuses.$inferInsert;
