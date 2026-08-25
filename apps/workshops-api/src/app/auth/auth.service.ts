import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import {
  workshopAccounts,
  workshops,
  type Workshop,
} from '../../db/schema';

/** Reserved login that maps to the env-configured superadmin. */
export const SUPERADMIN_USERNAME = 'superadmin';
import {
  SESSION_TTL_S,
  type SessionPayload,
  type SessionRole,
} from './session';

/**
 * The superadmin bcrypt hash is stored BASE64-ENCODED in the env var:
 * bcrypt hashes contain `$`, which dotenv-expand (run by Nx on .env, and
 * by some PaaS env UIs) mangles into variable expansions. A raw `$2…`
 * value is still accepted for robustness.
 */
function superadminHash(): string | null {
  const raw = process.env.WORKSHOPS_SUPERADMIN_PASSWORD_HASH?.trim();
  if (!raw) {
    return null;
  }
  if (raw.startsWith('$2')) {
    return raw;
  }
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    return decoded.startsWith('$2') ? decoded : null;
  } catch {
    return null;
  }
}

@Injectable()
export class AuthService {
  constructor(
    private readonly dbService: DbService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Workshop login: username + password (workshops-spec.md §4.1). The
   * reserved username `superadmin` checks the env hash and grants the
   * cross-workshop superadmin role — there is no separate login surface
   * for it, on purpose.
   */
  async loginWorkshop(
    slug: string,
    username: string,
    password: string,
  ): Promise<{ payload: SessionPayload; workshop: Workshop | null }> {
    const user = username.trim().toLowerCase();

    if (user === SUPERADMIN_USERNAME) {
      const hash = superadminHash();
      if (!hash || !bcrypt.compareSync(password, hash)) {
        throw new UnauthorizedException('bad_credentials');
      }
      return { payload: { role: 'superadmin' }, workshop: null };
    }

    const rows = await this.dbService.db
      .select()
      .from(workshops)
      .where(and(eq(workshops.slug, slug), eq(workshops.published, true)));
    const workshop = rows[0];
    if (!workshop) {
      throw new UnauthorizedException('unknown_workshop');
    }

    const accounts = await this.dbService.db
      .select()
      .from(workshopAccounts)
      .where(
        and(
          eq(workshopAccounts.workshopId, workshop.id),
          eq(workshopAccounts.username, user),
        ),
      );
    const account = accounts[0];
    if (
      !account ||
      !bcrypt.compareSync(password, account.passwordHash) ||
      (account.role !== 'guest' && account.role !== 'admin')
    ) {
      throw new UnauthorizedException('bad_credentials');
    }

    return {
      payload: {
        role: account.role as SessionRole,
        workshopId: workshop.id,
        slug: workshop.slug,
      },
      workshop,
    };
  }

  sign(payload: SessionPayload): string {
    return this.jwt.sign(
      { ...payload },
      { expiresIn: SESSION_TTL_S[payload.role] },
    );
  }

  verify(token: string): SessionPayload | null {
    try {
      const decoded = this.jwt.verify<SessionPayload & { exp: number }>(token);
      return { role: decoded.role, workshopId: decoded.workshopId, slug: decoded.slug };
    } catch {
      return null;
    }
  }
}
