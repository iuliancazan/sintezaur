/**
 * Sentry init for the worker process. Mirror of `apps/api/src/instrument.ts`
 * — imported first in `main.ts` so the SDK installs its global handlers
 * before pg-boss starts firing jobs.
 */
import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN?.trim();
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? 'production',
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    /** Tag every event so the dashboard can split api vs worker errors. */
    initialScope: { tags: { service: 'worker' } },
  });
}
