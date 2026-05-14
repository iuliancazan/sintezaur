import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  DATABASE,
  userRoles,
  users,
  type SintezaurDb,
  type UserRole,
} from '@sintezaur/db';
import { eq } from 'drizzle-orm';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../strategies/jwt.strategy';

/**
 * Use after `JwtAuthGuard`. Reads the `@RolesAllowed(...)` metadata on
 * the handler (or class), re-fetches the user's current role set from
 * the DB (so grants/revokes take immediate effect), and 403s if the
 * intersection with `allowed` is empty. If no `@RolesAllowed(...)` is
 * set, the guard passes. Spec §7.2 — roles are multi-valued.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DATABASE) private readonly db: SintezaurDb,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const allowed = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!allowed || allowed.length === 0) return true;

    const req = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const userId = req.user?.sub;
    if (!userId) throw new ForbiddenException();

    const [row] = await this.db
      .select({ deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!row || row.deletedAt) {
      throw new ForbiddenException('Insufficient role');
    }
    const rolesHeld = await this.db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));
    const has = new Set(rolesHeld.map((r) => r.role));
    if (!allowed.some((r) => has.has(r))) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
