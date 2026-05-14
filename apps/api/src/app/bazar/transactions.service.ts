import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DATABASE,
  listingMessageThreads,
  listings,
  messages,
  transactions,
  type SintezaurDb,
  type Transaction,
} from '@sintezaur/db';
import { and, desc, eq } from 'drizzle-orm';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

/**
 * Bilateral transaction confirmation per spec §8.2.
 *
 * Flow:
 *  - First click creates the transaction row (status='pending'), stamps
 *    that party's `*_confirmed_at`, notifies the other party.
 *  - Second click flips status='confirmed', stamps the other side's
 *    `*_confirmed_at` + `confirmed_at`, inserts a `transaction_confirmed`
 *    system message, flips `listing.status='sold'`, and notifies the
 *    first party so they can write a review.
 */
@Injectable()
export class TransactionsService {
  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly notifications: NotificationsService,
    private readonly gateway: RealtimeGateway,
  ) {}

  async confirm(
    actorId: string,
    threadId: string,
  ): Promise<{ transaction: Transaction; confirmed: boolean }> {
    const [row] = await this.db
      .select({
        thread: listingMessageThreads,
        listing: listings,
      })
      .from(listingMessageThreads)
      .innerJoin(listings, eq(listings.id, listingMessageThreads.listingId))
      .where(eq(listingMessageThreads.id, threadId))
      .limit(1);
    if (!row) throw new NotFoundException(`thread ${threadId} not found`);
    const { thread, listing } = row;
    const isSeller = listing.sellerId === actorId;
    const isBuyer = thread.buyerId === actorId;
    if (!isSeller && !isBuyer)
      throw new ForbiddenException('Nu ești participant pe acest thread.');
    if (listing.status === 'sold')
      throw new ConflictException('Tranzacția este deja confirmată.');
    if (listing.status !== 'active' && listing.status !== 'expired')
      throw new BadRequestException('Listing-ul nu permite confirmare.');

    // Resolve final price from the latest accepted offer (if any),
    // falling back to current listing.price.
    const acceptedOffer = await this.findAcceptedOffer(threadId);
    const finalPrice = acceptedOffer?.offerAmount ?? listing.price;
    const currency = acceptedOffer?.offerCurrency ?? listing.currency;

    const [existing] = await this.db
      .select()
      .from(transactions)
      .where(eq(transactions.threadId, threadId))
      .limit(1);

    const now = new Date();
    if (!existing) {
      const [tx] = await this.db
        .insert(transactions)
        .values({
          listingId: listing.id,
          threadId,
          sellerId: listing.sellerId,
          buyerId: thread.buyerId,
          status: 'pending',
          finalPrice,
          currency,
          acceptedOfferMessageId: acceptedOffer?.id ?? null,
          sellerConfirmedAt: isSeller ? now : null,
          buyerConfirmedAt: isBuyer ? now : null,
        })
        .returning();
      await this.notifyOtherSideOfFirstConfirm(tx, actorId, listing);
      return { transaction: tx, confirmed: false };
    }

    if (existing.status === 'confirmed') {
      return { transaction: existing, confirmed: true };
    }

    const alreadyOnThisSide =
      (isSeller && existing.sellerConfirmedAt) ||
      (isBuyer && existing.buyerConfirmedAt);
    if (alreadyOnThisSide) {
      throw new ConflictException('Ai confirmat deja tranzacția.');
    }

    const patch: Partial<typeof transactions.$inferInsert> = isSeller
      ? { sellerConfirmedAt: now }
      : { buyerConfirmedAt: now };
    const otherStamped = isSeller
      ? existing.buyerConfirmedAt
      : existing.sellerConfirmedAt;
    const willConfirm = !!otherStamped;
    if (willConfirm) {
      patch.status = 'confirmed';
      patch.confirmedAt = now;
    }

    const [tx] = await this.db
      .update(transactions)
      .set({ ...patch, updatedAt: now })
      .where(eq(transactions.id, existing.id))
      .returning();

    if (willConfirm) {
      await this.db
        .update(listings)
        .set({ status: 'sold', soldAt: now, updatedAt: now })
        .where(eq(listings.id, listing.id));

      const [sysMsg] = await this.db
        .insert(messages)
        .values({
          threadId,
          senderId: actorId,
          kind: 'transaction_confirmed',
          body: 'Tranzacție confirmată — felicitări!',
        })
        .returning();
      await this.db
        .update(listingMessageThreads)
        .set({
          lastMessageAt: now,
          lastMessagePreview: 'Tranzacție confirmată',
        })
        .where(eq(listingMessageThreads.id, threadId));
      this.gateway.emitToThread(threadId, 'chat:message', sysMsg);
      this.gateway.emitToThread(threadId, 'transaction:confirmed', tx);

      await this.notifyBothOnConfirm(tx, listing);
    } else {
      await this.notifyOtherSideOfFirstConfirm(tx, actorId, listing);
    }

    return { transaction: tx, confirmed: willConfirm };
  }

  async getByThread(
    userId: string,
    threadId: string,
  ): Promise<Transaction | null> {
    const [row] = await this.db
      .select({ tx: transactions, listing: listings, thread: listingMessageThreads })
      .from(transactions)
      .innerJoin(listings, eq(listings.id, transactions.listingId))
      .innerJoin(
        listingMessageThreads,
        eq(listingMessageThreads.id, transactions.threadId),
      )
      .where(eq(transactions.threadId, threadId))
      .limit(1);
    if (!row) return null;
    if (
      row.listing.sellerId !== userId &&
      row.thread.buyerId !== userId
    )
      throw new ForbiddenException();
    return row.tx;
  }

  private async findAcceptedOffer(threadId: string) {
    const [accepted] = await this.db
      .select({
        repliesTo: messages.repliesToMessageId,
      })
      .from(messages)
      .where(
        and(
          eq(messages.threadId, threadId),
          eq(messages.kind, 'offer_accepted'),
        ),
      )
      .orderBy(desc(messages.createdAt))
      .limit(1);
    if (!accepted?.repliesTo) return null;
    const [offer] = await this.db
      .select()
      .from(messages)
      .where(eq(messages.id, accepted.repliesTo))
      .limit(1);
    return offer ?? null;
  }

  private async notifyOtherSideOfFirstConfirm(
    tx: Transaction,
    actorId: string,
    listing: typeof listings.$inferSelect,
  ): Promise<void> {
    const recipientId =
      actorId === tx.sellerId ? tx.buyerId : tx.sellerId;
    if (!recipientId) return;
    await this.notifications.post({
      recipientId,
      kind: 'bazar_transaction_confirmed_by_other',
      dedupKey: `bazar_tx_first_confirm:${tx.id}:${recipientId}`,
      targetType: 'listing',
      targetId: listing.id,
      actorId,
      payload: {
        listing: { id: listing.id, slug: listing.slug, title: listing.title },
        finalPrice: tx.finalPrice,
        currency: tx.currency,
      },
    });
  }

  private async notifyBothOnConfirm(
    tx: Transaction,
    listing: typeof listings.$inferSelect,
  ): Promise<void> {
    for (const recipientId of [tx.sellerId, tx.buyerId] as const) {
      if (!recipientId) continue;
      await this.notifications.post({
        recipientId,
        kind: 'bazar_transaction_confirmed_by_other',
        dedupKey: `bazar_tx_confirmed:${tx.id}:${recipientId}`,
        targetType: 'listing',
        targetId: listing.id,
        payload: {
          listing: { id: listing.id, slug: listing.slug, title: listing.title },
          status: 'confirmed',
          finalPrice: tx.finalPrice,
          currency: tx.currency,
          canReview: true,
        },
      });
    }
  }
}
