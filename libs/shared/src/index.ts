/**
 * @sintezaur/shared — code shared between api, worker, site, dashboard.
 *
 * Empty until M1 (auth DTOs, role enums) and M2 (gear DTOs, taxonomy
 * constants, currency/slug helpers). Keep types FE-friendly: no
 * imports from `pg`, `drizzle-orm`, `@nestjs/*`, or any backend-only
 * package. If something needs DB/Nest types, it lives in @sintezaur/db
 * or @sintezaur/auth, not here.
 */
export {};
