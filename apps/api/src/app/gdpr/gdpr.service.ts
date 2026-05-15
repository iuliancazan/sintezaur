import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DATABASE,
  articles,
  contentReports,
  forumPostLikes,
  forumPosts,
  gearReviews,
  listings,
  messages,
  notificationPreferences,
  notifications,
  savedSearches,
  transactionReviews,
  transactions,
  userBlocks,
  userCategorySubscriptions,
  userThreadSubscriptions,
  userEmailHistory,
  userGearStatuses,
  userListingWatches,
  userRoles,
  users,
  type SintezaurDb,
} from '@sintezaur/db';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { AuditLogService } from '../common/audit-log.service';

interface UserExport {
  exportedAt: string;
  schemaVersion: '1.0';
  user: Record<string, unknown>;
  roles: string[];
  emailHistory: unknown[];
  listings: unknown[];
  messagesSent: unknown[];
  savedSearches: unknown[];
  listingWatches: unknown[];
  transactionsAsBuyer: unknown[];
  transactionsAsSeller: unknown[];
  transactionReviewsGiven: unknown[];
  transactionReviewsReceived: unknown[];
  gearCollection: unknown[];
  gearReviews: unknown[];
  forumPosts: unknown[];
  forumLikes: unknown[];
  threadSubscriptions: unknown[];
  categorySubscriptions: unknown[];
  articles: unknown[];
  notificationPreferences: unknown[];
  notifications: unknown[];
  blocksMade: unknown[];
  contentReportsFiled: unknown[];
}

/**
 * GDPR / RGPD compliance (spec §11 foundation). Two endpoints:
 *
 *   - `exportForUser(userId)` — returns a JSON dump with every row
 *     where the user is owner/author/participant. Operator-only data
 *     (admin notes, IP addresses on others' content, etc.) is excluded.
 *   - `deleteAccount(userId)` — soft-delete the row + PII redaction
 *     across user-authored content. Per spec §7.11, structural data
 *     (listings, posts) stays for legitimate-interest retention
 *     (transaction history, public discourse), but identifying info
 *     is wiped: email → `deleted-<uuid>@sintezaur.local`, username →
 *     `deleted-<short>`, full_name → "[utilizator șters]", bio /
 *     socials / avatar / phone → NULL.
 *
 * Both actions are audit-logged. Delete is irreversible from the user
 * surface (admin can reverse manually within retention window).
 */
@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly audit: AuditLogService,
  ) {}

  async exportForUser(userId: string): Promise<UserExport> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundException();

    const [
      roles,
      emailHistory,
      myListings,
      myMessages,
      mySavedSearches,
      myWatches,
      myTxBuyer,
      myTxSeller,
      myTxReviewsGiven,
      myTxReviewsReceived,
      myCollection,
      myGearReviews,
      myForumPosts,
      myLikes,
      myThreadSubs,
      myCategorySubs,
      myArticles,
      myNotifPrefs,
      myNotifs,
      myBlocks,
      myReports,
    ] = await Promise.all([
      this.db.select().from(userRoles).where(eq(userRoles.userId, userId)),
      this.db
        .select()
        .from(userEmailHistory)
        .where(eq(userEmailHistory.userId, userId)),
      this.db.select().from(listings).where(eq(listings.sellerId, userId)),
      this.db.select().from(messages).where(eq(messages.senderId, userId)),
      this.db
        .select()
        .from(savedSearches)
        .where(eq(savedSearches.userId, userId)),
      this.db
        .select()
        .from(userListingWatches)
        .where(eq(userListingWatches.userId, userId)),
      this.db.select().from(transactions).where(eq(transactions.buyerId, userId)),
      this.db.select().from(transactions).where(eq(transactions.sellerId, userId)),
      this.db
        .select()
        .from(transactionReviews)
        .where(eq(transactionReviews.reviewerId, userId)),
      this.db
        .select()
        .from(transactionReviews)
        .where(eq(transactionReviews.revieweeId, userId)),
      this.db
        .select()
        .from(userGearStatuses)
        .where(eq(userGearStatuses.userId, userId)),
      this.db.select().from(gearReviews).where(eq(gearReviews.userId, userId)),
      this.db.select().from(forumPosts).where(eq(forumPosts.authorId, userId)),
      this.db
        .select()
        .from(forumPostLikes)
        .where(eq(forumPostLikes.userId, userId)),
      this.db
        .select()
        .from(userThreadSubscriptions)
        .where(eq(userThreadSubscriptions.userId, userId)),
      this.db
        .select()
        .from(userCategorySubscriptions)
        .where(eq(userCategorySubscriptions.userId, userId)),
      this.db.select().from(articles).where(eq(articles.authorId, userId)),
      this.db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId)),
      this.db
        .select()
        .from(notifications)
        .where(eq(notifications.recipientId, userId)),
      this.db.select().from(userBlocks).where(eq(userBlocks.blockerId, userId)),
      this.db
        .select()
        .from(contentReports)
        .where(eq(contentReports.reporterId, userId)),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      schemaVersion: '1.0',
      user: redactSelfPii(user),
      roles: roles.map((r) => r.role),
      emailHistory,
      listings: myListings,
      messagesSent: myMessages,
      savedSearches: mySavedSearches,
      listingWatches: myWatches,
      transactionsAsBuyer: myTxBuyer,
      transactionsAsSeller: myTxSeller,
      transactionReviewsGiven: myTxReviewsGiven,
      transactionReviewsReceived: myTxReviewsReceived,
      gearCollection: myCollection,
      gearReviews: myGearReviews,
      forumPosts: myForumPosts,
      forumLikes: myLikes,
      threadSubscriptions: myThreadSubs,
      categorySubscriptions: myCategorySubs,
      articles: myArticles,
      notificationPreferences: myNotifPrefs,
      notifications: myNotifs,
      blocksMade: myBlocks,
      contentReportsFiled: myReports,
    };
  }

  async deleteAccount(userId: string): Promise<void> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundException();
    if (user.deletedAt) {
      throw new ConflictException('Contul este deja șters.');
    }

    const stamp = new Date();
    const tomb = `deleted-${user.id.slice(0, 8)}`;
    const tombEmail = `${tomb}@sintezaur.local`;

    await this.db.transaction(async (tx) => {
      // 1. Anonymize PII on the user row + flag deletedAt. Structural
      //    columns (id, createdAt, roles) stay so foreign keys + audit
      //    log don't dangle.
      await tx
        .update(users)
        .set({
          email: tombEmail,
          username: tomb,
          fullName: '[utilizator șters]',
          passwordHash: null,
          bio: null,
          location: null,
          avatarUrl: null,
          websiteUrl: null,
          socialInstagram: null,
          socialSoundcloud: null,
          socialBandcamp: null,
          phoneE164: null,
          phoneVerifiedAt: null,
          idVerifiedAt: null,
          deletedAt: stamp,
          updatedAt: stamp,
        })
        .where(eq(users.id, userId));

      // 2. Drop ephemeral session state — refresh tokens + email verif
      //    tokens + password reset tokens are cascaded by FK ON DELETE
      //    on user ⇒ we soft-delete user, so explicitly clear them.
      //    (Drizzle migrations declared CASCADE on user FK; we don't
      //    delete the user row, so a manual cleanup is needed here.)
      await tx.execute(
        sql`DELETE FROM refresh_tokens WHERE user_id = ${userId}`,
      );
      await tx.execute(
        sql`DELETE FROM email_verification_tokens WHERE user_id = ${userId}`,
      );
      await tx.execute(
        sql`DELETE FROM password_reset_tokens WHERE user_id = ${userId}`,
      );

      // 3. Soft-delete listings the user owns (keeps transaction
      //    history intact for the other party). status flips to
      //    'removed' with removedAt set; existing helpers respect this.
      await tx
        .update(listings)
        .set({ status: 'removed', removedAt: stamp, updatedAt: stamp })
        .where(
          and(
            eq(listings.sellerId, userId),
            isNull(listings.removedAt),
          ),
        );

      // 4. Hide forum posts authored by user (placeholder UX per §8.4).
      await tx
        .update(forumPosts)
        .set({
          hiddenAt: stamp,
          hiddenReason: 'account_deleted_by_user',
        })
        .where(eq(forumPosts.authorId, userId));
    });

    await this.audit.record({
      actorId: userId,
      action: 'gdpr_self_delete',
      targetType: 'user',
      targetId: userId,
      details: { tombEmail, tombUsername: tomb },
    });
    this.logger.log(`GDPR delete: user ${userId} anonymized.`);
  }
}

function redactSelfPii(user: Record<string, unknown>): Record<string, unknown> {
  // Strip non-self-relevant operational fields. The user already knows
  // their own email/avatar; we don't need to ship password_hash or
  // internal counters back to them.
  const {
    passwordHash: _password,
    failedLoginCount: _fail,
    lockedUntil: _lock,
    ...rest
  } = user as Record<string, unknown>;
  return rest;
}
