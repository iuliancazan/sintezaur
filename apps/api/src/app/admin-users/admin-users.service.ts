import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DATABASE,
  userRoles,
  users,
  type SintezaurDb,
  type UserRole,
} from '@sintezaur/db';
import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import type { Request } from 'express';
import { AuditLogService } from '../common/audit-log.service';

const GRANTABLE_BY_ADMIN: UserRole[] = [
  'editor',
  'curator',
  'moderator',
];

@Injectable()
export class AdminUsersService {
  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly audit: AuditLogService,
  ) {}

  async list(opts: { q?: string; page?: number; pageSize?: number }) {
    const page = opts.page ?? 1;
    const pageSize = Math.min(opts.pageSize ?? 50, 200);
    const offset = (page - 1) * pageSize;

    const conds = [isNull(users.deletedAt)];
    if (opts.q && opts.q.trim().length >= 2) {
      const term = `%${opts.q.trim()}%`;
      conds.push(
        or(ilike(users.username, term), ilike(users.email, term)) as never,
      );
    }
    const whereClause = and(...conds);

    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        fullName: users.fullName,
        emailVerified: users.emailVerified,
        trustLevel: users.trustLevel,
        createdAt: users.createdAt,
        roles: sql<string[]>`coalesce((
          SELECT array_agg(${userRoles.role}::text)
          FROM ${userRoles}
          WHERE ${userRoles.userId} = ${users.id}
        ), '{}')`,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause);

    return {
      items: rows,
      page,
      pageSize,
      totalCount: count,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
    };
  }

  async grantRole(
    actorId: string,
    actorIsSuperadmin: boolean,
    targetUserId: string,
    role: UserRole,
    req?: Request,
  ): Promise<void> {
    if (role === 'user') {
      throw new BadRequestException(
        '`user` is the implicit baseline — not grantable.',
      );
    }
    if ((role === 'admin' || role === 'superadmin') && !actorIsSuperadmin) {
      throw new ForbiddenException(
        'Doar superadmin poate acorda admin/superadmin.',
      );
    }
    if (!actorIsSuperadmin && !GRANTABLE_BY_ADMIN.includes(role)) {
      throw new BadRequestException(`Rolul "${role}" nu poate fi acordat.`);
    }

    // Make sure the target exists.
    const [target] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, targetUserId), isNull(users.deletedAt)))
      .limit(1);
    if (!target) throw new NotFoundException(`user ${targetUserId} not found`);

    try {
      await this.db.insert(userRoles).values({
        userId: targetUserId,
        role,
        grantedBy: actorId,
      });
    } catch (err: unknown) {
      // unique-violation on (user_id, role) — already granted.
      const code = (err as { code?: string })?.code;
      if (code === '23505')
        throw new ConflictException('Rolul este deja acordat.');
      throw err;
    }

    await this.audit.record({
      actorId,
      action: 'promote_user',
      targetType: 'user',
      targetId: targetUserId,
      details: { role },
      req,
    });
  }

  async revokeRole(
    actorId: string,
    actorIsSuperadmin: boolean,
    targetUserId: string,
    role: UserRole,
    req?: Request,
  ): Promise<void> {
    if (role === 'user') {
      throw new BadRequestException(
        '`user` is implicit and cannot be revoked.',
      );
    }
    if ((role === 'admin' || role === 'superadmin') && !actorIsSuperadmin) {
      throw new ForbiddenException(
        'Doar superadmin poate revoca admin/superadmin.',
      );
    }
    await this.db
      .delete(userRoles)
      .where(
        and(eq(userRoles.userId, targetUserId), eq(userRoles.role, role)),
      );
    await this.audit.record({
      actorId,
      action: 'demote_user',
      targetType: 'user',
      targetId: targetUserId,
      details: { role },
      req,
    });
  }
}
