/**
 * DI tokens for consumers that need to inject the shared `Pool` and
 * `Database` instances. The actual providers live in apps/api's
 * `DbModule`, but the tokens are exported here so any lib (e.g.
 * `@sintezaur/auth`) can `@Inject(DATABASE)` without depending on
 * the api app.
 */
export const DATABASE = Symbol('SINTEZAUR_DATABASE');
export const DATABASE_POOL = Symbol('SINTEZAUR_DATABASE_POOL');
