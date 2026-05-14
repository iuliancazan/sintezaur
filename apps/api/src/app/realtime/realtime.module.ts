import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PgListenService } from './pg-listen.service';
import { RealtimeGateway } from './realtime.gateway';

/**
 * Realtime stack: a Socket.io gateway + a Postgres LISTEN/NOTIFY
 * subscriber that bridges cross-process notification rows into the
 * gateway's per-user rooms.
 *
 * JwtModule.registerAsync wires the same secret as `@sintezaur/auth`,
 * so handshake cookie validation matches HTTP auth exactly.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  providers: [RealtimeGateway, PgListenService],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
