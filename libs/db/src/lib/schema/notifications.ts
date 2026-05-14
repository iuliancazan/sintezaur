import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  notificationChannelEnum,
  notificationKindEnum,
  notificationPreferenceModeEnum,
} from './enums';
import { users } from './users';

/* ============================================================
   notifications — one row per delivery attempt to a user.

   `dedup_key` is the spec §7.5 anti-spam guard: e.g.
   `forum_reply:<post_id>:<recipient_id>`. The check-then-insert is
   wrapped in the service layer; this index just makes the lookup fast.

   `payload` carries the kind-specific context the UI uses to render
   ("@vlad replied in your thread X", "Listing dropped from 4200 to
   3800 RON", etc.). Schema-less so new kinds don't need migrations.

   `target_type + target_id` are polymorphic FKs the UI uses to
   build the "go to source" deep link.
   ============================================================ */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    kind: notificationKindEnum('kind').notNull(),
    channel: notificationChannelEnum('channel').notNull().default('in_app'),

    /** Anti-spam key per spec §7.5; service-enforced uniqueness window. */
    dedupKey: text('dedup_key').notNull(),

    /** Deep-link target for "go to source" — polymorphic. */
    targetType: text('target_type'),
    targetId: uuid('target_id'),

    /** Payload for UI rendering. Schema-less. */
    payload: jsonb('payload').notNull().default(sql`'{}'::jsonb`),

    /** Optional FK to the actor (the user who triggered the event). */
    actorId: uuid('actor_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    /** Whether the user has read the in-app notification. */
    readAt: timestamp('read_at', { withTimezone: true }),
    /** For email channel: when sent (NULL = still queued). */
    emailSentAt: timestamp('email_sent_at', { withTimezone: true }),
    /** Set when included in the next daily digest. */
    digestIncludedAt: timestamp('digest_included_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    /** Hot path: "my unread bell drop-down". */
    index('notifications_recipient_unread_idx')
      .on(t.recipientId, t.createdAt)
      .where(sql`${t.readAt} IS NULL`),
    /** Dedup probe. */
    index('notifications_dedup_idx').on(t.dedupKey, t.recipientId),
    /** Hot path: "my history paginated". */
    index('notifications_recipient_history_idx').on(
      t.recipientId,
      t.createdAt,
    ),
    index('notifications_email_queue_idx')
      .on(t.createdAt)
      .where(sql`${t.channel} IN ('email','both') AND ${t.emailSentAt} IS NULL`),
  ],
);
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

/* ============================================================
   notification_preferences — per (user × kind × channel) row.

   Defaults are encoded service-side (most in_app on, email batched
   daily for non-urgent). Missing row = use default. Users edit via
   /preferences/notifications.
   ============================================================ */
export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: notificationKindEnum('kind').notNull(),
    channel: notificationChannelEnum('channel').notNull(),
    mode: notificationPreferenceModeEnum('mode').notNull().default('on'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('notification_preferences_user_kind_channel_unique').on(
      t.userId,
      t.kind,
      t.channel,
    ),
    index('notification_preferences_user_idx').on(t.userId),
  ],
);
export type NotificationPreference =
  typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference =
  typeof notificationPreferences.$inferInsert;
