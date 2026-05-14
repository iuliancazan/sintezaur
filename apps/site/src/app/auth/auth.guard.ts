import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Protect `/cont/**` and any future user-only route. Reads the
 * already-loaded session signal — the appInitializer runs
 * `loadCurrentUser()` before the router boots, so we don't have to
 * await anything here.
 */
export const authGuard: CanActivateFn = (_, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/login'], {
    queryParams: { redirect: state.url },
  });
};
