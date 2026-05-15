import { Module } from '@nestjs/common';
import { SeoController } from './seo.controller';
import { SitemapService } from './sitemap.service';

/**
 * SEO crawler endpoints — `/sitemap.xml` + `/robots.txt` (M6-B). Served
 * from the bare root (excluded from the `/api` prefix in main.ts).
 *
 * The static robots.txt at `apps/site/public/robots.txt` becomes
 * obsolete: when the API host serves `/robots.txt`, browsers and bots
 * use that. We keep the static file in tree as a safety net for any
 * deployment where the API host isn't the same as the site host.
 */
@Module({
  controllers: [SeoController],
  providers: [SitemapService],
})
export class SeoModule {}
