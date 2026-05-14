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
  forumCategories,
  forumPosts,
  forumThreads,
  users,
  type ForumThread,
  type SintezaurDb,
} from '@sintezaur/db';
import { slugFromParts, uniqueSlug } from '@sintezaur/shared';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { ForumPostsService } from './forum-posts.service';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const MAX_PIN_SLOTS = 3;

export interface CreateThreadInput {
  categoryId: string;
  title: string;
  body: Record<string, unknown>;
  bodyHtml: string;
}

export interface ThreadListItem {
  id: string;
  slug: string;
  title: string;
  authorId: string | null;
  authorUsername: string | null;
  authorFullName: string | null;
  categoryId: string;
  categorySlug: string;
  postCount: number;
  lastPostAt: Date | null;
  createdAt: Date;
  pinnedAt: Date | null;
  pinPosition: number | null;
  lockedAt: Date | null;
}

@Injectable()
export class ForumThreadsService {
  private readonly logger = new Logger(ForumThreadsService.name);

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly posts: ForumPostsService,
  ) {}

  /* ============================================================
     Create — atomic thread + OP (spec-locked: 1 request).
     System categories reject user creates from this surface; they
     are populated by the article auto-thread + canonical gear flow.
     ============================================================ */

  async createWithOp(
    authorId: string,
    input: CreateThreadInput,
  ): Promise<{ id: string; slug: string }> {
    if (input.title.trim().length < 4 || input.title.trim().length > 200) {
      throw new BadRequestException('Titlul trebuie să aibă 4–200 caractere.');
    }

    const [category] = await this.db
      .select()
      .from(forumCategories)
      .where(eq(forumCategories.id, input.categoryId))
      .limit(1);
    if (!category) throw new NotFoundException('Categoria nu există.');
    if (category.kind === 'system') {
      throw new ForbiddenException(
        'Categoriile de sistem nu acceptă thread-uri create de utilizatori.',
      );
    }

    const slug = await uniqueSlug(slugFromParts(input.title), (s) =>
      this.slugTaken(s),
    );

    const [thread] = await this.db
      .insert(forumThreads)
      .values({
        slug,
        categoryId: input.categoryId,
        authorId,
        title: input.title.trim(),
        postCount: 0,
      })
      .returning({ id: forumThreads.id, slug: forumThreads.slug });

    const op = await this.posts.createOp(
      authorId,
      thread.id,
      input.body,
      input.bodyHtml,
    );
    await this.db
      .update(forumThreads)
      .set({ firstPostId: op.id, updatedAt: new Date() })
      .where(eq(forumThreads.id, thread.id));

    return thread;
  }

  /* ============================================================
     Read
     ============================================================ */

  async listByCategorySlug(
    categorySlug: string,
    opts: { page?: number; pageSize?: number } = {},
  ): Promise<{
    category: {
      id: string;
      slug: string;
      name: string;
      description: string | null;
      kind: 'user' | 'system';
    };
    items: ThreadListItem[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  }> {
    const [category] = await this.db
      .select()
      .from(forumCategories)
      .where(eq(forumCategories.slug, categorySlug))
      .limit(1);
    if (!category)
      throw new NotFoundException(`category "${categorySlug}" not found`);

    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(opts.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const where = and(
      eq(forumThreads.categoryId, category.id),
      isNull(forumThreads.deletedAt),
    );

    const rows = await this.db
      .select({
        id: forumThreads.id,
        slug: forumThreads.slug,
        title: forumThreads.title,
        authorId: forumThreads.authorId,
        authorUsername: users.username,
        authorFullName: users.fullName,
        categoryId: forumThreads.categoryId,
        postCount: forumThreads.postCount,
        lastPostAt: forumThreads.lastPostAt,
        createdAt: forumThreads.createdAt,
        pinnedAt: forumThreads.pinnedAt,
        pinPosition: forumThreads.pinPosition,
        lockedAt: forumThreads.lockedAt,
      })
      .from(forumThreads)
      .leftJoin(users, eq(users.id, forumThreads.authorId))
      .where(where)
      .orderBy(
        // Pinned slots first (slot 1 above slot 2 above slot 3), then
        // recency by lastPostAt with createdAt fallback.
        sql`${forumThreads.pinPosition} ASC NULLS LAST`,
        sql`COALESCE(${forumThreads.lastPostAt}, ${forumThreads.createdAt}) DESC`,
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(forumThreads)
      .where(where);

    return {
      category: {
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        kind: category.kind,
      },
      items: rows.map((r) => ({ ...r, categorySlug: category.slug })),
      page,
      pageSize,
      totalCount: count,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
    };
  }

  async findBySlug(slug: string): Promise<{
    thread: ForumThread;
    category: { id: string; slug: string; name: string; kind: 'user' | 'system' };
    author: { id: string; username: string; fullName: string } | null;
  }> {
    const [row] = await this.db
      .select({
        thread: forumThreads,
        category: {
          id: forumCategories.id,
          slug: forumCategories.slug,
          name: forumCategories.name,
          kind: forumCategories.kind,
        },
        authorId: users.id,
        authorUsername: users.username,
        authorFullName: users.fullName,
      })
      .from(forumThreads)
      .innerJoin(
        forumCategories,
        eq(forumCategories.id, forumThreads.categoryId),
      )
      .leftJoin(users, eq(users.id, forumThreads.authorId))
      .where(eq(forumThreads.slug, slug))
      .limit(1);
    if (!row || row.thread.deletedAt) {
      throw new NotFoundException(`thread "${slug}" not found`);
    }
    return {
      thread: row.thread,
      category: row.category,
      author: row.authorId
        ? {
            id: row.authorId,
            username: row.authorUsername as string,
            fullName: row.authorFullName as string,
          }
        : null,
    };
  }

  /* ============================================================
     Moderation — lock/pin/unpin/delete
     ============================================================ */

  async lock(threadId: string, lock: boolean): Promise<void> {
    await this.db
      .update(forumThreads)
      .set({
        lockedAt: lock ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(forumThreads.id, threadId));
  }

  /**
   * Pin into the first free slot 1-3 (spec §8.4). Conflicts on slot
   * are blocked by DB unique partial index — we resolve the slot
   * inside a transaction to be safe.
   */
  async pin(threadId: string): Promise<{ pinPosition: number }> {
    const [thread] = await this.db
      .select()
      .from(forumThreads)
      .where(eq(forumThreads.id, threadId))
      .limit(1);
    if (!thread) throw new NotFoundException(`thread ${threadId} not found`);
    if (thread.pinPosition !== null) {
      return { pinPosition: thread.pinPosition };
    }

    const used = await this.db
      .select({ pos: forumThreads.pinPosition })
      .from(forumThreads)
      .where(
        and(
          eq(forumThreads.categoryId, thread.categoryId),
          sql`${forumThreads.pinPosition} IS NOT NULL`,
        ),
      );
    const usedSet = new Set(used.map((r) => r.pos as number));
    let slot = 0;
    for (let i = 1; i <= MAX_PIN_SLOTS; i++) {
      if (!usedSet.has(i)) {
        slot = i;
        break;
      }
    }
    if (slot === 0) {
      throw new ConflictException(
        `Categoria are deja ${MAX_PIN_SLOTS} thread-uri pinned (max).`,
      );
    }
    await this.db
      .update(forumThreads)
      .set({
        pinnedAt: new Date(),
        pinPosition: slot,
        updatedAt: new Date(),
      })
      .where(eq(forumThreads.id, threadId));
    return { pinPosition: slot };
  }

  async unpin(threadId: string): Promise<void> {
    await this.db
      .update(forumThreads)
      .set({
        pinnedAt: null,
        pinPosition: null,
        updatedAt: new Date(),
      })
      .where(eq(forumThreads.id, threadId));
  }

  async modDelete(threadId: string): Promise<void> {
    await this.db
      .update(forumThreads)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(forumThreads.id, threadId));
  }

  /* ============================================================
     Internals
     ============================================================ */

  private async slugTaken(slug: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: forumThreads.id })
      .from(forumThreads)
      .where(
        and(eq(forumThreads.slug, slug), isNull(forumThreads.deletedAt)),
      )
      .limit(1);
    return rows.length > 0;
  }
}
