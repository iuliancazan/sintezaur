import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DATABASE,
  notificationPreferences,
  notifications,
  type NotificationChannel,
  type NotificationKind,
  type NotificationPreferenceMode,
  type SintezaurDb,
} from '@sintezaur/db';
import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../db/db.module';

/**
 * Default channel matrix per spec §7.5: most in-app on, email batched.
 * Missing preference rows fall back to these.
 */
export const DEFAULT_PREFS: Record<
  NotificationKind,
  Partial<Record<NotificationChannel, NotificationPreferenceMode>>
> = {
  bazar_new_message: { in_app: 'on', email: 'digest' },
  bazar_new_offer: { in_app: 'on', email: 'on' },
  bazar_counter_offer: { in_app: 'on', email: 'on' },
  bazar_offer_accepted: { in_app: 'on', email: 'on' },
  bazar_offer_rejected: { in_app: 'on', email: 'digest' },
  bazar_price_drop_watched: { in_app: 'on', email: 'digest' },
  bazar_saved_search_match: { in_app: 'on', email: 'digest' },
  bazar_listing_expiring: { in_app: 'on', email: 'on' },
  bazar_transaction_confirmed_by_other: { in_app: 'on', email: 'on' },
  bazar_review_submitted_on_me: { in_app: 'on', email: 'digest' },
  tezaur_review_on_my_gear: { in_app: 'on', email: 'digest' },
  revista_article_in_followed_category: { in_app: 'on', email: 'digest' },
  revista_reply_to_my_article: { in_app: 'on', email: 'on' },
  forum_reply_in_subscribed: { in_app: 'on', email: 'digest' },
  forum_mention: { in_app: 'on', email: 'on' },
  forum_badge_earned: { in_app: 'on', email: 'digest' },
  forum_mod_action_on_my_content: { in_app: 'on', email: 'on' },
  forum_report_resolved: { in_app: 'on', email: 'digest' },
  admin_announcement: { in_app: 'on', email: 'on' },
  storage_quota_lifetime_reached: { in_app: 'on', email: 'on' },
};

export interface PostNotificationInput {
  recipientId: string;
  kind: NotificationKind;
  dedupKey: string;
  targetType?: string;
  targetId?: string;
  payload?: Record<string, unknown>;
  actorId?: string | null;
}

/** Pg channel used to push fresh notifications to the API process(es). */
export const PG_NOTIFY_CHANNEL = 'sintezaur_notify';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly dedupWindowMinutes: number;

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    config: ConfigService,
  ) {
    this.dedupWindowMinutes = Number(
      config.get('NOTIFICATION_DEDUP_WINDOW_MINUTES') ?? 60,
    );
  }

  /**
   * Insert one notification per channel after consulting preferences +
   * dedup window. Publishes a `sintezaur_notify` Postgres NOTIFY so the
   * realtime gateway (any API instance) can push to active sockets.
   */
  async post(input: PostNotificationInput): Promise<void> {
    const channels = await this.resolveChannels(input.recipientId, input.kind);
    if (channels.length === 0) return;

    const cutoff = new Date(
      Date.now() - this.dedupWindowMinutes * 60 * 1000,
    );
    const existing = await this.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.dedupKey, input.dedupKey),
          eq(notifications.recipientId, input.recipientId),
          gte(notifications.createdAt, cutoff),
        ),
      )
      .limit(1);
    if (existing.length > 0) return;

    const rows = await this.db
      .insert(notifications)
      .values(
        channels.map((channel) => ({
          recipientId: input.recipientId,
          kind: input.kind,
          channel,
          dedupKey: input.dedupKey,
          targetType: input.targetType ?? null,
          targetId: input.targetId ?? null,
          payload: input.payload ?? {},
          actorId: input.actorId ?? null,
        })),
      )
      .returning({
        id: notifications.id,
        channel: notifications.channel,
      });

    const inAppRow = rows.find((r) => r.channel === 'in_app');
    if (inAppRow) {
      const payload = JSON.stringify({
        id: inAppRow.id,
        recipientId: input.recipientId,
        kind: input.kind,
      });
      await this.pool
        .query(`NOTIFY ${PG_NOTIFY_CHANNEL}, $1`, [payload])
        .catch((err) =>
          this.logger.warn(`NOTIFY failed: ${(err as Error).message}`),
        );
    }
  }

  async listForUser(
    userId: string,
    opts: { unreadOnly?: boolean; limit?: number; before?: Date } = {},
  ) {
    const limit = Math.min(opts.limit ?? 30, 100);
    const conds = [
      eq(notifications.recipientId, userId),
      eq(notifications.channel, 'in_app'),
    ];
    if (opts.unreadOnly) conds.push(isNull(notifications.readAt));
    if (opts.before)
      conds.push(sql`${notifications.createdAt} < ${opts.before}`);
    return this.db
      .select()
      .from(notifications)
      .where(and(...conds))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async markRead(userId: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.recipientId, userId),
          sql`${notifications.id} = ANY(${ids}::uuid[])`,
          isNull(notifications.readAt),
        ),
      );
  }

  async markAllRead(userId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.recipientId, userId),
          eq(notifications.channel, 'in_app'),
          isNull(notifications.readAt),
        ),
      );
  }

  async unreadCount(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, userId),
          eq(notifications.channel, 'in_app'),
          isNull(notifications.readAt),
        ),
      );
    return row?.count ?? 0;
  }

  /**
   * Effective preference matrix for the prefs page. Returns one row
   * per (kind, channel) pair, with the user's saved value or the
   * default if no row exists. Only `in_app` + `email` channels are
   * exposed; `both` is a derived value, not user-editable.
   */
  async getPreferences(userId: string): Promise<
    Array<{
      kind: NotificationKind;
      channel: 'in_app' | 'email';
      mode: NotificationPreferenceMode;
    }>
  > {
    const rows = await this.db
      .select({
        kind: notificationPreferences.kind,
        channel: notificationPreferences.channel,
        mode: notificationPreferences.mode,
      })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));

    const saved = new Map<string, NotificationPreferenceMode>();
    for (const r of rows) saved.set(`${r.kind}::${r.channel}`, r.mode);

    const out: Array<{
      kind: NotificationKind;
      channel: 'in_app' | 'email';
      mode: NotificationPreferenceMode;
    }> = [];
    for (const kind of Object.keys(DEFAULT_PREFS) as NotificationKind[]) {
      for (const channel of ['in_app', 'email'] as const) {
        const key = `${kind}::${channel}`;
        const fallback = DEFAULT_PREFS[kind][channel] ?? 'off';
        out.push({
          kind,
          channel,
          mode: saved.get(key) ?? fallback,
        });
      }
    }
    return out;
  }

  /**
   * Bulk upsert. Caller sends a partial matrix — only rows present
   * get persisted. Missing combos fall back to the default at
   * resolve time, so deleting a row is equivalent to "reset to default".
   */
  async setPreferences(
    userId: string,
    updates: Array<{
      kind: NotificationKind;
      channel: 'in_app' | 'email';
      mode: NotificationPreferenceMode;
    }>,
  ): Promise<void> {
    if (updates.length === 0) return;
    const now = new Date();
    for (const u of updates) {
      await this.db
        .insert(notificationPreferences)
        .values({
          userId,
          kind: u.kind,
          channel: u.channel,
          mode: u.mode,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            notificationPreferences.userId,
            notificationPreferences.kind,
            notificationPreferences.channel,
          ],
          set: { mode: u.mode, updatedAt: now },
        });
    }
  }

  private async resolveChannels(
    userId: string,
    kind: NotificationKind,
  ): Promise<NotificationChannel[]> {
    const prefs = await this.db
      .select({
        channel: notificationPreferences.channel,
        mode: notificationPreferences.mode,
      })
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.kind, kind),
        ),
      );
    const map: Partial<
      Record<NotificationChannel, NotificationPreferenceMode>
    > = { ...DEFAULT_PREFS[kind] };
    for (const r of prefs) map[r.channel] = r.mode;

    const out: NotificationChannel[] = [];
    if (map.in_app === 'on') out.push('in_app');
    if (map.email === 'on') out.push('email');
    return out;
  }
}
