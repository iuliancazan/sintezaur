import { Inject, Injectable } from '@nestjs/common';
import {
  DATABASE,
  forumCategories,
  forumThreads,
  users,
  type SintezaurDb,
} from '@sintezaur/db';
import { and, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';

export interface ForumSearchQuery {
  q?: string;
  categories?: string[];
  authorUsername?: string;
  tag?: string;
  gearId?: string;
  from?: string;
  to?: string;
  sort?: 'relevance' | 'newest' | 'most_replies';
  page?: number;
  pageSize?: number;
}

export interface ForumSearchHit {
  threadId: string;
  threadSlug: string;
  threadTitle: string;
  categorySlug: string;
  categoryName: string;
  authorId: string | null;
  authorUsername: string | null;
  postCount: number;
  lastPostAt: Date | null;
  createdAt: Date;
  tags: string[];
  /** ts_headline snippet from the OP body when matched, else fallback. */
  snippet: string | null;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

/**
 * Faceted forum search per spec §8.4. Backed by:
 *  - `forum_posts.search_vector` (tsvector GIN, migration 9006) for the
 *    text match on body content.
 *  - `forum_threads.tags` + `gear_tag` (migration 0010) for the structured
 *    facet filters.
 *
 * Results are aggregated at the *thread* level: the search returns one
 * hit per thread that has at least one matching post (or a matching
 * title), with a snippet from the best-matching post body.
 */
@Injectable()
export class ForumSearchService {
  constructor(@Inject(DATABASE) private readonly db: SintezaurDb) {}

  async search(query: ForumSearchQuery): Promise<{
    items: ForumSearchHit[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  }> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(
      query.pageSize ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );

    const term = (query.q ?? '').trim();
    const hasText = term.length >= 2;
    const sort: 'relevance' | 'newest' | 'most_replies' =
      query.sort ?? (hasText ? 'relevance' : 'newest');

    const conds = [isNull(forumThreads.deletedAt)];
    if (query.categories && query.categories.length > 0) {
      conds.push(
        sql`${forumCategories.slug} = ANY(${query.categories}::text[])`,
      );
    }
    if (query.authorUsername) {
      conds.push(eq(users.username, query.authorUsername));
    }
    if (query.tag) {
      conds.push(sql`${query.tag} = ANY(${forumThreads.tags})`);
    }
    if (query.gearId) {
      conds.push(sql`${query.gearId} = ANY(${forumThreads.gearTag})`);
    }
    if (query.from) {
      conds.push(gte(forumThreads.createdAt, new Date(query.from)));
    }
    if (query.to) {
      conds.push(lte(forumThreads.createdAt, new Date(query.to)));
    }

    const tsQuery = hasText
      ? sql`websearch_to_tsquery('sintezaur_ro', ${term})`
      : null;

    if (hasText && tsQuery) {
      // Either the OP body matches, or the thread title contains the
      // query (case-insensitive). The first arm uses the GIN index;
      // the second arm is a fallback for titles which we don't index.
      conds.push(
        sql`(
          EXISTS (
            SELECT 1 FROM forum_posts fp
             WHERE fp.thread_id = ${forumThreads.id}
               AND fp.deleted_at IS NULL
               AND fp.hidden_at IS NULL
               AND fp.status = 'approved'
               AND fp.search_vector @@ ${tsQuery}
          )
          OR ${forumThreads.title} ILIKE ${'%' + term + '%'}
        )`,
      );
    }

    const orderBy = (() => {
      if (sort === 'most_replies') return desc(forumThreads.postCount);
      if (sort === 'newest')
        return sql`COALESCE(${forumThreads.lastPostAt}, ${forumThreads.createdAt}) DESC`;
      // relevance — when text is present, rank by max ts_rank on posts;
      // when no text, fall back to recency.
      if (hasText && tsQuery) {
        return sql`(
          SELECT COALESCE(MAX(ts_rank(fp.search_vector, ${tsQuery})), 0)
            FROM forum_posts fp
           WHERE fp.thread_id = ${forumThreads.id}
             AND fp.deleted_at IS NULL
             AND fp.hidden_at IS NULL
             AND fp.status = 'approved'
        ) DESC`;
      }
      return sql`COALESCE(${forumThreads.lastPostAt}, ${forumThreads.createdAt}) DESC`;
    })();

    const whereClause = and(...conds);

    const rows = await this.db
      .select({
        threadId: forumThreads.id,
        threadSlug: forumThreads.slug,
        threadTitle: forumThreads.title,
        categorySlug: forumCategories.slug,
        categoryName: forumCategories.name,
        authorId: forumThreads.authorId,
        authorUsername: users.username,
        postCount: forumThreads.postCount,
        lastPostAt: forumThreads.lastPostAt,
        createdAt: forumThreads.createdAt,
        tags: forumThreads.tags,
        snippet: hasText && tsQuery
          ? sql<string | null>`(
              SELECT ts_headline(
                'sintezaur_ro',
                regexp_replace(coalesce(fp.body_html, ''), '<[^>]+>', ' ', 'g'),
                ${tsQuery},
                'StartSel=<mark>, StopSel=</mark>, MaxWords=22, MinWords=10, ShortWord=2, MaxFragments=2, FragmentDelimiter=" … "'
              )
                FROM forum_posts fp
               WHERE fp.thread_id = ${forumThreads.id}
                 AND fp.deleted_at IS NULL
                 AND fp.hidden_at IS NULL
                 AND fp.status = 'approved'
                 AND fp.search_vector @@ ${tsQuery}
               ORDER BY ts_rank(fp.search_vector, ${tsQuery}) DESC
               LIMIT 1
            )`
          : sql<string | null>`NULL`,
      })
      .from(forumThreads)
      .innerJoin(
        forumCategories,
        eq(forumCategories.id, forumThreads.categoryId),
      )
      .leftJoin(users, eq(users.id, forumThreads.authorId))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(forumThreads)
      .innerJoin(
        forumCategories,
        eq(forumCategories.id, forumThreads.categoryId),
      )
      .leftJoin(users, eq(users.id, forumThreads.authorId))
      .where(whereClause);

    return {
      items: rows,
      page,
      pageSize,
      totalCount: count,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
    };
  }
}
