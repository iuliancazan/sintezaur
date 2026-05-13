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
};
