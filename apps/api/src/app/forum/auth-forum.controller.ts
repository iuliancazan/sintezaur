import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  type AuthenticatedUser,
} from '@sintezaur/auth';
import {
  CreateReplyDto,
  CreateThreadDto,
  SetSubscriptionDto,
  UpdatePostDto,
} from './forum.dto';
import { ForumLikesService } from './forum-likes.service';
import { ForumPostsService } from './forum-posts.service';
import { ForumSubscriptionsService } from './forum-subscriptions.service';
import { ForumThreadsService } from './forum-threads.service';
import { ForumUsersService } from './forum-users.service';

const MOD_ROLES = new Set(['moderator', 'admin', 'superadmin']);

function isMod(user: AuthenticatedUser): boolean {
  return user.roles.some((r) => MOD_ROLES.has(r));
}

/**
 * Authenticated write surface for the forum.
 * Endpoints (any authenticated user):
 *   POST   /forum/threads
 *   POST   /forum/threads/:id/posts
 *   PATCH  /forum/posts/:id
 *   DELETE /forum/posts/:id
 */
@Controller('forum')
@UseGuards(JwtAuthGuard)
export class AuthForumController {
  constructor(
    private readonly threads: ForumThreadsService,
    private readonly posts: ForumPostsService,
    private readonly forumUsers: ForumUsersService,
    private readonly likes: ForumLikesService,
    private readonly subscriptions: ForumSubscriptionsService,
  ) {}

  @Get('mention-search')
  searchMentions(@Query('q') q?: string) {
    return this.forumUsers.searchForMention(q ?? '');
  }

  /* ============ likes ============ */

  @Post('posts/:id/like')
  toggleLike(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) postId: string,
  ) {
    return this.likes.toggle(user.sub, postId);
  }

  /* ============ subscriptions ============ */

  @Get('subscriptions/me')
  async listMySubscriptions(@CurrentUser() user: AuthenticatedUser) {
    const [threads, categories] = await Promise.all([
      this.subscriptions.listMyThreadSubscriptions(user.sub),
      this.subscriptions.listMyCategorySubscriptions(user.sub),
    ]);
    return { threads, categories };
  }

  @Get('threads/:id/subscription')
  async getThreadSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) threadId: string,
  ) {
    const level = await this.subscriptions.getThreadLevel(user.sub, threadId);
    return { level };
  }

  @Patch('threads/:id/subscription')
  setThreadSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) threadId: string,
    @Body() dto: SetSubscriptionDto,
  ) {
    return this.subscriptions.setThreadLevel(user.sub, threadId, dto.level);
  }

  @Get('categories/:id/subscription')
  async getCategorySubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) categoryId: string,
  ) {
    const level = await this.subscriptions.getCategoryLevel(
      user.sub,
      categoryId,
    );
    return { level };
  }

  @Patch('categories/:id/subscription')
  setCategorySubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) categoryId: string,
    @Body() dto: SetSubscriptionDto,
  ) {
    return this.subscriptions.setCategoryLevel(user.sub, categoryId, dto.level);
  }

  /* ============ my-likes (for thread render) ============ */

  @Get('threads/:id/my-likes')
  async listMyLikes(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) threadId: string,
  ) {
    return this.posts.listMyLikedPostIds(user.sub, threadId);
  }

  @Post('threads')
  createThread(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateThreadDto,
  ) {
    return this.threads.createWithOp(user.sub, dto);
  }

  @Post('threads/:id/posts')
  createReply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) threadId: string,
    @Body() dto: CreateReplyDto,
  ) {
    return this.posts.createReply(user.sub, {
      threadId,
      parentPostId: dto.parentPostId ?? null,
      body: dto.body,
      bodyHtml: dto.bodyHtml,
    });
  }

  @Patch('posts/:id')
  updatePost(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.posts.update(user.sub, isMod(user), id, dto);
  }

  @Delete('posts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePost(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.posts.authorDelete(user.sub, id);
  }
}
