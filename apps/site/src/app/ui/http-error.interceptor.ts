import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ToastService } from './toast.service';

/**
 * Global HTTP error toast (M6-C). Rules:
 *
 *   - 0 / network errors    → "ești offline / serverul nu răspunde"
 *   - 401                   → silent (auth interceptor retries with /refresh,
 *                              and if that fails the auth guard handles UX)
 *   - 403                   → "nu ai permisiunea" (rare on public surfaces,
 *                              usually a route-guard bug if it surfaces)
 *   - 404                   → silent (components handle their own 404 UX —
 *                              we don't want a toast on every deep-link)
 *   - 429                   → "prea multe acțiuni, încearcă peste o vreme"
 *   - 5xx                   → "ceva nu a funcționat — încearcă mai târziu"
 *   - everything else       → silent (4xx form validation etc. shows the
 *                              error in the form itself)
 *
 * Suppression: any request to a non-API origin is skipped entirely
 * (third-party images / assets / external CDN that the site happens
 * to hit). Same for the /auth/* surface — those flows already show
 * inline errors and a toast would be noise.
 */
const AUTH_QUIET_PATHS = [
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/refresh',
  '/auth/change-password',
  '/auth/change-email',
];

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const base = environment.apiBaseUrl;
  if (!req.url.startsWith(base)) return next(req);
  if (AUTH_QUIET_PATHS.some((p) => req.url.includes(p))) return next(req);

  const toast = inject(ToastService);
  return next(req).pipe(
    tap({
      error: (err: unknown) => {
        if (!(err instanceof HttpErrorResponse)) return;
        const status = err.status;
        if (status === 401 || status === 404) return; // handled elsewhere
        if (status === 0) {
          toast.error('Serverul nu răspunde', {
            detail: 'Verifică conexiunea la internet și reîncearcă.',
          });
          return;
        }
        if (status === 429) {
          toast.warn('Prea multe acțiuni într-un timp scurt', {
            detail: 'Așteaptă câteva minute și reîncearcă.',
          });
          return;
        }
        if (status >= 500) {
          toast.error('Ceva nu a funcționat pe server', {
            detail: 'Am notat eroarea. Reîncearcă în câteva minute.',
          });
          return;
        }
        if (status === 403) {
          toast.warn('Nu ai permisiunea pentru această acțiune.');
          return;
        }
        // Other 4xx: silent — the call site shows the inline form/UX error.
      },
    }),
  );
};
