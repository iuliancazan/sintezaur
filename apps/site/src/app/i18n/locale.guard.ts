import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LocaleService } from './locale.service';

/**
 * Locale-stickiness guard.
 *
 * When the user picked English (cookie + URL prefix on the active
 * page), any in-app navigation to a bare path like `/tezaur` lands
 * on the RO route by default — `routerLink` resolves absolute
 * paths verbatim, and the EN sibling lives one segment deeper at
 * `/en/tezaur`. The guard rewrites those navigations to the
 * `/en`-prefixed equivalent before the route activates, so the
 * locale follows the user across every click without us having to
 * audit every `routerLink` in the codebase.
 *
 * Returning a `UrlTree` cancels the current navigation and replays
 * it with the corrected URL — no flash of the wrong content,
 * no double history entry.
 *
 * We only auto-add the prefix; we never strip it. If a user with
 * cookie=ro deep-links to `/en/foo`, the `data.locale = 'en'` on
 * the parent route sets the active locale and they stay on the EN
 * tree — matches what they typed.
 */
export const localeGuard: CanActivateFn = (_route, state) => {
  const locale = inject(LocaleService);
  const router = inject(Router);
  const url = state.url;
  const urlHasEn =
    url === '/en' || url.startsWith('/en/') || url.startsWith('/en?');
  if (locale.locale() === 'en' && !urlHasEn) {
    return router.parseUrl('/en' + url);
  }
  return true;
};
