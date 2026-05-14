import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DATABASE,
  listings,
  notifications,
  type SintezaurDb,
} from '@sintezaur/db';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import { and, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { DATABASE_POOL } from '@sintezaur/db';

/**
 * Notify sellers whose `active` listings hit the 3-day or 1-day mark
 * before `expires_at`. Per spec §7.5.
 *
 * Dedup: `bazar_listing_expiring:<listing_id>:<bucket>` where `bucket`
 * is `'3d' | '1d'`. The dedup window default of 60 min keeps daily
 * cron re-runs idempotent, and the bucket key prevents the 3-day
 * reminder from blocking the 1-day reminder two days later.
 */
@Injectable()
export class ListingExpiringSoonJob {
  private readonly logger = new Logger(ListingExpiringSoonJob.name);

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly config: ConfigService,
  ) {}

  async run(): Promise<{ notified: number }> {
    const buckets: { label: '3d' | '1d'; days: number }[] = [
      { label: '3d', days: 3 },
      { label: '1d', days: 1 },
    ];
    let total = 0;
    for (const b of buckets) {
      const rows = await this.db
        .select({
          id: listings.id,
          sellerId: listings.sellerId,
          slug: listings.slug,
          title: listings.title,
          expiresAt: listings.expiresAt,
        })
        .from(listings)
        .where(
          and(
            eq(listings.status, 'active'),
            isNull(listings.removedAt),
            gte(listings.expiresAt, sql`now() + (interval '1 day' * ${b.days - 1})`),
            lte(listings.expiresAt, sql`now() + (interval '1 day' * ${b.days})`),
          ),
        );
      for (const r of rows) {
        const dedupKey = `bazar_listing_expiring:${r.id}:${b.label}`;
        const exists = await this.db
          .select({ id: notifications.id })
          .from(notifications)
          .where(
            and(
              eq(notifications.dedupKey, dedupKey),
              eq(notifications.recipientId, r.sellerId),
            ),
          )
          .limit(1);
        if (exists.length > 0) continue;
        await this.db.insert(notifications).values({
          recipientId: r.sellerId,
          kind: 'bazar_listing_expiring',
          channel: 'in_app',
          dedupKey,
          targetType: 'listing',
          targetId: r.id,
          payload: {
            listing: { id: r.id, slug: r.slug, title: r.title },
            expiresAt: r.expiresAt,
            bucket: b.label,
          },
        });
        // Push via NOTIFY so the API gateway can push to active sockets.
        await this.pool
          .query(`NOTIFY sintezaur_notify, $1`, [
            JSON.stringify({
              id: dedupKey,
              recipientId: r.sellerId,
              kind: 'bazar_listing_expiring',
            }),
          ])
          .catch(() => undefined);
        total++;
      }
    }
    if (total > 0)
      this.logger.log(`expiring-soon notifications sent: ${total}`);
    return { notified: total };
  }
}
