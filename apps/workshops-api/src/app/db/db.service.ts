import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../db/schema';

@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly pool: Pool;
  readonly db: NodePgDatabase<typeof schema>;

  constructor() {
    const databaseUrl = process.env.WORKSHOPS_DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('WORKSHOPS_DATABASE_URL is not set.');
    }
    this.pool = new Pool({ connectionString: databaseUrl, max: 10 });
    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
