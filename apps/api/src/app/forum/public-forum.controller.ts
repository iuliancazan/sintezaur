import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { Public } from '@sintezaur/auth';
import { ForumAttachmentsService } from './forum-attachments.service';
import { ForumCategoriesService } from './forum-categories.service';
import { ForumPostsService } from './forum-posts.service';
import {
  ForumSearchService,
  type ForumSearchQuery,
} from './forum-search.service';
import { ForumThreadsService } from './forum-threads.service';

/**
 * Public read surface for the forum. Anonymous read per spec §8.4.
 * Endpoints:
 *   GET /forum/categories
 *   GET /forum/categories/:slug/threads
 *   GET /forum/threads/:slug
 *   GET /forum/threads/:slug/posts
 */
@Controller('forum')
@Public()
export class PublicForumController {
  constructor(
    private readonly categories: ForumCategoriesService,
    private readonly threads: ForumThreadsService,
    private readonly posts: ForumPostsService,
    private readonly search: ForumSearchService,
    private readonly attachments: ForumAttachmentsService,
  ) {}

  @Get('categories')
  listCategories() {
    return this.categories.listAll();
  }

  @Get('search')
  searchThreads(
    @Query('q') q?: string,
    @Query('categories') categories?: string | string[],
    @Query('author') author?: string,
    @Query('tag') tag?: string,
    @Query('gearId') gearId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const cats = Array.isArray(categories)
      ? categories
      : categories
        ? categories.split(',').filter(Boolean)
        : undefined;
    const safeSort: ForumSearchQuery['sort'] =
      sort === 'newest' || sort === 'most_replies' || sort === 'relevance'
        ? sort
        : undefined;
    return this.search.search({
      q,
      categories: cats,
      authorUsername: author,
      tag,
      gearId,
      from,
      to,
      sort: safeSort,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('categories/:slug/threads')
  listThreads(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.threads.listByCategorySlug(slug, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('threads/:slug')
  async getThread(@Param('slug') slug: string) {
    try {
      return await this.threads.findBySlug(slug);
    } catch (err) {
      return this.handleSlugMiss(slug, err);
    }
  }

  @Get('threads/:slug/posts')
  async listPosts(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    let t;
    try {
      t = await this.threads.findBySlug(slug);
    } catch (err) {
      await this.handleSlugMiss(slug, err);
      return; // unreachable — handleSlugMiss always throws
    }
    return this.posts.listForThread(t.thread.id, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('threads/:slug/attachments')
  async listAttachments(@Param('slug') slug: string) {
    let t;
    try {
      t = await this.threads.findBySlug(slug);
    } catch (err) {
      await this.handleSlugMiss(slug, err);
      return;
    }
    return { items: await this.attachments.listForThread(t.thread.id) };
  }

  /**
   * Spec §7.13: when a thread slug 404s, try slug_redirects for a
   * 301 (active) or 410 (expired) hint. Site router uses this to
   * either replaceUrl to the new slug or render the Gone state.
   */
  private async handleSlugMiss(slug: string, original: unknown): Promise<never> {
    if (!(original instanceof NotFoundException)) {
      throw original instanceof Error ? original : new Error(String(original));
    }
    const redirect = await this.threads.lookupSlugRedirect(slug);
    if (redirect) {
      throw new NotFoundException({
        message: redirect.expired ? 'gone' : 'redirect',
        redirectTo: `/forum/.../${redirect.newSlug}`,
      });
    }
    throw original;
  }
}
