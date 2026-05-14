import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DATABASE, forumCategories, type SintezaurDb } from '@sintezaur/db';
import { asc, eq } from 'drizzle-orm';

/**
 * Read-only service for the forum category list. Categories themselves
 * are seeded via postflight SQL (9005 + 9007); they don't change at
 * runtime in MVP (M5-F+ adds a dashboard editor if needed).
 */
@Injectable()
export class ForumCategoriesService {
  constructor(@Inject(DATABASE) private readonly db: SintezaurDb) {}

  async listAll(): Promise<
    {
      id: string;
      key: string;
      slug: string;
      name: string;
      description: string | null;
      kind: 'user' | 'system';
      position: number;
    }[]
  > {
    return this.db
      .select({
        id: forumCategories.id,
        key: forumCategories.key,
        slug: forumCategories.slug,
        name: forumCategories.name,
        description: forumCategories.description,
        kind: forumCategories.kind,
        position: forumCategories.position,
      })
      .from(forumCategories)
      .orderBy(asc(forumCategories.position), asc(forumCategories.name));
  }

  async findBySlug(slug: string) {
    const [row] = await this.db
      .select()
      .from(forumCategories)
      .where(eq(forumCategories.slug, slug))
      .limit(1);
    if (!row) throw new NotFoundException(`category "${slug}" not found`);
    return row;
  }

  async findByKey(key: string) {
    const [row] = await this.db
      .select()
      .from(forumCategories)
      .where(eq(forumCategories.key, key))
      .limit(1);
    return row ?? null;
  }
}
