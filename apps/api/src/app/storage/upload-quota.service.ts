import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import {
  DATABASE,
  storageEvents,
  storageFolderStats,
  userRoles,
  userUploadQuota,
  type SintezaurDb,
  type StorageFileTypeValue,
  type StorageModuleValue,
} from '@sintezaur/db';
import { and, eq, sql } from 'drizzle-orm';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageLimitsService } from './storage-limits.service';

export interface QuotaCheckInput {
  userId: string;
  bytes: number;
  fileType: StorageFileTypeValue;
  module: StorageModuleValue;
}

export interface QuotaTrackInput {
  userId: string;
  module: StorageModuleValue;
  resourceId: string | null;
  purpose: string;
  objectKey: string;
  bytes: number;
  contentType: string;
  fileType: StorageFileTypeValue;
}

/**
 * Pre-upload checks + post-upload bookkeeping for the quota system.
 *
 * `check()` rejects with the right HTTP error class before a single
 * byte hits the driver: 413 if the file blows a per-file cap, 429 if
 * the user has already burned their daily window.
 *
 * `track()` runs once a put succeeds: bumps `user_upload_quota`
 * (daily + lifetime), upserts `storage_folder_stats`, appends to the
 * `storage_events` audit log, and fires a one-shot
 * `storage_quota_lifetime_reached` notification when the user crosses
 * the lifetime alert threshold for the first time.
 */
@Injectable()
export class UploadQuotaService {
  private readonly logger = new Logger(UploadQuotaService.name);

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly limits: StorageLimitsService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Enforce per-file + per-user-daily limits before accepting an
   * upload. Reads the user's current daily counters with a same-day
   * reset done lazily (the cron is the steady-state path; this is a
   * belt-and-braces guard).
   */
  async check(input: QuotaCheckInput): Promise<void> {
    const perFile = await this.limits.getMaxBytes(
      'per_file',
      input.fileType,
      input.module,
    );
    if (perFile !== null && input.bytes > perFile) {
      throw new PayloadTooLargeException(
        `Fișierul depășește limita de ${(perFile / 1024 / 1024).toFixed(0)} MB.`,
      );
    }

    const dailyCap = await this.limits.getMaxBytes(
      'per_user_daily',
      input.fileType,
      input.module,
    );
    if (dailyCap === null) return; // no daily cap configured

    const dailyUsed = await this.getDailyUsedBytes(input.userId);
    if (dailyUsed + input.bytes > dailyCap) {
      throw new HttpException(
        {
          statusCode: 429,
          message:
            'Ai atins limita zilnică de upload. Reîncearcă mâine sau șterge fișiere mai vechi.',
          dailyCapBytes: dailyCap,
          dailyUsedBytes: dailyUsed,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Record a successful put. Wrapped in a transaction so the counters
   * and event log can't drift if one of the writes fails halfway.
   */
  async track(input: QuotaTrackInput): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(storageEvents).values({
        userId: input.userId,
        module: input.module,
        resourceId: input.resourceId,
        purpose: input.purpose,
        objectKey: input.objectKey,
        bytes: input.bytes,
        contentType: input.contentType,
        fileType: input.fileType,
      });

      await tx
        .insert(userUploadQuota)
        .values({
          userId: input.userId,
          dailyBytes: input.bytes,
          lifetimeBytes: input.bytes,
        })
        .onConflictDoUpdate({
          target: userUploadQuota.userId,
          set: {
            dailyBytes: sql`${userUploadQuota.dailyBytes} + ${input.bytes}`,
            lifetimeBytes: sql`${userUploadQuota.lifetimeBytes} + ${input.bytes}`,
          },
        });

      if (input.resourceId) {
        await tx
          .insert(storageFolderStats)
          .values({
            module: input.module,
            resourceId: input.resourceId,
            totalBytes: input.bytes,
            fileCount: 1,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [storageFolderStats.module, storageFolderStats.resourceId],
            set: {
              totalBytes: sql`${storageFolderStats.totalBytes} + ${input.bytes}`,
              fileCount: sql`${storageFolderStats.fileCount} + 1`,
              updatedAt: new Date(),
            },
          });
      }
    });

    // Out of band — failing to notify must not roll back the upload.
    await this.maybeFireLifetimeAlert(input.userId);
  }

  /**
   * Reverse-apply the counters when an object is deleted. Used by
   * `deleteObjects()` so the storage_folder_stats stay accurate
   * without waiting for nightly reconciliation. Lifetime bytes are
   * NOT decremented — they represent "ever uploaded" for trust
   * purposes (the lifetime alert is one-shot anyway).
   */
  async untrack(
    module: StorageModuleValue,
    resourceId: string | null,
    bytes: number,
  ): Promise<void> {
    if (!resourceId || bytes <= 0) return;
    await this.db
      .update(storageFolderStats)
      .set({
        totalBytes: sql`greatest(${storageFolderStats.totalBytes} - ${bytes}, 0)`,
        fileCount: sql`greatest(${storageFolderStats.fileCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(storageFolderStats.module, module),
          eq(storageFolderStats.resourceId, resourceId),
        ),
      );
  }

  private async getDailyUsedBytes(userId: string): Promise<number> {
    const [row] = await this.db
      .select({
        dailyBytes: userUploadQuota.dailyBytes,
        lastResetAt: userUploadQuota.lastResetAt,
      })
      .from(userUploadQuota)
      .where(eq(userUploadQuota.userId, userId))
      .limit(1);

    if (!row) return 0;

    // Lazy reset: if the last reset is on a previous UTC day, treat
    // the daily counter as zero. The nightly cron does the canonical
    // reset; this is a safety net for the first request after
    // midnight when the cron is still queued.
    const lastReset = new Date(row.lastResetAt);
    const now = new Date();
    if (
      lastReset.getUTCFullYear() !== now.getUTCFullYear() ||
      lastReset.getUTCMonth() !== now.getUTCMonth() ||
      lastReset.getUTCDate() !== now.getUTCDate()
    ) {
      return 0;
    }
    return Number(row.dailyBytes);
  }

  private async maybeFireLifetimeAlert(userId: string): Promise<void> {
    const threshold = await this.limits.getMaxBytes(
      'per_user_lifetime_alert',
      '*',
      '*',
    );
    if (threshold === null) return;

    const [row] = await this.db
      .select({
        lifetimeBytes: userUploadQuota.lifetimeBytes,
        notifiedAt: userUploadQuota.notifiedLifetimeAt,
      })
      .from(userUploadQuota)
      .where(eq(userUploadQuota.userId, userId))
      .limit(1);

    if (!row || row.notifiedAt !== null) return;
    if (Number(row.lifetimeBytes) < threshold) return;

    const stamped = await this.db
      .update(userUploadQuota)
      .set({ notifiedLifetimeAt: new Date() })
      .where(
        and(
          eq(userUploadQuota.userId, userId),
          sql`${userUploadQuota.notifiedLifetimeAt} IS NULL`,
        ),
      )
      .returning({ id: userUploadQuota.userId });

    // Race condition guard — another concurrent track() may have won.
    if (stamped.length === 0) return;

    try {
      await this.notifications.post({
        recipientId: userId,
        kind: 'storage_quota_lifetime_reached',
        dedupKey: `storage-lifetime:${userId}`,
        targetType: 'user',
        targetId: userId,
        payload: {
          thresholdBytes: threshold,
          lifetimeBytes: Number(row.lifetimeBytes),
        },
      });

      // Fan out to every admin so storage usage gets a human review.
      const admins = await this.db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .where(eq(userRoles.role, 'admin'));
      for (const admin of admins) {
        await this.notifications.post({
          recipientId: admin.userId,
          kind: 'storage_quota_lifetime_reached',
          dedupKey: `storage-lifetime:${userId}:admin:${admin.userId}`,
          targetType: 'user',
          targetId: userId,
          payload: {
            thresholdBytes: threshold,
            lifetimeBytes: Number(row.lifetimeBytes),
            recipientUserId: userId,
          },
        });
      }
    } catch (err) {
      this.logger.warn(
        `lifetime-alert notify failed for ${userId}: ${(err as Error).message}`,
      );
    }
  }

}
