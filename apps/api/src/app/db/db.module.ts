import {
  Global,
  Inject,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  DATABASE,
  DATABASE_POOL,
  createDatabase,
  createPool,
  type SintezaurDb,
} from '@sintezaur/db';
import type { Pool } from 'pg';

// Re-export so app-side imports can `from './db/db.module'` for the
// tokens without depending on @sintezaur/db directly. Ownership of
// the symbols stays with @sintezaur/db so libs that need to inject
// (e.g. @sintezaur/auth) don't depend on this app.
export { DATABASE, DATABASE_POOL };

/**
 * Global module that owns the singleton pg Pool and a Drizzle SintezaurDb
 * built from it. Pool is closed on application shutdown.
 *
 * Inject via `@Inject(DATABASE) db: SintezaurDb`.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Pool => {
        const connectionString = config.getOrThrow<string>('DATABASE_URL');
        const max = Number(config.get('DATABASE_POOL_MAX') ?? 20);
        return createPool({ connectionString, max });
      },
    },
    {
      provide: DATABASE,
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool): SintezaurDb => createDatabase(pool),
    },
  ],
  exports: [DATABASE, DATABASE_POOL],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
