import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  type AuthenticatedUser,
} from '@sintezaur/auth';
import { CreateReplyDto, CreateThreadDto, UpdatePostDto } from './forum.dto';
import { ForumPostsService } from './forum-posts.service';
import { ForumThreadsService } from './forum-threads.service';

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
  ) {}

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
