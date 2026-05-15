import { Controller, Get, Header, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '@sintezaur/auth';
import type { Response } from 'express';
import { SitemapService } from './sitemap.service';

/**
 * SEO crawler endpoints served from the bare domain root per
 * `apps/api/src/main.ts` `setGlobalPrefix({ exclude })`. Crawlers
 * fetch `https://sintezaur.ro/sitemap.xml` and `/robots.txt` — both
 * land here.
 */
@Controller()
export class SeoController {
  constructor(
    private readonly sitemap: SitemapService,
    private readonly config: ConfigService,
  ) {}

  @Get('sitemap.xml')
  @Public()
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  async getSitemap(@Res() res: Response): Promise<void> {
    const xml = await this.sitemap.render();
    res.send(xml);
  }

  @Get('robots.txt')
  @Public()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=86400')
  getRobots(@Res() res: Response): void {
    const base = (
      this.config.get<string>('SITE_BASE_URL') ?? 'https://sintezaur.ro'
    ).replace(/\/$/, '');
    const body = [
      'User-agent: *',
      'Allow: /',
      '',
      // Block private surfaces; the dashboard host is separate, but
      // belt + suspenders. /cont/* are signed-in pages — no value to
      // indexing — and /login etc. shouldn't surface.
      'Disallow: /cont/',
      'Disallow: /login',
      'Disallow: /signup',
      'Disallow: /forgot-password',
      'Disallow: /reset-password',
      'Disallow: /verify-email',
      '',
      `Sitemap: ${base}/sitemap.xml`,
      '',
    ].join('\n');
    res.send(body);
  }
}
