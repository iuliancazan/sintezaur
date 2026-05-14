import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  RolesAllowed,
  RolesGuard,
  type AuthenticatedUser,
} from '@sintezaur/auth';
import { HidePostDto } from './forum.dto';
import { ForumPostsService } from './forum-posts.service';
import { ForumThreadsService } from './forum-threads.service';

/**
 * Moderation surface for the forum. Spec §8.4: mods act via inline
 * buttons on the public site, not the dashboard — so these endpoints
 * stay under /forum/ with role gating.
 */
@Controller('forum/mod')
@UseGuards(JwtAuthGuard, RolesGuard)
@RolesAllowed('moderator', 'admin', 'superadmin')
export class ModForumController {
  constructor(
    private readonly threads: ForumThreadsService,
    private readonly posts: ForumPostsService,
  ) {}

  /* ============ threads ============ */

  @Post('threads/:id/lock')
  @HttpCode(HttpStatus.NO_CONTENT)
  async lock(@Param('id', ParseUUIDPipe) id: string) {
    await this.threads.lock(id, true);
  }

  @Post('threads/:id/unlock')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlock(@Param('id', ParseUUIDPipe) id: string) {
    await this.threads.lock(id, false);
  }

  @Post('threads/:id/pin')
  pin(@Param('id', ParseUUIDPipe) id: string) {
    return this.threads.pin(id);
  }

  @Post('threads/:id/unpin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unpin(@Param('id', ParseUUIDPipe) id: string) {
    await this.threads.unpin(id);
  }

  @Delete('threads/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteThread(@Param('id', ParseUUIDPipe) id: string) {
    await this.threads.modDelete(id);
  }

  /* ============ posts ============ */

  @Post('posts/:id/hide')
  @HttpCode(HttpStatus.NO_CONTENT)
  async hide(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HidePostDto,
  ) {
    await this.posts.hide(user.sub, id, dto.reason);
  }

  @Post('posts/:id/unhide')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unhide(@Param('id', ParseUUIDPipe) id: string) {
    await this.posts.unhide(id);
  }

  @Post('posts/:id/approve')
  @HttpCode(HttpStatus.NO_CONTENT)
  async approve(@Param('id', ParseUUIDPipe) id: string) {
    await this.posts.approve(id);
  }

  @Post('posts/:id/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reject(@Param('id', ParseUUIDPipe) id: string) {
    await this.posts.reject(id);
  }
}
