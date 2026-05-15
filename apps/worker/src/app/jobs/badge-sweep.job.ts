import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DATABASE,
  badges,
  forumPosts,
  userBadges,
  users,
  type SintezaurDb,
} from '@sintezaur/db';
import { and, eq, isNull, sql } from 'drizzle-orm';

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
 * Nightly badge awarding sweep — safety net behind the API's instant
 * hooks. Runs the same eligibility SQL as the API service, but skips
 * the `forum_badge_earned` notification fan-out (those fire in real
 * time from the instant hooks; the sweep just catches edge cases where
 * a badge was added/modified after the threshold-meeting event, or
 * where the user has never triggered a hook since the badge launched).
 *
 * NOTE: Implementation duplicates the SQL evaluators from
 * `apps/api/src/app/forum/badge-awarding.service.ts`. Until the
 * notification service is extracted into a shared lib (post-MVP), we
 * keep evaluation logic in two places. Changes to evaluator SQL must
 * land in both files.
 */
@Injectable()
export class BadgeSweepJob {
  private readonly logger = new Logger(BadgeSweepJob.name);

  constructor(@Inject(DATABASE) private readonly db: SintezaurDb) {}

  async run(): Promise<{ awarded: number }> {
    const all = await this.db.select().from(badges);
    let total = 0;
    for (const b of all) {
      const c = this.parseCriteria(b.criteria);
      if (!c) continue;
      const eligible = await this.eligibleUserIds(c);
      if (eligible.length === 0) continue;
      const inserted = await this.db
        .insert(userBadges)
        .values(
          eligible.map((userId) => ({
            userId,
            badgeKey: b.key,
            category: b.category,
          })),
        )
        .onConflictDoNothing()
        .returning({ userId: userBadges.userId });
      if (inserted.length > 0) {
        this.logger.log(
          `sweep awarded "${b.key}" to ${inserted.length} user(s)`,
        );
        total += inserted.length;
      }
    }
    return { awarded: total };
  }

  private parseCriteria(raw: unknown): ParsedCriteria | null {
    const c = raw as { kind?: string; threshold?: number };
    if (!c || !c.kind || typeof c.threshold !== 'number') return null;
    if (!SUPPORTED_KINDS.includes(c.kind as CriteriaKind)) return null;
    return { kind: c.kind as CriteriaKind, threshold: c.threshold };
  }

  private async eligibleUserIds(c: ParsedCriteria): Promise<string[]> {
    if (c.kind === 'post_count') {
      const rows = await this.db
        .select({
          authorId: forumPosts.authorId,
        })
        .from(forumPosts)
        .where(
          and(
            eq(forumPosts.status, 'approved'),
            isNull(forumPosts.deletedAt),
            isNull(forumPosts.hiddenAt),
            sql`${forumPosts.authorId} IS NOT NULL`,
          ),
        )
        .groupBy(forumPosts.authorId)
        .having(sql`count(*) >= ${c.threshold}`);
      return rows
        .map((r) => r.authorId)
        .filter((id): id is string => id !== null);
    }
    if (c.kind === 'account_age_days') {
      const rows = await this.db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            isNull(users.deletedAt),
            sql`${users.createdAt} <= NOW() - INTERVAL '1 day' * ${c.threshold}`,
          ),
        );
      return rows.map((r) => r.id);
    }
    if (c.kind === 'likes_received') {
      const rows = await this.db
        .select({
          authorId: forumPosts.authorId,
        })
        .from(forumPosts)
        .where(
          and(
            isNull(forumPosts.deletedAt),
            isNull(forumPosts.hiddenAt),
            sql`${forumPosts.authorId} IS NOT NULL`,
          ),
        )
        .groupBy(forumPosts.authorId)
        .having(
          sql`COALESCE(SUM(${forumPosts.likeCount}), 0) >= ${c.threshold}`,
        );
      return rows
        .map((r) => r.authorId)
        .filter((id): id is string => id !== null);
    }
    return [];
  }
}
