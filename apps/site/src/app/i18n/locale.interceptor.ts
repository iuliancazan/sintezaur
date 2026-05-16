import {
  HttpEvent,
  HttpHandlerFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LocaleService } from './locale.service';

/**
 * M16-E: stamp locale-aware API requests with the active locale so the
 * server-side resolver can pick between RO and EN columns and emit an
 * `isTranslated` flag.
 *
 * Originally this fired on every API request, but the global
 * NestJS ValidationPipe runs with `forbidNonWhitelisted: true` —
 * any query DTO that doesn't declare a `locale` field 400s. Only
 * Tezaur and Legal detail handlers actually consume the param, so
 * we keep the stamping scoped to that allowlist instead of bloating
 * every DTO with an ignored field.
 *
 * Requests aimed at endpoints outside the allowlist (lists, mutations,
 * auth, search, etc.) pass through untouched. Calls that already carry
 * an explicit `locale` query stay as-is so per-call overrides still work.
 */

/** URL patterns (relative to `apiBaseUrl`) where the server reads `locale`. */
const LOCALE_ROUTES: RegExp[] = [
  // Public Tezaur gear detail by slug: GET /tezaur/{slug}
  /^\/tezaur\/[^/]+$/,
  // Legal pages detail: GET /legal/pages/{slug}
  /^\/legal\/pages\/[^/]+$/,
];

function needsLocaleParam(url: string): boolean {
  const base = environment.apiBaseUrl;
  if (!url.startsWith(base)) return false;
  // Strip the base + drop the query string for the regex match.
  const path = url.slice(base.length).split('?')[0];
  return LOCALE_ROUTES.some((re) => re.test(path));
}

export function localeInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  if (!needsLocaleParam(req.url)) {
    return next(req);
  }
  if (req.params.has('locale')) {
    return next(req);
  }
  const locale = inject(LocaleService).locale();
  return next(req.clone({ setParams: { locale } }));
}
