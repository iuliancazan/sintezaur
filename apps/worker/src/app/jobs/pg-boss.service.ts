import {
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PgBoss from 'pg-boss';
import { ListingExpiryJob } from './listing-expiry.job';
import { ListingExpiringSoonJob } from './listing-expiring-soon.job';
import { ListingCleanupJob } from './listing-cleanup.job';

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

    // Schedule daily crons. pg-boss uses node-cron syntax (min hr dom mon dow).
    // Times below in UTC; daily window before Romanian morning traffic.
    await this.boss.schedule('listing:expire', '15 3 * * *');
    await this.boss.schedule('listing:expiring-soon', '30 3 * * *');
    await this.boss.schedule('listing:cleanup', '45 3 * * *');
    this.logger.log('listing crons scheduled (03:15 / 03:30 / 03:45 UTC)');
  }

  async onApplicationShutdown() {
    if (this.boss) {
      await this.boss.stop({ graceful: true });
      this.boss = null;
    }
  }
}
