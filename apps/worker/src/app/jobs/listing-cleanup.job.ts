import { Inject, Injectable, Logger } from '@nestjs/common';
import { DATABASE, listings, type SintezaurDb } from '@sintezaur/db';
import { and, eq, isNull, lte, sql } from 'drizzle-orm';

/**
 * After 30 days as `expired`, flip the row to `removed` (soft delete
 * per §7.11). Price history rows survive — they're keyed by listing_id,
 * not by listing.status.
 */
@Injectable()
export class ListingCleanupJob {
  private readonly logger = new Logger(ListingCleanupJob.name);

  constructor(@Inject(DATABASE) private readonly db: SintezaurDb) {}

  async run(): Promise<{ removed: number }> {
    const result = await this.db
      .update(listings)
      .set({ status: 'removed', removedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(listings.status, 'expired'),
          isNull(listings.removedAt),
          lte(listings.expiresAt, sql`now() - interval '30 days'`),
        ),
      )
      .returning({ id: listings.id });
    if (result.length > 0)
      this.logger.log(`cleanup soft-removed ${result.length} listings`);
    return { removed: result.length };
  }
}
