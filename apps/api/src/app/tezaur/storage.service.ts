import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import 'multer';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import {
  IMAGE_VARIANTS,
  IMAGE_VARIANT_SIZES,
  type ImageVariantLiteral,
} from '@sintezaur/shared';

export interface ProcessedVariant {
  variant: ImageVariantLiteral;
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
 * Image pipeline for Tezaur (and later Bazar) uploads.
 *
 * Each source image produces 7 variants — 3 aspect ratios × 2 sizes,
 * plus the original. EXIF is stripped on every variant. Files land
 * under `<UPLOADS_DIR>/<scope>/<entity-id>/<source-id>/<variant>.jpg`.
 *
 * `original` is re-encoded (not byte-copied) so EXIF strips on it too;
 * we keep it for future re-cropping needs.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadsDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadsDir = resolve(
      process.cwd(),
      this.config.get<string>('UPLOADS_DIR') ?? './storage/uploads',
    );
  }

  /** Allow-list of input mime types (Sharp tolerates more; we narrow defensively). */
  private static readonly ALLOWED_INPUT_MIMES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

  /** Max input size (10 MB) — bigger uploads are rejected upstream by Multer. */
  static readonly MAX_INPUT_BYTES = 10 * 1024 * 1024;

  async processImage(
    scope: 'gear' | 'listing',
    entityId: string,
    file: Express.Multer.File,
  ): Promise<ProcessedUpload> {
    if (!StorageService.ALLOWED_INPUT_MIMES.has(file.mimetype)) {
      throw new Error(`Unsupported image mime type: ${file.mimetype}`);
    }

    const sourceId = randomUUID();
    const dir = join(this.uploadsDir, scope, entityId, sourceId);
    await mkdir(dir, { recursive: true });

    // Pre-load + auto-rotate (uses EXIF Orientation then strips it). All
    // downstream variants share this base so we re-decode JPEG once.
    const base = sharp(file.buffer).rotate();

    const variants: ProcessedVariant[] = [];
    for (const variant of IMAGE_VARIANTS) {
      const out = await this.renderVariant(base, variant, dir);
      variants.push({
        variant,
        path: this.relativePath(scope, entityId, sourceId, variant),
        ...out,
      });
    }

    return { sourceId, variants };
  }

  async deleteSource(
    scope: 'gear' | 'listing',
    entityId: string,
    sourceId: string,
    variants: ImageVariantLiteral[],
  ): Promise<void> {
    for (const variant of variants) {
      const abs = join(this.uploadsDir, scope, entityId, sourceId, this.fileName(variant));
      try {
        await unlink(abs);
      } catch (err) {
        // Missing files aren't fatal — the DB row is the source of truth.
        this.logger.warn(`failed to unlink ${abs}: ${(err as Error).message}`);
      }
    }
  }

  absolutePath(relPath: string): string {
    return join(this.uploadsDir, relPath);
  }

  async exists(relPath: string): Promise<boolean> {
    try {
      await stat(join(this.uploadsDir, relPath));
      return true;
    } catch {
      return false;
    }
  }

  private async renderVariant(
    base: sharp.Sharp,
    variant: ImageVariantLiteral,
    dir: string,
  ): Promise<{ width: number; height: number; sizeBytes: number; mimeType: string }> {
    const path = join(dir, this.fileName(variant));

    let pipeline: sharp.Sharp;
    if (variant === 'original') {
      // Re-encode original to strip EXIF + ensure JPEG (consistent format
      // across the gallery; deal with WebP / PNG inputs uniformly).
      pipeline = base.clone().jpeg({ quality: 92, mozjpeg: true });
    } else {
      const size = IMAGE_VARIANT_SIZES[variant];
      pipeline = base.clone().resize(size.width, size.height, {
        fit: 'cover',
        position: 'attention',
      }).jpeg({ quality: 84, mozjpeg: true });
    }

    const { data, info } = await pipeline
      .withMetadata({}) // strip EXIF; keep ICC for color fidelity
      .toBuffer({ resolveWithObject: true });

    await writeFile(path, data);
    return {
      width: info.width,
      height: info.height,
      sizeBytes: data.byteLength,
      mimeType: 'image/jpeg',
    };
  }

  private fileName(variant: ImageVariantLiteral): string {
    return `${variant}.jpg`;
  }

  private relativePath(
    scope: 'gear' | 'listing',
    entityId: string,
    sourceId: string,
    variant: ImageVariantLiteral,
  ): string {
    return `${scope}/${entityId}/${sourceId}/${this.fileName(variant)}`;
  }
}
