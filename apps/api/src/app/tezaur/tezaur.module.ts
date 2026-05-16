import { Module } from '@nestjs/common';
import { AdminTezaurController } from './admin-tezaur.controller';
import { GearReviewService } from './gear-review.service';
import { MeContributorController } from './me-contributor.controller';
import { MeTezaurController } from './me-tezaur.controller';
import { PublicTezaurController } from './public-tezaur.controller';
import { TezaurService } from './tezaur.service';
import { UserGearStatusService } from './user-gear-status.service';

/**
 * StorageService + AuditLogService are exported globally by CommonModule
 * so they don't need to be listed in providers / exports here.
 */
@Module({
  controllers: [
    AdminTezaurController,
    PublicTezaurController,
    MeTezaurController,
    MeContributorController,
  ],
  providers: [TezaurService, GearReviewService, UserGearStatusService],
  exports: [TezaurService],
})
export class TezaurModule {}
