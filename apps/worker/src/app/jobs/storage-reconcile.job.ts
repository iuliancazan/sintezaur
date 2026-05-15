import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ListObjectsV2Command,
  S3Client,
  type _Object as S3Object,
} from '@aws-sdk/client-s3';
import {
  DATABASE,
  storageEvents,
  type SintezaurDb,
  type StorageModuleValue,
} from '@sintezaur/db';
import { eq, sql } from 'drizzle-orm';

const MODULES: StorageModuleValue[] = [
  'tezaur',
  'bazar',
  'revista',
  'forum',
  'avatar',
];

const DRIFT_THRESHOLD_BYTES = 1 * 1024 * 1024; // 1 MB

/**
 * Nightly job at 03:00 UTC — walks the R2 bucket per module prefix
 * and compares the total bytes against `storage_events` aggregate.
 * Logs drift > 1 MB and emits a structured `reconcile_summary`
 * entry per module so admins can monitor in M7-D.
 *
 * No-op when `STORAGE_DRIVER!=s3` — the local driver has no remote
 * to reconcile against. Throttled: paginates ListObjectsV2 with
 * 1000 keys/page and a 200 ms sleep between pages so a 100k-object
 * bucket stays well under R2's free-tier API quotas.
 */
@Injectable()
export class StorageReconcileJob {
  private readonly logger = new Logger(StorageReconcileJob.name);

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly config: ConfigService,
  ) {}

  async run(): Promise<{
    skipped: boolean;
    drifts: Array<{ module: StorageModuleValue; remote: number; local: number; diff: number }>;
  }> {
    const flavor = (this.config.get<string>('STORAGE_DRIVER') ?? 'local')
      .toLowerCase()
      .trim();
    if (flavor !== 's3') {
      this.logger.log('STORAGE_DRIVER != s3 — skipping reconciliation');
      return { skipped: true, drifts: [] };
    }

    const client = this.buildS3Client();
    const bucket = this.config.getOrThrow<string>('R2_BUCKET');

    const drifts: Array<{
      module: StorageModuleValue;
      remote: number;
      local: number;
      diff: number;
    }> = [];

    for (const module of MODULES) {
      const remote = await this.sumRemote(client, bucket, `${module}/`);
      const local = await this.sumLocal(module);
      const diff = Math.abs(remote - local);
      if (diff > DRIFT_THRESHOLD_BYTES) {
        this.logger.warn(
          `reconcile drift ${module}: remote=${remote} local=${local} diff=${diff}`,
        );
        drifts.push({ module, remote, local, diff });
      } else {
        this.logger.log(
          `reconcile ${module}: remote=${remote} local=${local} (within tolerance)`,
        );
      }
    }
    return { skipped: false, drifts };
  }

  private buildS3Client(): S3Client {
    return new S3Client({
      region: 'auto',
      endpoint: this.config.getOrThrow<string>('R2_ENDPOINT'),
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
      },
      forcePathStyle: false,
    });
  }

  private async sumRemote(
    client: S3Client,
    bucket: string,
    prefix: string,
  ): Promise<number> {
    let total = 0;
    let continuationToken: string | undefined;
    do {
      const res = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        }),
      );
      for (const obj of (res.Contents ?? []) as S3Object[]) {
        total += Number(obj.Size ?? 0);
      }
      continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
      if (continuationToken) {
        await new Promise((r) => setTimeout(r, 200));
      }
    } while (continuationToken);
    return total;
  }

  private async sumLocal(module: StorageModuleValue): Promise<number> {
    const [row] = await this.db
      .select({ sum: sql<string>`coalesce(sum(${storageEvents.bytes}), 0)` })
      .from(storageEvents)
      .where(eq(storageEvents.module, module));
    return Number(row?.sum ?? 0);
  }
}
