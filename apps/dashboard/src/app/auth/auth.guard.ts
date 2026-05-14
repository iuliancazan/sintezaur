import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Combined "logged in AND staff" guard. Anonymous → /login; logged
 * in but not staff → /login with a hint. Used on every dashboard
 * route except /login itself.
 */
export const staffGuard: CanActivateFn = (): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isStaff()) return true;
  return router.createUrlTree(['/login'], {
    queryParams: auth.isLoggedIn() ? { reason: 'not_staff' } : {},
  });
};
