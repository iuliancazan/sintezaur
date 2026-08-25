import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
} from '@angular/router';
import { AuthService, type SessionRole } from './auth.service';

/** Any valid session; guest/admin must match the :slug they unlocked. */
export const workshopGuard: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const session = await auth.resolve();
  if (!session) {
    return router.parseUrl('/');
  }
  const slug = route.paramMap.get('slug');
  if (
    session.role !== 'superadmin' &&
    slug &&
    session.workshop?.slug !== slug
  ) {
    return router.parseUrl('/');
  }
  return true;
};

/** Restricts a route to the given roles (on top of workshopGuard). */
export function roleGuard(...roles: SessionRole[]): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const session = await auth.resolve();
    if (!session || !roles.includes(session.role)) {
      return router.parseUrl('/');
    }
    return true;
  };
}
