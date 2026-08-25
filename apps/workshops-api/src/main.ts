import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // API under /api; everything else will be the gated SPA (served by this
  // process in production — wired in W1's static-serving step).
  app.setGlobalPrefix('api');

  // Same-origin by design: dev goes through the Angular dev-server proxy
  // (apps/workshops/proxy.conf.json), prod is served by this process. No
  // CORS config on purpose.
  const port = Number.parseInt(process.env.WORKSHOPS_API_PORT ?? '3300', 10);
  await app.listen(port);
  Logger.log(`workshops-api listening on http://localhost:${port}/api`);
}

bootstrap();
