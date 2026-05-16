import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import 'multer';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import {
  IMAGE_VARIANTS,
  IMAGE_VARIANT_SIZES,
  type ImageVariantLiteral,
  type StorageDriver,
  type StorageModule as SharedStorageModule,
} from '@sintezaur/shared';
import { STORAGE_DRIVER } from '../storage/storage-driver.token';
import { detectFileType } from '../storage/file-type-detector';
import { UploadQuotaService } from '../storage/upload-quota.service';

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

export interface ProcessedAttachment {
  objectKey: string;
  bytes: number;
  contentType: string;
  contentHash: string;
  extension: string;
  /** One of: 'audio' | 'pdf' | 'zip'. */
  kind: Exclude<SharedStorageModule, 'tezaur' | 'bazar' | 'revista' | 'forum' | 'avatar'> | 'audio' | 'pdf' | 'zip';
}

export type AttachmentKindLiteral = 'audio' | 'pdf' | 'zip';

const IMAGE_SCOPE_TO_MODULE: Record<
  'gear' | 'listing' | 'article',
  SharedStorageModule
> = {
  gear: 'tezaur',
  listing: 'bazar',
  article: 'revista',
};

const ALLOWED_AUDIO_MIMES = new Set(['audio/mpeg', 'audio/wav', 'audio/ogg']);
const ALLOWED_PDF_MIMES = new Set(['application/pdf']);
const ALLOWED_ZIP_MIMES = new Set([
  'application/zip',
  'application/x-zip-compressed',
]);

/**
 * File-pipeline orchestrator. Sharp does image encoding; magic-byte
 * detection vets audio/PDF/ZIP; the active `StorageDriver` does the
 * I/O (local FS in dev, Cloudflare R2 in prod).
 *
 * Each source image produces 7 variants — 3 aspect ratios × 2 sizes,
 * plus the original. EXIF is stripped on every variant. Object keys are
 * `<module>/<resource-id>/<source-id>/<variant>-<sha256-12>.jpg` so each
 * variant is content-addressed and safe to cache forever.
 *
 * Audio / PDF / ZIP attachments are content-addressed by their input
 * bytes (no re-encode) at
 * `<module>/<resource-id>/attachment-<sha256-12>.<ext>`.
 *
 * Avatars are mutable (single key per user) — short cache TTL on edit.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @Inject(STORAGE_DRIVER) private readonly driver: StorageDriver,
    private readonly quota: UploadQuotaService,
  ) {}

  /** Allow-list of input mime types for images (Sharp tolerates more; we narrow defensively). */
  private static readonly ALLOWED_INPUT_MIMES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

  /** Max input size (10 MB) — bigger uploads are rejected upstream by Multer. */
  static readonly MAX_INPUT_BYTES = 10 * 1024 * 1024;

  /** Larger multer ceiling for audio/PDF/ZIP — the quota guard applies the real per-type caps. */
  static readonly MAX_ATTACHMENT_INPUT_BYTES = 25 * 1024 * 1024;

  async processImage(
    scope: 'gear' | 'listing' | 'article',
    entityId: string,
    file: Express.Multer.File,
    actorId?: string | null,
  ): Promise<ProcessedUpload> {
    if (!StorageService.ALLOWED_INPUT_MIMES.has(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        `Tip imagine neacceptat: ${file.mimetype}.`,
      );
    }
    const detected = detectFileType(file.buffer);
    if (!detected || detected.fileType !== 'image') {
      throw new UnsupportedMediaTypeException(
        'Fișierul nu pare a fi o imagine validă.',
      );
    }

    const module = IMAGE_SCOPE_TO_MODULE[scope];

    if (actorId) {
      await this.quota.check({
        userId: actorId,
        bytes: file.size,
        fileType: 'image',
        module,
      });
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
      if (actorId) {
        await this.quota.track({
          userId: actorId,
          module,
          resourceId: entityId,
          purpose: `image-${variant}`,
          objectKey: key,
          bytes: put.size,
          contentType: 'image/jpeg',
          fileType: 'image',
        });
      }
    }

    return { sourceId, variants };
  }

  /**
   * Audio attachment pipeline. Magic-byte vets MP3/WAV/OGG, then the
   * file is stored as-is (no re-encode). Caller owns DB row creation
   * in `forum_post_attachments` / `revista_article_attachments`.
   */
  async processAudio(
    module: SharedStorageModule,
    resourceId: string,
    file: Express.Multer.File,
    actorId: string,
  ): Promise<ProcessedAttachment> {
    return this.processAttachment(
      module,
      resourceId,
      file,
      actorId,
      'audio',
      ALLOWED_AUDIO_MIMES,
    );
  }

  async processPdf(
    module: SharedStorageModule,
    resourceId: string,
    file: Express.Multer.File,
    actorId: string,
  ): Promise<ProcessedAttachment> {
    return this.processAttachment(
      module,
      resourceId,
      file,
      actorId,
      'pdf',
      ALLOWED_PDF_MIMES,
    );
  }

  async processZip(
    module: SharedStorageModule,
    resourceId: string,
    file: Express.Multer.File,
    actorId: string,
  ): Promise<ProcessedAttachment> {
    return this.processAttachment(
      module,
      resourceId,
      file,
      actorId,
      'zip',
      ALLOWED_ZIP_MIMES,
    );
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
      throw new UnsupportedMediaTypeException(
        `Tip avatar neacceptat: ${file.mimetype}.`,
      );
    }
    await this.quota.check({
      userId,
      bytes: file.size,
      fileType: 'image',
      module: 'avatar',
    });

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
    await this.quota.track({
      userId,
      module: 'avatar',
      resourceId: userId,
      purpose: 'avatar',
      objectKey: key,
      bytes: put.size,
      contentType: 'image/webp',
      fileType: 'image',
    });
    return {
      relativePath: key,
      sizeBytes: put.size > 0 ? put.size : info.size ?? data.byteLength,
    };
  }

  async deleteAvatar(userId: string): Promise<void> {
    try {
      await this.driver.delete(`avatar/${userId}.webp`);
      await this.quota.untrack('avatar', userId, 0);
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

  private async processAttachment(
    module: SharedStorageModule,
    resourceId: string,
    file: Express.Multer.File,
    actorId: string,
    expected: AttachmentKindLiteral,
    allowedMimes: Set<string>,
  ): Promise<ProcessedAttachment> {
    if (!allowedMimes.has(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        `Tip neacceptat pentru ${expected}: ${file.mimetype}.`,
      );
    }
    const detected = detectFileType(file.buffer);
    if (!detected || detected.fileType !== expected) {
      throw new BadRequestException(
        `Conținutul fișierului nu corespunde tipului ${expected}.`,
      );
    }

    await this.quota.check({
      userId: actorId,
      bytes: file.size,
      fileType: expected,
      module,
    });

    const fullHash = createHash('sha256').update(file.buffer).digest('hex');
    const shortHash = fullHash.slice(0, 12);
    const key = `${module}/${resourceId}/attachment-${shortHash}.${detected.extension}`;

    const put = await this.driver.put({
      key,
      body: file.buffer,
      contentType: detected.mimeType,
    });

    await this.quota.track({
      userId: actorId,
      module,
      resourceId,
      purpose: `attachment-${expected}`,
      objectKey: key,
      bytes: put.size,
      contentType: detected.mimeType,
      fileType: expected,
    });

    return {
      objectKey: key,
      bytes: put.size,
      contentType: detected.mimeType,
      contentHash: fullHash,
      extension: detected.extension,
      kind: expected,
    };
  }

  /**
   * Regenerate the square_thumb + square_medium variants from the
   * stored `original`, applying a user-selected crop window (in
   * original image pixel coordinates). Used by the manual cropper UI
   * on the Tezaur add page. Returns the new variant rows ready to be
   * persisted by the caller. The caller is responsible for deleting
   * the old square variant keys from storage.
   */
  async regenerateSquareVariantsWithCrop(
    scope: 'gear' | 'listing' | 'article',
    entityId: string,
    sourceId: string,
    originalKey: string,
    crop: { x: number; y: number; w: number; h: number },
    actorId?: string | null,
  ): Promise<{ variants: ProcessedVariant[] }> {
    const buf = await this.driver.get(originalKey);
    const meta = await sharp(buf).metadata();
    if (!meta.width || !meta.height) {
      throw new BadRequestException(
        'Originalul nu are dimensiuni valide pentru crop.',
      );
    }
    // Clamp to original bounds — bad input is treated as a clipped crop.
    const x = Math.max(0, Math.min(crop.x, meta.width - 1));
    const y = Math.max(0, Math.min(crop.y, meta.height - 1));
    const w = Math.max(1, Math.min(crop.w, meta.width - x));
    const h = Math.max(1, Math.min(crop.h, meta.height - y));

    const module = IMAGE_SCOPE_TO_MODULE[scope];
    const squareVariants = ['square_thumb', 'square_medium'] as const;
    const variants: ProcessedVariant[] = [];

    for (const variant of squareVariants) {
      const size = IMAGE_VARIANT_SIZES[variant];
      const { data, info } = await sharp(buf)
        .extract({ left: x, top: y, width: w, height: h })
        .resize(size.width, size.height, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 84, mozjpeg: true })
        .withMetadata({})
        .toBuffer({ resolveWithObject: true });

      const hash = StorageService.shortHash(data);
      const key = `${scope}/${entityId}/${sourceId}/${variant}-${hash}.jpg`;
      const put = await this.driver.put({
        key,
        body: data,
        contentType: 'image/jpeg',
      });
      variants.push({
        variant,
        path: key,
        width: info.width,
        height: info.height,
        sizeBytes: put.size,
        mimeType: 'image/jpeg',
      });
      if (actorId) {
        await this.quota.track({
          userId: actorId,
          module,
          resourceId: entityId,
          purpose: `image-${variant}`,
          objectKey: key,
          bytes: put.size,
          contentType: 'image/jpeg',
          fileType: 'image',
        });
      }
    }
    return { variants };
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
