import type { CookieOptions, Response } from 'express';
import type { ConfigService } from '@nestjs/config';
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from './strategies/jwt.strategy';

/**
 * Builds the cookie options for access + refresh cookies per spec §7.1.
 *
 * Dev (COOKIE_DOMAIN=localhost or empty):
 *   - Secure=false, SameSite=Lax, Domain omitted.
 *   - Lax works across localhost:3000 ↔ localhost:4200 because the
 *     browser treats same-host different-port as same-site.
 *
 * Prod (COOKIE_DOMAIN=.sintezaur.ro, COOKIE_SECURE=true):
 *   - Secure=true, SameSite=Lax, Domain=.sintezaur.ro.
 *   - Lax over the parent domain is enough for cross-subdomain flow
 *     (api ↔ site ↔ admin); SameSite=None would also work but is
 *     unnecessarily permissive when everything is same-site.
 *
 * `HttpOnly=true` always — keeps JS out of the cookie, which is the
 * point of the cookie strategy in the first place.
 */
export function buildCookieOptions(
  config: ConfigService,
  maxAgeMs: number,
): CookieOptions {
  const rawDomain = (config.get<string>('COOKIE_DOMAIN') ?? '').trim();
  const secure =
    (config.get<string>('COOKIE_SECURE') ?? 'false').toLowerCase() === 'true';
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
    // For localhost dev, leave domain undefined so the browser scopes
    // the cookie to the exact host. `.sintezaur.ro` only kicks in in
    // prod, where it lets api / site / admin share the session.
    ...(rawDomain && rawDomain !== 'localhost'
      ? { domain: rawDomain }
      : {}),
  };
}

export function setAuthCookies(
  res: Response,
  config: ConfigService,
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
  },
): void {
  const now = Date.now();
  res.cookie(
    ACCESS_COOKIE_NAME,
    tokens.accessToken,
    buildCookieOptions(
      config,
      Math.max(0, tokens.accessTokenExpiresAt.getTime() - now),
    ),
  );
  res.cookie(
    REFRESH_COOKIE_NAME,
    tokens.refreshToken,
    buildCookieOptions(
      config,
      Math.max(0, tokens.refreshTokenExpiresAt.getTime() - now),
    ),
  );
}

export function clearAuthCookies(
  res: Response,
  config: ConfigService,
): void {
  const opts = buildCookieOptions(config, 0);
  res.clearCookie(ACCESS_COOKIE_NAME, opts);
  res.clearCookie(REFRESH_COOKIE_NAME, opts);
}
