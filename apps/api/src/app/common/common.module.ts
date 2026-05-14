import { Global, Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { StorageService } from './storage.service';

/**
 * Global services consumed by both Tezaur (M2) and Bazar (M3) — image
 * pipeline + audit log. Promoted from `apps/api/src/app/tezaur/` so
 * BazarModule doesn't have to depend on TezaurModule for either.
 *
 * `@Global()` so any feature module gets these without explicit `imports`.
 */
@Global()
@Module({
  providers: [StorageService, AuditLogService],
  exports: [StorageService, AuditLogService],
})
export class CommonModule {}
