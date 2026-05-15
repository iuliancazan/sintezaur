import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DATABASE,
  badges,
  forumPosts,
  userBadges,
  users,
  type Badge,
  type SintezaurDb,
} from '@sintezaur/db';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { NotificationsService } from '../notifications/notifications.service';

type CriteriaKind = 'post_count' | 'account_age_days' | 'likes_received';

interface ParsedCriteria {
  kind: CriteriaKind;
  threshold: number;
}

const SUPPORTED_KINDS: CriteriaKind[] = [
  'post_count',
  'account_age_days',
  'likes_received',
];

/**
 * Badge awarding per spec §7.4. Two surfaces:
 *   - evaluateForUsers(userIds) — called from instant hooks
 *     (post create, like toggle, signup-anniversary, etc.).
 *   - evaluateForAllActive(since) — called from the nightly cron sweep
 *     to catch users untouched by hooks (e.g. newly defined badges).
 *
 * Awarding is idempotent: `user_badges` has a unique (user_id, badge_key)
 * index. Only freshly-awarded rows trigger the `forum_badge_earned`
 * notification.
 */
@Injectable()
export class BadgeAwardingService {
  private readonly logger = new Logger(BadgeAwardingService.name);

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly notifications: NotificationsService,
  ) {}

  async evaluateForUsers(userIds: string[]): Promise<number> {
    if (userIds.length === 0) return 0;
    const all = await this.loadBadges();
    if (all.length === 0) return 0;
    let totalAwarded = 0;
    for (const badge of all) {
      const criteria = this.parseCriteria(badge);
      if (!criteria) continue;
      const eligible = await this.eligibleUserIds(criteria, userIds);
      const newlyAwarded = await this.awardAndNotify(badge, eligible);
      totalAwarded += newlyAwarded;
    }
    return totalAwarded;
  }

  /**
   * Sweep — evaluate all badges across every active user. Used by the
   * nightly cron. Expensive; only runs once / day. Returns total newly
   * awarded.
   */
  async evaluateAll(): Promise<number> {
    const all = await this.loadBadges();
    if (all.length === 0) return 0;
    let totalAwarded = 0;
    for (const badge of all) {
      const criteria = this.parseCriteria(badge);
      if (!criteria) continue;
      const eligible = await this.eligibleUserIds(criteria, null);
      const newlyAwarded = await this.awardAndNotify(badge, eligible);
      totalAwarded += newlyAwarded;
    }
    return totalAwarded;
  }

  private async loadBadges(): Promise<Badge[]> {
    return this.db.select().from(badges);
  }

  private parseCriteria(b: Badge): ParsedCriteria | null {
    const c = b.criteria as { kind?: string; threshold?: number };
    if (!c || !c.kind || typeof c.threshold !== 'number') {
      this.logger.warn(
        `Badge "${b.key}" has invalid criteria; skipping. (${JSON.stringify(c)})`,
      );
      return null;
    }
    if (!SUPPORTED_KINDS.includes(c.kind as CriteriaKind)) {
      this.logger.warn(
        `Badge "${b.key}" uses unknown kind "${c.kind}"; skipping.`,
      );
      return null;
    }
    return { kind: c.kind as CriteriaKind, threshold: c.threshold };
  }

  /**
   * For a (criteria, optional candidate-list) returns IDs of users who
   * satisfy the criteria. Passing `null` for `userIds` means "evaluate
   * against the whole user table" (cron path).
   */
  private async eligibleUserIds(
    criteria: ParsedCriteria,
    userIds: string[] | null,
  ): Promise<string[]> {
    if (criteria.kind === 'post_count') {
      const rows = await this.db
        .select({
          authorId: forumPosts.authorId,
          c: sql<number>`count(*)::int`,
        })
        .from(forumPosts)
        .where(
          and(
            eq(forumPosts.status, 'approved'),
            isNull(forumPosts.deletedAt),
            isNull(forumPosts.hiddenAt),
            userIds === null
              ? sql`${forumPosts.authorId} IS NOT NULL`
              : sql`${forumPosts.authorId} = ANY(${userIds}::uuid[])`,
          ),
        )
        .groupBy(forumPosts.authorId)
        .having(sql`count(*) >= ${criteria.threshold}`);
      return rows
        .map((r) => r.authorId)
        .filter((id): id is string => id !== null);
    }

    if (criteria.kind === 'account_age_days') {
      const cutoff = sql`NOW() - INTERVAL '1 day' * ${criteria.threshold}`;
      const rows = await this.db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            isNull(users.deletedAt),
            sql`${users.createdAt} <= ${cutoff}`,
            userIds === null
              ? sql`TRUE`
              : sql`${users.id} = ANY(${userIds}::uuid[])`,
          ),
        );
      return rows.map((r) => r.id);
    }

    if (criteria.kind === 'likes_received') {
      const rows = await this.db
        .select({
          authorId: forumPosts.authorId,
          total: sql<number>`COALESCE(SUM(${forumPosts.likeCount}), 0)::int`,
        })
        .from(forumPosts)
        .where(
          and(
            isNull(forumPosts.deletedAt),
            isNull(forumPosts.hiddenAt),
            userIds === null
              ? sql`${forumPosts.authorId} IS NOT NULL`
              : sql`${forumPosts.authorId} = ANY(${userIds}::uuid[])`,
          ),
        )
        .groupBy(forumPosts.authorId)
        .having(
          sql`COALESCE(SUM(${forumPosts.likeCount}), 0) >= ${criteria.threshold}`,
        );
      return rows
        .map((r) => r.authorId)
        .filter((id): id is string => id !== null);
    }

    return [];
  }

  /**
   * Insert into user_badges ON CONFLICT DO NOTHING and notify only on
   * newly-inserted rows. Notification is fire-and-forget — we never
   * fail awarding on notify error.
   */
  private async awardAndNotify(
    badge: Badge,
    userIds: string[],
  ): Promise<number> {
    if (userIds.length === 0) return 0;
    const inserted = await this.db
      .insert(userBadges)
      .values(
        userIds.map((userId) => ({
          userId,
          badgeKey: badge.key,
          category: badge.category,
        })),
      )
      .onConflictDoNothing()
      .returning({ userId: userBadges.userId });

    for (const row of inserted) {
      try {
        await this.notifications.post({
          recipientId: row.userId,
          kind: 'forum_badge_earned',
          dedupKey: `forum_badge:${badge.key}:${row.userId}`,
          targetType: 'badge',
          targetId: badge.id,
          payload: {
            badgeKey: badge.key,
            badgeNameRo: badge.nameRo,
            badgeNameEn: badge.nameEn,
            category: badge.category,
          },
        });
      } catch (err) {
        this.logger.warn(
          `notify forum_badge_earned failed for ${row.userId}/${badge.key}: ${(err as Error).message}`,
        );
      }
    }
    if (inserted.length > 0) {
      this.logger.log(`awarded "${badge.key}" to ${inserted.length} user(s)`);
    }
    return inserted.length;
  }
}
