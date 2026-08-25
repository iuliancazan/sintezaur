import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
} from '@angular/router';
import { AuthService, type SessionRole } from './auth.service';

/**
 * Any valid session; guest/admin must match the :slug they unlocked.
 * Otherwise → that workshop's own login page.
 */
export const workshopGuard: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const session = await auth.resolve();
  const slug = route.paramMap.get('slug');
  if (!session) {
    return router.parseUrl(slug ? `/w/${slug}/login` : '/');
  }
  if (
    session.role !== 'superadmin' &&
    slug &&
    session.workshop?.slug !== slug
  ) {
    return router.parseUrl(`/w/${slug}/login`);
  }
  return true;
};

/** Restricts a route to the given roles (on top of workshopGuard). */
export function roleGuard(...roles: SessionRole[]): CanActivateFn {
  return async (route: ActivatedRouteSnapshot) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const session = await auth.resolve();
    if (!session || !roles.includes(session.role)) {
      const slug = route.paramMap.get('slug');
      return router.parseUrl(slug ? `/w/${slug}` : '/');
    }
    return true;
  };
}
