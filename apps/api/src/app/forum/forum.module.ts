import { Module } from '@nestjs/common';
import { AuthForumController } from './auth-forum.controller';
import { ForumCategoriesService } from './forum-categories.service';
import { ForumPostsService } from './forum-posts.service';
import { ForumThreadsService } from './forum-threads.service';
import { ForumUsersService } from './forum-users.service';
import { ModForumController } from './mod-forum.controller';
import { PublicForumController } from './public-forum.controller';

/**
 * Forum — M5. Walking-skeleton-complete: schema in M5-A, this M5-B
 * ships read + write + moderation. Mentions, likes, subscriptions,
 * notification fan-out, badges, faceted search and the anti-spam
 * stack land in M5-D..M5-H.
 */
@Module({
  controllers: [
    PublicForumController,
    AuthForumController,
    ModForumController,
  ],
  providers: [
    ForumCategoriesService,
    ForumThreadsService,
    ForumPostsService,
    ForumUsersService,
  ],
  exports: [
    ForumCategoriesService,
    ForumThreadsService,
    ForumPostsService,
  ],
})
export class ForumModule {}
