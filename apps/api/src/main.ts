import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import * as path from 'node:path';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(PinoLogger));

  app.use(
    helmet({
      // Allow /uploads/* to be embedded cross-origin by the site dev
      // server (4200 → 3000) without CSP gymnastics.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());

  // Serve uploaded images at /uploads/<filename>. The directory itself
  // is created lazily by the uploads module when it lands in M2.
  const uploadsDir = path.resolve(
    process.env.UPLOADS_DIR ?? './storage/uploads',
  );
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  // SEO crawler endpoints live at the bare domain root (`/sitemap.xml`,
  // `/robots.txt`) — what Google/Bing expect. Everything else stays
  // under `/api`. Coolify only needs to route the API host to this
  // service; no extra alias config required for SEO.
  app.setGlobalPrefix('api', {
    exclude: ['sitemap.xml', 'robots.txt'],
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  const corsOrigin = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigin.length > 0 ? corsOrigin : true,
    credentials: true,
  });

  const port = Number.parseInt(process.env.API_PORT ?? '3000', 10);
  await app.listen(port);
}

bootstrap();
