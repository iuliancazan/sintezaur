/**
 * Production environment.
 *
 * Used by `nx build site --configuration=production` via the
 * `fileReplacements` configuration in `apps/site/project.json`.
 */
export const environment = {
  production: true,
  apiBaseUrl: 'https://api.sintezaur.ro/api',
  adminDashboardUrl: 'https://admin.sintezaur.ro',
  /**
   * Umami Cloud — populate before production build. Both required for
   * the tracker to activate at runtime; leaving either empty makes
   * `UmamiService` a no-op.
   */
  umamiWebsiteId: '',
  umamiScriptUrl: '',
};
