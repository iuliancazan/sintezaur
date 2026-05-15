import { Injectable, Logger } from '@nestjs/common';
import { ListingsService } from '../bazar/listings.service';
import {
  ForumSearchService,
  type ForumSearchQuery,
} from '../forum/forum-search.service';
import { ArticlesService } from '../revista/articles.service';
import { TezaurService } from '../tezaur/tezaur.service';

const MIN_QUERY_LEN = 2;
const DEFAULT_LIMIT_PER_SECTION = 5;
const MAX_LIMIT_PER_SECTION = 20;

export interface UnifiedSearchSection<T> {
  items: T[];
  totalCount: number;
}

/**
 * Cross-module text search per spec §7.6 ("One unified search page +
 * per-section filtered search"). Hits Tezaur + Bazar + Revista +
 * Forum in parallel using each section's existing FT-search infra,
 * returns the top N from each. Frontend renders 4 grouped result
 * cards; deep-links to per-section search with the same `q`.
 *
 * Failures in any one section don't break the others — each fan-out
 * promise is wrapped in a try/catch so a slow Forum query won't take
 * out the whole response.
 */
@Injectable()
export class UnifiedSearchService {
  private readonly logger = new Logger(UnifiedSearchService.name);

  constructor(
    private readonly tezaur: TezaurService,
    private readonly listings: ListingsService,
    private readonly articles: ArticlesService,
    private readonly forum: ForumSearchService,
  ) {}

  async search(rawQuery: string, rawLimit?: number) {
    const query = (rawQuery ?? '').trim();
    if (query.length < MIN_QUERY_LEN) {
      return {
        query,
        tooShort: true,
        tezaur: { items: [], totalCount: 0 },
        bazar: { items: [], totalCount: 0 },
        revista: { items: [], totalCount: 0 },
        forum: { items: [], totalCount: 0 },
        totalHits: 0,
      };
    }
    const limit = Math.min(
      Math.max(rawLimit ?? DEFAULT_LIMIT_PER_SECTION, 1),
      MAX_LIMIT_PER_SECTION,
    );

    const [tezaur, bazar, revista, forum] = await Promise.all([
      this.safeTezaur(query, limit),
      this.safeBazar(query, limit),
      this.safeRevista(query, limit),
      this.safeForum(query, limit),
    ]);

    return {
      query,
      tooShort: false,
      tezaur,
      bazar,
      revista,
      forum,
      totalHits:
        tezaur.totalCount +
        bazar.totalCount +
        revista.totalCount +
        forum.totalCount,
    };
  }

  private async safeTezaur(q: string, limit: number) {
    try {
      const res = await this.tezaur.listPublic({
        q,
        pageSize: limit,
        page: 1,
      });
      return { items: res.items, totalCount: res.totalCount };
    } catch (err) {
      this.logger.warn(`tezaur search failed: ${(err as Error).message}`);
      return { items: [], totalCount: 0 };
    }
  }

  private async safeBazar(q: string, limit: number) {
    try {
      const res = await this.listings.listPublic({
        q,
        pageSize: limit,
        page: 1,
      });
      return { items: res.items, totalCount: res.totalCount };
    } catch (err) {
      this.logger.warn(`bazar search failed: ${(err as Error).message}`);
      return { items: [], totalCount: 0 };
    }
  }

  private async safeRevista(q: string, limit: number) {
    try {
      const res = await this.articles.listPublic({
        q,
        pageSize: limit,
        page: 1,
      });
      return { items: res.items, totalCount: res.totalCount };
    } catch (err) {
      this.logger.warn(`revista search failed: ${(err as Error).message}`);
      return { items: [], totalCount: 0 };
    }
  }

  private async safeForum(q: string, limit: number) {
    try {
      const fq: ForumSearchQuery = { q, page: 1, pageSize: limit };
      const res = await this.forum.search(fq);
      return { items: res.items, totalCount: res.totalCount };
    } catch (err) {
      this.logger.warn(`forum search failed: ${(err as Error).message}`);
      return { items: [], totalCount: 0 };
    }
  }
}
