import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DATABASE,
  userBlocks,
  users,
  type SintezaurDb,
} from '@sintezaur/db';
import { and, desc, eq, isNull } from 'drizzle-orm';

export interface BlockListItem {
  id: string;
  blockedUserId: string;
  blockedUsername: string;
  blockedFullName: string;
  blockedAvatarUrl: string | null;
  reason: string | null;
  createdAt: Date;
}

/**
 * User-blocking surface per spec §7.4. Blocks are unilateral: blocker
 * never sees blocked-user content (filtered by feature services that
 * call into here); blocked user can still see blocker's content but
 * can't message them. Self-block prevented at DB level
 * (`user_blocks_not_self` check).
 */
@Injectable()
export class BlocksService {
  constructor(@Inject(DATABASE) private readonly db: SintezaurDb) {}

  async list(blockerId: string): Promise<BlockListItem[]> {
    return await this.db
      .select({
        id: userBlocks.id,
        blockedUserId: userBlocks.blockedId,
        blockedUsername: users.username,
        blockedFullName: users.fullName,
        blockedAvatarUrl: users.avatarUrl,
        reason: userBlocks.reason,
        createdAt: userBlocks.createdAt,
      })
      .from(userBlocks)
      .innerJoin(users, eq(users.id, userBlocks.blockedId))
      .where(and(eq(userBlocks.blockerId, blockerId), isNull(users.deletedAt)))
      .orderBy(desc(userBlocks.createdAt));
  }

  async create(
    blockerId: string,
    input: { blockedUserId?: string; blockedUsername?: string; reason?: string | null },
  ): Promise<BlockListItem> {
    const target = await this.resolveTarget(input);
    if (target.id === blockerId) {
      throw new BadRequestException('Nu te poți bloca pe tine.');
    }
    try {
      const [row] = await this.db
        .insert(userBlocks)
        .values({
          blockerId,
          blockedId: target.id,
          reason: input.reason?.trim() || null,
        })
        .returning();
      return {
        id: row.id,
        blockedUserId: target.id,
        blockedUsername: target.username,
        blockedFullName: target.fullName,
        blockedAvatarUrl: target.avatarUrl,
        reason: row.reason,
        createdAt: row.createdAt,
      };
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException('Utilizatorul este deja blocat.');
      }
      throw err;
    }
  }

  async remove(blockerId: string, blockedUserId: string): Promise<void> {
    const result = await this.db
      .delete(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerId, blockerId),
          eq(userBlocks.blockedId, blockedUserId),
        ),
      );
    if ((result as { rowCount?: number }).rowCount === 0) {
      throw new NotFoundException('Blocarea nu există.');
    }
  }

  async isBlocked(blockerId: string, blockedUserId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: userBlocks.id })
      .from(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerId, blockerId),
          eq(userBlocks.blockedId, blockedUserId),
        ),
      )
      .limit(1);
    return !!row;
  }

  private async resolveTarget(input: {
    blockedUserId?: string;
    blockedUsername?: string;
  }): Promise<{
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
  }> {
    if (input.blockedUserId) {
      const [row] = await this.db
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(and(eq(users.id, input.blockedUserId), isNull(users.deletedAt)))
        .limit(1);
      if (!row) throw new NotFoundException('Utilizatorul nu există.');
      return row;
    }
    if (input.blockedUsername) {
      const [row] = await this.db
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(
          and(
            eq(users.username, input.blockedUsername.toLowerCase()),
            isNull(users.deletedAt),
          ),
        )
        .limit(1);
      if (!row) throw new NotFoundException('Utilizatorul nu există.');
      return row;
    }
    throw new BadRequestException(
      'Specifică blockedUserId sau blockedUsername.',
    );
  }
}
