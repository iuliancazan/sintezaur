import { Module } from '@nestjs/common';
import { AuthForumController } from './auth-forum.controller';
import { ForumCategoriesService } from './forum-categories.service';
import { ForumLikesService } from './forum-likes.service';
import { ForumPostsService } from './forum-posts.service';
import { ForumSubscriptionsService } from './forum-subscriptions.service';
import { ForumThreadsService } from './forum-threads.service';
import { ForumUsersService } from './forum-users.service';
import { ModForumController } from './mod-forum.controller';
import { PublicForumController } from './public-forum.controller';

/**
 * Forum — M5. Walking-skeleton-complete: schema in M5-A, read+write+mod
 * in M5-B/C/D. M5-E adds likes + subscriptions + notification fan-out
 * (mention > revista-author > thread-watcher dedup). Badges, faceted
 * search and anti-spam stack land in M5-F..M5-H.
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
    ForumLikesService,
    ForumSubscriptionsService,
  ],
  exports: [
    ForumCategoriesService,
    ForumThreadsService,
    ForumPostsService,
    ForumSubscriptionsService,
  ],
})
export class ForumModule {}
