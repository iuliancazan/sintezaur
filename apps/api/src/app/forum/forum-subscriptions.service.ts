import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  DATABASE,
  forumCategories,
  forumThreads,
  userCategorySubscriptions,
  userThreadSubscriptions,
  type ForumSubscriptionLevel,
  type SintezaurDb,
} from '@sintezaur/db';
import { and, desc, eq, sql } from 'drizzle-orm';

export interface ThreadSubscription {
  threadId: string;
  threadSlug: string;
  threadTitle: string;
  categorySlug: string;
  categoryName: string;
  level: ForumSubscriptionLevel;
  updatedAt: Date;
}

export interface CategorySubscription {
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  level: ForumSubscriptionLevel;
  updatedAt: Date;
}

const ACTIVE_LEVELS = new Set<ForumSubscriptionLevel>([
  'watching',
  'tracking',
  'mentioned_only',
]);

/**
 * Per-(user, target) subscription state for forum threads + categories.
 * Spec §7.5 — 4 levels (watching/tracking/mentioned_only/muted). Setting
 * any level upserts; passing `null` deletes the row entirely (returns the
 * user to default = no subscription = no notifications).
 *
 * Auto-subscribe pattern (used from ForumPostsService): when a user posts
 * in a thread, default them to `watching` IF they have no row yet. We
 * never overwrite an existing row (the user might have explicitly muted).
 */
@Injectable()
export class ForumSubscriptionsService {
  constructor(@Inject(DATABASE) private readonly db: SintezaurDb) {}

  /* ============ thread ============ */

  async setThreadLevel(
    userId: string,
    threadId: string,
    level: ForumSubscriptionLevel | null,
  ): Promise<{ level: ForumSubscriptionLevel | null }> {
    const [t] = await this.db
      .select({ id: forumThreads.id })
      .from(forumThreads)
      .where(eq(forumThreads.id, threadId))
      .limit(1);
    if (!t) throw new NotFoundException('Thread-ul nu există.');

    if (level === null) {
      await this.db
        .delete(userThreadSubscriptions)
        .where(
          and(
            eq(userThreadSubscriptions.userId, userId),
            eq(userThreadSubscriptions.threadId, threadId),
          ),
        );
      return { level: null };
    }

    await this.db
      .insert(userThreadSubscriptions)
      .values({ userId, threadId, level })
      .onConflictDoUpdate({
        target: [
          userThreadSubscriptions.userId,
          userThreadSubscriptions.threadId,
        ],
        set: { level, updatedAt: new Date() },
      });
    return { level };
  }

  /** Idempotent — used by ForumPostsService after a user replies. */
  async ensureWatchingThread(
    userId: string,
    threadId: string,
  ): Promise<void> {
    await this.db
      .insert(userThreadSubscriptions)
      .values({ userId, threadId, level: 'watching' })
      .onConflictDoNothing();
  }

  async getThreadLevel(
    userId: string,
    threadId: string,
  ): Promise<ForumSubscriptionLevel | null> {
    const [row] = await this.db
      .select({ level: userThreadSubscriptions.level })
      .from(userThreadSubscriptions)
      .where(
        and(
          eq(userThreadSubscriptions.userId, userId),
          eq(userThreadSubscriptions.threadId, threadId),
        ),
      )
      .limit(1);
    return row?.level ?? null;
  }

  /**
   * Watchers who should receive `forum_reply_in_subscribed` for a new
   * reply. Excludes the actor + anyone whose level is `muted` or
   * `tracking` (digest only — handled by future cron, not real-time).
   * `mentioned_only` users are excluded here too: they get notified via
   * the mention path if they were @-tagged, otherwise nothing.
   */
  async watchersForRealtime(
    threadId: string,
    excludeUserId: string,
  ): Promise<string[]> {
    const rows = await this.db
      .select({ userId: userThreadSubscriptions.userId })
      .from(userThreadSubscriptions)
      .where(
        and(
          eq(userThreadSubscriptions.threadId, threadId),
          eq(userThreadSubscriptions.level, 'watching'),
          sql`${userThreadSubscriptions.userId} <> ${excludeUserId}`,
        ),
      );
    return rows.map((r) => r.userId);
  }

  /* ============ category ============ */

  async setCategoryLevel(
    userId: string,
    categoryId: string,
    level: ForumSubscriptionLevel | null,
  ): Promise<{ level: ForumSubscriptionLevel | null }> {
    const [c] = await this.db
      .select({ id: forumCategories.id })
      .from(forumCategories)
      .where(eq(forumCategories.id, categoryId))
      .limit(1);
    if (!c) throw new NotFoundException('Categoria nu există.');

    if (level === null) {
      await this.db
        .delete(userCategorySubscriptions)
        .where(
          and(
            eq(userCategorySubscriptions.userId, userId),
            eq(userCategorySubscriptions.categoryId, categoryId),
          ),
        );
      return { level: null };
    }

    await this.db
      .insert(userCategorySubscriptions)
      .values({ userId, categoryId, level })
      .onConflictDoUpdate({
        target: [
          userCategorySubscriptions.userId,
          userCategorySubscriptions.categoryId,
        ],
        set: { level, updatedAt: new Date() },
      });
    return { level };
  }

  async getCategoryLevel(
    userId: string,
    categoryId: string,
  ): Promise<ForumSubscriptionLevel | null> {
    const [row] = await this.db
      .select({ level: userCategorySubscriptions.level })
      .from(userCategorySubscriptions)
      .where(
        and(
          eq(userCategorySubscriptions.userId, userId),
          eq(userCategorySubscriptions.categoryId, categoryId),
        ),
      )
      .limit(1);
    return row?.level ?? null;
  }

  /* ============ list (account page) ============ */

  async listMyThreadSubscriptions(
    userId: string,
  ): Promise<ThreadSubscription[]> {
    const rows = await this.db
      .select({
        threadId: userThreadSubscriptions.threadId,
        level: userThreadSubscriptions.level,
        updatedAt: userThreadSubscriptions.updatedAt,
        threadSlug: forumThreads.slug,
        threadTitle: forumThreads.title,
        categorySlug: forumCategories.slug,
        categoryName: forumCategories.name,
      })
      .from(userThreadSubscriptions)
      .innerJoin(
        forumThreads,
        eq(forumThreads.id, userThreadSubscriptions.threadId),
      )
      .innerJoin(
        forumCategories,
        eq(forumCategories.id, forumThreads.categoryId),
      )
      .where(eq(userThreadSubscriptions.userId, userId))
      .orderBy(desc(userThreadSubscriptions.updatedAt));
    return rows;
  }

  async listMyCategorySubscriptions(
    userId: string,
  ): Promise<CategorySubscription[]> {
    const rows = await this.db
      .select({
        categoryId: userCategorySubscriptions.categoryId,
        level: userCategorySubscriptions.level,
        updatedAt: userCategorySubscriptions.updatedAt,
        categorySlug: forumCategories.slug,
        categoryName: forumCategories.name,
      })
      .from(userCategorySubscriptions)
      .innerJoin(
        forumCategories,
        eq(forumCategories.id, userCategorySubscriptions.categoryId),
      )
      .where(eq(userCategorySubscriptions.userId, userId))
      .orderBy(desc(userCategorySubscriptions.updatedAt));
    return rows;
  }

  /** Used by reply fan-out to skip muted/tracking users efficiently. */
  static isRealtimeLevel(level: ForumSubscriptionLevel | null): boolean {
    return level === 'watching';
  }

  static isActive(level: ForumSubscriptionLevel | null): boolean {
    return level !== null && ACTIVE_LEVELS.has(level);
  }
}
