import { Module } from '@nestjs/common';
import { AdminBazarController } from './admin-bazar.controller';
import { ListingsService } from './listings.service';
import { MeBazarController } from './me-bazar.controller';
import { PublicBazarController } from './public-bazar.controller';

/**
 * Bazar — Phase 1 (M3). Listings CRUD + photo pipeline + public list/detail.
 *
 * Saved searches, watch hearts, expiry cron, recently-sold endpoint land in
 * Faza C. WebSocket chat + offers + transactions + reviews land in Faza D.
 *
 * StorageService + AuditLogService are provided globally by CommonModule.
 */
@Module({
  controllers: [
    PublicBazarController,
    MeBazarController,
    AdminBazarController,
  ],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class BazarModule {}
