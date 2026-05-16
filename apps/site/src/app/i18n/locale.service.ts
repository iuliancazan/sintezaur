import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  ActivatedRouteSnapshot,
  NavigationEnd,
  Router,
} from '@angular/router';
import { filter } from 'rxjs';
import { I18nService } from './i18n.service';

export type Locale = 'ro' | 'en';
export const SUPPORTED_LOCALES: Locale[] = ['ro', 'en'];
export const DEFAULT_LOCALE: Locale = 'ro';
const COOKIE_NAME = 'sz_locale';

/**
 * Detect the initial locale from the URL/cookie before any Angular DI
 * is available. Used by APP_INITIALIZER so the i18n bundle is loaded
 * in the correct language before the first render — no RO→EN flash
 * for users who land on `/en/...`.
 */
export function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const path = window.location?.pathname ?? '/';
  if (path === '/en' || path.startsWith('/en/')) return 'en';
  const cookieMatch = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=(ro|en)`),
  );
  if (cookieMatch?.[1] === 'en' && path === '/') return 'en';
  return DEFAULT_LOCALE;
}

/**
 * Single source of truth for the in-app locale.
 *
 * Strategy:
 *   - URL prefix wins. `/en/...` ⇒ EN, anything else ⇒ RO.
 *   - On first paint we read the URL synchronously (before the router
 *     fires its first `NavigationEnd`) so the i18n bundle loads in the
 *     right language during APP_INITIALIZER.
 *   - On every `NavigationEnd` we re-sync from the route tree's
 *     `data.locale` flag (RO is the implicit default when missing).
 *   - When the user toggles language via `setLocale()`, we navigate to
 *     the equivalent URL in the other locale and persist the choice in
 *     `users.preferred_locale` (logged-in) or a long-lived cookie
 *     (anonymous). We never change locale without changing the URL —
 *     keeps the back button honest and SEO indexing crisp.
 */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly _locale = signal<Locale>(DEFAULT_LOCALE);
  readonly locale = this._locale.asReadonly();
  readonly isEnglish = computed(() => this._locale() === 'en');

  constructor() {
    // Read the initial locale synchronously so the signal is correct
    // before any view binds to it. The bundle itself is loaded in
    // APP_INITIALIZER (see `app.config.ts`) — by the time this
    // constructor runs, the right bundle is already in memory.
    this._locale.set(detectInitialLocale());

    // Subscribe to NavigationEnd to re-sync the signal whenever the
    // user navigates between locales. The router emits one event per
    // top-level navigation; we walk the route tree to find the leaf's
    // resolved `data.locale`.
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        const fromTree = this.localeFromRouteTree();
        if (fromTree !== this._locale()) {
          this._locale.set(fromTree);
        }
      });

    // Whenever the signal flips after boot, swap the active bundle
    // and the `<html lang>` attribute. Skip the very first run when
    // the signal already matches what APP_INITIALIZER loaded.
    let firstRun = true;
    effect(() => {
      const loc = this._locale();
      if (firstRun) {
        firstRun = false;
        if (isPlatformBrowser(this.platformId)) {
          this.document.documentElement.lang = loc;
        }
        return;
      }
      if (this.i18n.locale() !== loc) {
        void this.i18n.init(loc);
      }
      if (isPlatformBrowser(this.platformId)) {
        this.document.documentElement.lang = loc;
      }
    });
  }

  /**
   * Returns the input path prefixed with `/en` when the active locale
   * is English. Use this from any `routerLink` that needs to preserve
   * the user's chosen language.
   *
   *   localizeUrl('/tezaur')          → '/tezaur'   (RO)
   *   localizeUrl('/tezaur')          → '/en/tezaur' (EN)
   *   localizeUrl('/tezaur/korg-ms-20')→ '/en/tezaur/korg-ms-20'
   */
  localizeUrl(path: string): string {
    if (this._locale() === 'ro') return path;
    if (!path.startsWith('/')) return path;
    return `/en${path}`;
  }

  /**
   * Switch to a new locale.
   *
   * We hard-reload the page via `window.location.assign` instead of
   * an in-app router navigation because the i18n bundle lives behind
   * the `TPipe` (pure pipe — re-evaluates only on input changes) and
   * dozens of components cache translated strings in computed signals
   * built from `i18n.t(...)`. None of those will re-render when the
   * bundle is swapped in place under a router navigation.
   *
   * A hard reload is the standard SPA pattern for locale switching
   * (Wikipedia, GitHub, etc.) and guarantees a clean state:
   * APP_INITIALIZER re-runs with the new URL prefix and pulls the
   * right bundle BEFORE the first paint, every component remounts
   * with the right locale, and the localeInterceptor stamps the new
   * locale on subsequent API calls.
   */
  setLocale(next: Locale): void {
    if (next === this._locale()) return;
    this.persistCookie(next);
    const current = this.router.url || '/';
    const stripped = this.stripPrefix(current);
    const target = next === 'en' ? `/en${stripped}` : stripped || '/';
    if (isPlatformBrowser(this.platformId)) {
      this.document.location.assign(target);
    } else {
      // SSR / Node — fall back to a router nav. We never actually hit
      // this in the browser, but it keeps the contract sane for tests.
      void this.router.navigateByUrl(target);
    }
  }

  /**
   * Strip a leading `/en` segment, if any, from an in-app URL. Used
   * by `setLocale` and by the language-switcher to compute the
   * cross-locale alternate URL.
   */
  stripPrefix(url: string): string {
    if (url === '/en') return '/';
    if (url.startsWith('/en/')) return url.slice(3); // keeps the leading '/'
    return url;
  }

  /**
   * Returns the equivalent URL for the *other* locale — useful for
   * `<link rel="alternate" hreflang="...">` injection in the head.
   */
  alternateUrl(targetLocale: Locale): string {
    const stripped = this.stripPrefix(this.router.url || '/');
    if (targetLocale === 'en') return `/en${stripped === '/' ? '' : stripped}` || '/en';
    return stripped || '/';
  }

  private localeFromRouteTree(): Locale {
    let snapshot: ActivatedRouteSnapshot | null =
      this.router.routerState.snapshot.root;
    while (snapshot) {
      const data = snapshot.data as { locale?: Locale } | undefined;
      if (data?.locale === 'en') return 'en';
      snapshot = snapshot.firstChild;
    }
    return 'ro';
  }

  private persistCookie(loc: Locale): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const oneYear = 60 * 60 * 24 * 365;
    this.document.cookie = `${COOKIE_NAME}=${loc}; Max-Age=${oneYear}; Path=/; SameSite=Lax`;
  }
}
