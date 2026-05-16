import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';

export interface PageMeta {
  /** Plain page title. The service appends " · Sintezaur" automatically. */
  title: string;
  /** Meta description — 1–2 sentences, ~150 chars. */
  description?: string;
  /** Absolute or site-relative URL of the social-preview image. */
  ogImage?: string;
  /** Site-relative path of the canonical URL (e.g. `/tezaur/korg-minilogue-xd`). */
  canonicalPath?: string;
  /** og:type — defaults to `website` for lists, `article` for content. */
  ogType?: 'website' | 'article' | 'product';
}

/** Public base URL of the site (used for canonical + OG absolute URLs). */
const SITE_BASE_URL = (() => {
  // SITE_BASE_URL isn't part of the build-time environment; fall back to
  // window.origin in the browser, and prod URL on SSR-less SPA where the
  // env file decides. Both M6-A drafts hard-code the same hostname.
  if (typeof window !== 'undefined') return window.location.origin;
  return environment.production ? 'https://sintezaur.ro' : 'http://localhost:4200';
})();

const SUFFIX = ' · Sintezaur';
const DEFAULT_OG_IMAGE = '/assets/branding/og-default.png';

/**
 * Centralised SEO helpers per spec §7.7 (title + description + OG +
 * Twitter cards + JSON-LD). SPA-only for M6-B; full SSR is a M6-B
 * follow-up (see `docs/seo-todo.md`). Modern Google + Bing crawlers
 * execute JS so client-side meta still indexes — slower-to-update
 * than SSR'd HTML but acceptable for soft-launch.
 *
 * Usage pattern:
 *   seo.set({ title: 'Korg Minilogue XD', description: '...', ogType: 'product' });
 *   seo.setJsonLd({ '@context':'https://schema.org', '@type':'Product', ... });
 *
 * Components don't need to clear meta on destroy — the next route's
 * `set()` overwrites all tags. JSON-LD is cleared on `set()` too.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly JSONLD_ID = 'sintezaur-jsonld';
  private readonly CANONICAL_ID = 'sintezaur-canonical';
  private readonly ALTERNATE_RO_ID = 'sintezaur-alternate-ro';
  private readonly ALTERNATE_EN_ID = 'sintezaur-alternate-en';
  private readonly ALTERNATE_DEFAULT_ID = 'sintezaur-alternate-default';

  set(input: PageMeta): void {
    const fullTitle = input.title ? `${input.title}${SUFFIX}` : 'Sintezaur';
    this.title.setTitle(fullTitle);

    const description =
      input.description ??
      'Enciclopedia, bazarul, revista și forumul producției muzicale în limba română.';
    const ogImage = absolutize(input.ogImage ?? DEFAULT_OG_IMAGE);
    const ogType = input.ogType ?? 'website';
    const canonicalUrl = input.canonicalPath
      ? `${SITE_BASE_URL}${input.canonicalPath}`
      : SITE_BASE_URL;

    this.upsert('name', 'description', description);

    this.upsert('property', 'og:title', fullTitle);
    this.upsert('property', 'og:description', description);
    this.upsert('property', 'og:image', ogImage);
    this.upsert('property', 'og:url', canonicalUrl);
    this.upsert('property', 'og:type', ogType);
    this.upsert('property', 'og:site_name', 'Sintezaur');
    this.upsert('property', 'og:locale', 'ro_RO');

    this.upsert('name', 'twitter:card', 'summary_large_image');
    this.upsert('name', 'twitter:title', fullTitle);
    this.upsert('name', 'twitter:description', description);
    this.upsert('name', 'twitter:image', ogImage);

    this.setCanonical(canonicalUrl);
    // M16-J: emit `hreflang` alternates for the same path in the
    // other locale. We derive both URLs from the canonical path so
    // callers don't have to think about locale prefixes.
    this.setAlternates(input.canonicalPath ?? '/');
    // Locale-aware og:locale — flips between RO and EN based on the
    // canonical URL's prefix.
    if ((input.canonicalPath ?? '/').startsWith('/en')) {
      this.upsert('property', 'og:locale', 'en_US');
      this.upsert('property', 'og:locale:alternate', 'ro_RO');
    } else {
      this.upsert('property', 'og:locale', 'ro_RO');
      this.upsert('property', 'og:locale:alternate', 'en_US');
    }

    // Clear any previously-set JSON-LD so the new page starts clean.
    // Pages that want JSON-LD call `setJsonLd()` AFTER `set()`.
    this.clearJsonLd();
  }

  /**
   * Inject a `<script type="application/ld+json">` into <head>. Replaces
   * any previous JSON-LD injected by the service.
   */
  setJsonLd(data: Record<string, unknown> | Array<Record<string, unknown>>): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.clearJsonLd();
    const head = this.document.head;
    if (!head) return;
    const script = this.document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute('id', this.JSONLD_ID);
    script.textContent = JSON.stringify(data);
    head.appendChild(script);
  }

  clearJsonLd(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const existing = this.document.getElementById(this.JSONLD_ID);
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  }

  /**
   * Helper for building a schema.org `BreadcrumbList` block. Pass the
   * crumb chain top-down (root first). Returns an object suitable to
   * push into a `setJsonLd([primary, breadcrumb])` array on detail
   * pages. URLs are absolutized against the site origin.
   */
  static breadcrumbList(
    items: Array<{ name: string; path: string }>,
  ): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: it.name,
        item: absolutize(it.path),
      })),
    };
  }

  private upsert(
    attr: 'name' | 'property',
    key: string,
    content: string,
  ): void {
    const selector = `${attr}="${key}"`;
    this.meta.updateTag({ [attr]: key, content }, selector);
  }

  private setCanonical(url: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const head = this.document.head;
    if (!head) return;
    let link = this.document.getElementById(
      this.CANONICAL_ID,
    ) as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('id', this.CANONICAL_ID);
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  /**
   * Cross-link the current page with its other-locale counterpart.
   * `path` is the canonical path of the active page (may or may not
   * start with `/en`). We always emit three tags: ro, en, x-default
   * (RO) — Google needs all three for correct language selection.
   */
  private setAlternates(path: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const head = this.document.head;
    if (!head) return;
    const isEn = path === '/en' || path.startsWith('/en/');
    const bare = isEn ? (path === '/en' ? '/' : path.slice(3)) : path;
    const roUrl = `${SITE_BASE_URL}${bare}`;
    const enUrl = `${SITE_BASE_URL}${bare === '/' ? '/en' : `/en${bare}`}`;
    this.upsertAlternate(this.ALTERNATE_RO_ID, 'ro', roUrl);
    this.upsertAlternate(this.ALTERNATE_EN_ID, 'en', enUrl);
    this.upsertAlternate(this.ALTERNATE_DEFAULT_ID, 'x-default', roUrl);
  }

  private upsertAlternate(id: string, hreflang: string, href: string): void {
    const head = this.document.head;
    let link = this.document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('id', id);
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', hreflang);
      head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}

function absolutize(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${SITE_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}
