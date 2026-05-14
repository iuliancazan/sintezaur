import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DATABASE,
  listingPhotos,
  listings,
  userListingWatches,
  type SintezaurDb,
} from '@sintezaur/db';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class WatchService {
  private readonly logger = new Logger(WatchService.name);

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly notifications: NotificationsService,
  ) {}

  async listForUser(userId: string) {
    return this.db
      .select({
        listingId: listings.id,
        slug: listings.slug,
        title: listings.title,
        price: listings.price,
        currency: listings.currency,
        status: listings.status,
        location: listings.location,
        condition: listings.condition,
        createdAt: listings.createdAt,
        watchedAt: userListingWatches.createdAt,
        thumb: sql<string | null>`(
          SELECT path FROM ${listingPhotos}
          WHERE ${listingPhotos.listingId} = ${listings.id}
            AND ${listingPhotos.variant} = 'landscape_4x3_medium'
          ORDER BY position ASC
          LIMIT 1
        )`,
      })
      .from(userListingWatches)
      .innerJoin(listings, eq(listings.id, userListingWatches.listingId))
      .where(
        and(
          eq(userListingWatches.userId, userId),
          isNull(listings.removedAt),
        ),
      )
      .orderBy(desc(userListingWatches.createdAt));
  }

  async watch(userId: string, listingId: string): Promise<void> {
    const [listing] = await this.db
      .select({ id: listings.id })
      .from(listings)
      .where(and(eq(listings.id, listingId), isNull(listings.removedAt)))
      .limit(1);
    if (!listing) throw new NotFoundException(`listing ${listingId} not found`);
    await this.db
      .insert(userListingWatches)
      .values({ userId, listingId })
      .onConflictDoNothing();
  }

  async unwatch(userId: string, listingId: string): Promise<void> {
    await this.db
      .delete(userListingWatches)
      .where(
        and(
          eq(userListingWatches.userId, userId),
          eq(userListingWatches.listingId, listingId),
        ),
      );
  }

  /**
   * Fan out a price-drop notification to every watcher except the
   * seller. Called by `ListingsService.update` after the price moves
   * down. Dedup_key per (watch_id, listing_id, new_price) keeps repeat
   * runs idempotent.
   */
  async fanoutPriceDrop(
    listingId: string,
    sellerId: string,
    oldPrice: string,
    newPrice: string,
    currency: string,
    listingMeta: { slug: string; title: string },
  ): Promise<void> {
    const watchers = await this.db
      .select({ userId: userListingWatches.userId })
      .from(userListingWatches)
      .where(eq(userListingWatches.listingId, listingId));
    for (const w of watchers) {
      if (w.userId === sellerId) continue;
      try {
        await this.notifications.post({
          recipientId: w.userId,
          kind: 'bazar_price_drop_watched',
          dedupKey: `bazar_price_drop:${listingId}:${newPrice}`,
          targetType: 'listing',
          targetId: listingId,
          actorId: sellerId,
          payload: {
            listing: { id: listingId, ...listingMeta },
            oldPrice,
            newPrice,
            currency,
          },
        });
      } catch (err) {
        this.logger.warn(
          `price-drop notify failed for user ${w.userId}: ${(err as Error).message}`,
        );
      }
    }
  }
}
