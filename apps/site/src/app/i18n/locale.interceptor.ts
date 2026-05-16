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
 * M16-E: stamp every API request with the active locale so server-side
 * resolvers (Tezaur detail, legal pages, future Revista detail) can
 * pick between RO and EN columns and emit a `isTranslated` flag.
 *
 * We only touch requests aimed at our own API host — third-party calls
 * (storage URLs, analytics) keep their parameters untouched. Requests
 * that already carry a `locale` query stay as-is, so per-call overrides
 * (e.g. a curator previewing both languages) still work.
 */
export function localeInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }
  if (req.params.has('locale')) {
    return next(req);
  }
  const locale = inject(LocaleService).locale();
  return next(req.clone({ setParams: { locale } }));
}
