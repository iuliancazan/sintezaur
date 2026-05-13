/**
 * Background-jobs worker. Bootstrapped as a NestJS app to share DI +
 * config + logging conventions with the API. Job handlers (pg-boss
 * subscribers) land starting in M3 (Bazar notifications) and M5
 * (forum badge cron, listing-expiry cron).
 *
 * For M0 the worker is a no-op that boots and stays alive — proves
 * the bootstrap path + Coolify resource shape end-to-end.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number.parseInt(process.env.WORKER_PORT ?? '3001', 10);
  await app.listen(port);
  Logger.log(
    `🛠  Sintezaur worker is running on port ${port} (no jobs registered yet)`,
  );
}

bootstrap();
