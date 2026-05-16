import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

type Bundle = Record<string, unknown>;

/**
 * Runtime i18n service.
 *
 * Why custom and not `@angular/localize`: localize is build-time
 * (one app per locale, hashes baked into chunks). Our deploy story
 * is one binary per instance with `LOCALE=ro|en` env, so a runtime
 * bundle swap is the right shape. ngx-translate would work too but
 * brings ~30KB and an entire DI ecosystem for a feature we use as
 * a key→string lookup.
 *
 * Loading: `init()` is awaited from app.config provideAppInitializer
 * so the bundle is in memory before any view renders — no flash of
 * missing keys. The bundle is served as a static asset from
 * `/assets/i18n/<locale>.json`.
 *
 * Interpolation: keys can include `{{var}}` placeholders. Pass an
 * object as the second `t()` arg:
 *
 *   t('auth.signup.success_body', { email: 'x@y.com' })
 *
 * Missing keys fall back to the key itself in dev (visible in UI
 * which is the right amount of nag).
 */
const FALLBACK_LOCALE = 'ro';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly http = inject(HttpClient);
  /** Active bundle for the current locale (may equal the fallback). */
  private bundle: Bundle = {};
  /**
   * Always-loaded RO bundle. When the active locale is EN and a key
   * is missing from `bundle`, we resolve against this so the UI never
   * shows raw keys to the user — RO copy fills the gap.
   */
  private fallbackBundle: Bundle = {};
  readonly locale = signal<string>(FALLBACK_LOCALE);
  readonly ready = signal<boolean>(false);

  async init(locale: string = FALLBACK_LOCALE): Promise<void> {
    this.locale.set(locale);
    // Always make sure the RO fallback is in memory before the first
    // paint. Subsequent calls reuse the already-loaded fallback.
    if (Object.keys(this.fallbackBundle).length === 0) {
      this.fallbackBundle = await this.fetchBundle(FALLBACK_LOCALE);
    }
    if (locale === FALLBACK_LOCALE) {
      this.bundle = this.fallbackBundle;
    } else {
      this.bundle = await this.fetchBundle(locale);
    }
    this.ready.set(true);
  }

  t(key: string, vars?: Record<string, string | number>): string {
    const raw = this.resolve(key) ?? this.resolve(key, this.fallbackBundle);
    if (raw === undefined) return key;
    if (!vars) return raw;
    return raw.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) =>
      vars[name] !== undefined ? String(vars[name]) : `{{${name}}}`,
    );
  }

  private async fetchBundle(locale: string): Promise<Bundle> {
    try {
      const bundle = await firstValueFrom(
        this.http.get<Bundle>(`/assets/i18n/${locale}.json`),
      );
      return bundle ?? {};
    } catch (err) {
      console.error(`[i18n] failed to load ${locale} bundle`, err);
      return {};
    }
  }

  private resolve(key: string, bundle: Bundle = this.bundle): string | undefined {
    const path = key.split('.');
    let cur: unknown = bundle;
    for (const part of path) {
      if (cur === null || typeof cur !== 'object') return undefined;
      cur = (cur as Record<string, unknown>)[part];
    }
    return typeof cur === 'string' ? cur : undefined;
  }
}
