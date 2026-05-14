import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DATABASE,
  savedSearches,
  type SavedSearch,
  type SintezaurDb,
} from '@sintezaur/db';
import { and, desc, eq, sql } from 'drizzle-orm';
import { NotificationsService } from '../notifications/notifications.service';

export interface SavedSearchQueryShape {
  q?: string;
  gearId?: string;
  brand?: string;
  category?: string;
  conditions?: string[];
  kinds?: string[];
  deliveries?: string[];
  location?: string;
  priceMin?: number;
  priceMax?: number;
  currency?: string;
}

@Injectable()
export class SavedSearchService {
  private readonly logger = new Logger(SavedSearchService.name);
  private readonly maxPerUser: number;

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly notifications: NotificationsService,
    config: ConfigService,
  ) {
    this.maxPerUser = Number(config.get('SAVED_SEARCH_MAX_PER_USER') ?? 50);
  }

  async list(userId: string): Promise<SavedSearch[]> {
    return this.db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.userId, userId))
      .orderBy(desc(savedSearches.createdAt));
  }

  async create(
    userId: string,
    name: string,
    query: SavedSearchQueryShape,
    notifyMode: 'instant' | 'daily_digest' | 'off' = 'instant',
  ): Promise<SavedSearch> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(savedSearches)
      .where(eq(savedSearches.userId, userId));
    if (count >= this.maxPerUser) {
      throw new ConflictException(
        `Limita de ${this.maxPerUser} căutări salvate a fost atinsă.`,
      );
    }
    const [row] = await this.db
      .insert(savedSearches)
      .values({
        userId,
        target: 'bazar',
        name,
        query: query as Record<string, unknown>,
        notifyMode,
      })
      .returning();
    return row;
  }

  async update(
    userId: string,
    id: string,
    patch: {
      name?: string;
      query?: SavedSearchQueryShape;
      notifyMode?: 'instant' | 'daily_digest' | 'off';
    },
  ): Promise<SavedSearch> {
    const [existing] = await this.db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Căutare inexistentă.');
    if (existing.userId !== userId)
      throw new ForbiddenException('Nu poți modifica această căutare.');
    const [row] = await this.db
      .update(savedSearches)
      .set({
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.query !== undefined && {
          query: patch.query as Record<string, unknown>,
        }),
        ...(patch.notifyMode !== undefined && {
          notifyMode: patch.notifyMode,
        }),
        updatedAt: new Date(),
      })
      .where(eq(savedSearches.id, id))
      .returning();
    return row;
  }

  async remove(userId: string, id: string): Promise<void> {
    const [existing] = await this.db
      .select({ userId: savedSearches.userId })
      .from(savedSearches)
      .where(eq(savedSearches.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Căutare inexistentă.');
    if (existing.userId !== userId)
      throw new ForbiddenException('Nu poți șterge această căutare.');
    await this.db.delete(savedSearches).where(eq(savedSearches.id, id));
  }

  /**
   * Run all `instant` saved searches against a fresh listing snapshot
   * and emit `bazar_saved_search_match` notifications for matches.
   *
   * Called from ListingsService on create + on update when fields that
   * affect matching change (price, condition, currency, kind, location,
   * gearId). Cheap because the saved-searches table is capped at 50/user
   * and most filters reduce candidates quickly.
   */
  async evaluateForListing(listing: {
    id: string;
    slug: string;
    sellerId: string;
    gearId: string | null;
    title: string;
    price: string;
    currency: string;
    condition: string;
    kind: string;
    delivery: string;
    location: string;
  }): Promise<void> {
    const rows = await this.db
      .select()
      .from(savedSearches)
      .where(
        and(
          eq(savedSearches.target, 'bazar'),
          eq(savedSearches.notifyMode, 'instant'),
        ),
      );
    const priceNum = Number(listing.price);
    for (const row of rows) {
      if (row.userId === listing.sellerId) continue;
      const q = (row.query ?? {}) as SavedSearchQueryShape;
      if (!matches(listing, priceNum, q)) continue;
      try {
        await this.notifications.post({
          recipientId: row.userId,
          kind: 'bazar_saved_search_match',
          dedupKey: `bazar_saved_search_match:${row.id}:${listing.id}`,
          targetType: 'listing',
          targetId: listing.id,
          actorId: listing.sellerId,
          payload: {
            savedSearchId: row.id,
            savedSearchName: row.name,
            listing: {
              id: listing.id,
              slug: listing.slug,
              title: listing.title,
              price: listing.price,
              currency: listing.currency,
              condition: listing.condition,
              location: listing.location,
            },
          },
        });
        await this.db
          .update(savedSearches)
          .set({ lastNotifiedAt: new Date() })
          .where(eq(savedSearches.id, row.id));
      } catch (err) {
        this.logger.warn(
          `evaluateForListing notify failed for search ${row.id}: ${(err as Error).message}`,
        );
      }
    }
  }
}

function matches(
  listing: {
    gearId: string | null;
    title: string;
    price: string;
    currency: string;
    condition: string;
    kind: string;
    delivery: string;
    location: string;
  },
  priceNum: number,
  q: SavedSearchQueryShape,
): boolean {
  if (q.gearId && q.gearId !== listing.gearId) return false;
  if (q.conditions?.length && !q.conditions.includes(listing.condition))
    return false;
  if (q.kinds?.length && !q.kinds.includes(listing.kind)) return false;
  if (q.deliveries?.length && !q.deliveries.includes(listing.delivery))
    return false;
  if (q.currency && q.currency !== listing.currency) return false;
  if (q.priceMin !== undefined && priceNum < q.priceMin) return false;
  if (q.priceMax !== undefined && priceNum > q.priceMax) return false;
  if (q.location) {
    if (!listing.location.toLowerCase().includes(q.location.toLowerCase()))
      return false;
  }
  if (q.q) {
    const needle = q.q.trim().toLowerCase();
    if (needle.length >= 2 && !listing.title.toLowerCase().includes(needle))
      return false;
  }
  return true;
}
