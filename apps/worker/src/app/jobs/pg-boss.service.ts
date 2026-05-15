import {
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PgBoss from 'pg-boss';
import { BadgeSweepJob } from './badge-sweep.job';
import { ListingExpiryJob } from './listing-expiry.job';
import { ListingExpiringSoonJob } from './listing-expiring-soon.job';
import { ListingCleanupJob } from './listing-cleanup.job';
import { StorageDailyResetJob } from './storage-daily-reset.job';
import { StorageReconcileJob } from './storage-reconcile.job';

export const PG_BOSS = Symbol.for('PG_BOSS');

@Injectable()
export class PgBossService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(PgBossService.name);
  private boss: PgBoss | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly expiry: ListingExpiryJob,
    private readonly expiringSoon: ListingExpiringSoonJob,
    private readonly cleanup: ListingCleanupJob,
    private readonly badgeSweep: BadgeSweepJob,
    private readonly storageDailyReset: StorageDailyResetJob,
    private readonly storageReconcile: StorageReconcileJob,
  ) {}

  async onModuleInit() {
    const url = this.config.getOrThrow<string>('DATABASE_URL');
    this.boss = new PgBoss({
      connectionString: url,
      schema: 'pgboss',
    });
    this.boss.on('error', (err) =>
      this.logger.error(`pg-boss error: ${err.message}`),
    );
    await this.boss.start();
    this.logger.log('pg-boss started');

    // Register handlers (idempotent across worker restarts).
    await this.boss.work('listing:expire', () => this.expiry.run());
    await this.boss.work('listing:expiring-soon', () =>
      this.expiringSoon.run(),
    );
    await this.boss.work('listing:cleanup', () => this.cleanup.run());
    await this.boss.work('badges:sweep', () => this.badgeSweep.run());
    await this.boss.work('storage:reset-daily-quota', () =>
      this.storageDailyReset.run(),
    );
    await this.boss.work('storage:reconcile', () =>
      this.storageReconcile.run(),
    );

    // Schedule daily crons. pg-boss uses node-cron syntax (min hr dom mon dow).
    // Times below in UTC; daily window before Romanian morning traffic.
    await this.boss.schedule('storage:reset-daily-quota', '0 0 * * *');
    await this.boss.schedule('storage:reconcile', '0 3 * * *');
    await this.boss.schedule('listing:expire', '15 3 * * *');
    await this.boss.schedule('listing:expiring-soon', '30 3 * * *');
    await this.boss.schedule('listing:cleanup', '45 3 * * *');
    await this.boss.schedule('badges:sweep', '0 4 * * *');
    this.logger.log(
      'crons scheduled (storage 00:00/03:00 + listings 03:15/03:30/03:45 + badges 04:00 UTC)',
    );
  }

  async onApplicationShutdown() {
    if (this.boss) {
      await this.boss.stop({ graceful: true });
      this.boss = null;
    }
  }
}
