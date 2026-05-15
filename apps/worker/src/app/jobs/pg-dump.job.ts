import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'node:child_process';
import { mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Daily `pg_dump` backup job per spec §M6 deliverable.
 *
 * Runs `pg_dump --format=custom --compress=9` to `BACKUP_DIR`
 * (default `./storage/backups`) with a timestamped filename. After
 * the dump succeeds, prunes any file older than
 * `BACKUP_RETAIN_DAYS` (default 14) days.
 *
 * Offsite sync (Hetzner Storage Box via rclone/rsync) is configured
 * separately on Coolify as an external cron — see
 * `docs/devops/backups.md`. This job only handles the local dump +
 * retention.
 *
 * Failures are logged but the job doesn't crash the worker — a
 * missed dump is recoverable from the previous night's file; the
 * Sentry handler captures the exception for paging.
 */
@Injectable()
export class PgDumpBackupJob {
  private readonly logger = new Logger(PgDumpBackupJob.name);

  constructor(private readonly config: ConfigService) {}

  async run(): Promise<{
    file: string | null;
    sizeBytes: number;
    pruned: number;
    skipped?: boolean;
  }> {
    const databaseUrl = this.config.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      this.logger.warn('DATABASE_URL not set — skipping pg_dump');
      return { file: null, sizeBytes: 0, pruned: 0, skipped: true };
    }
    const backupDir = resolve(
      process.cwd(),
      this.config.get<string>('BACKUP_DIR') ?? './storage/backups',
    );
    const retainDays = Math.max(
      Number(this.config.get('BACKUP_RETAIN_DAYS') ?? 14),
      1,
    );

    await mkdir(backupDir, { recursive: true });

    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .replace('Z', '');
    const file = join(backupDir, `sintezaur-${stamp}.dump`);

    this.logger.log(`pg_dump → ${file}`);
    await execAsync(
      `pg_dump --format=custom --compress=9 --file=${shellQuote(file)} ${shellQuote(databaseUrl)}`,
      { maxBuffer: 1024 * 1024 * 1024 }, // 1 GiB stdout cap (we use --file so stdout stays empty)
    );

    const st = await stat(file);
    this.logger.log(
      `pg_dump done: ${(st.size / 1024 / 1024).toFixed(1)} MB at ${file}`,
    );

    const pruned = await this.prune(backupDir, retainDays);
    if (pruned > 0) this.logger.log(`pruned ${pruned} old backup files`);

    return { file, sizeBytes: st.size, pruned };
  }

  private async prune(dir: string, retainDays: number): Promise<number> {
    let count = 0;
    const cutoff = Date.now() - retainDays * 24 * 60 * 60 * 1000;
    const files = await readdir(dir);
    for (const f of files) {
      if (!f.startsWith('sintezaur-') || !f.endsWith('.dump')) continue;
      const full = join(dir, f);
      const s = await stat(full);
      if (s.mtimeMs < cutoff) {
        await unlink(full);
        count++;
      }
    }
    return count;
  }
}

/**
 * Conservative shell-arg quoter — pg_dump path + connection string are
 * never user-supplied, but better safe than sorry on a process boundary.
 */
function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}
