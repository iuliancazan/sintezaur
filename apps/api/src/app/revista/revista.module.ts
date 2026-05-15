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
import { RevistaAttachmentsController } from './revista-attachments.controller';
import { RevistaAttachmentsService } from './revista-attachments.service';

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
    RevistaAttachmentsController,
  ],
  providers: [
    ArticlesService,
    RevistaFollowsService,
    RevistaAttachmentsService,
  ],
  exports: [ArticlesService, RevistaAttachmentsService],
})
export class RevistaModule {}
