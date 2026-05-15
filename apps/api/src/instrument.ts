/**
 * Sentry init — MUST be imported FIRST in `main.ts` (before any other
 * code that may throw or set up logging) so the SDK can wire its
 * global error handlers before NestJS bootstraps.
 *
 * No-op when `SENTRY_DSN` env is empty — dev + CI run with Sentry
 * disabled and no warnings; prod sets the env in Coolify.
 *
 * Per spec §M6 "Sentry (or Pino-based error aggregation) wired in
 * api + worker". `@sentry/nestjs` auto-wires the Nest exception
 * filter chain via `SentryModule.forRoot()`, but the init call has
 * to happen before `NestFactory.create()` to capture early-boot
 * errors.
 */
import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN?.trim();
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? 'production',
    release: process.env.SENTRY_RELEASE,
    // Tracing samples — 10% of requests at 1.0 noise level. Adjust
    // when traffic justifies more detail.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    // Profiling integration omitted on purpose — keeps the SDK
    // surface small. Enable when CPU-bound endpoints become a
    // concern.
  });
}
