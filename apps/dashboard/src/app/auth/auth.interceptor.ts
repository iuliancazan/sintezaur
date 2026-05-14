import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

const AUTH_PATHS_NO_RETRY = ['/auth/login', '/auth/refresh', '/auth/logout'];

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
          user ? next(withCookies) : throwError(() => err),
        ),
      );
    }),
  );
};
