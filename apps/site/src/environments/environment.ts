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
   * Umami Cloud — both fields required for tracking. Leave empty on
   * dev so the `UmamiService` becomes a no-op. Replace at build time
   * via `environment.prod.ts` for production.
   */
  umamiWebsiteId: '',
  umamiScriptUrl: '',
};
