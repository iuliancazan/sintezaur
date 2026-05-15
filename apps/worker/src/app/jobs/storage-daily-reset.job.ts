import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DATABASE,
  userUploadQuota,
  type SintezaurDb,
} from '@sintezaur/db';
import { gt } from 'drizzle-orm';

/**
 * Nightly job at 00:00 UTC — zeroes the per-user daily upload counter
 * so the next UTC day starts with a fresh quota window. spec §M7.
 *
 * Only resets rows where `daily_bytes > 0` so the UPDATE is cheap and
 * doesn't churn timestamps on dormant users.
 */
@Injectable()
export class StorageDailyResetJob {
  private readonly logger = new Logger(StorageDailyResetJob.name);

  constructor(@Inject(DATABASE) private readonly db: SintezaurDb) {}

  async run(): Promise<{ reset: number }> {
    const result = await this.db
      .update(userUploadQuota)
      .set({ dailyBytes: 0, lastResetAt: new Date() })
      .where(gt(userUploadQuota.dailyBytes, 0))
      .returning({ userId: userUploadQuota.userId });
    if (result.length > 0)
      this.logger.log(`daily quota reset for ${result.length} users`);
    return { reset: result.length };
  }
}
