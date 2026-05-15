import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { SentryModule } from '@sentry/nestjs/setup';
import {
  DATABASE,
  DATABASE_POOL,
  createDatabase,
  createPool,
  type SintezaurDb,
} from '@sintezaur/db';
import type { Pool } from 'pg';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BadgeSweepJob } from './jobs/badge-sweep.job';
import { ListingCleanupJob } from './jobs/listing-cleanup.job';
import { ListingExpiringSoonJob } from './jobs/listing-expiring-soon.job';
import { ListingExpiryJob } from './jobs/listing-expiry.job';
import { PgBossService } from './jobs/pg-boss.service';
import { PgDumpBackupJob } from './jobs/pg-dump.job';
import { StorageDailyResetJob } from './jobs/storage-daily-reset.job';
import { StorageReconcileJob } from './jobs/storage-reconcile.job';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.LOG_FORMAT === 'pretty'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: DATABASE_POOL,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService): Pool => {
        const connectionString = cfg.getOrThrow<string>('DATABASE_URL');
        const max = Number(cfg.get('DATABASE_POOL_MAX') ?? 4);
        return createPool({ connectionString, max });
      },
    },
    {
      provide: DATABASE,
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool): SintezaurDb => createDatabase(pool),
    },
    ListingExpiryJob,
    ListingExpiringSoonJob,
    ListingCleanupJob,
    BadgeSweepJob,
    StorageDailyResetJob,
    StorageReconcileJob,
    PgDumpBackupJob,
    PgBossService,
  ],
})
export class AppModule {}
