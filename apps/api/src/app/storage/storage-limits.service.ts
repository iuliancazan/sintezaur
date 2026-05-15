import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DATABASE,
  storageLimits,
  type SintezaurDb,
  type StorageFileTypeValue,
  type StorageLimitScope,
  type StorageModuleValue,
} from '@sintezaur/db';

interface CachedRow {
  scope: StorageLimitScope;
  fileType: StorageFileTypeValue;
  module: StorageModuleValue;
  maxBytes: number;
}

export interface SerializedLimit {
  id: string;
  scope: StorageLimitScope;
  fileType: StorageFileTypeValue;
  module: StorageModuleValue;
  maxBytes: number;
  updatedAt: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Single source of truth for upload size caps.
 *
 * Reads `storage_limits` and serves lookups with a wildcard fallback —
 * an exact `(scope, file_type, module)` row wins, else
 * `(scope, file_type, *)`, else `(scope, *, module)`, else
 * `(scope, *, *)`. Returns `null` if nothing matches.
 *
 * Cached in-memory for 5 minutes. Admin edits in M7-D invalidate the
 * cache by calling `invalidate()`. The cache is per-process — that's
 * fine for a single-API setup; multi-API would need a Redis pub/sub
 * which we explicitly don't have (see project tech decisions).
 */
@Injectable()
export class StorageLimitsService {
  private readonly logger = new Logger(StorageLimitsService.name);
  private cache: CachedRow[] = [];
  private cacheLoadedAt = 0;

  constructor(@Inject(DATABASE) private readonly db: SintezaurDb) {}

  invalidate(): void {
    this.cacheLoadedAt = 0;
  }

  async getMaxBytes(
    scope: StorageLimitScope,
    fileType: StorageFileTypeValue,
    module: StorageModuleValue,
  ): Promise<number | null> {
    const rows = await this.load();
    const candidates: Array<[StorageFileTypeValue, StorageModuleValue]> = [
      [fileType, module],
      [fileType, '*'],
      ['*', module],
      ['*', '*'],
    ];
    for (const [ft, mod] of candidates) {
      const hit = rows.find(
        (r) => r.scope === scope && r.fileType === ft && r.module === mod,
      );
      if (hit) return hit.maxBytes;
    }
    return null;
  }

  /** Snapshot for the public `GET /api/storage/limits` endpoint. */
  async list(): Promise<SerializedLimit[]> {
    const rows = await this.db
      .select({
        id: storageLimits.id,
        scope: storageLimits.scope,
        fileType: storageLimits.fileType,
        module: storageLimits.module,
        maxBytes: storageLimits.maxBytes,
        updatedAt: storageLimits.updatedAt,
      })
      .from(storageLimits)
      .orderBy(
        storageLimits.scope,
        storageLimits.fileType,
        storageLimits.module,
      );
    return rows.map((r) => ({
      id: r.id,
      scope: r.scope,
      fileType: r.fileType,
      module: r.module,
      maxBytes: Number(r.maxBytes),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  private async load(): Promise<CachedRow[]> {
    const now = Date.now();
    if (this.cache.length > 0 && now - this.cacheLoadedAt < CACHE_TTL_MS) {
      return this.cache;
    }
    const rows = await this.db
      .select({
        scope: storageLimits.scope,
        fileType: storageLimits.fileType,
        module: storageLimits.module,
        maxBytes: storageLimits.maxBytes,
      })
      .from(storageLimits);
    this.cache = rows.map((r) => ({
      scope: r.scope,
      fileType: r.fileType,
      module: r.module,
      maxBytes: Number(r.maxBytes),
    }));
    this.cacheLoadedAt = now;
    this.logger.debug(
      `storage_limits cache refreshed: ${this.cache.length} rows`,
    );
    return this.cache;
  }
}
