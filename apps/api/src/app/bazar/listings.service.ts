import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import 'multer';
import {
  DATABASE,
  type SintezaurDb,
  gear,
  listingPhotos,
  listingPriceHistory,
  listings,
  transactions,
  userBlocks,
  userListingWatches,
  userReviewAggregate,
  users,
} from '@sintezaur/db';
import { slugFromParts, uniqueSlug } from '@sintezaur/shared';
import { and, desc, eq, gte, ilike, inArray, isNull, lte, sql } from 'drizzle-orm';
import type { Request } from 'express';
import { AuditLogService } from '../common/audit-log.service';
import { StorageService } from '../common/storage.service';
import type {
  CreateListingDto,
  ListListingsQueryDto,
  UpdateListingDto,
} from './bazar.dto';
import { SavedSearchService } from './saved-search.service';
import { WatchService } from './watch.service';

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 60;

/** 90 days after creation (spec §8.2). */
const LISTING_DEFAULT_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/** Min interval between free refreshes (spec §8.2). */
const LISTING_REFRESH_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

export interface PublicListingListItem {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  model: string | null;
  gearId: string | null;
  gearSlug: string | null;
  price: string;
  currency: string;
  condition: string;
  kind: string;
  delivery: string;
  acceptsOffers: boolean;
  location: string;
  thumb: string | null;
  status: string;
  createdAt: Date;
  expiresAt: Date | null;
  refreshedAt: Date | null;
  seller: {
    id: string;
    username: string;
    avgRating: string | null;
    reviewCount: number;
    transactionCount: number;
  };
}

export interface QuickListSuggestion {
  gear: {
    id: string;
    slug: string;
    brand: string;
    model: string;
    category: string;
  };
  suggestedTitle: string;
  suggestedConditions: string[];
  priceStats: {
    currency: 'ron' | 'eur';
    avg: number | null;
    median: number | null;
    low: number | null;
    high: number | null;
    soldCount: number;
    activeCount: number;
  };
}

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly storage: StorageService,
    private readonly audit: AuditLogService,
    private readonly savedSearch: SavedSearchService,
    private readonly watch: WatchService,
  ) {}

  /* ============================================================
     CRUD
     ============================================================ */

  async create(
    sellerId: string,
    dto: CreateListingDto,
  ): Promise<{ id: string; slug: string }> {
    let slugSource: string;
    if (dto.gearId) {
      const [g] = await this.db
        .select({ brand: gear.brand, model: gear.model })
        .from(gear)
        .where(and(eq(gear.id, dto.gearId), isNull(gear.deletedAt)))
        .limit(1);
      if (!g) throw new NotFoundException(`gear ${dto.gearId} not found`);
      slugSource = slugFromParts(g.brand, g.model, dto.title);
    } else {
      slugSource = slugFromParts(dto.rawMake ?? '', dto.rawModel ?? '', dto.title);
    }
    const slug = await uniqueSlug(slugSource, (s) => this.slugExists(s));

    const now = new Date();
    const expiresAt = new Date(now.getTime() + LISTING_DEFAULT_TTL_MS);

    const [row] = await this.db
      .insert(listings)
      .values({
        slug,
        sellerId,
        gearId: dto.gearId ?? null,
        rawMake: dto.gearId ? null : dto.rawMake ?? null,
        rawModel: dto.gearId ? null : dto.rawModel ?? null,
        rawYear: dto.rawYear ?? null,
        title: dto.title,
        description: dto.description,
        descriptionHtml: dto.descriptionHtml ?? '',
        price: dto.price.toString(),
        currency: dto.currency,
        condition: dto.condition,
        conditionNote: dto.conditionNote ?? null,
        kind: dto.kind,
        lookingFor: dto.lookingFor ?? null,
        delivery: dto.delivery,
        shippingCost: dto.shippingCost?.toString() ?? null,
        shippingCarriers: dto.shippingCarriers ?? [],
        acceptsOffers: dto.acceptsOffers,
        location: dto.location,
        contactPhone: dto.contactPhone ?? null,
        status: 'active',
        expiresAt,
      })
      .returning({ id: listings.id, slug: listings.slug });

    // Fan out saved-search matches asynchronously — never block the
    // 201 response on the evaluator.
    void this.savedSearch
      .evaluateForListing({
        id: row.id,
        slug: row.slug,
        sellerId,
        gearId: dto.gearId ?? null,
        title: dto.title,
        price: dto.price.toString(),
        currency: dto.currency,
        condition: dto.condition,
        kind: dto.kind,
        delivery: dto.delivery,
        location: dto.location,
      })
      .catch((err) =>
        this.logger.warn(
          `saved-search evaluator failed for ${row.id}: ${(err as Error).message}`,
        ),
      );

    return row;
  }

  async update(
    sellerId: string,
    id: string,
    dto: UpdateListingDto,
  ): Promise<{ id: string; slug: string }> {
    const [existing] = await this.db
      .select()
      .from(listings)
      .where(and(eq(listings.id, id), isNull(listings.removedAt)))
      .limit(1);
    if (!existing) throw new NotFoundException(`listing ${id} not found`);
    if (existing.sellerId !== sellerId)
      throw new ForbiddenException('You can only edit your own listings.');
    if (existing.status === 'sold')
      throw new ConflictException('Sold listings cannot be edited.');

    const priceChanged =
      dto.price !== undefined && dto.price.toString() !== existing.price;

    await this.db
      .update(listings)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && {
          description: dto.description,
          descriptionHtml: dto.descriptionHtml ?? existing.descriptionHtml,
        }),
        ...(dto.price !== undefined && { price: dto.price.toString() }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.condition !== undefined && { condition: dto.condition }),
        ...(dto.conditionNote !== undefined && {
          conditionNote: dto.conditionNote ?? null,
        }),
        ...(dto.kind !== undefined && { kind: dto.kind }),
        ...(dto.lookingFor !== undefined && {
          lookingFor: dto.lookingFor ?? null,
        }),
        ...(dto.delivery !== undefined && { delivery: dto.delivery }),
        ...(dto.shippingCost !== undefined && {
          shippingCost: dto.shippingCost?.toString() ?? null,
        }),
        ...(dto.shippingCarriers !== undefined && {
          shippingCarriers: dto.shippingCarriers,
        }),
        ...(dto.acceptsOffers !== undefined && {
          acceptsOffers: dto.acceptsOffers,
        }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.contactPhone !== undefined && {
          contactPhone: dto.contactPhone ?? null,
        }),
        updatedAt: new Date(),
      })
      .where(eq(listings.id, id));

    // Log price change separately so the price-drop notification trigger
    // can read it. We never mutate listing_price_history; we only insert.
    if (priceChanged) {
      const newPrice = dto.price!.toString();
      const currency = dto.currency ?? existing.currency;
      await this.db.insert(listingPriceHistory).values({
        listingId: id,
        oldPrice: existing.price,
        newPrice,
        currency,
      });
      if (Number(newPrice) < Number(existing.price)) {
        void this.watch.fanoutPriceDrop(
          id,
          existing.sellerId,
          existing.price,
          newPrice,
          currency,
          { slug: existing.slug, title: dto.title ?? existing.title },
        );
      }
    }

    // Re-evaluate saved searches when match-relevant fields changed.
    const matchRelevantChanged =
      dto.price !== undefined ||
      dto.currency !== undefined ||
      dto.condition !== undefined ||
      dto.kind !== undefined ||
      dto.delivery !== undefined ||
      dto.location !== undefined ||
      dto.title !== undefined;
    if (matchRelevantChanged && existing.status === 'active') {
      void this.savedSearch.evaluateForListing({
        id,
        slug: existing.slug,
        sellerId: existing.sellerId,
        gearId: existing.gearId,
        title: dto.title ?? existing.title,
        price: (dto.price?.toString() ?? existing.price) as string,
        currency: dto.currency ?? existing.currency,
        condition: dto.condition ?? existing.condition,
        kind: dto.kind ?? existing.kind,
        delivery: dto.delivery ?? existing.delivery,
        location: dto.location ?? existing.location,
      });
    }

    return { id, slug: existing.slug };
  }

  async refresh(sellerId: string, id: string): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(listings)
      .where(and(eq(listings.id, id), isNull(listings.removedAt)))
      .limit(1);
    if (!existing) throw new NotFoundException(`listing ${id} not found`);
    if (existing.sellerId !== sellerId)
      throw new ForbiddenException('You can only refresh your own listings.');
    if (existing.status === 'sold')
      throw new ConflictException('Sold listings cannot be refreshed.');

    const now = new Date();
    if (existing.refreshedAt) {
      const sinceRefresh = now.getTime() - existing.refreshedAt.getTime();
      if (sinceRefresh < LISTING_REFRESH_COOLDOWN_MS) {
        throw new ConflictException(
          'Listings can be refreshed at most once per 30 days.',
        );
      }
    }

    const expiresAt = new Date(now.getTime() + LISTING_DEFAULT_TTL_MS);
    await this.db
      .update(listings)
      .set({
        status: 'active',
        refreshedAt: now,
        expiresAt,
        createdAt: now, // reset sort position per spec §8.2
        updatedAt: now,
      })
      .where(eq(listings.id, id));
  }

  async removeOwn(sellerId: string, id: string): Promise<void> {
    const [existing] = await this.db
      .select({ id: listings.id, sellerId: listings.sellerId })
      .from(listings)
      .where(and(eq(listings.id, id), isNull(listings.removedAt)))
      .limit(1);
    if (!existing) throw new NotFoundException(`listing ${id} not found`);
    if (existing.sellerId !== sellerId)
      throw new ForbiddenException('You can only remove your own listings.');
    await this.db
      .update(listings)
      .set({ status: 'removed', removedAt: new Date() })
      .where(eq(listings.id, id));
  }

  async modRemove(
    actorId: string,
    id: string,
    reason: string,
    req?: Request,
  ): Promise<void> {
    await this.db
      .update(listings)
      .set({ status: 'removed', removedAt: new Date() })
      .where(eq(listings.id, id));
    await this.audit.record({
      actorId,
      action: 'remove_listing',
      targetType: 'listing',
      targetId: id,
      details: { reason },
      req,
    });
  }

  /* ============================================================
     Photo pipeline
     ============================================================ */

  async attachPhoto(
    sellerId: string,
    listingId: string,
    file: Express.Multer.File,
  ): Promise<{ sourceId: string }> {
    const [existing] = await this.db
      .select({ id: listings.id, sellerId: listings.sellerId })
      .from(listings)
      .where(and(eq(listings.id, listingId), isNull(listings.removedAt)))
      .limit(1);
    if (!existing) throw new NotFoundException(`listing ${listingId} not found`);
    if (existing.sellerId !== sellerId)
      throw new ForbiddenException('You can only add photos to your listings.');

    const processed = await this.storage.processImage('listing', listingId, file);

    const [{ max }] = await this.db
      .select({
        max: sql<number>`coalesce(max(${listingPhotos.position}), -1)`,
      })
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, listingId));
    const position = (max ?? -1) + 1;

    await this.db.insert(listingPhotos).values(
      processed.variants.map((v) => ({
        listingId,
        sourceId: processed.sourceId,
        variant: v.variant,
        path: v.path,
        width: v.width,
        height: v.height,
        sizeBytes: v.sizeBytes,
        mimeType: v.mimeType,
        position,
      })),
    );
    return { sourceId: processed.sourceId };
  }

  async detachPhoto(
    sellerId: string,
    listingId: string,
    sourceId: string,
  ): Promise<void> {
    const [existing] = await this.db
      .select({ sellerId: listings.sellerId })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);
    if (!existing) throw new NotFoundException(`listing ${listingId} not found`);
    if (existing.sellerId !== sellerId)
      throw new ForbiddenException('Not your listing.');

    const rows = await this.db
      .select({ variant: listingPhotos.variant })
      .from(listingPhotos)
      .where(
        and(
          eq(listingPhotos.listingId, listingId),
          eq(listingPhotos.sourceId, sourceId),
        ),
      );
    if (!rows.length)
      throw new NotFoundException(`photo source ${sourceId} not found`);

    await this.storage.deleteSource(
      'listing',
      listingId,
      sourceId,
      rows.map((r) => r.variant) as any,
    );
    await this.db
      .delete(listingPhotos)
      .where(
        and(
          eq(listingPhotos.listingId, listingId),
          eq(listingPhotos.sourceId, sourceId),
        ),
      );
  }

  async reorderPhotos(
    sellerId: string,
    listingId: string,
    sourceIdsInOrder: string[],
  ): Promise<void> {
    const [existing] = await this.db
      .select({ sellerId: listings.sellerId })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);
    if (!existing) throw new NotFoundException(`listing ${listingId} not found`);
    if (existing.sellerId !== sellerId)
      throw new ForbiddenException('Not your listing.');

    for (const [index, sourceId] of sourceIdsInOrder.entries()) {
      await this.db
        .update(listingPhotos)
        .set({ position: index })
        .where(
          and(
            eq(listingPhotos.listingId, listingId),
            eq(listingPhotos.sourceId, sourceId),
          ),
        );
    }
  }

  /* ============================================================
     Public list / detail
     ============================================================ */

  async listPublic(
    query: ListListingsQueryDto,
    viewerId?: string,
  ): Promise<{
    items: PublicListingListItem[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const offset = (page - 1) * pageSize;

    const conditions = [eq(listings.status, 'active'), isNull(listings.removedAt)];
    // Hide listings from sellers the viewer has blocked (spec §7.4).
    // Anonymous viewers see everything — block applies only to the blocker.
    if (viewerId) {
      conditions.push(
        sql`${listings.sellerId} NOT IN (
          SELECT ${userBlocks.blockedId} FROM ${userBlocks}
          WHERE ${userBlocks.blockerId} = ${viewerId}
        )`,
      );
    }
    if (query.gearId) conditions.push(eq(listings.gearId, query.gearId));
    if (query.brand) conditions.push(ilike(gear.brand, query.brand));
    if (query.category) conditions.push(eq(gear.category, query.category as any));
    if (query.conditions?.length)
      conditions.push(inArray(listings.condition, query.conditions));
    if (query.kinds?.length)
      conditions.push(inArray(listings.kind, query.kinds));
    if (query.deliveries?.length)
      conditions.push(inArray(listings.delivery, query.deliveries));
    if (query.location)
      conditions.push(ilike(listings.location, `%${query.location}%`));
    if (query.priceMin !== undefined)
      conditions.push(gte(listings.price, query.priceMin.toString()));
    if (query.priceMax !== undefined)
      conditions.push(lte(listings.price, query.priceMax.toString()));
    if (query.currency) conditions.push(eq(listings.currency, query.currency));
    if (query.q && query.q.trim().length >= 2) {
      const term = query.q.trim();
      conditions.push(
        sql`(
          ${listings.searchVector} @@ websearch_to_tsquery('sintezaur_ro', ${term})
          OR lower(${listings.location}) % lower(${term})
        )`,
      );
    }

    const orderBy = (() => {
      switch (query.sort) {
        case 'price_asc':
          return sql`${listings.price}::numeric ASC`;
        case 'price_desc':
          return sql`${listings.price}::numeric DESC`;
        case 'expiring_soon':
          return sql`${listings.expiresAt} ASC NULLS LAST`;
        case 'most_viewed':
          return desc(listings.viewCount);
        case 'newest':
        default:
          return desc(listings.createdAt);
      }
    })();

    const whereClause = and(...conditions);

    const items = await this.db
      .select({
        id: listings.id,
        slug: listings.slug,
        title: listings.title,
        brand: gear.brand,
        model: gear.model,
        gearId: listings.gearId,
        gearSlug: gear.slug,
        price: listings.price,
        currency: listings.currency,
        condition: listings.condition,
        kind: listings.kind,
        delivery: listings.delivery,
        acceptsOffers: listings.acceptsOffers,
        location: listings.location,
        status: listings.status,
        createdAt: listings.createdAt,
        expiresAt: listings.expiresAt,
        refreshedAt: listings.refreshedAt,
        sellerId: listings.sellerId,
        sellerUsername: users.username,
        sellerAvgRating: userReviewAggregate.avgRating,
        sellerReviewCount: userReviewAggregate.reviewCount,
        sellerTransactionCount: userReviewAggregate.transactionCount,
        thumb: sql<string | null>`(
          SELECT path FROM ${listingPhotos}
          WHERE ${listingPhotos.listingId} = ${listings.id}
            AND ${listingPhotos.variant} = 'landscape_4x3_medium'
          ORDER BY position ASC
          LIMIT 1
        )`,
      })
      .from(listings)
      .leftJoin(gear, eq(gear.id, listings.gearId))
      .innerJoin(users, eq(users.id, listings.sellerId))
      .leftJoin(
        userReviewAggregate,
        eq(userReviewAggregate.userId, listings.sellerId),
      )
      .where(whereClause)
      .orderBy(orderBy as any)
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(listings)
      .leftJoin(gear, eq(gear.id, listings.gearId))
      .where(whereClause);

    return {
      items: items.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        brand: r.brand,
        model: r.model,
        gearId: r.gearId,
        gearSlug: r.gearSlug,
        price: r.price,
        currency: r.currency,
        condition: r.condition,
        kind: r.kind,
        delivery: r.delivery,
        acceptsOffers: r.acceptsOffers,
        location: r.location,
        thumb: r.thumb,
        status: r.status,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
        refreshedAt: r.refreshedAt,
        seller: {
          id: r.sellerId,
          username: r.sellerUsername,
          avgRating: r.sellerAvgRating,
          reviewCount: r.sellerReviewCount ?? 0,
          transactionCount: r.sellerTransactionCount ?? 0,
        },
      })),
      page,
      pageSize,
      totalCount: count,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
    };
  }

  async findBySlug(slug: string, viewerId?: string): Promise<{
    listing: typeof listings.$inferSelect;
    photos: (typeof listingPhotos.$inferSelect)[];
    gear: { id: string; slug: string; brand: string; model: string; category: string } | null;
    seller: {
      id: string;
      username: string;
      fullName: string;
      avgRating: string | null;
      reviewCount: number;
      transactionCount: number;
      createdAt: Date;
    };
    isWatched: boolean;
  } | null> {
    const [listing] = await this.db
      .select()
      .from(listings)
      .where(and(eq(listings.slug, slug), isNull(listings.removedAt)))
      .limit(1);
    if (!listing) return null;

    // Bump view count (don't block on the increment)
    void this.db
      .update(listings)
      .set({ viewCount: sql`${listings.viewCount} + 1` })
      .where(eq(listings.id, listing.id))
      .catch((err) => this.logger.warn(`viewCount bump failed: ${err}`));

    const photos = await this.db
      .select()
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, listing.id))
      .orderBy(listingPhotos.position);

    const [gearRow] = listing.gearId
      ? await this.db
          .select({
            id: gear.id,
            slug: gear.slug,
            brand: gear.brand,
            model: gear.model,
            category: gear.category,
          })
          .from(gear)
          .where(eq(gear.id, listing.gearId))
          .limit(1)
      : [];

    const [seller] = await this.db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        createdAt: users.createdAt,
        avgRating: userReviewAggregate.avgRating,
        reviewCount: userReviewAggregate.reviewCount,
        transactionCount: userReviewAggregate.transactionCount,
      })
      .from(users)
      .leftJoin(
        userReviewAggregate,
        eq(userReviewAggregate.userId, users.id),
      )
      .where(eq(users.id, listing.sellerId))
      .limit(1);

    let isWatched = false;
    if (viewerId) {
      const watch = await this.db
        .select({ id: userListingWatches.id })
        .from(userListingWatches)
        .where(
          and(
            eq(userListingWatches.userId, viewerId),
            eq(userListingWatches.listingId, listing.id),
          ),
        )
        .limit(1);
      isWatched = watch.length > 0;
    }

    return {
      listing,
      photos,
      gear: gearRow ?? null,
      seller: {
        id: seller.id,
        username: seller.username,
        fullName: seller.fullName,
        avgRating: seller.avgRating,
        reviewCount: seller.reviewCount ?? 0,
        transactionCount: seller.transactionCount ?? 0,
        createdAt: seller.createdAt,
      },
      isWatched,
    };
  }

  /* ============================================================
     Admin listing list — sees ALL rows incl. removed/draft
     ============================================================ */

  async listForAdmin(opts: {
    status?: string;
    q?: string;
    sellerUsername?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    items: (PublicListingListItem & { removedAt: Date | null })[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  }> {
    const page = opts.page ?? 1;
    const pageSize = Math.min(opts.pageSize ?? 50, 200);
    const offset = (page - 1) * pageSize;

    const conds = [];
    if (opts.status) conds.push(eq(listings.status, opts.status as any));
    if (opts.q && opts.q.trim().length >= 2) {
      const term = opts.q.trim();
      conds.push(sql`(
        ${listings.title} ILIKE ${'%' + term + '%'}
        OR ${listings.slug} ILIKE ${'%' + term + '%'}
      )`);
    }
    if (opts.sellerUsername) {
      conds.push(ilike(users.username, `%${opts.sellerUsername}%`));
    }

    const whereClause = conds.length > 0 ? and(...conds) : undefined;

    const rows = await this.db
      .select({
        id: listings.id,
        slug: listings.slug,
        title: listings.title,
        brand: gear.brand,
        model: gear.model,
        gearId: listings.gearId,
        gearSlug: gear.slug,
        price: listings.price,
        currency: listings.currency,
        condition: listings.condition,
        kind: listings.kind,
        delivery: listings.delivery,
        acceptsOffers: listings.acceptsOffers,
        location: listings.location,
        status: listings.status,
        createdAt: listings.createdAt,
        expiresAt: listings.expiresAt,
        refreshedAt: listings.refreshedAt,
        removedAt: listings.removedAt,
        sellerId: listings.sellerId,
        sellerUsername: users.username,
        thumb: sql<string | null>`(
          SELECT path FROM ${listingPhotos}
          WHERE ${listingPhotos.listingId} = ${listings.id}
            AND ${listingPhotos.variant} = 'square_thumb'
          ORDER BY position ASC
          LIMIT 1
        )`,
      })
      .from(listings)
      .leftJoin(gear, eq(gear.id, listings.gearId))
      .innerJoin(users, eq(users.id, listings.sellerId))
      .where(whereClause as any)
      .orderBy(desc(listings.createdAt))
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(listings)
      .innerJoin(users, eq(users.id, listings.sellerId))
      .where(whereClause as any);

    return {
      items: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        brand: r.brand,
        model: r.model,
        gearId: r.gearId,
        gearSlug: r.gearSlug,
        price: r.price,
        currency: r.currency,
        condition: r.condition,
        kind: r.kind,
        delivery: r.delivery,
        acceptsOffers: r.acceptsOffers,
        location: r.location,
        thumb: r.thumb,
        status: r.status,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
        refreshedAt: r.refreshedAt,
        removedAt: r.removedAt,
        seller: {
          id: r.sellerId,
          username: r.sellerUsername,
          avgRating: null,
          reviewCount: 0,
          transactionCount: 0,
        },
      })),
      page,
      pageSize,
      totalCount: count,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
    };
  }

  async modUnremove(
    actorId: string,
    id: string,
    req?: Request,
  ): Promise<void> {
    await this.db
      .update(listings)
      .set({
        status: 'active',
        removedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(listings.id, id));
    await this.audit.record({
      actorId,
      action: 'remove_listing',
      targetType: 'listing',
      targetId: id,
      details: { action: 'unremove' },
      req,
    });
  }

  /* ============================================================
     My listings (own dashboard)
     ============================================================ */

  async listOwn(
    sellerId: string,
    opts: { status?: string; limit?: number } = {},
  ): Promise<PublicListingListItem[]> {
    const limit = Math.min(opts.limit ?? 60, 200);
    const conds = [eq(listings.sellerId, sellerId), isNull(listings.removedAt)];
    if (opts.status) conds.push(eq(listings.status, opts.status as any));
    const rows = await this.db
      .select({
        id: listings.id,
        slug: listings.slug,
        title: listings.title,
        brand: gear.brand,
        model: gear.model,
        gearId: listings.gearId,
        gearSlug: gear.slug,
        price: listings.price,
        currency: listings.currency,
        condition: listings.condition,
        kind: listings.kind,
        delivery: listings.delivery,
        acceptsOffers: listings.acceptsOffers,
        location: listings.location,
        status: listings.status,
        createdAt: listings.createdAt,
        expiresAt: listings.expiresAt,
        refreshedAt: listings.refreshedAt,
        thumb: sql<string | null>`(
          SELECT path FROM ${listingPhotos}
          WHERE ${listingPhotos.listingId} = ${listings.id}
            AND ${listingPhotos.variant} = 'landscape_4x3_medium'
          ORDER BY position ASC
          LIMIT 1
        )`,
      })
      .from(listings)
      .leftJoin(gear, eq(gear.id, listings.gearId))
      .where(and(...conds))
      .orderBy(desc(listings.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      brand: r.brand,
      model: r.model,
      gearId: r.gearId,
      gearSlug: r.gearSlug,
      price: r.price,
      currency: r.currency,
      condition: r.condition,
      kind: r.kind,
      delivery: r.delivery,
      acceptsOffers: r.acceptsOffers,
      location: r.location,
      thumb: r.thumb,
      status: r.status,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      refreshedAt: r.refreshedAt,
      seller: {
        id: sellerId,
        username: '',
        avgRating: null,
        reviewCount: 0,
        transactionCount: 0,
      },
    }));
  }

  /* ============================================================
     Recently sold (spec §8.2 — feeds price suggestions + Tezaur)
     ============================================================ */

  async recentlySold(params: {
    gearId?: string;
    limit?: number;
  }): Promise<PublicListingListItem[]> {
    const limit = Math.min(params.limit ?? 12, 60);
    const conditions = [eq(listings.status, 'sold'), isNull(listings.removedAt)];
    if (params.gearId) conditions.push(eq(listings.gearId, params.gearId));
    const rows = await this.db
      .select({
        id: listings.id,
        slug: listings.slug,
        title: listings.title,
        brand: gear.brand,
        model: gear.model,
        gearId: listings.gearId,
        gearSlug: gear.slug,
        price: listings.price,
        currency: listings.currency,
        condition: listings.condition,
        kind: listings.kind,
        delivery: listings.delivery,
        acceptsOffers: listings.acceptsOffers,
        location: listings.location,
        status: listings.status,
        createdAt: listings.createdAt,
        soldAt: listings.soldAt,
        expiresAt: listings.expiresAt,
        refreshedAt: listings.refreshedAt,
        sellerId: listings.sellerId,
        sellerUsername: users.username,
        sellerAvgRating: userReviewAggregate.avgRating,
        sellerReviewCount: userReviewAggregate.reviewCount,
        sellerTransactionCount: userReviewAggregate.transactionCount,
        thumb: sql<string | null>`(
          SELECT path FROM ${listingPhotos}
          WHERE ${listingPhotos.listingId} = ${listings.id}
            AND ${listingPhotos.variant} = 'landscape_4x3_medium'
          ORDER BY position ASC
          LIMIT 1
        )`,
      })
      .from(listings)
      .leftJoin(gear, eq(gear.id, listings.gearId))
      .innerJoin(users, eq(users.id, listings.sellerId))
      .leftJoin(
        userReviewAggregate,
        eq(userReviewAggregate.userId, listings.sellerId),
      )
      .where(and(...conditions))
      .orderBy(sql`${listings.soldAt} DESC NULLS LAST`)
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      brand: r.brand,
      model: r.model,
      gearId: r.gearId,
      gearSlug: r.gearSlug,
      price: r.price,
      currency: r.currency,
      condition: r.condition,
      kind: r.kind,
      delivery: r.delivery,
      acceptsOffers: r.acceptsOffers,
      location: r.location,
      thumb: r.thumb,
      status: r.status,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      refreshedAt: r.refreshedAt,
      seller: {
        id: r.sellerId,
        username: r.sellerUsername,
        avgRating: r.sellerAvgRating,
        reviewCount: r.sellerReviewCount ?? 0,
        transactionCount: r.sellerTransactionCount ?? 0,
      },
    }));
  }

  /* ============================================================
     Quick-list from Tezaur (spec §8.2)
     ============================================================ */

  async quickListSuggestion(gearId: string): Promise<QuickListSuggestion | null> {
    const [g] = await this.db
      .select({
        id: gear.id,
        slug: gear.slug,
        brand: gear.brand,
        model: gear.model,
        category: gear.category,
      })
      .from(gear)
      .where(and(eq(gear.id, gearId), isNull(gear.deletedAt)))
      .limit(1);
    if (!g) return null;

    // Price stats from confirmed-sold transactions (final_price) — falls
    // back to active listings if there are no sales yet.
    const soldRows = await this.db
      .select({
        final: transactions.finalPrice,
        currency: transactions.currency,
      })
      .from(transactions)
      .innerJoin(listings, eq(listings.id, transactions.listingId))
      .where(
        and(eq(listings.gearId, gearId), eq(transactions.status, 'confirmed')),
      );

    const activeRows = await this.db
      .select({ price: listings.price, currency: listings.currency })
      .from(listings)
      .where(
        and(
          eq(listings.gearId, gearId),
          eq(listings.status, 'active'),
          isNull(listings.removedAt),
        ),
      );

    const stats = computePriceStats(
      soldRows.map((r) => ({ amount: Number(r.final), currency: r.currency })),
      activeRows.map((r) => ({
        amount: Number(r.price),
        currency: r.currency,
      })),
    );

    return {
      gear: g,
      suggestedTitle: `${g.brand} ${g.model} — stare foarte bună`,
      suggestedConditions: ['very_good', 'good'],
      priceStats: stats,
    };
  }

  /* ============================================================
     internals
     ============================================================ */

  private async slugExists(slug: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: listings.id })
      .from(listings)
      .where(and(eq(listings.slug, slug), isNull(listings.removedAt)))
      .limit(1);
    return rows.length > 0;
  }
}

function computePriceStats(
  sold: { amount: number; currency: string }[],
  active: { amount: number; currency: string }[],
): QuickListSuggestion['priceStats'] {
  // Prefer RON-currency sold rows; fall back to active if none.
  const ron = sold.filter((r) => r.currency === 'ron').map((r) => r.amount);
  const eur = sold.filter((r) => r.currency === 'eur').map((r) => r.amount);
  const currency: 'ron' | 'eur' = ron.length >= eur.length ? 'ron' : 'eur';
  const fromSold = currency === 'ron' ? ron : eur;
  const usable =
    fromSold.length >= 3
      ? fromSold
      : active.filter((r) => r.currency === currency).map((r) => r.amount);
  if (!usable.length) {
    return {
      currency,
      avg: null,
      median: null,
      low: null,
      high: null,
      soldCount: fromSold.length,
      activeCount: active.length,
    };
  }
  usable.sort((a, b) => a - b);
  const sum = usable.reduce((acc, n) => acc + n, 0);
  const avg = Math.round(sum / usable.length);
  const mid = Math.floor(usable.length / 2);
  const median =
    usable.length % 2 === 1
      ? usable[mid]
      : Math.round((usable[mid - 1] + usable[mid]) / 2);
  return {
    currency,
    avg,
    median,
    low: usable[0],
    high: usable[usable.length - 1],
    soldCount: fromSold.length,
    activeCount: active.length,
  };
}
