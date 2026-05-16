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
import {
  AppConfigService,
  SintezaurPreset,
  provideSintezaurIcons,
} from '@sintezaur/ui';
import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';
import { AuthService } from './auth/auth.service';
import { I18nService } from './i18n/i18n.service';
import { localeInterceptor } from './i18n/locale.interceptor';
import { detectInitialLocale } from './i18n/locale.service';
import { httpErrorInterceptor } from './ui/http-error.interceptor';
import { UmamiService } from './analytics/umami.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      appRoutes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    provideHttpClient(
      withFetch(),
      // The locale interceptor stamps every API request with the
      // active locale BEFORE the auth interceptor sees it — keeps
      // /api/auth/me etc. consistent with the rest of the surface.
      withInterceptors([localeInterceptor, authInterceptor, httpErrorInterceptor]),
    ),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: SintezaurPreset,
        options: {
          darkModeSelector: '[data-theme="dark"]',
          cssLayer: false,
        },
      },
    }),
    provideSintezaurIcons(),
    /**
     * Block app rendering until:
     *   1. the RO bundle is loaded (no key-flash on first paint)
     *   2. /auth/me has resolved (no anonymous flash for already-
     *      logged-in users)
     *   3. /config has resolved (image URLs need the storage public
     *      base — falls back to the env default if the fetch fails)
     * Parallel — the slowest gates boot.
     */
    provideAppInitializer(async () => {
      const i18n = inject(I18nService);
      const auth = inject(AuthService);
      const umami = inject(UmamiService);
      const appConfig = inject(AppConfigService);
      appConfig.setFallback(environment.imageBaseUrl);
      // Umami is fire-and-forget — don't gate boot on its script load.
      umami.init();
      await Promise.all([
        // Detect locale from URL/cookie BEFORE first render so users
        // landing on /en/... see EN copy immediately (no RO flash).
        // Falls back to RO when detection is ambiguous.
        i18n.init(detectInitialLocale()),
        auth.loadCurrentUser(),
        appConfig.bootstrap(environment.apiBaseUrl),
      ]);
    }),
  ],
};
