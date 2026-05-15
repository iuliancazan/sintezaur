import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  articles,
  DATABASE,
  forumCategories,
  forumPostLikes,
  forumPostMentions,
  forumPosts,
  forumThreads,
  users,
  type ForumPost,
  type SintezaurDb,
} from '@sintezaur/db';
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { NotificationsService } from '../notifications/notifications.service';
import { BadgeAwardingService } from './badge-awarding.service';
import { ForumSubscriptionsService } from './forum-subscriptions.service';

/** UUID v4 regex used to extract mention IDs from cached bodyHtml. */
const MENTION_ID_RE =
  /data-user-id="([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"/gi;

function parseMentionIds(bodyHtml: string): string[] {
  const ids = new Set<string>();
  let m: RegExpExecArray | null;
  MENTION_ID_RE.lastIndex = 0;
  while ((m = MENTION_ID_RE.exec(bodyHtml)) !== null) {
    ids.add(m[1].toLowerCase());
  }
  return [...ids];
}

export interface CreatePostInput {
  threadId: string;
  parentPostId?: string | null;
  body: Record<string, unknown>;
  bodyHtml: string;
}

export interface UpdatePostInput {
  body: Record<string, unknown>;
  bodyHtml: string;
}

export interface PostListItem {
  id: string;
  threadId: string;
  parentPostId: string | null;
  authorId: string | null;
  authorUsername: string | null;
  authorFullName: string | null;
  body: Record<string, unknown> | null;
  bodyHtml: string | null;
  topLevelSeq: number;
  subSeq: number | null;
  status: 'approved' | 'pending' | 'rejected';
  editedAt: Date | null;
  hiddenAt: Date | null;
  hiddenReason: string | null;
  likeCount: number;
  createdAt: Date;
}

@Injectable()
export class ForumPostsService {
  private readonly logger = new Logger(ForumPostsService.name);
  private readonly editWindowMinutes: number;
  private readonly approvalMinPosts: number;
  private readonly approvalMinDays: number;

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    config: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly subscriptions: ForumSubscriptionsService,
    private readonly badgeAwarding: BadgeAwardingService,
  ) {
    this.editWindowMinutes = Number(
      config.get('FORUM_EDIT_WINDOW_MINUTES') ?? 30,
    );
    this.approvalMinPosts = Number(
      config.get('FORUM_APPROVAL_MIN_POSTS') ?? 1,
    );
    this.approvalMinDays = Number(
      config.get('FORUM_APPROVAL_MIN_DAYS') ?? 0,
    );
  }

  /* ============================================================
     Create — handles OP and replies. For OP, the caller (Threads
     service) sets parentPostId = null AND we pre-allocate
     (top_level_seq=0, sub_seq=null). For replies, we walk the
     parent chain to find the top-level ancestor.
     ============================================================ */

  async createReply(
    actorId: string,
    input: CreatePostInput,
  ): Promise<ForumPost> {
    const thread = await this.requireThread(input.threadId);
    if (thread.lockedAt && !this.canBypassLock()) {
      throw new ConflictException(
        'Thread-ul este blocat — răspunsuri noi nu sunt permise.',
      );
    }

    const { topLevelSeq, subSeq } = await this.computeReplyNumbering(
      input.threadId,
      input.parentPostId ?? null,
    );

    const status = await this.resolvePostStatus(actorId);

    const [post] = await this.db
      .insert(forumPosts)
      .values({
        threadId: input.threadId,
        parentPostId: input.parentPostId ?? null,
        authorId: actorId,
        body: input.body,
        bodyHtml: input.bodyHtml,
        topLevelSeq,
        subSeq,
        status,
      })
      .returning();

    const mentionedIds = await this.syncMentions(
      post.id,
      actorId,
      input.bodyHtml,
    );

    if (status === 'approved') {
      await this.bumpThreadCountersOnApprovedInsert(input.threadId);
      await this.bumpApprovedPostCount(actorId);
      // Auto-watch on reply (idempotent — never overwrites explicit mute).
      await this.subscriptions.ensureWatchingThread(actorId, input.threadId);
      // Real-time notification fan-out (mention > reply per spec dedup).
      await this.fanOutReplyNotifications({
        postId: post.id,
        threadId: input.threadId,
        actorId,
        mentionedIds,
      });
      // Badge instant award (post_count threshold may have flipped).
      await this.badgeAwarding
        .evaluateForUsers([actorId])
        .catch((err) =>
          this.logger.warn(
            `badge evaluate (reply) failed for ${actorId}: ${(err as Error).message}`,
          ),
        );
    }

    return post;
  }

  /** Used by ForumThreadsService when creating a new thread + OP atomically. */
  async createOp(
    actorId: string,
    threadId: string,
    body: Record<string, unknown>,
    bodyHtml: string,
  ): Promise<ForumPost> {
    const status = await this.resolvePostStatus(actorId);
    const [post] = await this.db
      .insert(forumPosts)
      .values({
        threadId,
        parentPostId: null,
        authorId: actorId,
        body,
        bodyHtml,
        topLevelSeq: 0,
        subSeq: null,
        status,
      })
      .returning();

    await this.syncMentions(post.id, actorId, bodyHtml);

    if (status === 'approved') {
      await this.bumpThreadCountersOnApprovedInsert(threadId);
      await this.bumpApprovedPostCount(actorId);
      // Thread author auto-watches their own thread.
      await this.subscriptions.ensureWatchingThread(actorId, threadId);
      // Badge instant award (post_count + maybe thread author achievements).
      await this.badgeAwarding
        .evaluateForUsers([actorId])
        .catch((err) =>
          this.logger.warn(
            `badge evaluate (op) failed for ${actorId}: ${(err as Error).message}`,
          ),
        );
    }

    return post;
  }

  /* ============================================================
     Edit — within configurable window (default 30 min).
     ============================================================ */

  async update(
    actorId: string,
    actorIsMod: boolean,
    postId: string,
    input: UpdatePostInput,
  ): Promise<ForumPost> {
    const post = await this.requirePost(postId);
    if (post.authorId !== actorId && !actorIsMod) {
      throw new ForbiddenException('Nu poți edita acest post.');
    }
    if (!actorIsMod) {
      const ageMs = Date.now() - new Date(post.createdAt).getTime();
      if (ageMs > this.editWindowMinutes * 60 * 1000) {
        throw new ConflictException(
          `Fereastra de editare (${this.editWindowMinutes} min) a expirat.`,
        );
      }
    }
    const [updated] = await this.db
      .update(forumPosts)
      .set({
        body: input.body,
        bodyHtml: input.bodyHtml,
        editedAt: new Date(),
        editedByUserId: actorId,
        updatedAt: new Date(),
      })
      .where(eq(forumPosts.id, postId))
      .returning();
    await this.syncMentions(postId, post.authorId, input.bodyHtml);
    return updated;
  }

  /* ============================================================
     Mentions — parse `data-user-id="<uuid>"` from cached bodyHtml,
     validate against users table (drop deleted / non-existent),
     drop self-mentions, then re-sync the join table. Idempotent so
     edits re-sync safely.
     ============================================================ */

  private async syncMentions(
    postId: string,
    authorId: string | null,
    bodyHtml: string,
  ): Promise<string[]> {
    await this.db
      .delete(forumPostMentions)
      .where(eq(forumPostMentions.postId, postId));

    const rawIds = parseMentionIds(bodyHtml).filter((id) => id !== authorId);
    if (rawIds.length === 0) return [];

    const real = await this.db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          inArray(users.id, rawIds),
          isNull(users.deletedAt),
        ),
      );
    if (real.length === 0) return [];

    await this.db
      .insert(forumPostMentions)
      .values(
        real.map((r) => ({
          postId,
          mentionedUserId: r.id,
        })),
      )
      .onConflictDoNothing();
    return real.map((r) => r.id);
  }

  /* ============================================================
     Fan-out — orchestrates real-time notifications for a new reply.
     Order per spec §7.5 + interview decision:
       1. `forum_mention` for each mentioned user (highest priority)
       2. `revista_reply_to_my_article` for the article author when the
          reply lands in `discutii_articole`
       3. `forum_reply_in_subscribed` for thread watchers — EXCLUDING
          users who are already getting a mention notification (mention
          wins) and the article author (revista wins for that case)
     Each notification carries a stable dedup_key; NotificationsService
     enforces the dedup window.
     ============================================================ */

  private async fanOutReplyNotifications(args: {
    postId: string;
    threadId: string;
    actorId: string;
    mentionedIds: string[];
  }): Promise<void> {
    const { postId, threadId, actorId, mentionedIds } = args;

    // Look up thread + category context once.
    const [ctx] = await this.db
      .select({
        threadSlug: forumThreads.slug,
        threadTitle: forumThreads.title,
        categoryKey: forumCategories.key,
        categorySlug: forumCategories.slug,
      })
      .from(forumThreads)
      .innerJoin(
        forumCategories,
        eq(forumCategories.id, forumThreads.categoryId),
      )
      .where(eq(forumThreads.id, threadId))
      .limit(1);
    if (!ctx) return;

    const basePayload = {
      threadId,
      threadSlug: ctx.threadSlug,
      threadTitle: ctx.threadTitle,
      categorySlug: ctx.categorySlug,
      postId,
    };

    const suppressed = new Set<string>([actorId]);

    // 1. Mentions.
    for (const recipientId of mentionedIds) {
      if (suppressed.has(recipientId)) continue;
      await this.notifications.post({
        recipientId,
        actorId,
        kind: 'forum_mention',
        dedupKey: `forum_mention:${postId}:${recipientId}`,
        targetType: 'forum_post',
        targetId: postId,
        payload: basePayload,
      });
      suppressed.add(recipientId);
    }

    // 2. Revista author when in `discutii_articole`.
    if (ctx.categoryKey === 'discutii_articole') {
      const [art] = await this.db
        .select({
          authorId: articles.authorId,
          articleSlug: articles.slug,
          articleTitle: articles.title,
        })
        .from(articles)
        .where(eq(articles.threadId, threadId))
        .limit(1);
      if (art && art.authorId && !suppressed.has(art.authorId)) {
        await this.notifications.post({
          recipientId: art.authorId,
          actorId,
          kind: 'revista_reply_to_my_article',
          dedupKey: `revista_reply:${postId}:${art.authorId}`,
          targetType: 'forum_post',
          targetId: postId,
          payload: {
            ...basePayload,
            articleSlug: art.articleSlug,
            articleTitle: art.articleTitle,
          },
        });
        suppressed.add(art.authorId);
      }
    }

    // 3. Thread watchers (real-time level only).
    const watchers = await this.subscriptions.watchersForRealtime(
      threadId,
      actorId,
    );
    for (const recipientId of watchers) {
      if (suppressed.has(recipientId)) continue;
      await this.notifications.post({
        recipientId,
        actorId,
        kind: 'forum_reply_in_subscribed',
        dedupKey: `forum_reply:${postId}:${recipientId}`,
        targetType: 'forum_post',
        targetId: postId,
        payload: basePayload,
      });
    }
  }

  /* ============================================================
     Author / mod soft-delete + mod hide
     ============================================================ */

  async authorDelete(actorId: string, postId: string): Promise<void> {
    const post = await this.requirePost(postId);
    if (post.authorId !== actorId) {
      throw new ForbiddenException('Nu poți șterge acest post.');
    }
    if (post.deletedAt) return;
    await this.db
      .update(forumPosts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(forumPosts.id, postId));
    if (post.status === 'approved') {
      await this.bumpThreadCountersOnRemove(post.threadId);
    }
  }

  async hide(
    modId: string,
    postId: string,
    reason: string,
  ): Promise<void> {
    const post = await this.requirePost(postId);
    if (post.hiddenAt) return;
    await this.db
      .update(forumPosts)
      .set({
        hiddenAt: new Date(),
        hiddenReason: reason,
        hiddenByUserId: modId,
        updatedAt: new Date(),
      })
      .where(eq(forumPosts.id, postId));
    if (post.status === 'approved') {
      await this.bumpThreadCountersOnRemove(post.threadId);
    }
  }

  async unhide(postId: string): Promise<void> {
    const post = await this.requirePost(postId);
    if (!post.hiddenAt) return;
    await this.db
      .update(forumPosts)
      .set({
        hiddenAt: null,
        hiddenReason: null,
        hiddenByUserId: null,
        updatedAt: new Date(),
      })
      .where(eq(forumPosts.id, postId));
    if (post.status === 'approved' && !post.deletedAt) {
      await this.bumpThreadCountersOnApprovedInsert(post.threadId);
    }
  }

  async approve(postId: string): Promise<void> {
    const post = await this.requirePost(postId);
    if (post.status === 'approved') return;
    await this.db
      .update(forumPosts)
      .set({ status: 'approved', updatedAt: new Date() })
      .where(eq(forumPosts.id, postId));
    await this.bumpThreadCountersOnApprovedInsert(post.threadId);
    if (post.authorId) {
      await this.bumpApprovedPostCount(post.authorId);
    }
  }

  async reject(postId: string): Promise<void> {
    const post = await this.requirePost(postId);
    if (post.status === 'rejected') return;
    await this.db
      .update(forumPosts)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(forumPosts.id, postId));
    if (post.status === 'approved') {
      await this.bumpThreadCountersOnRemove(post.threadId);
    }
  }

  /* ============================================================
     Read — thread page render. Returns OP separately so the UI
     can position it at the top of the page.
     ============================================================ */

  async listForThread(
    threadId: string,
    opts: {
      includeHidden?: boolean;
      includePending?: boolean;
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<{
    op: PostListItem | null;
    replies: PostListItem[];
    page: number;
    pageSize: number;
    totalReplies: number;
  }> {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(opts.pageSize ?? 50, 200);

    const baseConds = [
      eq(forumPosts.threadId, threadId),
      isNull(forumPosts.deletedAt),
    ];
    if (!opts.includePending) {
      baseConds.push(sql`${forumPosts.status} <> 'rejected'`);
      baseConds.push(sql`${forumPosts.status} <> 'pending'`);
    }

    const rows = await this.db
      .select({
        id: forumPosts.id,
        threadId: forumPosts.threadId,
        parentPostId: forumPosts.parentPostId,
        authorId: forumPosts.authorId,
        authorUsername: users.username,
        authorFullName: users.fullName,
        body: forumPosts.body,
        bodyHtml: forumPosts.bodyHtml,
        topLevelSeq: forumPosts.topLevelSeq,
        subSeq: forumPosts.subSeq,
        status: forumPosts.status,
        editedAt: forumPosts.editedAt,
        hiddenAt: forumPosts.hiddenAt,
        hiddenReason: forumPosts.hiddenReason,
        likeCount: forumPosts.likeCount,
        createdAt: forumPosts.createdAt,
      })
      .from(forumPosts)
      .leftJoin(users, eq(users.id, forumPosts.authorId))
      .where(and(...baseConds))
      .orderBy(asc(forumPosts.topLevelSeq), asc(forumPosts.subSeq));

    const masked: PostListItem[] = rows.map((r) =>
      this.maskHidden({
        ...r,
        body: r.body as Record<string, unknown> | null,
      }),
    );

    const op = masked.find((p) => p.topLevelSeq === 0) ?? null;
    const replies = masked.filter((p) => p.topLevelSeq !== 0);

    // Paginate replies by top_level branches (group by top_level_seq).
    const branches = Array.from(
      new Set(replies.map((r) => r.topLevelSeq)),
    ).sort((a, b) => a - b);
    const branchSlice = branches.slice(
      (page - 1) * pageSize,
      page * pageSize,
    );
    const branchSet = new Set(branchSlice);
    const paged = replies.filter((r) => branchSet.has(r.topLevelSeq));

    return {
      op,
      replies: paged,
      page,
      pageSize,
      totalReplies: branches.length,
    };
  }

  async findById(id: string): Promise<ForumPost> {
    return this.requirePost(id);
  }

  /**
   * Returns the IDs of posts in `threadId` that `userId` has liked.
   * Used by the thread page to render the active state of the "Util"
   * button for the logged-in user (single round-trip after listPosts).
   */
  async listMyLikedPostIds(
    userId: string,
    threadId: string,
  ): Promise<{ postIds: string[] }> {
    const rows = await this.db
      .select({ postId: forumPostLikes.postId })
      .from(forumPostLikes)
      .innerJoin(forumPosts, eq(forumPosts.id, forumPostLikes.postId))
      .where(
        and(
          eq(forumPostLikes.userId, userId),
          eq(forumPosts.threadId, threadId),
        ),
      );
    return { postIds: rows.map((r) => r.postId) };
  }

  /* ============================================================
     Internals
     ============================================================ */

  private maskHidden(row: PostListItem): PostListItem {
    if (row.hiddenAt) {
      // Spec §8.4 hidden-post policy: motiv vizibil public, body ascuns.
      return {
        ...row,
        body: null,
        bodyHtml: null,
      };
    }
    return row;
  }

  private async requireThread(threadId: string) {
    const [row] = await this.db
      .select()
      .from(forumThreads)
      .where(eq(forumThreads.id, threadId))
      .limit(1);
    if (!row || row.deletedAt) {
      throw new NotFoundException(`thread ${threadId} not found`);
    }
    return row;
  }

  private async requirePost(id: string) {
    const [row] = await this.db
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.id, id))
      .limit(1);
    if (!row) throw new NotFoundException(`post ${id} not found`);
    return row;
  }

  private canBypassLock(): boolean {
    // M5-B: only mods+ can post in locked threads. Controller already
    // gates ; this method exists for the explicit signal in service.
    return false;
  }

  /**
   * Numbering algorithm per spec §8.4:
   *
   *   OP                  → (top_level_seq=0, sub_seq=NULL)
   *   Top-level reply     → (next top_level_seq, sub_seq=NULL)
   *   Sub-reply           → top_level_seq inherited from the top-level
   *                          ancestor; sub_seq = next under that ancestor.
   *
   * For replies to sub-replies (level 3+ in data), we collapse them
   * into the ancestor's branch — the renderer caps visual nesting at
   * 1 level anyway, so a chronological #N.M flat sub-list is correct.
   */
  private async computeReplyNumbering(
    threadId: string,
    parentPostId: string | null,
  ): Promise<{ topLevelSeq: number; subSeq: number | null }> {
    if (!parentPostId) {
      const next = await this.nextTopLevelSeq(threadId);
      return { topLevelSeq: next, subSeq: null };
    }
    const parent = await this.requirePost(parentPostId);
    if (parent.threadId !== threadId) {
      throw new BadRequestException('parent post nu apar?ine thread-ului.');
    }
    if (parent.topLevelSeq === 0) {
      // Replying to the OP = a top-level reply.
      const next = await this.nextTopLevelSeq(threadId);
      return { topLevelSeq: next, subSeq: null };
    }
    // Replying to a top-level or sub-reply → flat sub-reply under the
    // top-level ancestor's branch.
    const ancestorTopSeq = parent.topLevelSeq;
    const next = await this.nextSubSeq(threadId, ancestorTopSeq);
    return { topLevelSeq: ancestorTopSeq, subSeq: next };
  }

  private async nextTopLevelSeq(threadId: string): Promise<number> {
    const [row] = await this.db
      .select({ max: sql<number | null>`max(${forumPosts.topLevelSeq})` })
      .from(forumPosts)
      .where(
        and(
          eq(forumPosts.threadId, threadId),
          isNull(forumPosts.subSeq),
          sql`${forumPosts.topLevelSeq} > 0`,
        ),
      );
    return (row?.max ?? 0) + 1;
  }

  private async nextSubSeq(
    threadId: string,
    topLevelSeq: number,
  ): Promise<number> {
    const [row] = await this.db
      .select({ max: sql<number | null>`max(${forumPosts.subSeq})` })
      .from(forumPosts)
      .where(
        and(
          eq(forumPosts.threadId, threadId),
          eq(forumPosts.topLevelSeq, topLevelSeq),
          isNotNull(forumPosts.subSeq),
        ),
      );
    return (row?.max ?? 0) + 1;
  }

  /**
   * First-post approval per spec §8.4: a fresh account gets 'pending'
   * until they've passed BOTH thresholds (configurable). At launch both
   * default to 0/1, so first post auto-approves.
   */
  private async resolvePostStatus(
    authorId: string,
  ): Promise<'approved' | 'pending'> {
    if (this.approvalMinPosts <= 0 && this.approvalMinDays <= 0) {
      return 'approved';
    }
    const [u] = await this.db
      .select({
        postApprovalRequired: users.postApprovalRequired,
        approvedPostCount: users.approvedPostCount,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, authorId))
      .limit(1);
    if (!u) return 'pending';
    if (!u.postApprovalRequired) return 'approved';

    const ageDays =
      (Date.now() - new Date(u.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const okPosts = u.approvedPostCount >= this.approvalMinPosts;
    const okAge = ageDays >= this.approvalMinDays;
    if (okPosts && okAge) {
      // Auto-promote: clear the flag so subsequent posts skip the check.
      await this.db
        .update(users)
        .set({ postApprovalRequired: false })
        .where(eq(users.id, authorId));
      return 'approved';
    }
    return 'pending';
  }

  private async bumpApprovedPostCount(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({
        approvedPostCount: sql`${users.approvedPostCount} + 1`,
      })
      .where(eq(users.id, userId));
  }

  private async bumpThreadCountersOnApprovedInsert(
    threadId: string,
  ): Promise<void> {
    await this.db
      .update(forumThreads)
      .set({
        postCount: sql`${forumThreads.postCount} + 1`,
        lastPostAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(forumThreads.id, threadId));
  }

  private async bumpThreadCountersOnRemove(threadId: string): Promise<void> {
    await this.db
      .update(forumThreads)
      .set({
        postCount: sql`GREATEST(${forumThreads.postCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(forumThreads.id, threadId));
    // Recompute lastPostAt — cheap enough on a single thread.
    const [latest] = await this.db
      .select({ at: forumPosts.createdAt })
      .from(forumPosts)
      .where(
        and(
          eq(forumPosts.threadId, threadId),
          eq(forumPosts.status, 'approved'),
          isNull(forumPosts.hiddenAt),
          isNull(forumPosts.deletedAt),
        ),
      )
      .orderBy(desc(forumPosts.createdAt))
      .limit(1);
    await this.db
      .update(forumThreads)
      .set({ lastPostAt: latest?.at ?? null })
      .where(eq(forumThreads.id, threadId));
  }
}
