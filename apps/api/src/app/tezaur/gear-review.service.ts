import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DATABASE,
  type SintezaurDb,
  gear,
  gearReviews,
  users,
} from '@sintezaur/db';
import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import type { Request } from 'express';
import { AuditLogService } from './audit-log.service';
import type {
  CreateGearReviewDto,
  UpdateGearReviewDto,
} from './tezaur.dto';

export interface PublicReview {
  id: string;
  rating: number;
  body: string;
  ownershipMonths: number | null;
  helpfulCount: number;
  createdAt: Date;
  user: { id: string; username: string; initials: string };
}

@Injectable()
export class GearReviewService {
  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly audit: AuditLogService,
  ) {}

  async create(
    gearId: string,
    userId: string,
    dto: CreateGearReviewDto,
  ): Promise<{ id: string }> {
    const gearExists = await this.db
      .select({ id: gear.id })
      .from(gear)
      .where(and(eq(gear.id, gearId), isNull(gear.deletedAt)))
      .limit(1);
    if (!gearExists.length) throw new NotFoundException(`gear ${gearId} not found`);

    try {
      const [row] = await this.db
        .insert(gearReviews)
        .values({
          gearId,
          userId,
          rating: dto.rating,
          body: dto.body,
          ownershipMonths: dto.ownershipMonths,
        })
        .returning({ id: gearReviews.id });
      await this.recomputeAggregate(gearId);
      return row;
    } catch (err) {
      // Unique (userId, gearId) violation = already reviewed.
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException(
          'You already reviewed this gear; edit the existing review instead.',
        );
      }
      throw err;
    }
  }

  async update(
    reviewId: string,
    userId: string,
    dto: UpdateGearReviewDto,
  ): Promise<void> {
    const [existing] = await this.db
      .select({ userId: gearReviews.userId, gearId: gearReviews.gearId })
      .from(gearReviews)
      .where(eq(gearReviews.id, reviewId))
      .limit(1);
    if (!existing) throw new NotFoundException(`review ${reviewId} not found`);
    if (existing.userId !== userId)
      throw new ForbiddenException('You can only edit your own reviews.');

    await this.db
      .update(gearReviews)
      .set({
        ...(dto.rating !== undefined && { rating: dto.rating }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.ownershipMonths !== undefined && {
          ownershipMonths: dto.ownershipMonths,
        }),
        updatedAt: new Date(),
      })
      .where(eq(gearReviews.id, reviewId));
    await this.recomputeAggregate(existing.gearId);
  }

  async deleteOwn(reviewId: string, userId: string): Promise<void> {
    const [existing] = await this.db
      .select({ userId: gearReviews.userId, gearId: gearReviews.gearId })
      .from(gearReviews)
      .where(eq(gearReviews.id, reviewId))
      .limit(1);
    if (!existing) throw new NotFoundException(`review ${reviewId} not found`);
    if (existing.userId !== userId)
      throw new ForbiddenException('You can only delete your own reviews.');

    await this.db
      .update(gearReviews)
      .set({ deletedAt: new Date() })
      .where(eq(gearReviews.id, reviewId));
    await this.recomputeAggregate(existing.gearId);
  }

  async modHide(
    reviewId: string,
    actorId: string,
    reason: string,
    req?: Request,
  ): Promise<void> {
    const [existing] = await this.db
      .select({ gearId: gearReviews.gearId })
      .from(gearReviews)
      .where(eq(gearReviews.id, reviewId))
      .limit(1);
    if (!existing) throw new NotFoundException(`review ${reviewId} not found`);

    await this.db
      .update(gearReviews)
      .set({ hiddenAt: new Date(), hiddenReason: reason })
      .where(eq(gearReviews.id, reviewId));
    await this.recomputeAggregate(existing.gearId);
    await this.audit.record({
      actorId,
      action: 'hide_gear_review',
      targetType: 'gear_review',
      targetId: reviewId,
      details: { reason },
      req,
    });
  }

  /** Public-facing review list for a gear (paginated). */
  async listForGear(
    gearId: string,
    opts: { page: number; pageSize: number },
  ): Promise<{
    items: PublicReview[];
    page: number;
    pageSize: number;
    totalCount: number;
    aggregate: {
      avg: number | null;
      count: number;
      ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;
    };
  }> {
    const offset = (opts.page - 1) * opts.pageSize;

    const items = await this.db
      .select({
        id: gearReviews.id,
        rating: gearReviews.rating,
        body: gearReviews.body,
        ownershipMonths: gearReviews.ownershipMonths,
        helpfulCount: gearReviews.helpfulCount,
        createdAt: gearReviews.createdAt,
        userId: users.id,
        username: users.username,
        fullName: users.fullName,
      })
      .from(gearReviews)
      .innerJoin(users, eq(users.id, gearReviews.userId))
      .where(
        and(
          eq(gearReviews.gearId, gearId),
          isNull(gearReviews.deletedAt),
          isNull(gearReviews.hiddenAt),
          isNull(users.deletedAt),
        ),
      )
      .orderBy(desc(gearReviews.helpfulCount), desc(gearReviews.createdAt))
      .limit(opts.pageSize)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(gearReviews)
      .where(
        and(
          eq(gearReviews.gearId, gearId),
          isNull(gearReviews.deletedAt),
          isNull(gearReviews.hiddenAt),
        ),
      );

    const breakdown = await this.db
      .select({
        rating: gearReviews.rating,
        count: sql<number>`count(*)::int`,
      })
      .from(gearReviews)
      .where(
        and(
          eq(gearReviews.gearId, gearId),
          isNull(gearReviews.deletedAt),
          isNull(gearReviews.hiddenAt),
        ),
      )
      .groupBy(gearReviews.rating);

    const ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    for (const row of breakdown) {
      const r = row.rating as 1 | 2 | 3 | 4 | 5;
      ratingBreakdown[r] = row.count;
    }

    const [{ avg }] = await this.db
      .select({
        avg: sql<number | null>`avg(${gearReviews.rating})::numeric(3,2)`,
      })
      .from(gearReviews)
      .where(
        and(
          eq(gearReviews.gearId, gearId),
          isNull(gearReviews.deletedAt),
          isNull(gearReviews.hiddenAt),
        ),
      );

    return {
      items: items.map((r) => ({
        id: r.id,
        rating: r.rating,
        body: r.body,
        ownershipMonths: r.ownershipMonths,
        helpfulCount: r.helpfulCount,
        createdAt: r.createdAt,
        user: {
          id: r.userId,
          username: r.username,
          initials: initialsFromName(r.fullName),
        },
      })),
      page: opts.page,
      pageSize: opts.pageSize,
      totalCount: count,
      aggregate: {
        avg: avg !== null && avg !== undefined ? Number(avg) : null,
        count,
        ratingBreakdown,
      },
    };
  }

  /** Find the calling user's existing review for a gear (form pre-fill). */
  async findMine(
    gearId: string,
    userId: string,
  ): Promise<typeof gearReviews.$inferSelect | null> {
    const [row] = await this.db
      .select()
      .from(gearReviews)
      .where(
        and(eq(gearReviews.gearId, gearId), eq(gearReviews.userId, userId)),
      )
      .limit(1);
    return row ?? null;
  }

  private async recomputeAggregate(gearId: string): Promise<void> {
    const [agg] = await this.db
      .select({
        avg: sql<number | null>`avg(${gearReviews.rating})::numeric(3,2)`,
        count: sql<number>`count(*)::int`,
      })
      .from(gearReviews)
      .where(
        and(
          eq(gearReviews.gearId, gearId),
          isNull(gearReviews.deletedAt),
          isNull(gearReviews.hiddenAt),
        ),
      );
    await this.db
      .update(gear)
      .set({
        avgRating: agg.avg !== null && agg.avg !== undefined ? String(agg.avg) : null,
        reviewCount: agg.count,
      })
      .where(eq(gear.id, gearId));
  }
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) ?? '··').toUpperCase();
}
