import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { SentryModule } from '@sentry/nestjs/setup';
import { JwtAuthGuard, RolesGuard } from '@sintezaur/auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BazarModule } from './bazar/bazar.module';
import { BlocksModule } from './blocks/blocks.module';
import { CommonModule } from './common/common.module';
import { DbModule } from './db/db.module';
import { ForumModule } from './forum/forum.module';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RevistaModule } from './revista/revista.module';
import { TezaurModule } from './tezaur/tezaur.module';
import { AdminClosureModule } from './admin-closure/admin-closure.module';
import { AdminStorageModule } from './admin-storage/admin-storage.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { AppConfigModule } from './app-config/app-config.module';
import { FeedbackModule } from './feedback/feedback.module';
import { GdprModule } from './gdpr/gdpr.module';
import { LegalModule } from './legal/legal.module';
import { SearchModule } from './search/search.module';
import { SeoModule } from './seo/seo.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    // Sentry hooks into Nest's exception filter chain. The actual
    // SDK init happens via the side-effect import in `main.ts` —
    // this module just wires the per-request integration. No-op
    // when `SENTRY_DSN` is empty.
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.LOG_FORMAT === 'pretty'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
    /**
     * Default throttle: 60 req/min per IP. Per-endpoint @Throttle()
     * overrides on auth surface (5/min signup, 10/min login,
     * 3/min forgot-password — per execution plan M1).
     */
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    DbModule,
    StorageModule,
    CommonModule,
    RealtimeModule,
    NotificationsModule,
    HealthModule,
    AuthModule,
    TezaurModule,
    BazarModule,
    BlocksModule,
    RevistaModule,
    ForumModule,
    AdminClosureModule,
    AdminStorageModule,
    AdminUsersModule,
    AppConfigModule,
    LegalModule,
    SearchModule,
    SeoModule,
    FeedbackModule,
    GdprModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    /**
     * Global JWT guard — every handler requires a valid access cookie
     * unless decorated with `@Public()`. Beats the "did I forget
     * @UseGuards on a write endpoint" footgun for an auth-heavy app.
     */
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
