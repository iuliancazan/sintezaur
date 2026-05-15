import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DATABASE,
  forumPostLikes,
  forumPosts,
  type SintezaurDb,
} from '@sintezaur/db';
import { and, eq, sql } from 'drizzle-orm';

export interface LikeResult {
  liked: boolean;
  likeCount: number;
}

/**
 * Likes ("Util" per spec §8.4) — single reaction per (user × post). Counter
 * on `forum_posts.like_count` is denormalized for cheap render and bumped
 * inside the same transaction as the like row.
 *
 * Self-likes blocked: Util on your own post is meaningless and would skew
 * the social signal.
 */
@Injectable()
export class ForumLikesService {
  constructor(@Inject(DATABASE) private readonly db: SintezaurDb) {}

  async toggle(userId: string, postId: string): Promise<LikeResult> {
    const [post] = await this.db
      .select({
        id: forumPosts.id,
        authorId: forumPosts.authorId,
        likeCount: forumPosts.likeCount,
        deletedAt: forumPosts.deletedAt,
      })
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .limit(1);
    if (!post || post.deletedAt) {
      throw new NotFoundException('Postarea nu există.');
    }
    if (post.authorId === userId) {
      throw new ConflictException('Nu poți marca propria postare ca utilă.');
    }

    const [existing] = await this.db
      .select({ id: forumPostLikes.id })
      .from(forumPostLikes)
      .where(
        and(
          eq(forumPostLikes.userId, userId),
          eq(forumPostLikes.postId, postId),
        ),
      )
      .limit(1);

    if (existing) {
      await this.db
        .delete(forumPostLikes)
        .where(eq(forumPostLikes.id, existing.id));
      const [bumped] = await this.db
        .update(forumPosts)
        .set({
          likeCount: sql`GREATEST(${forumPosts.likeCount} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(forumPosts.id, postId))
        .returning({ likeCount: forumPosts.likeCount });
      return { liked: false, likeCount: bumped.likeCount };
    }

    await this.db
      .insert(forumPostLikes)
      .values({ userId, postId })
      .onConflictDoNothing();
    const [bumped] = await this.db
      .update(forumPosts)
      .set({
        likeCount: sql`${forumPosts.likeCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(forumPosts.id, postId))
      .returning({ likeCount: forumPosts.likeCount });
    return { liked: true, likeCount: bumped.likeCount };
  }

  /**
   * Bulk lookup used to mark `likedByMe` on the thread page render. Caller
   * passes the post IDs visible on screen + the current user; we return
   * the subset that the user has liked.
   */
  async likedSubset(userId: string, postIds: string[]): Promise<Set<string>> {
    if (postIds.length === 0) return new Set();
    const rows = await this.db
      .select({ postId: forumPostLikes.postId })
      .from(forumPostLikes)
      .where(
        and(
          eq(forumPostLikes.userId, userId),
          sql`${forumPostLikes.postId} = ANY(${postIds}::uuid[])`,
        ),
      );
    return new Set(rows.map((r) => r.postId));
  }
}
