import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DATABASE,
  listingMessageThreads,
  listings,
  messages,
  userBlocks,
  users,
  type Message,
  type MessageKind,
  type SintezaurDb,
} from '@sintezaur/db';
import { and, asc, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

/** spec §8.2: max 5 counter rounds per thread. */
const MAX_OFFER_ROUNDS = 5;

/** spec §8.2: default 7-day expiry on a fresh offer. */
const OFFER_DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SendMessageInput {
  threadId?: string;
  listingId?: string;
  body: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly notifications: NotificationsService,
    private readonly gateway: RealtimeGateway,
  ) {}

  /* ============================================================
     Inbox + thread read
     ============================================================ */

  async listInbox(userId: string) {
    return this.db
      .select({
        threadId: listingMessageThreads.id,
        listingId: listingMessageThreads.listingId,
        listingSlug: listings.slug,
        listingTitle: listings.title,
        listingStatus: listings.status,
        buyerId: listingMessageThreads.buyerId,
        sellerId: listings.sellerId,
        lastMessageAt: listingMessageThreads.lastMessageAt,
        lastMessagePreview: listingMessageThreads.lastMessagePreview,
        sellerLastReadAt: listingMessageThreads.sellerLastReadAt,
        buyerLastReadAt: listingMessageThreads.buyerLastReadAt,
        otherUsername: users.username,
      })
      .from(listingMessageThreads)
      .innerJoin(listings, eq(listings.id, listingMessageThreads.listingId))
      .innerJoin(
        users,
        sql`${users.id} = CASE WHEN ${listingMessageThreads.buyerId} = ${userId}
                          THEN ${listings.sellerId}
                          ELSE ${listingMessageThreads.buyerId} END`,
      )
      .where(
        or(
          eq(listingMessageThreads.buyerId, userId),
          eq(listings.sellerId, userId),
        ),
      )
      .orderBy(desc(listingMessageThreads.lastMessageAt));
  }

  async readThread(userId: string, threadId: string) {
    const ctx = await this.loadThreadCtx(threadId);
    if (!ctx) throw new NotFoundException(`thread ${threadId} not found`);
    if (ctx.thread.buyerId !== userId && ctx.listing.sellerId !== userId)
      throw new ForbiddenException();

    // Touch last-read for this side.
    const isBuyer = ctx.thread.buyerId === userId;
    await this.db
      .update(listingMessageThreads)
      .set(
        isBuyer
          ? { buyerLastReadAt: new Date() }
          : { sellerLastReadAt: new Date() },
      )
      .where(eq(listingMessageThreads.id, threadId));

    const rows = await this.db
      .select()
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(asc(messages.createdAt));
    return { thread: ctx.thread, listing: ctx.listing, messages: rows };
  }

  /* ============================================================
     Send text message (creates thread on first contact)
     ============================================================ */

  async sendMessage(
    senderId: string,
    input: SendMessageInput,
  ): Promise<{ thread: { id: string }; message: Message }> {
    const ctx = input.threadId
      ? await this.loadThreadCtx(input.threadId)
      : input.listingId
        ? await this.openOrCreateThread(senderId, input.listingId)
        : null;
    if (!ctx) throw new NotFoundException(`thread/listing not found`);
    this.assertParticipant(ctx, senderId);
    await this.assertNotBlocked(ctx, senderId);

    if (ctx.listing.status !== 'active')
      throw new ConflictException('Listing-ul nu este activ.');

    const [msg] = await this.db
      .insert(messages)
      .values({
        threadId: ctx.thread.id,
        senderId,
        kind: 'text',
        body: input.body,
      })
      .returning();

    await this.touchThread(ctx.thread.id, input.body.slice(0, 160));
    this.gateway.emitToThread(ctx.thread.id, 'chat:message', msg);
    await this.notifyNewMessage(ctx, senderId, msg);
    return { thread: { id: ctx.thread.id }, message: msg };
  }

  /* ============================================================
     Structured offers — spec §8.2
     ============================================================ */

  async makeOffer(
    senderId: string,
    args: {
      threadId?: string;
      listingId?: string;
      amount: number;
      currency: 'ron' | 'eur';
      note?: string;
      repliesToMessageId?: string;
    },
  ): Promise<{ thread: { id: string }; message: Message }> {
    const ctx = args.threadId
      ? await this.loadThreadCtx(args.threadId)
      : args.listingId
        ? await this.openOrCreateThread(senderId, args.listingId)
        : null;
    if (!ctx) throw new NotFoundException('thread/listing not found');
    this.assertParticipant(ctx, senderId);
    await this.assertNotBlocked(ctx, senderId);

    if (!ctx.listing.acceptsOffers)
      throw new ConflictException(
        'Acest anunț nu acceptă oferte structurate.',
      );
    if (ctx.listing.status !== 'active')
      throw new ConflictException('Listing-ul nu este activ.');

    let kind: MessageKind = 'offer';
    if (args.repliesToMessageId) {
      const [prev] = await this.db
        .select()
        .from(messages)
        .where(eq(messages.id, args.repliesToMessageId))
        .limit(1);
      if (!prev || prev.threadId !== ctx.thread.id)
        throw new BadRequestException('replies_to_message_id invalid');
      if (
        prev.kind === 'offer_accepted' ||
        prev.kind === 'offer_rejected'
      )
        throw new ConflictException('Această ofertă este deja finalizată.');
      kind = 'counter_offer';
    }
    if (
      kind === 'counter_offer' &&
      ctx.thread.offerRoundCount >= MAX_OFFER_ROUNDS
    )
      throw new ConflictException(
        `Plafonul de ${MAX_OFFER_ROUNDS} runde de contraofertă a fost atins.`,
      );

    const expiresAt = new Date(Date.now() + OFFER_DEFAULT_TTL_MS);
    const [msg] = await this.db
      .insert(messages)
      .values({
        threadId: ctx.thread.id,
        senderId,
        kind,
        body: args.note ?? null,
        offerAmount: args.amount.toString(),
        offerCurrency: args.currency,
        offerExpiresAt: expiresAt,
        repliesToMessageId: args.repliesToMessageId ?? null,
      })
      .returning();

    if (kind === 'counter_offer') {
      await this.db
        .update(listingMessageThreads)
        .set({
          offerRoundCount: sql`${listingMessageThreads.offerRoundCount} + 1`,
        })
        .where(eq(listingMessageThreads.id, ctx.thread.id));
    }
    await this.touchThread(
      ctx.thread.id,
      kind === 'counter_offer'
        ? `Contraofertă: ${args.amount} ${args.currency.toUpperCase()}`
        : `Ofertă: ${args.amount} ${args.currency.toUpperCase()}`,
    );
    this.gateway.emitToThread(ctx.thread.id, 'chat:message', msg);
    await this.notifyOffer(ctx, senderId, msg, kind);
    return { thread: { id: ctx.thread.id }, message: msg };
  }

  async respondToOffer(
    actorId: string,
    threadId: string,
    offerMessageId: string,
    accept: boolean,
  ): Promise<{ message: Message }> {
    const ctx = await this.loadThreadCtx(threadId);
    if (!ctx) throw new NotFoundException(`thread ${threadId} not found`);
    this.assertParticipant(ctx, actorId);

    const [offer] = await this.db
      .select()
      .from(messages)
      .where(eq(messages.id, offerMessageId))
      .limit(1);
    if (!offer || offer.threadId !== threadId)
      throw new NotFoundException('offer not found');
    if (offer.kind !== 'offer' && offer.kind !== 'counter_offer')
      throw new BadRequestException('Mesajul nu este o ofertă.');
    if (offer.senderId === actorId)
      throw new ForbiddenException('Nu poți răspunde propriei oferte.');
    // ensure not already terminal
    const [terminal] = await this.db
      .select({ id: messages.id })
      .from(messages)
      .where(
        and(
          eq(messages.repliesToMessageId, offerMessageId),
          sql`${messages.kind} IN ('offer_accepted','offer_rejected')`,
        ),
      )
      .limit(1);
    if (terminal)
      throw new ConflictException('Această ofertă a fost deja finalizată.');

    const kind: MessageKind = accept ? 'offer_accepted' : 'offer_rejected';
    const [msg] = await this.db
      .insert(messages)
      .values({
        threadId,
        senderId: actorId,
        kind,
        body: null,
        repliesToMessageId: offerMessageId,
      })
      .returning();
    await this.touchThread(
      threadId,
      accept ? 'Ofertă acceptată' : 'Ofertă refuzată',
    );
    this.gateway.emitToThread(threadId, 'chat:message', msg);

    // Notify the offer author.
    const recipientId =
      offer.senderId && offer.senderId !== actorId ? offer.senderId : null;
    if (recipientId) {
      await this.notifications.post({
        recipientId,
        kind: accept ? 'bazar_offer_accepted' : 'bazar_offer_rejected',
        dedupKey: `bazar_offer_resolution:${msg.id}:${recipientId}`,
        targetType: 'listing_message_thread',
        targetId: threadId,
        actorId,
        payload: {
          listing: {
            id: ctx.listing.id,
            slug: ctx.listing.slug,
            title: ctx.listing.title,
          },
          offerAmount: offer.offerAmount,
          offerCurrency: offer.offerCurrency,
        },
      });
    }
    return { message: msg };
  }

  /* ============================================================
     Helpers
     ============================================================ */

  async loadThreadCtx(threadId: string): Promise<ThreadCtx | null> {
    const [row] = await this.db
      .select({
        thread: listingMessageThreads,
        listing: listings,
      })
      .from(listingMessageThreads)
      .innerJoin(listings, eq(listings.id, listingMessageThreads.listingId))
      .where(
        and(
          eq(listingMessageThreads.id, threadId),
          isNull(listings.removedAt),
        ),
      )
      .limit(1);
    return row ? { thread: row.thread, listing: row.listing } : null;
  }

  private async openOrCreateThread(
    buyerId: string,
    listingId: string,
  ): Promise<ThreadCtx | null> {
    const [listing] = await this.db
      .select()
      .from(listings)
      .where(and(eq(listings.id, listingId), isNull(listings.removedAt)))
      .limit(1);
    if (!listing) return null;
    if (listing.sellerId === buyerId)
      throw new ForbiddenException(
        'Nu poți deschide o conversație pe propriul tău anunț.',
      );

    const [existing] = await this.db
      .select()
      .from(listingMessageThreads)
      .where(
        and(
          eq(listingMessageThreads.listingId, listingId),
          eq(listingMessageThreads.buyerId, buyerId),
        ),
      )
      .limit(1);
    if (existing) return { thread: existing, listing };

    const [fresh] = await this.db
      .insert(listingMessageThreads)
      .values({ listingId, buyerId })
      .returning();
    return { thread: fresh, listing };
  }

  private assertParticipant(ctx: ThreadCtx, userId: string) {
    if (ctx.thread.buyerId !== userId && ctx.listing.sellerId !== userId)
      throw new ForbiddenException('Nu ești participant pe acest thread.');
  }

  private async assertNotBlocked(ctx: ThreadCtx, senderId: string) {
    const recipientId =
      senderId === ctx.thread.buyerId
        ? ctx.listing.sellerId
        : ctx.thread.buyerId;
    const [blk] = await this.db
      .select({ id: userBlocks.id })
      .from(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerId, recipientId),
          eq(userBlocks.blockedId, senderId),
        ),
      )
      .limit(1);
    if (blk)
      throw new ForbiddenException(
        'Nu poți trimite mesaje către acest utilizator.',
      );
  }

  private async touchThread(threadId: string, preview: string): Promise<void> {
    await this.db
      .update(listingMessageThreads)
      .set({
        lastMessageAt: new Date(),
        lastMessagePreview: preview,
      })
      .where(eq(listingMessageThreads.id, threadId));
  }

  private async notifyNewMessage(
    ctx: ThreadCtx,
    senderId: string,
    msg: Message,
  ): Promise<void> {
    const recipientId =
      senderId === ctx.thread.buyerId
        ? ctx.listing.sellerId
        : ctx.thread.buyerId;
    if (!recipientId || recipientId === senderId) return;
    await this.notifications.post({
      recipientId,
      kind: 'bazar_new_message',
      dedupKey: `bazar_new_message:${ctx.thread.id}:${recipientId}`,
      targetType: 'listing_message_thread',
      targetId: ctx.thread.id,
      actorId: senderId,
      payload: {
        listing: {
          id: ctx.listing.id,
          slug: ctx.listing.slug,
          title: ctx.listing.title,
        },
        preview: msg.body?.slice(0, 160) ?? '',
      },
    });
  }

  private async notifyOffer(
    ctx: ThreadCtx,
    senderId: string,
    msg: Message,
    kind: MessageKind,
  ): Promise<void> {
    const recipientId =
      senderId === ctx.thread.buyerId
        ? ctx.listing.sellerId
        : ctx.thread.buyerId;
    if (!recipientId || recipientId === senderId) return;
    await this.notifications.post({
      recipientId,
      kind: kind === 'counter_offer' ? 'bazar_counter_offer' : 'bazar_new_offer',
      dedupKey: `bazar_${kind}:${msg.id}:${recipientId}`,
      targetType: 'listing_message_thread',
      targetId: ctx.thread.id,
      actorId: senderId,
      payload: {
        listing: {
          id: ctx.listing.id,
          slug: ctx.listing.slug,
          title: ctx.listing.title,
        },
        amount: msg.offerAmount,
        currency: msg.offerCurrency,
      },
    });
  }
}

interface ThreadCtx {
  thread: typeof listingMessageThreads.$inferSelect;
  listing: typeof listings.$inferSelect;
}
