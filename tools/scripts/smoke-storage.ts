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
import { detectFileType } from '../../apps/api/src/app/storage/file-type-detector';
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

function checkMagicBytes(): void {
  const cases: Array<{ name: string; bytes: number[]; expect: string }> = [
    { name: 'JPEG', bytes: [0xff, 0xd8, 0xff, 0xe0, 0x00], expect: 'image' },
    {
      name: 'PNG',
      bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00],
      expect: 'image',
    },
    {
      name: 'WebP',
      bytes: [
        0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ],
      expect: 'image',
    },
    {
      name: 'MP3 (ID3v2)',
      bytes: [0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00],
      expect: 'audio',
    },
    { name: 'MP3 (frame sync)', bytes: [0xff, 0xfb, 0x90, 0x00], expect: 'audio' },
    {
      name: 'WAV',
      bytes: [
        0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
      ],
      expect: 'audio',
    },
    {
      name: 'OGG',
      bytes: [0x4f, 0x67, 0x67, 0x53, 0x00],
      expect: 'audio',
    },
    { name: 'PDF', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31], expect: 'pdf' },
    { name: 'ZIP', bytes: [0x50, 0x4b, 0x03, 0x04, 0x14], expect: 'zip' },
    { name: 'unknown', bytes: [0x00, 0x00, 0x00, 0x00], expect: 'null' },
  ];
  for (const c of cases) {
    const buf = Buffer.from(c.bytes);
    const got = detectFileType(buf);
    const gotLabel = got ? got.fileType : 'null';
    if (gotLabel !== c.expect) {
      throw new Error(
        `magic-byte ${c.name}: expected ${c.expect}, got ${gotLabel}`,
      );
    }
    process.stdout.write(`[smoke] magic-byte ${c.name} → ${gotLabel}\n`);
  }
}

async function main(): Promise<void> {
  const config = new ConfigService();
  const driver = selectDriver(config);
  process.stdout.write(
    `[smoke] driver = ${driver.constructor.name}\n`,
  );
  await checkDriver(driver);
  checkMagicBytes();
  await checkLimitsSeed();
  process.stdout.write('[smoke] all checks ok\n');
}

main().catch((err) => {
  console.error('[smoke] FAILED:', err);
  process.exit(1);
});
