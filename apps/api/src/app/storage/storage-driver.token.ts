/**
 * NestJS injection token for the active `StorageDriver`. Bound at
 * module bootstrap by `StorageModule` to either `LocalStorageDriver`
 * or `S3StorageDriver` depending on `STORAGE_DRIVER` env.
 */
export const STORAGE_DRIVER = Symbol('STORAGE_DRIVER');
