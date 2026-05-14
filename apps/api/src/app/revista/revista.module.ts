import { Module } from '@nestjs/common';
import { AdminRevistaController } from './admin-revista.controller';
import { ArticlesService } from './articles.service';
import { EditorRevistaController } from './editor-revista.controller';
import { RevistaFollowsController } from './follows.controller';
import { RevistaFollowsService } from './follows.service';
import {
  PublicAuthorController,
  PublicRevistaController,
} from './public-revista.controller';

/**
 * Revista — M4. Inline-on-site editorial composer + public reader.
 * StorageService is provided globally by CommonModule.
 */
@Module({
  controllers: [
    PublicRevistaController,
    PublicAuthorController,
    EditorRevistaController,
    AdminRevistaController,
    RevistaFollowsController,
  ],
  providers: [ArticlesService, RevistaFollowsService],
  exports: [ArticlesService],
})
export class RevistaModule {}
