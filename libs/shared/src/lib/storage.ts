/**
 * StorageDriver — backend-agnostic interface for object I/O.
 *
 * Two impls live in `apps/api/src/app/storage/`:
 *   - `LocalStorageDriver` — writes to `./storage/uploads/<key>` (dev / fallback)
 *   - `S3StorageDriver`    — talks to Cloudflare R2 (S3-compatible) in prod
 *
 * Object key format (immutable URLs):
 *   `<module>/<resource-id>/<purpose>-<sha256-12>.<ext>`
 *
 * For image pipelines that emit multiple variants per source upload, the
 * shape extends to `<module>/<resource-id>/<source-id>/<variant>-<hash>.<ext>`
 * — same family, hash on per-variant content bytes.
 *
 * Avatars stay at a stable mutable key (`avatar/<user-id>.webp`) because
 * each user only ever has one — the URL has a short cache TTL on edit.
 *
 * The interface is plain TypeScript (no `@nestjs/*` imports) so it can be
 * referenced from `@sintezaur/shared` without dragging backend deps into
 * the client bundle. Concrete drivers live in the API app.
 */

export const STORAGE_MODULES = [
  'tezaur',
  'bazar',
  'revista',
  'forum',
  'avatar',
] as const;
export type StorageModule = (typeof STORAGE_MODULES)[number];

export const STORAGE_FILE_TYPES = ['image', 'audio', 'pdf', 'zip'] as const;
export type StorageFileType = (typeof STORAGE_FILE_TYPES)[number];

/** Cache-Control header applied to every uploaded object by default. */
export const STORAGE_DEFAULT_CACHE_CONTROL =
  'public, max-age=31536000, immutable';

export interface StoragePutInput {
  /** Object key relative to bucket root. Must not start with `/`. */
  key: string;
  body: Buffer;
  /** MIME type — written as `Content-Type` on the stored object. */
  contentType: string;
  /** Cache header. Defaults to long-immutable; mutable keys (avatar) override. */
  cacheControl?: string;
}

export interface StoragePutResult {
  key: string;
  size: number;
}

export interface StorageDriver {
  put(input: StoragePutInput): Promise<StoragePutResult>;
  /** Buffer round-trip — used by tests and reconciliation only. */
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /** Public URL for the object. Always identical shape on both drivers. */
  url(key: string): string;
}
