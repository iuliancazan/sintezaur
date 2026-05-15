import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  RolesAllowed,
  RolesGuard,
  type AuthenticatedUser,
} from '@sintezaur/auth';
import type { Request } from 'express';
import { AuditLogService } from '../common/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { HidePostDto } from './forum.dto';
import { ForumPostsService } from './forum-posts.service';
import { ForumThreadsService } from './forum-threads.service';

/**
 * Moderation surface for the forum. Spec §8.4: mods act via inline
 * buttons on the public site, not the dashboard — so these endpoints
 * stay under /forum/mod/ with role gating.
 *
 * M5-G layered on top of M5-B endpoints:
 *  - every action writes an `audit_log` row (actor + target + IP/UA)
 *  - destructive actions (`hide_post`, `delete_thread`) notify the
 *    content author with `forum_mod_action_on_my_content` + reason
 */
@Controller('forum/mod')
@UseGuards(JwtAuthGuard, RolesGuard)
@RolesAllowed('moderator', 'admin', 'superadmin')
export class ModForumController {
  constructor(
    private readonly threads: ForumThreadsService,
    private readonly posts: ForumPostsService,
    private readonly audit: AuditLogService,
    private readonly notifications: NotificationsService,
  ) {}

  /* ============ first-post approval queue (M5-H) ============ */

  @Get('pending-posts')
  listPending(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.posts.listPendingPosts({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  /* ============ threads ============ */

  @Post('threads/:id/lock')
  @HttpCode(HttpStatus.NO_CONTENT)
  async lock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    await this.threads.lock(id, true);
    await this.audit.record({
      actorId: user.sub,
      action: 'lock_thread',
      targetType: 'forum_thread',
      targetId: id,
      req,
    });
  }

  @Post('threads/:id/unlock')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    await this.threads.lock(id, false);
    await this.audit.record({
      actorId: user.sub,
      action: 'unlock_thread',
      targetType: 'forum_thread',
      targetId: id,
      req,
    });
  }

  @Post('threads/:id/pin')
  async pin(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const result = await this.threads.pin(id);
    await this.audit.record({
      actorId: user.sub,
      action: 'pin_thread',
      targetType: 'forum_thread',
      targetId: id,
      details: { pinPosition: result.pinPosition },
      req,
    });
    return result;
  }

  @Post('threads/:id/unpin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unpin(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    await this.threads.unpin(id);
    await this.audit.record({
      actorId: user.sub,
      action: 'unpin_thread',
      targetType: 'forum_thread',
      targetId: id,
      req,
    });
  }

  @Delete('threads/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteThread(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
    @Req() req: Request,
  ) {
    const t = await this.threads.findById(id);
    await this.threads.modDelete(id);
    await this.audit.record({
      actorId: user.sub,
      action: 'delete_thread',
      targetType: 'forum_thread',
      targetId: id,
      details: { title: t.title, reason: body.reason ?? null },
      req,
    });
    if (t.authorId && t.authorId !== user.sub) {
      await this.notifications.post({
        recipientId: t.authorId,
        actorId: user.sub,
        kind: 'forum_mod_action_on_my_content',
        dedupKey: `forum_mod:thread_delete:${id}`,
        targetType: 'forum_thread',
        targetId: id,
        payload: {
          action: 'delete_thread',
          threadTitle: t.title,
          reason: body.reason ?? null,
        },
      });
    }
  }

  /* ============ posts ============ */

  @Post('posts/:id/hide')
  @HttpCode(HttpStatus.NO_CONTENT)
  async hide(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HidePostDto,
    @Req() req: Request,
  ) {
    await this.posts.hide(user.sub, id, dto.reason);
    const post = await this.posts.findById(id);
    await this.audit.record({
      actorId: user.sub,
      action: 'hide_post',
      targetType: 'forum_post',
      targetId: id,
      details: { reason: dto.reason },
      req,
    });
    if (post.authorId && post.authorId !== user.sub) {
      await this.notifications.post({
        recipientId: post.authorId,
        actorId: user.sub,
        kind: 'forum_mod_action_on_my_content',
        dedupKey: `forum_mod:post_hide:${id}`,
        targetType: 'forum_post',
        targetId: id,
        payload: {
          action: 'hide_post',
          reason: dto.reason,
          threadId: post.threadId,
        },
      });
    }
  }

  @Post('posts/:id/unhide')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unhide(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    await this.posts.unhide(id);
    await this.audit.record({
      actorId: user.sub,
      action: 'unhide_post',
      targetType: 'forum_post',
      targetId: id,
      req,
    });
  }

  @Post('posts/:id/approve')
  @HttpCode(HttpStatus.NO_CONTENT)
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    await this.posts.approve(id);
    await this.audit.record({
      actorId: user.sub,
      action: 'first_post_approve',
      targetType: 'forum_post',
      targetId: id,
      req,
    });
  }

  @Post('posts/:id/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    await this.posts.reject(id);
    await this.audit.record({
      actorId: user.sub,
      action: 'first_post_reject',
      targetType: 'forum_post',
      targetId: id,
      req,
    });
  }
}
