import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard, RolesGuard } from '@sintezaur/auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
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
    HealthModule,
    AuthModule,
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
