import { Controller, Get } from '@nestjs/common';

/**
 * Liveness probe for Coolify (and any other orchestrator). Periodic
 * GET; if it ever returns non-2xx or times out the container is
 * restarted.
 *
 * Kept deliberately simple — does NOT touch the DB. A failing DB
 * shouldn't restart-loop the container; that's a separate concern
 * (readiness probe, future).
 */
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
