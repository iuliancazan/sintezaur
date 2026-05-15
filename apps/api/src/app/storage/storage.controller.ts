import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '@sintezaur/auth';
import { StorageLimitsService } from './storage-limits.service';

/**
 * Public read-only endpoints for the storage layer.
 *
 * `GET /api/storage/limits` exposes the current `storage_limits`
 * table so the frontend uploader can run a client-side pre-check
 * before posting bytes that would only get rejected by the
 * `UploadQuotaGuard`. The response carries a 5-min Cache-Control —
 * same TTL as the in-memory service cache, so admin edits propagate
 * within the same window.
 */
@Controller('storage')
export class StorageController {
  constructor(private readonly limits: StorageLimitsService) {}

  @Public()
  @Get('limits')
  @Header('Cache-Control', 'public, max-age=300')
  async getLimits() {
    return { items: await this.limits.list() };
  }
}
