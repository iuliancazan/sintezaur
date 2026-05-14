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
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly http = inject(HttpClient);
  private bundle: Bundle = {};
  readonly locale = signal<string>('ro');
  readonly ready = signal<boolean>(false);

  async init(locale = 'ro'): Promise<void> {
    this.locale.set(locale);
    try {
      const bundle = await firstValueFrom(
        this.http.get<Bundle>(`/assets/i18n/${locale}.json`),
      );
      this.bundle = bundle ?? {};
    } catch (err) {
      console.error('[i18n] failed to load bundle', err);
      this.bundle = {};
    }
    this.ready.set(true);
  }

  t(key: string, vars?: Record<string, string | number>): string {
    const raw = this.resolve(key);
    if (raw === undefined) return key;
    if (!vars) return raw;
    return raw.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) =>
      vars[name] !== undefined ? String(vars[name]) : `{{${name}}}`,
    );
  }

  private resolve(key: string): string | undefined {
    const path = key.split('.');
    let cur: unknown = this.bundle;
    for (const part of path) {
      if (cur === null || typeof cur !== 'object') return undefined;
      cur = (cur as Record<string, unknown>)[part];
    }
    return typeof cur === 'string' ? cur : undefined;
  }
}
