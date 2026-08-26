import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Expired/invalid session on any API call (except auth) → FULL reload to
 * the gate. A router navigation is not enough: without a session the
 * server gates every asset, so the still-running SPA would strand (dead
 * images, failing lazy chunks) — same reasoning as the logout flow.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        !req.url.includes('/api/auth/')
      ) {
        auth.invalidate();
        window.location.assign('/');
      }
      return throwError(() => err);
    }),
  );
};
