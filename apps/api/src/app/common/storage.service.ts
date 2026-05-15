import { Inject, Injectable, Logger } from '@nestjs/common';
import 'multer';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import {
  IMAGE_VARIANTS,
  IMAGE_VARIANT_SIZES,
  type ImageVariantLiteral,
  type StorageDriver,
} from '@sintezaur/shared';
import { STORAGE_DRIVER } from '../storage/storage-driver.token';

export interface ProcessedVariant {
  variant: ImageVariantLiteral;
  /** Driver-relative object key. Stored verbatim in DB `path` columns. */
  path: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
}

export interface ProcessedUpload {
  sourceId: string;
  variants: ProcessedVariant[];
}

/**
 * Image-pipeline orchestrator. Sharp does the encoding; the active
 * `StorageDriver` does the I/O (local FS in dev, Cloudflare R2 in prod).
 *
 * Each source image produces 7 variants — 3 aspect ratios × 2 sizes,
 * plus the original. EXIF is stripped on every variant. Object keys are
 * `<module>/<resource-id>/<source-id>/<variant>-<sha256-12>.jpg` so each
 * variant is content-addressed and safe to cache forever.
 *
 * `original` is re-encoded (not byte-copied) so EXIF strips on it too.
 * Avatars are mutable (single key per user) since the cache TTL is short.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @Inject(STORAGE_DRIVER) private readonly driver: StorageDriver,
  ) {}

  /** Allow-list of input mime types (Sharp tolerates more; we narrow defensively). */
  private static readonly ALLOWED_INPUT_MIMES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

  /** Max input size (10 MB) — bigger uploads are rejected upstream by Multer. */
  static readonly MAX_INPUT_BYTES = 10 * 1024 * 1024;

  async processImage(
    scope: 'gear' | 'listing' | 'article',
    entityId: string,
    file: Express.Multer.File,
  ): Promise<ProcessedUpload> {
    if (!StorageService.ALLOWED_INPUT_MIMES.has(file.mimetype)) {
      throw new Error(`Unsupported image mime type: ${file.mimetype}`);
    }

    const sourceId = randomUUID();
    const base = sharp(file.buffer).rotate();

    const variants: ProcessedVariant[] = [];
    for (const variant of IMAGE_VARIANTS) {
      const rendered = await StorageService.renderVariant(base, variant);
      const hash = StorageService.shortHash(rendered.data);
      const key = `${scope}/${entityId}/${sourceId}/${variant}-${hash}.jpg`;
      const put = await this.driver.put({
        key,
        body: rendered.data,
        contentType: 'image/jpeg',
      });
      variants.push({
        variant,
        path: key,
        width: rendered.width,
        height: rendered.height,
        sizeBytes: put.size,
        mimeType: 'image/jpeg',
      });
    }

    return { sourceId, variants };
  }

  /**
   * Delete a batch of stored objects by key. Callers pass the `path`
   * values they have in DB (one row per variant). Failures are logged
   * but don't throw — DB rows are the source of truth for "what's gone".
   */
  async deleteObjects(keys: string[]): Promise<void> {
    for (const key of keys) {
      try {
        await this.driver.delete(key);
      } catch (err) {
        this.logger.warn(
          `failed to delete ${key}: ${(err as Error).message}`,
        );
      }
    }
  }

  /**
   * Avatar pipeline: one 256×256 WebP centered crop. Returns the
   * driver-relative object key (stored verbatim in `users.avatar_url`
   * by the auth service, which then resolves it via `url()` for the
   * client). EXIF stripped on re-encode. Mutable key — same upload
   * slot reused on every change.
   */
  async processAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ relativePath: string; sizeBytes: number }> {
    if (!StorageService.ALLOWED_INPUT_MIMES.has(file.mimetype)) {
      throw new Error(`Unsupported avatar mime type: ${file.mimetype}`);
    }
    const { data, info } = await sharp(file.buffer)
      .rotate()
      .resize(256, 256, { fit: 'cover', position: 'attention' })
      .webp({ quality: 86 })
      .withMetadata({})
      .toBuffer({ resolveWithObject: true });
    const key = `avatar/${userId}.webp`;
    // Avatars are mutable — short cache TTL so an edit shows up quickly.
    const put = await this.driver.put({
      key,
      body: data,
      contentType: 'image/webp',
      cacheControl: 'public, max-age=60, must-revalidate',
    });
    return {
      relativePath: key,
      sizeBytes: put.size > 0 ? put.size : info.size ?? data.byteLength,
    };
  }

  async deleteAvatar(userId: string): Promise<void> {
    try {
      await this.driver.delete(`avatar/${userId}.webp`);
    } catch {
      // ignore — DB row is source of truth
    }
  }

  /** Public URL for a stored object. Thin pass-through to the driver. */
  url(key: string): string {
    return this.driver.url(key);
  }

  /** Existence check — used by smoke tests + future reconciliation. */
  async exists(key: string): Promise<boolean> {
    return this.driver.exists(key);
  }

  private static async renderVariant(
    base: sharp.Sharp,
    variant: ImageVariantLiteral,
  ): Promise<{ data: Buffer; width: number; height: number }> {
    let pipeline: sharp.Sharp;
    if (variant === 'original') {
      // Re-encode original to strip EXIF + ensure JPEG (consistent format
      // across the gallery; deal with WebP / PNG inputs uniformly).
      pipeline = base.clone().jpeg({ quality: 92, mozjpeg: true });
    } else {
      const size = IMAGE_VARIANT_SIZES[variant];
      pipeline = base
        .clone()
        .resize(size.width, size.height, {
          fit: 'cover',
          position: 'attention',
        })
        .jpeg({ quality: 84, mozjpeg: true });
    }

    const { data, info } = await pipeline
      .withMetadata({}) // strip EXIF; keep ICC for color fidelity
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  }

  /** First 12 hex chars of SHA-256(buffer) — collision-safe for our scale. */
  private static shortHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex').slice(0, 12);
  }
}
