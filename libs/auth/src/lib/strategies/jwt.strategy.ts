import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  DATABASE,
  userRoles,
  users,
  type SintezaurDb,
  type UserRole,
} from '@sintezaur/db';
import { eq } from 'drizzle-orm';
import type { Request } from 'express';
import type { AccessTokenPayload } from '../token.service';

export const ACCESS_COOKIE_NAME = 'sintezaur_access';
export const REFRESH_COOKIE_NAME = 'sintezaur_refresh';

/**
 * Shape of `req.user` after a successful JWT validation. Kept small
 * (id + roles[]); anything else needed by a handler should come from a
 * dedicated query or a higher-level service.
 */
export interface AuthenticatedUser {
  sub: string;
  roles: UserRole[];
}

/**
 * JWT strategy with an explicit DB re-query in `validate`. Trusting the
 * `roles` claim from the JWT payload would mean role grants/revokes or
 * soft deletes only take effect once the access token expires (up to
 * 15min). The per-request hit is fine at our scale and worth the safety.
 *
 * Token is pulled from the `sintezaur_access` HttpOnly cookie (spec §7.1:
 * "tokens in HttpOnly cookies"). Bearer-header fallback is intentionally
 * not wired — if you need a header-bearer flow for a CLI later, add a
 * second strategy with a different name rather than weakening this one.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @Inject(DATABASE) private readonly db: SintezaurDb,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.[ACCESS_COOKIE_NAME] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const [user] = await this.db
      .select({ id: users.id, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user || user.deletedAt) {
      throw new UnauthorizedException();
    }
    const roleRows = await this.db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, user.id));
    return { sub: user.id, roles: roleRows.map((r) => r.role) };
  }
}
