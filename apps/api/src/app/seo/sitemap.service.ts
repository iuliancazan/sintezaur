import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DATABASE,
  articles,
  forumCategories,
  forumThreads,
  gear,
  legalPages,
  listings,
  type SintezaurDb,
} from '@sintezaur/db';
import { and, asc, eq, isNull } from 'drizzle-orm';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never';
  priority?: number;
}

const STATIC_PAGES: Array<{ path: string; priority: number; changefreq: SitemapUrl['changefreq'] }> = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/tezaur', priority: 0.9, changefreq: 'daily' },
  { path: '/bazar', priority: 0.9, changefreq: 'hourly' },
  { path: '/revista', priority: 0.9, changefreq: 'daily' },
  { path: '/forum', priority: 0.9, changefreq: 'hourly' },
  { path: '/termeni', priority: 0.3, changefreq: 'monthly' },
  { path: '/confidentialitate', priority: 0.3, changefreq: 'monthly' },
  { path: '/cookies', priority: 0.2, changefreq: 'monthly' },
  { path: '/regulament-forum', priority: 0.3, changefreq: 'monthly' },
  { path: '/despre', priority: 0.4, changefreq: 'monthly' },
  { path: '/contact', priority: 0.4, changefreq: 'monthly' },
];

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h — sitemaps don't need to be live

/**
 * Sitemap generator per spec §7.7. Renders a single sitemap.xml at the
 * site root (the spec calls for index splits only when URL count gets
 * above ~50k, which is years away for a RO-focused niche). Cached in
 * memory for an hour — invalidated on process restart.
 *
 * Includes: 11 static pages + all published gear / active listings /
 * published articles / forum categories + non-deleted forum threads +
 * legal pages.
 */
@Injectable()
export class SitemapService {
  private readonly logger = new Logger(SitemapService.name);
  private cached: { xml: string; generatedAt: number } | null = null;

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly config: ConfigService,
  ) {}

  async render(): Promise<string> {
    if (this.cached && Date.now() - this.cached.generatedAt < CACHE_TTL_MS) {
      return this.cached.xml;
    }
    const urls = await this.collect();
    const xml = this.serialize(urls);
    this.cached = { xml, generatedAt: Date.now() };
    return xml;
  }

  private siteBaseUrl(): string {
    const raw =
      this.config.get<string>('SITE_BASE_URL') ?? 'https://sintezaur.ro';
    return raw.replace(/\/$/, '');
  }

  private async collect(): Promise<SitemapUrl[]> {
    const base = this.siteBaseUrl();
    const out: SitemapUrl[] = [];

    for (const p of STATIC_PAGES) {
      out.push({
        loc: `${base}${p.path}`,
        changefreq: p.changefreq,
        priority: p.priority,
      });
    }

    // Tezaur — every published, non-deleted gear entry.
    const gearRows = await this.db
      .select({ slug: gear.slug, updatedAt: gear.updatedAt })
      .from(gear)
      .where(and(eq(gear.published, true), isNull(gear.deletedAt)))
      .orderBy(asc(gear.slug));
    for (const g of gearRows) {
      out.push({
        loc: `${base}/tezaur/${g.slug}`,
        lastmod: g.updatedAt.toISOString().slice(0, 10),
        changefreq: 'weekly',
        priority: 0.7,
      });
    }

    // Bazar — every active listing. Expired/sold listings are excluded
    // (intentionally — sold listings stay reachable for 30d but search
    // engines should not index transient URLs).
    const listingRows = await this.db
      .select({ slug: listings.slug, updatedAt: listings.updatedAt })
      .from(listings)
      .where(and(eq(listings.status, 'active'), isNull(listings.removedAt)));
    for (const l of listingRows) {
      out.push({
        loc: `${base}/bazar/${l.slug}`,
        lastmod: l.updatedAt.toISOString().slice(0, 10),
        changefreq: 'weekly',
        priority: 0.5,
      });
    }

    // Revista — every published article.
    const articleRows = await this.db
      .select({
        slug: articles.slug,
        updatedAt: articles.updatedAt,
        publishedAt: articles.publishedAt,
      })
      .from(articles)
      .where(eq(articles.status, 'published'));
    for (const a of articleRows) {
      out.push({
        loc: `${base}/revista/${a.slug}`,
        lastmod: (a.updatedAt ?? a.publishedAt ?? new Date())
          .toISOString()
          .slice(0, 10),
        changefreq: 'monthly',
        priority: 0.6,
      });
    }

    // Forum — visible categories + non-deleted threads. Pinned threads
    // get a slight priority bump.
    const categoryRows = await this.db
      .select({ slug: forumCategories.slug })
      .from(forumCategories);
    for (const c of categoryRows) {
      out.push({
        loc: `${base}/forum/${c.slug}`,
        changefreq: 'daily',
        priority: 0.6,
      });
    }

    const threadRows = await this.db
      .select({
        slug: forumThreads.slug,
        categorySlug: forumCategories.slug,
        updatedAt: forumThreads.updatedAt,
        pinnedAt: forumThreads.pinnedAt,
      })
      .from(forumThreads)
      .innerJoin(
        forumCategories,
        eq(forumCategories.id, forumThreads.categoryId),
      )
      .where(isNull(forumThreads.deletedAt));
    for (const th of threadRows) {
      out.push({
        loc: `${base}/forum/${th.categorySlug}/${th.slug}`,
        lastmod: th.updatedAt.toISOString().slice(0, 10),
        changefreq: 'weekly',
        priority: th.pinnedAt ? 0.6 : 0.4,
      });
    }

    // Legal pages already in the static list, but re-list with lastmod
    // pulled from DB so search engines pick up edits.
    const legalRows = await this.db
      .select({
        slug: legalPages.slug,
        updatedAt: legalPages.updatedAt,
      })
      .from(legalPages);
    for (const l of legalRows) {
      const idx = out.findIndex((u) => u.loc === `${base}/${l.slug}`);
      if (idx !== -1) {
        out[idx].lastmod = l.updatedAt.toISOString().slice(0, 10);
      }
    }

    return out;
  }

  private serialize(urls: SitemapUrl[]): string {
    const head =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    const body = urls
      .map((u) => {
        const parts = [`  <url>`, `    <loc>${escapeXml(u.loc)}</loc>`];
        if (u.lastmod) parts.push(`    <lastmod>${u.lastmod}</lastmod>`);
        if (u.changefreq)
          parts.push(`    <changefreq>${u.changefreq}</changefreq>`);
        if (u.priority != null)
          parts.push(`    <priority>${u.priority.toFixed(1)}</priority>`);
        parts.push('  </url>');
        return parts.join('\n');
      })
      .join('\n');
    return `${head}\n${body}\n</urlset>\n`;
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
