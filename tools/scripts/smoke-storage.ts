/**
 * Smoke check for the M7 storage layer.
 *
 * Exercises a put / exists / get / delete round-trip on whichever
 * driver `STORAGE_DRIVER` selects (defaults to local). Verifies the
 * `storage_limits` seed landed and prints the active limits.
 *
 * Run with:  pnpm tsx tools/scripts/smoke-storage.ts
 *
 * Exits non-zero on any check failure. Side-effect free: every key
 * written is deleted again at the end.
 */
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { randomBytes } from 'node:crypto';
import { LocalStorageDriver } from '../../apps/api/src/app/storage/local-storage.driver';
import { S3StorageDriver } from '../../apps/api/src/app/storage/s3-storage.driver';
import type { StorageDriver } from '@sintezaur/shared';

function selectDriver(config: ConfigService): StorageDriver {
  const flavor = (process.env.STORAGE_DRIVER ?? 'local').toLowerCase();
  if (flavor === 's3') return new S3StorageDriver(config);
  return new LocalStorageDriver(config);
}

async function checkDriver(driver: StorageDriver): Promise<void> {
  const key = `tezaur/_smoke/${Date.now()}-${randomBytes(4).toString('hex')}.bin`;
  const body = Buffer.from('sintezaur-m7-smoke');

  process.stdout.write(`[smoke] put ${key}... `);
  const put = await driver.put({
    key,
    body,
    contentType: 'application/octet-stream',
  });
  if (put.size !== body.byteLength) {
    throw new Error(`put.size=${put.size} != ${body.byteLength}`);
  }
  process.stdout.write('ok\n');

  process.stdout.write('[smoke] exists... ');
  if (!(await driver.exists(key))) throw new Error('exists() returned false');
  process.stdout.write('ok\n');

  process.stdout.write('[smoke] get... ');
  const fetched = await driver.get(key);
  if (!fetched.equals(body)) throw new Error('get() returned different bytes');
  process.stdout.write('ok\n');

  process.stdout.write(`[smoke] url => ${driver.url(key)}\n`);

  process.stdout.write('[smoke] delete... ');
  await driver.delete(key);
  if (await driver.exists(key)) {
    throw new Error('still exists after delete()');
  }
  process.stdout.write('ok\n');
}

async function checkLimitsSeed(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    process.stdout.write(
      '[smoke] DATABASE_URL not set — skipping limits-seed check\n',
    );
    return;
  }
  const pool = new Pool({ connectionString: url });
  try {
    const { rows } = await pool.query<{
      scope: string;
      file_type: string;
      module: string;
      max_bytes: string;
    }>(
      'SELECT scope, file_type, module, max_bytes FROM storage_limits ORDER BY scope, file_type, module',
    );
    if (rows.length === 0) {
      throw new Error('storage_limits is empty — seed migration did not run');
    }
    process.stdout.write(`[smoke] storage_limits seeded: ${rows.length} rows\n`);
    for (const r of rows) {
      const mb = (Number(r.max_bytes) / 1024 / 1024).toFixed(0);
      process.stdout.write(
        `  ${r.scope.padEnd(28)} ${r.file_type.padEnd(6)} ${r.module.padEnd(8)} ${mb} MB\n`,
      );
    }
  } finally {
    await pool.end();
  }
}

async function main(): Promise<void> {
  const config = new ConfigService();
  const driver = selectDriver(config);
  process.stdout.write(
    `[smoke] driver = ${driver.constructor.name}\n`,
  );
  await checkDriver(driver);
  await checkLimitsSeed();
  process.stdout.write('[smoke] all checks ok\n');
}

main().catch((err) => {
  console.error('[smoke] FAILED:', err);
  process.exit(1);
});
