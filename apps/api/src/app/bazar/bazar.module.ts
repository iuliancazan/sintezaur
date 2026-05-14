import { Module } from '@nestjs/common';
import { AdminBazarController } from './admin-bazar.controller';
import { ChatService } from './chat.service';
import { ListingsService } from './listings.service';
import { MeBazarController } from './me-bazar.controller';
import { PublicBazarController } from './public-bazar.controller';
import { SavedSearchService } from './saved-search.service';
import { TransactionReviewsService } from './transaction-reviews.service';
import { TransactionsService } from './transactions.service';
import { WatchService } from './watch.service';

/**
 * Bazar — M3. Faza B shipped listings CRUD + photo pipeline. Faza C
 * added saved searches, hearts, recently-sold, and a price-drop hook on
 * listing.update. Faza D adds Socket.io-backed chat, structured offers,
 * bilateral transaction confirmation, and bilateral reviews.
 *
 * The realtime gateway + pg-listen bridge + notifications service are
 * provided by globally-scoped modules (RealtimeModule, NotificationsModule)
 * so we don't list them as imports here.
 */
@Module({
  controllers: [
    PublicBazarController,
    MeBazarController,
    AdminBazarController,
  ],
  providers: [
    ListingsService,
    SavedSearchService,
    WatchService,
    ChatService,
    TransactionsService,
    TransactionReviewsService,
  ],
  exports: [ListingsService, WatchService],
})
export class BazarModule {}
