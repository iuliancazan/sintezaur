import { Module } from '@nestjs/common';
import { AdminTezaurController } from './admin-tezaur.controller';
import { AuditLogService } from './audit-log.service';
import { GearReviewService } from './gear-review.service';
import { MeTezaurController } from './me-tezaur.controller';
import { PublicTezaurController } from './public-tezaur.controller';
import { StorageService } from './storage.service';
import { TezaurService } from './tezaur.service';
import { UserGearStatusService } from './user-gear-status.service';

@Module({
  controllers: [
    AdminTezaurController,
    PublicTezaurController,
    MeTezaurController,
  ],
  providers: [
    TezaurService,
    GearReviewService,
    UserGearStatusService,
    StorageService,
    AuditLogService,
  ],
  exports: [TezaurService, StorageService, AuditLogService],
})
export class TezaurModule {}
