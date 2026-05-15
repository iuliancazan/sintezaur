import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import 'multer';
import {
  DATABASE,
  articleGear,
  articleImages,
  articles,
  forumCategories,
  forumThreads,
  gear,
  slugRedirects,
  type Article,
  type ArticleCategory,
  type SintezaurDb,
  users,
} from '@sintezaur/db';
import { slugFromParts, uniqueSlug } from '@sintezaur/shared';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Request } from 'express';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../common/storage.service';
import { RevistaFollowsService } from './follows.service';
import type {
  CreateArticleDto,
  ListArticlesQueryDto,
  UpdateArticleDto,
} from './revista.dto';

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 60;

export interface PublicArticleListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: ArticleCategory;
  tags: string[];
  heroThumb: string | null;
  publishedAt: Date | null;
  viewCount: number;
  author: { id: string; username: string; fullName: string };
}

export interface ArticleDetail {
  article: Article;
  heroImage: { sourceId: string; path: string } | null;
  inlineImages: { sourceId: string; path: string; caption: string | null }[];
  author: {
    id: string;
    username: string;
    fullName: string;
    bio: string | null;
    avatarUrl: string | null;
    createdAt: Date;
  };
  gear: {
    id: string;
    slug: string;
    brand: string;
    model: string;
    category: string;
    position: number;
  }[];
  thread: { id: string; slug: string; postCount: number } | null;
}

@Injectable()
export class ArticlesService {
  private readonly logger = new Logger(ArticlesService.name);

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly storage: StorageService,
    private readonly follows: RevistaFollowsService,
    private readonly notifications: NotificationsService,
  ) {}

  /* ============================================================
     CRUD
     ============================================================ */

  async create(
    authorId: string,
    dto: CreateArticleDto,
  ): Promise<{ id: string; slug: string }> {
    const slug = await uniqueSlug(slugFromParts(dto.title), (s) =>
      this.slugTaken(s),
    );
    const [row] = await this.db
      .insert(articles)
      .values({
        slug,
        authorId,
        title: dto.title,
        excerpt: dto.excerpt ?? null,
        body: dto.body,
        bodyHtml: dto.bodyHtml ?? '',
        category: dto.category,
        tags: dto.tags ?? [],
        heroSourceId: dto.heroSourceId ?? null,
        isPremium: dto.isPremium ?? false,
        status: 'draft',
      })
      .returning({ id: articles.id, slug: articles.slug });

    if (dto.gearIds?.length) {
      await this.syncGearLinks(row.id, dto.gearIds);
    }
    return row;
  }

  async update(
    actorId: string,
    actorIsAdmin: boolean,
    id: string,
    dto: UpdateArticleDto,
  ): Promise<{ id: string; slug: string }> {
    const existing = await this.requireOwnable(id, actorId, actorIsAdmin);

    // After publish, slug + category are locked unless admin force-edits
    // via the slug-rename endpoint.
    if (
      existing.status === 'published' &&
      dto.category !== undefined &&
      dto.category !== existing.category &&
      !actorIsAdmin
    ) {
      throw new ConflictException(
        'Categoria nu poate fi schimbată după publicare.',
      );
    }

    await this.db
      .update(articles)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.excerpt !== undefined && { excerpt: dto.excerpt ?? null }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.bodyHtml !== undefined && {
          bodyHtml: dto.bodyHtml ?? '',
        }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.heroSourceId !== undefined && {
          heroSourceId: dto.heroSourceId ?? null,
        }),
        ...(dto.isPremium !== undefined && {
          isPremium: dto.isPremium,
        }),
        updatedAt: new Date(),
      })
      .where(eq(articles.id, id));

    if (dto.gearIds !== undefined) {
      await this.syncGearLinks(id, dto.gearIds);
    }

    return { id, slug: existing.slug };
  }

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
          eq(slugRedirects.targetType, 'article'),
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

  async renameSlug(
    actorId: string,
    actorIsAdmin: boolean,
    id: string,
    newSlug: string,
  ): Promise<{ slug: string }> {
    const existing = await this.requireOwnable(id, actorId, actorIsAdmin);
    if (existing.status === 'published' && !actorIsAdmin) {
      throw new ConflictException(
        'Slug-ul poate fi schimbat doar înainte de publicare (admin override).',
      );
    }
    const candidate = slugFromParts(newSlug);
    if (candidate.length < 3 || candidate.length > 80) {
      throw new BadRequestException('Slug invalid (3–80 caractere).');
    }
    const safe = await uniqueSlug(candidate, (s) => this.slugTaken(s, id));
    const previousSlug = existing.slug;
    await this.db
      .update(articles)
      .set({ slug: safe, updatedAt: new Date() })
      .where(eq(articles.id, id));

    // Spec §7.13: record a 30-day 301 from old→new when admin renames a
    // published article. Pre-publish renames don't matter (no public URLs
    // are out there yet). Conflict-on-INSERT (same old_slug already
    // pointing somewhere) is swallowed — the existing redirect stays.
    if (previousSlug !== safe && existing.status === 'published') {
      try {
        await this.db.insert(slugRedirects).values({
          targetType: 'article',
          targetId: id,
          oldSlug: previousSlug,
          newSlug: safe,
        });
      } catch (err) {
        if ((err as { code?: string }).code !== '23505') throw err;
      }
    }
    return { slug: safe };
  }

  async publish(
    actorId: string,
    actorIsAdmin: boolean,
    id: string,
    _req?: Request,
  ): Promise<{ slug: string; threadId: string }> {
    const existing = await this.requireOwnable(id, actorId, actorIsAdmin);
    if (existing.status === 'published') {
      // Idempotent — return existing thread.
      if (!existing.threadId)
        throw new ConflictException(
          'Articol marcat publicat dar fără thread; contactează un admin.',
        );
      return { slug: existing.slug, threadId: existing.threadId };
    }
    if (existing.status === 'archived') {
      throw new ConflictException(
        'Articolele arhivate nu pot fi republicate fără admin unarchive.',
      );
    }

    // Auto-create the forum thread in `discutii_articole`.
    const threadId = await this.ensureArticleThread(existing);

    await this.db
      .update(articles)
      .set({
        status: 'published',
        publishedAt: new Date(),
        threadId,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, id));

    void this.notifyCategoryFollowers(existing, actorId).catch((err) =>
      this.logger.warn(
        `revista publish fan-out failed: ${(err as Error).message}`,
      ),
    );

    return { slug: existing.slug, threadId };
  }

  /**
   * Spec §7.5 — "Article published in a category I follow". Posts
   * one `revista_article_in_followed_category` per follower; the author
   * is excluded; NotificationsService handles dedup + preferences.
   */
  private async notifyCategoryFollowers(
    article: Article,
    authorId: string,
  ): Promise<void> {
    const followers = await this.follows.followersOf(article.category);
    if (followers.length === 0) return;
    const payload = {
      articleId: article.id,
      slug: article.slug,
      title: article.title,
      category: article.category,
    };
    await Promise.all(
      followers
        .filter((recipientId) => recipientId !== authorId)
        .map((recipientId) =>
          this.notifications.post({
            recipientId,
            kind: 'revista_article_in_followed_category',
            dedupKey: `revista_article:${article.id}:${recipientId}`,
            targetType: 'article',
            targetId: article.id,
            actorId: authorId,
            payload,
          }),
        ),
    );
  }

  async unpublish(
    actorId: string,
    actorIsAdmin: boolean,
    id: string,
  ): Promise<void> {
    const existing = await this.requireOwnable(id, actorId, actorIsAdmin);
    if (existing.status !== 'published') return;
    await this.db
      .update(articles)
      .set({ status: 'draft', updatedAt: new Date() })
      .where(eq(articles.id, id));
  }

  async archive(
    actorId: string,
    actorIsAdmin: boolean,
    id: string,
  ): Promise<void> {
    const existing = await this.requireOwnable(id, actorId, actorIsAdmin);
    if (existing.status === 'archived') return;
    await this.db
      .update(articles)
      .set({
        status: 'archived',
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(articles.id, id));
  }

  async unarchive(actorId: string, id: string): Promise<void> {
    // Admin-only path; service-level enforced via the controller guard.
    await this.db
      .update(articles)
      .set({ status: 'draft', archivedAt: null, updatedAt: new Date() })
      .where(eq(articles.id, id));
  }

  /* ============================================================
     Image pipeline
     ============================================================ */

  async attachImage(
    actorId: string,
    actorIsAdmin: boolean,
    articleId: string,
    file: Express.Multer.File,
    caption?: string,
  ): Promise<{ sourceId: string; path: string }> {
    const existing = await this.requireOwnable(articleId, actorId, actorIsAdmin);
    const processed = await this.storage.processImage('article', articleId, file);
    await this.db.insert(articleImages).values(
      processed.variants.map((v) => ({
        articleId,
        sourceId: processed.sourceId,
        variant: v.variant,
        path: v.path,
        width: v.width,
        height: v.height,
        sizeBytes: v.sizeBytes,
        mimeType: v.mimeType,
        caption: caption ?? null,
      })),
    );
    // Auto-set hero on first upload if not yet set.
    if (!existing.heroSourceId) {
      await this.db
        .update(articles)
        .set({ heroSourceId: processed.sourceId, updatedAt: new Date() })
        .where(eq(articles.id, articleId));
    }
    const large =
      processed.variants.find((v) => v.variant === 'landscape_16x9_large') ??
      processed.variants[0];
    return { sourceId: processed.sourceId, path: large.path };
  }

  async detachImage(
    actorId: string,
    actorIsAdmin: boolean,
    articleId: string,
    sourceId: string,
  ): Promise<void> {
    const existing = await this.requireOwnable(articleId, actorId, actorIsAdmin);
    const rows = await this.db
      .select({ path: articleImages.path })
      .from(articleImages)
      .where(
        and(
          eq(articleImages.articleId, articleId),
          eq(articleImages.sourceId, sourceId),
        ),
      );
    if (!rows.length)
      throw new NotFoundException(`image source ${sourceId} not found`);
    await this.storage.deleteObjects(rows.map((r) => r.path));
    await this.db
      .delete(articleImages)
      .where(
        and(
          eq(articleImages.articleId, articleId),
          eq(articleImages.sourceId, sourceId),
        ),
      );
    if (existing.heroSourceId === sourceId) {
      await this.db
        .update(articles)
        .set({ heroSourceId: null, updatedAt: new Date() })
        .where(eq(articles.id, articleId));
    }
  }

  /* ============================================================
     Public list / detail
     ============================================================ */

  async listPublic(query: ListArticlesQueryDto): Promise<{
    items: PublicArticleListItem[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const offset = (page - 1) * pageSize;

    const conds = [eq(articles.status, 'published')];
    if (query.category) conds.push(eq(articles.category, query.category));
    if (query.authorId) conds.push(eq(articles.authorId, query.authorId));
    if (query.tag)
      conds.push(sql`${query.tag} = ANY(${articles.tags})`);
    if (query.q && query.q.trim().length >= 2) {
      const term = query.q.trim();
      conds.push(
        sql`${articles.searchVector} @@ websearch_to_tsquery('sintezaur_ro', ${term})`,
      );
    }
    if (query.gearId) {
      conds.push(
        sql`EXISTS (SELECT 1 FROM ${articleGear} ag WHERE ag.article_id = ${articles.id} AND ag.gear_id = ${query.gearId})`,
      );
    }

    const orderBy = (() => {
      switch (query.sort) {
        case 'oldest':
          return sql`${articles.publishedAt} ASC NULLS LAST`;
        case 'most_viewed':
          return desc(articles.viewCount);
        case 'newest':
        default:
          return sql`${articles.publishedAt} DESC NULLS LAST`;
      }
    })();

    const whereClause = and(...conds);

    const rows = await this.db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        excerpt: articles.excerpt,
        category: articles.category,
        tags: articles.tags,
        publishedAt: articles.publishedAt,
        viewCount: articles.viewCount,
        heroSourceId: articles.heroSourceId,
        authorId: articles.authorId,
        authorUsername: users.username,
        authorFullName: users.fullName,
        heroThumb: sql<string | null>`(
          SELECT path FROM ${articleImages}
          WHERE ${articleImages.articleId} = ${articles.id}
            AND ${articleImages.variant} = 'landscape_16x9_medium'
            AND ${articleImages.sourceId} = ${articles.heroSourceId}
          LIMIT 1
        )`,
      })
      .from(articles)
      .innerJoin(users, eq(users.id, articles.authorId))
      .where(whereClause)
      .orderBy(orderBy as any)
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(articles)
      .where(whereClause);

    return {
      items: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt,
        category: r.category,
        tags: r.tags,
        publishedAt: r.publishedAt,
        viewCount: r.viewCount,
        heroThumb: r.heroThumb,
        author: {
          id: r.authorId,
          username: r.authorUsername,
          fullName: r.authorFullName,
        },
      })),
      page,
      pageSize,
      totalCount: count,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
    };
  }

  async findBySlug(slug: string): Promise<ArticleDetail | null> {
    const [article] = await this.db
      .select()
      .from(articles)
      .where(eq(articles.slug, slug))
      .limit(1);
    if (!article || article.status !== 'published') return null;
    return this.hydrateDetail(article);
  }

  /** Editor / admin preview — works for any status the actor owns. */
  async findOwnedById(
    actorId: string,
    actorIsAdmin: boolean,
    id: string,
  ): Promise<ArticleDetail | null> {
    const [article] = await this.db
      .select()
      .from(articles)
      .where(eq(articles.id, id))
      .limit(1);
    if (!article) return null;
    if (article.authorId !== actorId && !actorIsAdmin) {
      throw new ForbiddenException('Nu poți edita acest articol.');
    }
    return this.hydrateDetail(article);
  }

  /**
   * Editor by-slug lookup. Matches the latest non-archived row with this
   * slug. Used by `/revista/:slug/editare` so the URL stays human.
   */
  async findOwnedBySlug(
    actorId: string,
    actorIsAdmin: boolean,
    slug: string,
  ): Promise<ArticleDetail | null> {
    const [article] = await this.db
      .select()
      .from(articles)
      .where(eq(articles.slug, slug))
      .limit(1);
    if (!article) return null;
    if (article.authorId !== actorId && !actorIsAdmin) {
      throw new ForbiddenException('Nu poți edita acest articol.');
    }
    return this.hydrateDetail(article);
  }

  bumpViewCount(id: string): void {
    void this.db
      .update(articles)
      .set({ viewCount: sql`${articles.viewCount} + 1` })
      .where(eq(articles.id, id))
      .catch((err) =>
        this.logger.warn(`view bump failed: ${(err as Error).message}`),
      );
  }

  /* ============================================================
     Author profile (`/autor/:username`)
     ============================================================ */

  async authorProfile(username: string): Promise<{
    author: {
      id: string;
      username: string;
      fullName: string;
      bio: string | null;
      location: string | null;
      avatarUrl: string | null;
      websiteUrl: string | null;
      socialInstagram: string | null;
      socialSoundcloud: string | null;
      socialBandcamp: string | null;
      createdAt: Date;
    };
    articles: PublicArticleListItem[];
  } | null> {
    const [author] = await this.db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        bio: users.bio,
        location: users.location,
        avatarUrl: users.avatarUrl,
        websiteUrl: users.websiteUrl,
        socialInstagram: users.socialInstagram,
        socialSoundcloud: users.socialSoundcloud,
        socialBandcamp: users.socialBandcamp,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.username, username), isNull(users.deletedAt)))
      .limit(1);
    if (!author) return null;

    const rows = await this.db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        excerpt: articles.excerpt,
        category: articles.category,
        tags: articles.tags,
        publishedAt: articles.publishedAt,
        viewCount: articles.viewCount,
        heroSourceId: articles.heroSourceId,
        heroThumb: sql<string | null>`(
          SELECT path FROM ${articleImages}
          WHERE ${articleImages.articleId} = ${articles.id}
            AND ${articleImages.variant} = 'landscape_16x9_medium'
            AND ${articleImages.sourceId} = ${articles.heroSourceId}
          LIMIT 1
        )`,
      })
      .from(articles)
      .where(
        and(
          eq(articles.authorId, author.id),
          eq(articles.status, 'published'),
        ),
      )
      .orderBy(sql`${articles.publishedAt} DESC NULLS LAST`);

    return {
      author,
      articles: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt,
        category: r.category,
        tags: r.tags,
        publishedAt: r.publishedAt,
        viewCount: r.viewCount,
        heroThumb: r.heroThumb,
        author: {
          id: author.id,
          username: author.username,
          fullName: author.fullName,
        },
      })),
    };
  }

  /* ============================================================
     Admin listings (dashboard)
     ============================================================ */

  async listForAdmin(opts: {
    status?: string;
    q?: string;
    authorId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    items: (PublicArticleListItem & { status: string })[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  }> {
    const page = opts.page ?? 1;
    const pageSize = Math.min(opts.pageSize ?? 50, 200);
    const offset = (page - 1) * pageSize;

    const conds = [];
    if (opts.status) conds.push(eq(articles.status, opts.status as any));
    if (opts.authorId) conds.push(eq(articles.authorId, opts.authorId));
    if (opts.q && opts.q.trim().length >= 2) {
      const term = opts.q.trim();
      conds.push(sql`(
        ${articles.title} ILIKE ${'%' + term + '%'}
        OR ${articles.slug} ILIKE ${'%' + term + '%'}
      )`);
    }

    const whereClause = conds.length ? and(...conds) : undefined;

    const rows = await this.db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        excerpt: articles.excerpt,
        category: articles.category,
        tags: articles.tags,
        publishedAt: articles.publishedAt,
        viewCount: articles.viewCount,
        status: articles.status,
        authorId: articles.authorId,
        authorUsername: users.username,
        authorFullName: users.fullName,
        heroThumb: sql<string | null>`(
          SELECT path FROM ${articleImages}
          WHERE ${articleImages.articleId} = ${articles.id}
            AND ${articleImages.variant} = 'square_thumb'
            AND ${articleImages.sourceId} = ${articles.heroSourceId}
          LIMIT 1
        )`,
      })
      .from(articles)
      .innerJoin(users, eq(users.id, articles.authorId))
      .where(whereClause as any)
      .orderBy(desc(articles.updatedAt))
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(articles)
      .where(whereClause as any);

    return {
      items: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt,
        category: r.category,
        tags: r.tags,
        publishedAt: r.publishedAt,
        viewCount: r.viewCount,
        status: r.status,
        heroThumb: r.heroThumb,
        author: {
          id: r.authorId,
          username: r.authorUsername,
          fullName: r.authorFullName,
        },
      })),
      page,
      pageSize,
      totalCount: count,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
    };
  }

  /* ============================================================
     Internals
     ============================================================ */

  private async hydrateDetail(article: Article): Promise<ArticleDetail> {
    const imageRows = await this.db
      .select()
      .from(articleImages)
      .where(eq(articleImages.articleId, article.id));

    const hero = article.heroSourceId
      ? imageRows.find(
          (r) =>
            r.sourceId === article.heroSourceId &&
            r.variant === 'landscape_16x9_large',
        )
      : null;

    const inlineImages = imageRows
      .filter(
        (r) =>
          r.sourceId !== article.heroSourceId &&
          r.variant === 'landscape_4x3_large',
      )
      .map((r) => ({
        sourceId: r.sourceId,
        path: r.path,
        caption: r.caption,
      }));

    const [author] = await this.db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, article.authorId))
      .limit(1);

    const gearLinks = await this.db
      .select({
        id: gear.id,
        slug: gear.slug,
        brand: gear.brand,
        model: gear.model,
        category: gear.category,
        position: articleGear.position,
      })
      .from(articleGear)
      .innerJoin(gear, eq(gear.id, articleGear.gearId))
      .where(
        and(eq(articleGear.articleId, article.id), isNull(gear.deletedAt)),
      )
      .orderBy(articleGear.position);

    let thread: ArticleDetail['thread'] = null;
    if (article.threadId) {
      const [t] = await this.db
        .select({
          id: forumThreads.id,
          slug: forumThreads.slug,
          postCount: forumThreads.postCount,
        })
        .from(forumThreads)
        .where(eq(forumThreads.id, article.threadId))
        .limit(1);
      thread = t ?? null;
    }

    return {
      article,
      heroImage: hero ? { sourceId: hero.sourceId, path: hero.path } : null,
      inlineImages,
      author,
      gear: gearLinks,
      thread,
    };
  }

  private async syncGearLinks(
    articleId: string,
    gearIds: string[],
  ): Promise<void> {
    await this.db
      .delete(articleGear)
      .where(eq(articleGear.articleId, articleId));
    if (gearIds.length === 0) return;
    // Make sure all gear ids exist and aren't soft-deleted.
    const existing = await this.db
      .select({ id: gear.id })
      .from(gear)
      .where(and(inArray(gear.id, gearIds), isNull(gear.deletedAt)));
    const valid = new Set(existing.map((r) => r.id));
    const rows = gearIds
      .filter((id) => valid.has(id))
      .map((gearId, position) => ({ articleId, gearId, position }));
    if (rows.length) await this.db.insert(articleGear).values(rows);
  }

  private async requireOwnable(
    id: string,
    actorId: string,
    actorIsAdmin: boolean,
  ): Promise<Article> {
    const [existing] = await this.db
      .select()
      .from(articles)
      .where(eq(articles.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException(`article ${id} not found`);
    if (existing.authorId !== actorId && !actorIsAdmin) {
      throw new ForbiddenException('Nu poți modifica acest articol.');
    }
    return existing;
  }

  /**
   * Ensure (idempotent) the `discutii_articole` forum thread for this
   * article. Returns the thread id.
   */
  private async ensureArticleThread(article: Article): Promise<string> {
    if (article.threadId) {
      const [existing] = await this.db
        .select({ id: forumThreads.id })
        .from(forumThreads)
        .where(eq(forumThreads.id, article.threadId))
        .limit(1);
      if (existing) return existing.id;
    }
    const [cat] = await this.db
      .select({ id: forumCategories.id })
      .from(forumCategories)
      .where(eq(forumCategories.key, 'discutii_articole'))
      .limit(1);
    if (!cat) {
      throw new Error(
        'forum_categories seed missing — re-run pnpm migrate (9005).',
      );
    }
    // Reuse the article slug for the thread to keep the URL story
    // consistent (`/forum/discutii-articole/<slug>` mirrors
    // `/revista/<slug>`).
    const [thread] = await this.db
      .insert(forumThreads)
      .values({
        slug: article.slug,
        categoryId: cat.id,
        authorId: article.authorId,
        title: article.title,
        postCount: 0,
      })
      .returning({ id: forumThreads.id });
    return thread.id;
  }

  private async slugTaken(
    slug: string,
    excludeId?: string,
  ): Promise<boolean> {
    const conds = [
      eq(articles.slug, slug),
      sql`${articles.status} <> 'archived'`,
    ];
    if (excludeId) conds.push(sql`${articles.id} <> ${excludeId}`);
    const rows = await this.db
      .select({ id: articles.id })
      .from(articles)
      .where(and(...conds))
      .limit(1);
    return rows.length > 0;
  }
}
