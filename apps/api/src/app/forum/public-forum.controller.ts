import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { Public } from '@sintezaur/auth';
import { ForumCategoriesService } from './forum-categories.service';
import { ForumPostsService } from './forum-posts.service';
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
  ) {}

  @Get('categories')
  listCategories() {
    return this.categories.listAll();
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
}
