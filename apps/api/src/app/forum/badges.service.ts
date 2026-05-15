import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DATABASE,
  badges,
  userBadges,
  users,
  type Badge,
  type SintezaurDb,
} from '@sintezaur/db';
import { asc, eq, inArray } from 'drizzle-orm';

export interface BadgeUpsertInput {
  key: string;
  nameRo: string;
  nameEn: string;
  category: string;
  descriptionRo?: string | null;
  descriptionEn?: string | null;
  criteria: { kind: string; threshold: number };
  position?: number;
}

const KNOWN_KINDS = ['post_count', 'account_age_days', 'likes_received'];

/**
 * Read + admin-CRUD for `badges`. Awarding logic lives in
 * BadgeAwardingService; this service is the catalog.
 */
@Injectable()
export class BadgesService {
  constructor(@Inject(DATABASE) private readonly db: SintezaurDb) {}

  async listAll(): Promise<Badge[]> {
    return this.db
      .select()
      .from(badges)
      .orderBy(asc(badges.position), asc(badges.nameRo));
  }

  async listForUser(userId: string): Promise<
    {
      key: string;
      nameRo: string;
      nameEn: string;
      category: string;
      descriptionRo: string | null;
      descriptionEn: string | null;
      awardedAt: Date;
      position: number;
    }[]
  > {
    return this.db
      .select({
        key: badges.key,
        nameRo: badges.nameRo,
        nameEn: badges.nameEn,
        category: badges.category,
        descriptionRo: badges.descriptionRo,
        descriptionEn: badges.descriptionEn,
        position: badges.position,
        awardedAt: userBadges.awardedAt,
      })
      .from(userBadges)
      .innerJoin(badges, eq(badges.key, userBadges.badgeKey))
      .where(eq(userBadges.userId, userId))
      .orderBy(asc(badges.position), asc(badges.nameRo));
  }

  async listForUsername(username: string) {
    const [u] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (!u) throw new NotFoundException('user not found');
    return this.listForUser(u.id);
  }

  /* ============ admin CRUD ============ */

  async findById(id: string): Promise<Badge> {
    const [row] = await this.db
      .select()
      .from(badges)
      .where(eq(badges.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('badge not found');
    return row;
  }

  async create(input: BadgeUpsertInput): Promise<Badge> {
    this.validate(input);
    try {
      const [row] = await this.db
        .insert(badges)
        .values({
          key: input.key,
          nameRo: input.nameRo,
          nameEn: input.nameEn,
          category: input.category,
          descriptionRo: input.descriptionRo ?? null,
          descriptionEn: input.descriptionEn ?? null,
          criteria: input.criteria,
          position: input.position ?? 0,
        })
        .returning();
      return row;
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException(`Badge "${input.key}" există deja.`);
      }
      throw err;
    }
  }

  async update(id: string, input: Partial<BadgeUpsertInput>): Promise<Badge> {
    if (input.criteria) this.validateCriteria(input.criteria);
    const [row] = await this.db
      .update(badges)
      .set({
        nameRo: input.nameRo,
        nameEn: input.nameEn,
        category: input.category,
        descriptionRo: input.descriptionRo,
        descriptionEn: input.descriptionEn,
        criteria: input.criteria,
        position: input.position,
        updatedAt: new Date(),
      })
      .where(eq(badges.id, id))
      .returning();
    if (!row) throw new NotFoundException('badge not found');
    return row;
  }

  /**
   * Hard delete + cascade remove user awards. Adminul confirmă în UI.
   * Returnează nr. user_badges șterse pentru telemetry.
   */
  async delete(id: string): Promise<{ removedAwards: number }> {
    const b = await this.findById(id);
    const awards = await this.db
      .delete(userBadges)
      .where(eq(userBadges.badgeKey, b.key))
      .returning({ id: userBadges.id });
    await this.db.delete(badges).where(eq(badges.id, id));
    return { removedAwards: awards.length };
  }

  /* ============ validate ============ */

  private validate(input: BadgeUpsertInput): void {
    if (!input.key || !/^[a-z0-9_]+$/.test(input.key)) {
      throw new BadRequestException(
        'Key trebuie să conțină doar lowercase, cifre și underscores.',
      );
    }
    if (input.nameRo.trim().length < 2 || input.nameEn.trim().length < 2) {
      throw new BadRequestException('Numele (RO și EN) sunt obligatorii.');
    }
    this.validateCriteria(input.criteria);
  }

  private validateCriteria(c: { kind: string; threshold: number }): void {
    if (!KNOWN_KINDS.includes(c.kind)) {
      throw new BadRequestException(
        `Kind "${c.kind}" nu e suportat. Cunoscute: ${KNOWN_KINDS.join(', ')}.`,
      );
    }
    if (
      typeof c.threshold !== 'number' ||
      c.threshold < 1 ||
      !Number.isInteger(c.threshold)
    ) {
      throw new BadRequestException('Threshold trebuie integer >= 1.');
    }
  }

  /** Returns the set of badge keys an admin can choose from. */
  knownKinds(): string[] {
    return [...KNOWN_KINDS];
  }

  /** Hydrate badges by keys — used by `forum_badge_earned` consumers. */
  async findByKeys(keys: string[]): Promise<Badge[]> {
    if (keys.length === 0) return [];
    return this.db.select().from(badges).where(inArray(badges.key, keys));
  }
}
