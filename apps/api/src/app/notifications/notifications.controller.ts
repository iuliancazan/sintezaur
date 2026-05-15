import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Put,
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
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { NotificationsService } from './notifications.service';
import type {
  NotificationKind,
  NotificationPreferenceMode,
} from '@sintezaur/db';

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

const PREFERENCE_MODES: NotificationPreferenceMode[] = ['off', 'on', 'digest'];

export class PreferenceUpdateItemDto {
  @IsIn([
    'bazar_new_message',
    'bazar_new_offer',
    'bazar_counter_offer',
    'bazar_offer_accepted',
    'bazar_offer_rejected',
    'bazar_price_drop_watched',
    'bazar_saved_search_match',
    'bazar_listing_expiring',
    'bazar_transaction_confirmed_by_other',
    'bazar_review_submitted_on_me',
    'tezaur_review_on_my_gear',
    'revista_article_in_followed_category',
    'revista_reply_to_my_article',
    'forum_reply_in_subscribed',
    'forum_mention',
    'forum_badge_earned',
    'forum_mod_action_on_my_content',
    'forum_report_resolved',
    'admin_announcement',
    'storage_quota_lifetime_reached',
  ])
  kind!: NotificationKind;

  @IsIn(['in_app', 'email'])
  channel!: 'in_app' | 'email';

  @IsIn(PREFERENCE_MODES)
  mode!: NotificationPreferenceMode;
}

export class UpdatePreferencesBodyDto {
  @IsArray()
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => PreferenceUpdateItemDto)
  items!: PreferenceUpdateItemDto[];
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

  @Get('preferences')
  async getPreferences(@CurrentUser() user: AuthenticatedUser) {
    const items = await this.svc.getPreferences(user.sub);
    return { items };
  }

  @Put('preferences')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setPreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePreferencesBodyDto,
  ) {
    await this.svc.setPreferences(user.sub, dto.items);
  }
}
