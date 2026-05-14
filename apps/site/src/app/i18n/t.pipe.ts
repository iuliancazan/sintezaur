import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

/**
 * Template helper for translation lookups:
 *
 *   {{ 'auth.signup.title' | t }}
 *   {{ 'auth.signup.success_body' | t: { email: emailInput } }}
 *
 * The pipe is intentionally not `pure: false` — the bundle is loaded
 * once at boot via `provideAppInitializer` (see app.config.ts) and
 * never mutated thereafter, so the default `pure: true` is correct
 * and keeps change detection cheap.
 */
@Pipe({ name: 't', standalone: true })
export class TPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string, vars?: Record<string, string | number>): string {
    return this.i18n.t(key, vars);
  }
}
