import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  type AuthenticatedUser,
} from '@sintezaur/auth';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { NotificationsService } from './notifications.service';

export class ListNotificationsQuery {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class MarkReadBodyDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids!: string[];
}

@Controller('me/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() q: ListNotificationsQuery,
  ) {
    const items = await this.svc.listForUser(user.sub, {
      unreadOnly: q.unreadOnly,
      limit: q.limit,
    });
    const unread = await this.svc.unreadCount(user.sub);
    return { items, unread };
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return { count: await this.svc.unreadCount(user.sub) };
  }

  @Patch('mark-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MarkReadBodyDto,
  ) {
    await this.svc.markRead(user.sub, dto.ids);
  }

  @Patch('mark-all-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    await this.svc.markAllRead(user.sub);
  }
}
