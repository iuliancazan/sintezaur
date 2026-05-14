import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Browser interceptor wired in app.config via `withInterceptors`.
 *
 * Two jobs:
 *   1. Force `withCredentials: true` on every request to the API
 *      origin so the HttpOnly cookies travel.
 *   2. On 401 from an API call, attempt a single silent /refresh
 *      and replay the original request on success. If refresh
 *      fails, propagate the 401 — the auth guard handles redirect.
 *
 * Endpoints exempt from the 401-retry loop: /auth/login,
 * /auth/refresh, /auth/signup, /auth/forgot-password,
 * /auth/reset-password, /auth/verify-email — these are the auth
 * surface itself, and a 401 here means "credentials bad", not
 * "token expired".
 */
const AUTH_PATHS_NO_RETRY = [
  '/auth/login',
  '/auth/refresh',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const base = environment.apiBaseUrl;
  const targetsApi = req.url.startsWith(base);
  const withCookies = targetsApi
    ? req.clone({ withCredentials: true })
    : req;

  return next(withCookies).pipe(
    catchError((err: unknown) => {
      if (
        !(err instanceof HttpErrorResponse) ||
        err.status !== 401 ||
        !targetsApi ||
        AUTH_PATHS_NO_RETRY.some((p) => req.url.includes(p))
      ) {
        return throwError(() => err);
      }
      const auth = inject(AuthService);
      return from(auth.refresh()).pipe(
        switchMap((user) =>
          user
            ? next(withCookies)
            : throwError(() => err),
        ),
      );
    }),
  );
};
