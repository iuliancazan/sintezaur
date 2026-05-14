import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DATABASE,
  articleCategoryEnum,
  userFollowedCategories,
  type ArticleCategory,
  type SintezaurDb,
} from '@sintezaur/db';
import { and, eq } from 'drizzle-orm';

const VALID_CATEGORIES = new Set<string>(articleCategoryEnum.enumValues);

/**
 * Tracks which users follow each Revista category (§7.5). Reads feed
 * the publish fan-out; writes power the "Urmărește" toggle on /revista.
 */
@Injectable()
export class RevistaFollowsService {
  private readonly logger = new Logger(RevistaFollowsService.name);

  constructor(@Inject(DATABASE) private readonly db: SintezaurDb) {}

  isValidCategory(value: string): value is ArticleCategory {
    return VALID_CATEGORIES.has(value);
  }

  async listForUser(userId: string): Promise<ArticleCategory[]> {
    const rows = await this.db
      .select({ category: userFollowedCategories.category })
      .from(userFollowedCategories)
      .where(eq(userFollowedCategories.userId, userId));
    return rows.map((r) => r.category);
  }

  async follow(userId: string, category: ArticleCategory): Promise<void> {
    await this.db
      .insert(userFollowedCategories)
      .values({ userId, category })
      .onConflictDoNothing({
        target: [userFollowedCategories.userId, userFollowedCategories.category],
      });
  }

  async unfollow(userId: string, category: ArticleCategory): Promise<void> {
    await this.db
      .delete(userFollowedCategories)
      .where(
        and(
          eq(userFollowedCategories.userId, userId),
          eq(userFollowedCategories.category, category),
        ),
      );
  }

  async followersOf(category: ArticleCategory): Promise<string[]> {
    const rows = await this.db
      .select({ userId: userFollowedCategories.userId })
      .from(userFollowedCategories)
      .where(eq(userFollowedCategories.category, category));
    return rows.map((r) => r.userId);
  }
}
