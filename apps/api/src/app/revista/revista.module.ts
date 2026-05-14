import { Module } from '@nestjs/common';
import { AdminRevistaController } from './admin-revista.controller';
import { ArticlesService } from './articles.service';
import { EditorRevistaController } from './editor-revista.controller';
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
  ],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class RevistaModule {}
