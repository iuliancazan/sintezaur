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
};
