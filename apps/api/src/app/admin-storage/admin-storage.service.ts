import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DATABASE,
  storageEvents,
  storageFolderStats,
  storageLimits,
  userUploadQuota,
  users,
  type SintezaurDb,
  type StorageModuleValue,
} from '@sintezaur/db';
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import PgBoss from 'pg-boss';
import { StorageLimitsService } from '../storage/storage-limits.service';

export interface AdminLimitRow {
  id: string;
  scope: 'per_file' | 'per_user_daily' | 'per_user_lifetime_alert';
  fileType: 'image' | 'audio' | 'pdf' | 'zip' | '*';
  module: StorageModuleValue;
  maxBytes: number;
  updatedAt: string;
  updatedByUserId: string | null;
  updatedByUsername: string | null;
}

export interface AdminOverview {
  totalBytes: number;
  totalEvents: number;
  perModule: Array<{ module: StorageModuleValue; bytes: number; events: number }>;
  perFileType: Array<{ fileType: string; bytes: number; events: number }>;
}

export interface AdminFolderRow {
  module: StorageModuleValue;
  resourceId: string;
  totalBytes: number;
  fileCount: number;
  updatedAt: string;
}

export interface AdminTrendsPoint {
  bucket: string;
  bytes: number;
  events: number;
}

export interface AdminTopUserRow {
  userId: string;
  username: string | null;
  bytes: number;
  events: number;
}

type Granularity = 'day' | 'week' | 'month';
const GRANULARITY_TRUNC: Record<Granularity, string> = {
  day: 'day',
  week: 'week',
  month: 'month',
};

/**
 * Admin-side aggregations on top of `storage_events` +
 * `storage_folder_stats`. Every query hits Postgres only — never R2 —
 * so the dashboard stays snappy and free of API spend.
 *
 * Limits edits invalidate `StorageLimitsService` cache so changes
 * propagate within the same request cycle.
 */
@Injectable()
export class AdminStorageService {
  private readonly logger = new Logger(AdminStorageService.name);

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly limitsCache: StorageLimitsService,
    private readonly config: ConfigService,
  ) {}

  async listLimits(): Promise<AdminLimitRow[]> {
    const rows = await this.db
      .select({
        id: storageLimits.id,
        scope: storageLimits.scope,
        fileType: storageLimits.fileType,
        module: storageLimits.module,
        maxBytes: storageLimits.maxBytes,
        updatedAt: storageLimits.updatedAt,
        updatedById: storageLimits.updatedBy,
        updatedByUsername: users.username,
      })
      .from(storageLimits)
      .leftJoin(users, eq(users.id, storageLimits.updatedBy))
      .orderBy(
        asc(storageLimits.scope),
        asc(storageLimits.fileType),
        asc(storageLimits.module),
      );
    return rows.map((r) => ({
      id: r.id,
      scope: r.scope,
      fileType: r.fileType,
      module: r.module,
      maxBytes: Number(r.maxBytes),
      updatedAt: r.updatedAt.toISOString(),
      updatedByUserId: r.updatedById,
      updatedByUsername: r.updatedByUsername,
    }));
  }

  async updateLimit(
    id: string,
    maxBytes: number,
    actorId: string,
  ): Promise<AdminLimitRow> {
    if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
      throw new BadRequestException('max_bytes trebuie să fie un număr > 0');
    }
    const [updated] = await this.db
      .update(storageLimits)
      .set({ maxBytes, updatedAt: new Date(), updatedBy: actorId })
      .where(eq(storageLimits.id, id))
      .returning({ id: storageLimits.id });
    if (!updated) throw new NotFoundException(`limit ${id} inexistent`);
    this.limitsCache.invalidate();
    const all = await this.listLimits();
    const row = all.find((r) => r.id === id);
    if (!row) throw new NotFoundException(`limit ${id} inexistent post-update`);
    return row;
  }

  async overview(): Promise<AdminOverview> {
    const totals = await this.db
      .select({
        bytes: sql<string>`coalesce(sum(${storageEvents.bytes}), 0)`,
        events: sql<number>`count(*)::int`,
      })
      .from(storageEvents);
    const perModule = await this.db
      .select({
        module: storageEvents.module,
        bytes: sql<string>`coalesce(sum(${storageEvents.bytes}), 0)`,
        events: sql<number>`count(*)::int`,
      })
      .from(storageEvents)
      .groupBy(storageEvents.module);
    const perFileType = await this.db
      .select({
        fileType: storageEvents.fileType,
        bytes: sql<string>`coalesce(sum(${storageEvents.bytes}), 0)`,
        events: sql<number>`count(*)::int`,
      })
      .from(storageEvents)
      .groupBy(storageEvents.fileType);
    return {
      totalBytes: Number(totals[0]?.bytes ?? 0),
      totalEvents: Number(totals[0]?.events ?? 0),
      perModule: perModule.map((r) => ({
        module: r.module,
        bytes: Number(r.bytes),
        events: r.events,
      })),
      perFileType: perFileType.map((r) => ({
        fileType: r.fileType,
        bytes: Number(r.bytes),
        events: r.events,
      })),
    };
  }

  async folders(opts: {
    module?: StorageModuleValue;
    limit?: number;
  }): Promise<AdminFolderRow[]> {
    const limit = Math.min(opts.limit ?? 50, 200);
    const conds = [];
    if (opts.module) conds.push(eq(storageFolderStats.module, opts.module));
    const rows = await this.db
      .select()
      .from(storageFolderStats)
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(storageFolderStats.totalBytes))
      .limit(limit);
    return rows.map((r) => ({
      module: r.module,
      resourceId: r.resourceId,
      totalBytes: Number(r.totalBytes),
      fileCount: r.fileCount,
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async trends(opts: {
    granularity?: Granularity;
    from?: string;
    to?: string;
  }): Promise<AdminTrendsPoint[]> {
    const granularity = opts.granularity ?? 'day';
    const truncUnit = GRANULARITY_TRUNC[granularity];
    if (!truncUnit) {
      throw new BadRequestException(`granularitate necunoscută: ${granularity}`);
    }
    const conds = [];
    if (opts.from) {
      const d = this.parseDate(opts.from, 'from');
      conds.push(gte(storageEvents.createdAt, d));
    }
    if (opts.to) {
      const d = this.parseDate(opts.to, 'to');
      conds.push(lte(storageEvents.createdAt, d));
    }
    const truncExpr = sql<string>`date_trunc(${truncUnit}, ${storageEvents.createdAt})`;
    const rows = await this.db
      .select({
        bucket: truncExpr,
        bytes: sql<string>`coalesce(sum(${storageEvents.bytes}), 0)`,
        events: sql<number>`count(*)::int`,
      })
      .from(storageEvents)
      .where(conds.length > 0 ? and(...conds) : undefined)
      .groupBy(truncExpr)
      .orderBy(truncExpr);
    return rows.map((r) => ({
      bucket: this.toIsoBucket(r.bucket),
      bytes: Number(r.bytes),
      events: r.events,
    }));
  }

  async topUsers(opts: {
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<AdminTopUserRow[]> {
    const limit = Math.min(opts.limit ?? 25, 100);
    const conds = [];
    if (opts.from) {
      conds.push(gte(storageEvents.createdAt, this.parseDate(opts.from, 'from')));
    }
    if (opts.to) {
      conds.push(lte(storageEvents.createdAt, this.parseDate(opts.to, 'to')));
    }
    const rows = await this.db
      .select({
        userId: storageEvents.userId,
        username: users.username,
        bytes: sql<string>`coalesce(sum(${storageEvents.bytes}), 0)`,
        events: sql<number>`count(*)::int`,
      })
      .from(storageEvents)
      .leftJoin(users, eq(users.id, storageEvents.userId))
      .where(
        conds.length > 0
          ? and(sql`${storageEvents.userId} IS NOT NULL`, ...conds)
          : sql`${storageEvents.userId} IS NOT NULL`,
      )
      .groupBy(storageEvents.userId, users.username)
      .orderBy(desc(sql`sum(${storageEvents.bytes})`))
      .limit(limit);
    return rows.map((r) => ({
      userId: r.userId ?? '',
      username: r.username,
      bytes: Number(r.bytes),
      events: r.events,
    }));
  }

  /**
   * Manual on-demand trigger for the nightly reconciliation job. Just
   * enqueues a one-shot `storage:reconcile` so the worker picks it up;
   * doesn't block the request thread.
   */
  async triggerReconcile(): Promise<{ jobId: string | null }> {
    const url = this.config.getOrThrow<string>('DATABASE_URL');
    const boss = new PgBoss({ connectionString: url, schema: 'pgboss' });
    try {
      await boss.start();
      const jobId = await boss.send('storage:reconcile', {});
      return { jobId };
    } finally {
      await boss.stop({ graceful: false });
    }
  }

  /**
   * Quick admin-side counter dump for the user-detail drawer. Returns
   * the user's daily + lifetime counters plus their notified-at stamp.
   */
  async getUserQuota(userId: string) {
    const [row] = await this.db
      .select()
      .from(userUploadQuota)
      .where(eq(userUploadQuota.userId, userId))
      .limit(1);
    if (!row) {
      return {
        userId,
        dailyBytes: 0,
        lifetimeBytes: 0,
        lastResetAt: null as string | null,
        notifiedLifetimeAt: null as string | null,
      };
    }
    return {
      userId,
      dailyBytes: Number(row.dailyBytes),
      lifetimeBytes: Number(row.lifetimeBytes),
      lastResetAt: row.lastResetAt.toISOString(),
      notifiedLifetimeAt: row.notifiedLifetimeAt
        ? row.notifiedLifetimeAt.toISOString()
        : null,
    };
  }

  private parseDate(raw: string, label: string): Date {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`${label} invalid: ${raw}`);
    }
    return d;
  }

  private toIsoBucket(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
      return value;
    }
    return String(value);
  }
}
