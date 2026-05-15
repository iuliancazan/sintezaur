import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type {
  StorageDriver,
  StoragePutInput,
  StoragePutResult,
} from '@sintezaur/shared';

/**
 * LocalStorageDriver — disk-backed driver for dev + CI.
 *
 * Files live under `UPLOADS_DIR` (default `./storage/uploads`). Public
 * URLs are built off `STORAGE_PUBLIC_BASE_URL` (default
 * `http://localhost:3000/uploads`) so the existing `useStaticAssets`
 * route at `/uploads/<key>` keeps serving them.
 *
 * Cache headers passed via `cacheControl` are *not* honored by the
 * static middleware — that's a known gap until M7-C reroutes serving
 * through a hashed-asset controller. Production never uses this driver.
 */
@Injectable()
export class LocalStorageDriver implements StorageDriver {
  private readonly logger = new Logger(LocalStorageDriver.name);
  private readonly root: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.root = resolve(
      process.cwd(),
      this.config.get<string>('UPLOADS_DIR') ?? './storage/uploads',
    );
    this.publicBaseUrl = (
      this.config.get<string>('STORAGE_PUBLIC_BASE_URL') ??
      'http://localhost:3000/uploads'
    ).replace(/\/+$/, '');
  }

  async put(input: StoragePutInput): Promise<StoragePutResult> {
    LocalStorageDriver.assertSafeKey(input.key);
    const abs = join(this.root, input.key);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, input.body);
    return { key: input.key, size: input.body.byteLength };
  }

  async get(key: string): Promise<Buffer> {
    LocalStorageDriver.assertSafeKey(key);
    return readFile(join(this.root, key));
  }

  async delete(key: string): Promise<void> {
    LocalStorageDriver.assertSafeKey(key);
    try {
      await unlink(join(this.root, key));
    } catch (err) {
      this.logger.warn(
        `unlink ${key} failed: ${(err as Error).message}`,
      );
    }
  }

  async exists(key: string): Promise<boolean> {
    LocalStorageDriver.assertSafeKey(key);
    try {
      await stat(join(this.root, key));
      return true;
    } catch {
      return false;
    }
  }

  url(key: string): string {
    LocalStorageDriver.assertSafeKey(key);
    return `${this.publicBaseUrl}/${key}`;
  }

  /**
   * Guard against `..` traversal in object keys. Keys are server-built
   * (module / resource-id / hash) so this should never fire in practice
   * — defense in depth against future refactors.
   */
  private static assertSafeKey(key: string): void {
    if (
      !key ||
      key.startsWith('/') ||
      key.includes('..') ||
      key.includes('\0')
    ) {
      throw new Error(`Unsafe storage key: ${key}`);
    }
  }
}
