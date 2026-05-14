import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/**
 * Notifications per spec §7.5. The service is global so any feature
 * module can post without listing it in its own `imports`. Channels:
 *  - in_app rows are pushed live by the realtime gateway via
 *    Postgres LISTEN/NOTIFY (one row → one socket emit).
 *  - email rows queue up for the worker's nodemailer pg-boss job
 *    (digest cron — wired in M5).
 */
@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
