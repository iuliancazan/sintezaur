import { Module } from '@nestjs/common';
import { BazarModule } from '../bazar/bazar.module';
import { ForumModule } from '../forum/forum.module';
import { RevistaModule } from '../revista/revista.module';
import { TezaurModule } from '../tezaur/tezaur.module';
import { UnifiedSearchController } from './unified-search.controller';
import { UnifiedSearchService } from './unified-search.service';

/**
 * Cross-module search per spec §7.6. Depends on each section module
 * for the actual FT-search queries — no DB code lives here.
 */
@Module({
  imports: [TezaurModule, BazarModule, RevistaModule, ForumModule],
  controllers: [UnifiedSearchController],
  providers: [UnifiedSearchService],
})
export class SearchModule {}
