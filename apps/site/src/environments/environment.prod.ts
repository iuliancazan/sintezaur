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
   * Cloudflare R2 custom domain — mirrors the API's
   * `STORAGE_PUBLIC_BASE_URL` so the FE can resolve storage keys even
   * if the `GET /config` bootstrap fetch fails. If you cut over to a
   * different CDN in Coolify, update both this constant and the env
   * var on the api service.
   */
  imageBaseUrl: 'https://files.sintezaur.ro',
  /**
   * Umami Cloud — populate before production build. Both required for
   * the tracker to activate at runtime; leaving either empty makes
   * `UmamiService` a no-op.
   */
  umamiWebsiteId: '',
  umamiScriptUrl: '',
};
