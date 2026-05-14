import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

type Bundle = Record<string, unknown>;

/**
 * Dashboard runtime i18n service. Same shape as the site's
 * I18nService; consolidated to a shared lib in M2.
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
