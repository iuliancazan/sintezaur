import { Global, Logger, Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageDriver } from './local-storage.driver';
import { S3StorageDriver } from './s3-storage.driver';
import { STORAGE_DRIVER } from './storage-driver.token';

const driverProvider: Provider = {
  provide: STORAGE_DRIVER,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const flavor = (config.get<string>('STORAGE_DRIVER') ?? 'local')
      .toLowerCase()
      .trim();
    const logger = new Logger('StorageModule');
    if (flavor === 's3') {
      logger.log('storage driver = s3 (Cloudflare R2)');
      return new S3StorageDriver(config);
    }
    if (flavor !== 'local') {
      logger.warn(
        `unknown STORAGE_DRIVER="${flavor}" — falling back to local`,
      );
    } else {
      logger.log('storage driver = local');
    }
    return new LocalStorageDriver(config);
  },
};

/**
 * Provides the active `StorageDriver` to the rest of the app. The
 * concrete impl is selected at bootstrap from `STORAGE_DRIVER` env
 * (`local` | `s3`). Marked `@Global()` so feature modules don't have
 * to import StorageModule explicitly.
 */
@Global()
@Module({
  providers: [driverProvider],
  exports: [STORAGE_DRIVER],
})
export class StorageModule {}
