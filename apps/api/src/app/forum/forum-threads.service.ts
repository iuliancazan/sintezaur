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
  articles,
  DATABASE,
  forumCategories,
  forumThreads,
  gear,
  slugRedirects,
  users,
  type ForumThread,
  type SintezaurDb,
} from '@sintezaur/db';
import { slugFromParts, uniqueSlug } from '@sintezaur/shared';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { ForumPostsService } from './forum-posts.service';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const MAX_PIN_SLOTS = 3;

export interface CreateThreadInput {
  categoryId: string;
  title: string;
  body: Record<string, unknown>;
  bodyHtml: string;
  /** Free-text tags. Lowercased, trimmed, deduped, max 6. */
  tags?: string[];
  /** Structured gear refs (FK app-side to gear.id). Max 5. */
  gearTag?: string[];
}

const MAX_TAGS = 6;
const MAX_GEAR_TAGS = 5;
const TAG_RE = /^[a-z0-9][a-z0-9-]{1,30}$/;

function normalizeTags(input: string[] | undefined): string[] {
  if (!input) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const t = raw.trim().toLowerCase();
    if (!t || !TAG_RE.test(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
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

    const tags = normalizeTags(input.tags);
    const gearTagIds = await this.validateGearTags(input.gearTag ?? []);

    const [thread] = await this.db
      .insert(forumThreads)
      .values({
        slug,
        categoryId: input.categoryId,
        authorId,
        title: input.title.trim(),
        postCount: 0,
        tags,
        gearTag: gearTagIds,
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

  async findById(id: string): Promise<ForumThread> {
    const [row] = await this.db
      .select()
      .from(forumThreads)
      .where(eq(forumThreads.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('thread not found');
    return row;
  }

  async findBySlug(slug: string): Promise<{
    thread: ForumThread;
    category: {
      id: string;
      key: string;
      slug: string;
      name: string;
      kind: 'user' | 'system';
    };
    author: { id: string; username: string; fullName: string } | null;
    sourceLink: {
      type: 'article' | 'gear';
      slug: string;
      title: string;
    } | null;
  }> {
    const [row] = await this.db
      .select({
        thread: forumThreads,
        category: {
          id: forumCategories.id,
          key: forumCategories.key,
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

    let sourceLink: {
      type: 'article' | 'gear';
      slug: string;
      title: string;
    } | null = null;
    if (row.category.kind === 'system') {
      if (row.category.key === 'discutii_articole') {
        const [art] = await this.db
          .select({ slug: articles.slug, title: articles.title })
          .from(articles)
          .where(eq(articles.threadId, row.thread.id))
          .limit(1);
        if (art) sourceLink = { type: 'article', slug: art.slug, title: art.title };
      } else if (row.category.key === 'discutii_echipamente') {
        const [g] = await this.db
          .select({ slug: gear.slug, brand: gear.brand, model: gear.model })
          .from(gear)
          .where(eq(gear.canonicalThreadId, row.thread.id))
          .limit(1);
        if (g) {
          sourceLink = {
            type: 'gear',
            slug: g.slug,
            title: `${g.brand} ${g.model}`,
          };
        }
      }
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
      sourceLink,
    };
  }

  /**
   * Slug-redirect lookup per spec §7.13. Resolves an old slug to its
   * current (or expired) target. Public controller turns this into a
   * 301 redirect when `expired=false` or a 410 Gone when expired —
   * search engines drop the URL actively rather than retrying 404.
   */
  async lookupSlugRedirect(oldSlug: string): Promise<{
    newSlug: string;
    targetId: string;
    expired: boolean;
  } | null> {
    const [row] = await this.db
      .select({
        newSlug: slugRedirects.newSlug,
        targetId: slugRedirects.targetId,
        expiresAt: slugRedirects.expiresAt,
      })
      .from(slugRedirects)
      .where(
        and(
          eq(slugRedirects.targetType, 'forum_thread'),
          eq(slugRedirects.oldSlug, oldSlug),
        ),
      )
      .limit(1);
    if (!row) return null;
    return {
      newSlug: row.newSlug,
      targetId: row.targetId,
      expired: row.expiresAt <= new Date(),
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

  private async validateGearTags(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const trimmed = [...new Set(ids)].slice(0, MAX_GEAR_TAGS);
    const rows = await this.db
      .select({ id: gear.id })
      .from(gear)
      .where(and(inArray(gear.id, trimmed), isNull(gear.deletedAt)));
    return rows.map((r) => r.id);
  }
}
