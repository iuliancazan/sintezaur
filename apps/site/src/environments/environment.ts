/**
 * Default (development) environment.
 *
 * Replaced at production build time by `environment.prod.ts` via the
 * `fileReplacements` configuration in `apps/site/project.json`.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api',
  adminDashboardUrl: 'http://localhost:4201',
  /**
   * Storage public base URL — fallback used until the
   * `AppConfigService.bootstrap()` fetch lands. Mirrors the BE's
   * `STORAGE_PUBLIC_BASE_URL` for the active driver: `/uploads` on the
   * API host for local storage, the R2 custom domain in prod.
   */
  imageBaseUrl: 'http://localhost:3000/uploads',
  /**
   * Umami Cloud — both fields required for tracking. Leave empty on
   * dev so the `UmamiService` becomes a no-op. Replace at build time
   * via `environment.prod.ts` for production.
   */
  umamiWebsiteId: '',
  umamiScriptUrl: '',
};
