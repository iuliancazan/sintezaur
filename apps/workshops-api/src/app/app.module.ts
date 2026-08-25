import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { DbModule } from './db/db.module';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { RolesGuard } from './auth/roles';
import { SessionGuard } from './auth/session.guard';
import { EventsService } from './events/events.service';
import { EventsController } from './events/events.controller';
import { PublicWorkshopsController } from './workshops/public.controller';
import { PanelController } from './panel/panel.controller';
import { PdfController } from './pdf/pdf.controller';

function sessionSecret(): string {
  const secret = process.env.WORKSHOPS_SESSION_SECRET;
  if (secret && secret !== 'replace-with-32-random-bytes') {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('WORKSHOPS_SESSION_SECRET must be set in production.');
  }
  console.warn(
    '[workshops-api] WORKSHOPS_SESSION_SECRET not set — using an insecure dev fallback.',
  );
  return 'dev-only-insecure-secret';
}

@Module({
  imports: [
    DbModule,
    JwtModule.register({ secret: sessionSecret() }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 60 }],
    }),
  ],
  controllers: [
    AppController,
    AuthController,
    EventsController,
    PublicWorkshopsController,
    PanelController,
    PdfController,
  ],
  providers: [AuthService, SessionGuard, RolesGuard, EventsService],
})
export class AppModule {}
