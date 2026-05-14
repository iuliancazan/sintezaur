/**
 * @sintezaur/shared — code shared between api, worker, site, dashboard.
 *
 * Pure, browser-safe helpers + literal types. No imports from `pg`,
 * `drizzle-orm`, `@nestjs/*`, or any backend-only package. If
 * something needs DB / Nest types, it lives in @sintezaur/db or
 * @sintezaur/auth, not here.
 */
export * from './lib/slug';
export * from './lib/tezaur-taxonomy';
export * from './lib/bazar-taxonomy';
