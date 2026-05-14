import { Inject, Injectable, Logger } from '@nestjs/common';
import { DATABASE, listings, type SintezaurDb } from '@sintezaur/db';
import { and, eq, isNull, lte, sql } from 'drizzle-orm';

/**
 * Flip `active` listings past their `expires_at` to `expired`. spec §8.2.
 * Returns the number of rows affected so cron telemetry is meaningful.
 */
@Injectable()
export class ListingExpiryJob {
  private readonly logger = new Logger(ListingExpiryJob.name);

  constructor(@Inject(DATABASE) private readonly db: SintezaurDb) {}

  async run(): Promise<{ expired: number }> {
    const result = await this.db
      .update(listings)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(
        and(
          eq(listings.status, 'active'),
          isNull(listings.removedAt),
          lte(listings.expiresAt, sql`now()`),
        ),
      )
      .returning({ id: listings.id });
    if (result.length > 0)
      this.logger.log(`expired ${result.length} listings`);
    return { expired: result.length };
  }
}
