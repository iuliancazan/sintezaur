import {
  Controller,
  Get,
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
    const t = await this.threads.findBySlug(slug);
    return t;
  }

  @Get('threads/:slug/posts')
  async listPosts(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const t = await this.threads.findBySlug(slug);
    return this.posts.listForThread(t.thread.id, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('threads/:slug/attachments')
  async listAttachments(@Param('slug') slug: string) {
    const t = await this.threads.findBySlug(slug);
    return { items: await this.attachments.listForThread(t.thread.id) };
  }
}
