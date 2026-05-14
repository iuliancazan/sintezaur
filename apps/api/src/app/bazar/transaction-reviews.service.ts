import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DATABASE,
  listings,
  transactionReviews,
  transactions,
  userReviewAggregate,
  type SintezaurDb,
  type TransactionReview,
} from '@sintezaur/db';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { NotificationsService } from '../notifications/notifications.service';

/** spec §8.2: reviews must be submitted within 30 days of confirmed_at. */
const REVIEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class TransactionReviewsService {
  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly notifications: NotificationsService,
  ) {}

  async submit(
    reviewerId: string,
    transactionId: string,
    rating: number,
    body: string,
  ): Promise<TransactionReview> {
    const [tx] = await this.db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);
    if (!tx) throw new NotFoundException(`transaction ${transactionId} not found`);
    if (tx.status !== 'confirmed' || !tx.confirmedAt)
      throw new ConflictException(
        'Recenziile pot fi scrise doar după confirmarea bilaterală.',
      );
    if (Date.now() - tx.confirmedAt.getTime() > REVIEW_WINDOW_MS)
      throw new ConflictException(
        'Fereastra de 30 de zile pentru recenzii a expirat.',
      );
    let revieweeId: string;
    if (reviewerId === tx.sellerId) revieweeId = tx.buyerId;
    else if (reviewerId === tx.buyerId) revieweeId = tx.sellerId;
    else throw new ForbiddenException();

    const [existing] = await this.db
      .select({ id: transactionReviews.id })
      .from(transactionReviews)
      .where(
        and(
          eq(transactionReviews.transactionId, transactionId),
          eq(transactionReviews.reviewerId, reviewerId),
        ),
      )
      .limit(1);
    if (existing)
      throw new ConflictException('Ai depus deja o recenzie pentru această tranzacție.');

    const [review] = await this.db
      .insert(transactionReviews)
      .values({
        transactionId,
        reviewerId,
        revieweeId,
        rating,
        body,
      })
      .returning();

    await this.recomputeAggregate(revieweeId);

    // Notify the reviewee.
    const [listing] = await this.db
      .select({ id: listings.id, slug: listings.slug, title: listings.title })
      .from(listings)
      .where(eq(listings.id, tx.listingId))
      .limit(1);
    await this.notifications.post({
      recipientId: revieweeId,
      kind: 'bazar_review_submitted_on_me',
      dedupKey: `bazar_review_submitted:${review.id}:${revieweeId}`,
      targetType: 'transaction_review',
      targetId: review.id,
      actorId: reviewerId,
      payload: {
        rating,
        listing,
      },
    });
    return review;
  }

  async listForUser(userId: string) {
    return this.db
      .select()
      .from(transactionReviews)
      .where(
        and(
          eq(transactionReviews.revieweeId, userId),
          isNull(transactionReviews.hiddenAt),
        ),
      )
      .orderBy(desc(transactionReviews.createdAt));
  }

  /**
   * Recompute the (avg, count) aggregate over visible reviews and
   * upsert the row. Cheap because counts stay small per user.
   */
  async recomputeAggregate(userId: string): Promise<void> {
    const [stats] = await this.db
      .select({
        avg: sql<string>`coalesce(avg(${transactionReviews.rating}), 0)::numeric(3,2)`,
        count: sql<number>`count(*)::int`,
      })
      .from(transactionReviews)
      .where(
        and(
          eq(transactionReviews.revieweeId, userId),
          isNull(transactionReviews.hiddenAt),
        ),
      );
    const [{ txCount }] = await this.db
      .select({
        txCount: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .where(
        and(
          sql`(${transactions.sellerId} = ${userId} OR ${transactions.buyerId} = ${userId})`,
          eq(transactions.status, 'confirmed'),
        ),
      );

    await this.db
      .insert(userReviewAggregate)
      .values({
        userId,
        avgRating: stats.count > 0 ? stats.avg : null,
        reviewCount: stats.count,
        transactionCount: txCount,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userReviewAggregate.userId,
        set: {
          avgRating: stats.count > 0 ? stats.avg : null,
          reviewCount: stats.count,
          transactionCount: txCount,
          updatedAt: new Date(),
        },
      });
  }
}
