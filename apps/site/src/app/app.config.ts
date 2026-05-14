import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { appRoutes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';
import { AuthService } from './auth/auth.service';
import { I18nService } from './i18n/i18n.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      appRoutes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: { darkModeSelector: '.dark', cssLayer: false },
      },
    }),
    /**
     * Block app rendering until:
     *   1. the RO bundle is loaded (no key-flash on first paint)
     *   2. /auth/me has resolved (no anonymous flash for already-
     *      logged-in users)
     * Both run in parallel — the slower of the two gates boot.
     */
    provideAppInitializer(async () => {
      const i18n = inject(I18nService);
      const auth = inject(AuthService);
      await Promise.all([i18n.init('ro'), auth.loadCurrentUser()]);
    }),
  ],
};
