import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, users, type SintezaurDb } from '@sintezaur/db';
import { and, asc, ilike, isNull, or, sql } from 'drizzle-orm';

const MAX_RESULTS = 8;
const MIN_QUERY = 2;

@Injectable()
export class ForumUsersService {
  constructor(@Inject(DATABASE) private readonly db: SintezaurDb) {}

  /**
   * Used by the @mention autocomplete in the Tiptap composer. Returns
   * at most MAX_RESULTS users where username OR full_name matches the
   * query as a prefix-insensitive `ILIKE`. Empty / too-short queries
   * return an empty list (avoid leaking the user table).
   */
  async searchForMention(
    query: string,
  ): Promise<{ id: string; username: string; fullName: string }[]> {
    const q = query.trim();
    if (q.length < MIN_QUERY) return [];

    const like = `${q}%`;
    return this.db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
      })
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          or(ilike(users.username, like), ilike(users.fullName, like)),
        ),
      )
      .orderBy(
        // Username matches first, then full name. Then alphabetical.
        sql`CASE WHEN ${users.username} ILIKE ${like} THEN 0 ELSE 1 END`,
        asc(users.username),
      )
      .limit(MAX_RESULTS);
  }
}
