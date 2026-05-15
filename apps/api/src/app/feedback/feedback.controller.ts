import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  CurrentUser,
  JwtAuthGuard,
  RolesAllowed,
  RolesGuard,
  type AuthenticatedUser,
} from '@sintezaur/auth';
import type { Request } from 'express';
import {
  CreateFeedbackDto,
  ListFeedbackQueryDto,
  UpdateFeedbackDto,
} from './feedback.dto';
import { FeedbackService } from './feedback.service';

/**
 *   POST   /feedback                        — auth required, throttled
 *   GET    /admin/feedback                  — admin/superadmin queue
 *   PATCH  /admin/feedback/:id              — read | archived
 *   GET    /admin/feedback/unread           — count for sidebar
 */
@Controller()
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post('feedback')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFeedbackDto,
    @Req() req: Request,
  ) {
    return this.feedback.submit(user.sub, dto, req);
  }

  @Get('admin/feedback')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RolesAllowed('admin', 'superadmin')
  list(@Query() query: ListFeedbackQueryDto) {
    return this.feedback.list(query);
  }

  @Get('admin/feedback/unread')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RolesAllowed('admin', 'superadmin')
  async unread() {
    return { count: await this.feedback.unreadCount() };
  }

  @Patch('admin/feedback/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RolesAllowed('admin', 'superadmin')
  setStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFeedbackDto,
  ) {
    return this.feedback.setStatus(id, dto.status, user.sub);
  }
}
