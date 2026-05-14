import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  DATABASE,
  refreshTokens,
  type SintezaurDb,
  type UserRole,
} from '@sintezaur/db';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';

/**
 * JWT access token payload. Kept small: `sub` + `roles[]`. Roles are
 * re-fetched on every request via `JwtStrategy.validate` so grant /
 * revoke / soft-delete takes effect immediately rather than waiting
 * for the access token to expire. Multi-valued per spec §7.2.
 */
export interface AccessTokenPayload {
  sub: string;
  roles: UserRole[];
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenId: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

/**
 * Issues access + refresh JWTs and manages the persisted refresh-token
 * lifecycle (insert, lookup, revoke, rotate). Plaintext refresh tokens
 * are stored as sha256 hashes; plaintexts only ever land in the
 * HttpOnly `sintezaur_refresh` cookie at issue time.
 */
@Injectable()
export class TokenService {
  private readonly accessTtlMs: number;
  private readonly refreshTtlMs: number;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
    @Inject(DATABASE) private readonly db: SintezaurDb,
  ) {
    this.accessTtlMs = parseDurationToMs(
      config.get('JWT_ACCESS_TTL') ?? '15m',
    );
    this.refreshTtlMs = parseDurationToMs(
      config.get('JWT_REFRESH_TTL') ?? '30d',
    );
  }

  get accessTtlSeconds(): number {
    return Math.floor(this.accessTtlMs / 1_000);
  }
  get refreshTtlSeconds(): number {
    return Math.floor(this.refreshTtlMs / 1_000);
  }

  async issueTokens(
    userId: string,
    roles: UserRole[],
    meta?: { ip?: string | null; userAgent?: string | null },
  ): Promise<IssuedTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, roles } satisfies AccessTokenPayload,
      { expiresIn: this.accessTtlSeconds },
    );
    const refreshToken = randomBytes(48).toString('base64url');
    const tokenHash = sha256(refreshToken);
    const now = Date.now();
    const accessTokenExpiresAt = new Date(now + this.accessTtlMs);
    const refreshTokenExpiresAt = new Date(now + this.refreshTtlMs);
    const [row] = await this.db
      .insert(refreshTokens)
      .values({
        userId,
        tokenHash,
        expiresAt: refreshTokenExpiresAt,
        ip: meta?.ip ?? null,
        userAgent: meta?.userAgent ?? null,
      })
      .returning({ id: refreshTokens.id });
    return {
      accessToken,
      refreshToken,
      refreshTokenId: row.id,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    };
  }

  async findActiveRefreshToken(
    presented: string,
  ): Promise<{ id: string; userId: string } | null> {
    const tokenHash = sha256(presented);
    const now = new Date();
    const [row] = await this.db
      .select({
        id: refreshTokens.id,
        userId: refreshTokens.userId,
      })
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, now),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async revokeById(id: string, replacedBy?: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date(), replacedBy: replacedBy ?? null })
      .where(eq(refreshTokens.id, id));
  }

  async revokeByPlaintext(presented: string): Promise<boolean> {
    const tokenHash = sha256(presented);
    const result = await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
        ),
      )
      .returning({ id: refreshTokens.id });
    return result.length > 0;
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          isNull(refreshTokens.revokedAt),
        ),
      );
  }
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Parse `Ns` / `Nm` / `Nh` / `Nd`. Fallback: parse as raw milliseconds. */
function parseDurationToMs(input: string): number {
  const match = /^(\d+)\s*([smhd]?)$/.exec(input.trim());
  if (!match) {
    const n = Number.parseInt(input, 10);
    if (Number.isNaN(n)) throw new Error(`Invalid duration: ${input}`);
    return n;
  }
  const n = Number.parseInt(match[1], 10);
  const unit = match[2] || 's';
  const factor =
    unit === 's' ? 1_000
    : unit === 'm' ? 60_000
    : unit === 'h' ? 3_600_000
    : 86_400_000;
  return n * factor;
}
