import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { workshops, type Workshop } from '../../db/schema';
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
   * Workshop login: one password field; whichever hash it matches decides
   * the role (guest first, then admin — workshops-spec.md §4.1).
   */
  async loginWorkshop(
    slug: string,
    password: string,
  ): Promise<{ payload: SessionPayload; workshop: Workshop }> {
    const rows = await this.dbService.db
      .select()
      .from(workshops)
      .where(and(eq(workshops.slug, slug), eq(workshops.published, true)));
    const workshop = rows[0];
    if (!workshop) {
      throw new UnauthorizedException('unknown_workshop');
    }

    let role: SessionRole | null = null;
    if (
      workshop.guestPasswordHash &&
      bcrypt.compareSync(password, workshop.guestPasswordHash)
    ) {
      role = 'guest';
    } else if (
      workshop.adminPasswordHash &&
      bcrypt.compareSync(password, workshop.adminPasswordHash)
    ) {
      role = 'admin';
    }
    if (!role) {
      throw new UnauthorizedException('bad_password');
    }

    return {
      payload: { role, workshopId: workshop.id, slug: workshop.slug },
      workshop,
    };
  }

  loginSuperadmin(password: string): SessionPayload {
    const hash = superadminHash();
    if (!hash || !bcrypt.compareSync(password, hash)) {
      throw new UnauthorizedException('bad_password');
    }
    return { role: 'superadmin' };
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
