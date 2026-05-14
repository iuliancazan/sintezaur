import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  DATABASE,
  type SintezaurDb,
  gear,
  userGearStatuses,
} from '@sintezaur/db';
import { and, eq, isNull } from 'drizzle-orm';
import { TezaurService } from './tezaur.service';
import type { SetGearStatusDto } from './tezaur.dto';

@Injectable()
export class UserGearStatusService {
  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly tezaur: TezaurService,
  ) {}

  async set(userId: string, dto: SetGearStatusDto): Promise<void> {
    const [g] = await this.db
      .select({ id: gear.id })
      .from(gear)
      .where(and(eq(gear.id, dto.gearId), isNull(gear.deletedAt)))
      .limit(1);
    if (!g) throw new NotFoundException(`gear ${dto.gearId} not found`);

    await this.db
      .insert(userGearStatuses)
      .values({
        userId,
        gearId: dto.gearId,
        status: dto.status,
        isPublic: dto.isPublic ?? true,
        note: dto.note,
      })
      .onConflictDoUpdate({
        target: [
          userGearStatuses.userId,
          userGearStatuses.gearId,
          userGearStatuses.status,
        ],
        set: {
          isPublic: dto.isPublic ?? true,
          note: dto.note,
          updatedAt: new Date(),
        },
      });

    if (dto.status === 'owned') {
      await this.tezaur.recomputeOwnersCount(dto.gearId);
    }
  }

  async unset(
    userId: string,
    gearId: string,
    status: SetGearStatusDto['status'],
  ): Promise<void> {
    await this.db
      .delete(userGearStatuses)
      .where(
        and(
          eq(userGearStatuses.userId, userId),
          eq(userGearStatuses.gearId, gearId),
          eq(userGearStatuses.status, status),
        ),
      );
    if (status === 'owned') {
      await this.tezaur.recomputeOwnersCount(gearId);
    }
  }

  /** Listed on the gear detail page so the user sees their own flags. */
  async listForUserAndGear(
    userId: string,
    gearId: string,
  ): Promise<(typeof userGearStatuses.$inferSelect)[]> {
    return this.db
      .select()
      .from(userGearStatuses)
      .where(
        and(
          eq(userGearStatuses.userId, userId),
          eq(userGearStatuses.gearId, gearId),
        ),
      );
  }

  /** "Colecția mea" tab on the user profile (M2 — show own collection only). */
  async listForUser(
    userId: string,
  ): Promise<{ status: string; gearId: string; brand: string; model: string; slug: string }[]> {
    const rows = await this.db
      .select({
        status: userGearStatuses.status,
        gearId: userGearStatuses.gearId,
        brand: gear.brand,
        model: gear.model,
        slug: gear.slug,
      })
      .from(userGearStatuses)
      .innerJoin(gear, eq(gear.id, userGearStatuses.gearId))
      .where(
        and(
          eq(userGearStatuses.userId, userId),
          isNull(gear.deletedAt),
        ),
      );
    return rows;
  }
}
